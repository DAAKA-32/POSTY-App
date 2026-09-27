import { randomBytes } from "node:crypto";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// Both ciphers cache the key at first use, so every case loads a fresh
// module graph with the environment it wants to simulate.
const KEY_A = randomBytes(32).toString("base64");
const KEY_B = randomBytes(32).toString("base64");
const ORIGINAL_KEY = process.env.TOKEN_ENCRYPTION_KEY;

async function appCipher() {
  vi.resetModules();
  return import("@/lib/crypto/token-cipher");
}
async function schedulerAuth() {
  vi.resetModules();
  return import("../../functions/src/scheduler/publishers/auth");
}

/** Encrypt exactly like the Next.js app (Vercel) does when saving a connection. */
async function encryptLikeTheApp(plaintext: string, key: string): Promise<string> {
  process.env.TOKEN_ENCRYPTION_KEY = key;
  const cipher = await appCipher();
  return cipher.encryptToken(plaintext);
}

// Warm the transform cache once: the first cold import of the module graph
// is slow; later fresh instances (vi.resetModules) are then instantaneous.
beforeAll(async () => {
  await import("@/lib/crypto/token-cipher");
  await import("../../functions/src/scheduler/publishers/auth");
}, 60_000);

beforeEach(() => {
  delete process.env.TOKEN_ENCRYPTION_KEY;
});
afterEach(() => {
  if (ORIGINAL_KEY === undefined) delete process.env.TOKEN_ENCRYPTION_KEY;
  else process.env.TOKEN_ENCRYPTION_KEY = ORIGINAL_KEY;
});

describe("token decryption in the scheduler runtime", () => {
  it("decrypts a token encrypted by the app when both runtimes share the key", async () => {
    const encrypted = await encryptLikeTheApp("linkedin-access-token", KEY_A);
    expect(encrypted.startsWith("enc:v1:")).toBe(true);
    process.env.TOKEN_ENCRYPTION_KEY = KEY_A;
    const { decryptConnectionToken } = await schedulerAuth();
    expect(decryptConnectionToken(encrypted, "linkedin")).toBe("linkedin-access-token");
  });

  it("INCIDENT 2026-09 — key absent from the Functions runtime → CONFIG_ENCRYPTION_KEY_MISSING (retryable, explicit)", async () => {
    const encrypted = await encryptLikeTheApp("linkedin-access-token", KEY_A);
    delete process.env.TOKEN_ENCRYPTION_KEY; // functions/.env.<projectId> without the key
    const { decryptConnectionToken } = await schedulerAuth();
    let caught: unknown;
    try {
      decryptConnectionToken(encrypted, "linkedin");
    } catch (err) {
      caught = err;
    }
    expect(caught).toMatchObject({
      name: "PublishError",
      code: "CONFIG_ENCRYPTION_KEY_MISSING",
      retryable: true,
      ambiguous: false,
    });
    expect((caught as Error).message).toContain("TOKEN_ENCRYPTION_KEY");
  });

  it("legacy plaintext tokens still work without any key (why the bug stayed hidden until a reconnect)", async () => {
    const { decryptConnectionToken } = await schedulerAuth();
    expect(decryptConnectionToken("AQV-legacy-plaintext-token", "linkedin")).toBe("AQV-legacy-plaintext-token");
  });

  it("different key in the two runtimes → TOKEN_DECRYPT_FAILED", async () => {
    const encrypted = await encryptLikeTheApp("linkedin-access-token", KEY_A);
    process.env.TOKEN_ENCRYPTION_KEY = KEY_B;
    const { decryptConnectionToken } = await schedulerAuth();
    expect(() => decryptConnectionToken(encrypted, "linkedin")).toThrowError(
      expect.objectContaining({ code: "TOKEN_DECRYPT_FAILED" }),
    );
  });

  it("malformed key → CONFIG_ENCRYPTION_KEY_INVALID", async () => {
    const encrypted = await encryptLikeTheApp("linkedin-access-token", KEY_A);
    process.env.TOKEN_ENCRYPTION_KEY = "not-32-bytes";
    const { decryptConnectionToken } = await schedulerAuth();
    expect(() => decryptConnectionToken(encrypted, "linkedin")).toThrowError(
      expect.objectContaining({ code: "CONFIG_ENCRYPTION_KEY_INVALID" }),
    );
  });

  it("a BOM-prefixed key (PowerShell pipe pitfall) is still usable", async () => {
    const encrypted = await encryptLikeTheApp("linkedin-access-token", KEY_A);
    process.env.TOKEN_ENCRYPTION_KEY = `﻿${KEY_A}\n`;
    const { decryptConnectionToken } = await schedulerAuth();
    expect(decryptConnectionToken(encrypted, "linkedin")).toBe("linkedin-access-token");
  });

  it("missing token on the connection → CONNECTION_NOT_FOUND (reconnect)", async () => {
    const { decryptConnectionToken } = await schedulerAuth();
    expect(() => decryptConnectionToken(undefined, "linkedin")).toThrowError(
      expect.objectContaining({ code: "CONNECTION_NOT_FOUND", retryable: false }),
    );
  });

  it("the decryption error never leaks the ciphertext or key", async () => {
    const encrypted = await encryptLikeTheApp("linkedin-access-token", KEY_A);
    process.env.TOKEN_ENCRYPTION_KEY = KEY_B;
    const { decryptConnectionToken } = await schedulerAuth();
    try {
      decryptConnectionToken(encrypted, "linkedin");
    } catch (err) {
      const text = JSON.stringify(err) + String((err as Error).message);
      expect(text).not.toContain(encrypted.slice(7, 30));
      expect(text).not.toContain(KEY_B);
    }
  });
});

describe("assertNotExpired", () => {
  const NOW = Date.UTC(2026, 8, 30);

  it("rejects an expired token with TOKEN_EXPIRED and the expiry date", async () => {
    const { assertNotExpired } = await schedulerAuth();
    expect(() => assertNotExpired({ toMillis: () => NOW - 1 }, NOW, "linkedin")).toThrowError(
      expect.objectContaining({ code: "TOKEN_EXPIRED", retryable: false }),
    );
  });

  it("accepts a valid token and returns its expiry", async () => {
    const { assertNotExpired } = await schedulerAuth();
    expect(assertNotExpired({ toMillis: () => NOW + 1_000 }, NOW, "linkedin")).toBe(NOW + 1_000);
  });

  it("tolerates a missing / malformed expiry (the API decides) instead of crashing", async () => {
    const { assertNotExpired } = await schedulerAuth();
    expect(assertNotExpired(undefined, NOW, "linkedin")).toBeNull();
    expect(assertNotExpired("not a date", NOW, "linkedin")).toBeNull();
  });
});
