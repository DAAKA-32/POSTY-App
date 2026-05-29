import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { randomBytes } from "node:crypto";
import {
  encryptToken,
  decryptToken,
  isEncrypted,
  encryptIfPresent,
  decryptIfPresent,
  __resetKeyCacheForTests,
} from "@/lib/crypto/token-cipher";

function setTestKey(): string {
  const key = randomBytes(32).toString("base64");
  process.env.TOKEN_ENCRYPTION_KEY = key;
  __resetKeyCacheForTests();
  return key;
}

describe("token-cipher", () => {
  const originalKey = process.env.TOKEN_ENCRYPTION_KEY;

  beforeEach(() => {
    setTestKey();
  });

  afterEach(() => {
    if (originalKey === undefined) {
      delete process.env.TOKEN_ENCRYPTION_KEY;
    } else {
      process.env.TOKEN_ENCRYPTION_KEY = originalKey;
    }
    __resetKeyCacheForTests();
  });

  describe("encrypt/decrypt round trip", () => {
    it("returns the original plaintext after a round trip", () => {
      const plaintext = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.long-fake-token-payload.signature";
      const encrypted = encryptToken(plaintext);
      expect(decryptToken(encrypted)).toBe(plaintext);
    });

    it("handles unicode and emoji", () => {
      const plaintext = "héllo-wörld-🔐-токен";
      const encrypted = encryptToken(plaintext);
      expect(decryptToken(encrypted)).toBe(plaintext);
    });

    it("handles long values (10KB)", () => {
      const plaintext = "x".repeat(10_000);
      const encrypted = encryptToken(plaintext);
      expect(decryptToken(encrypted)).toBe(plaintext);
    });

    it("produces a different ciphertext each call (random IV)", () => {
      const plaintext = "same-secret";
      const a = encryptToken(plaintext);
      const b = encryptToken(plaintext);
      expect(a).not.toBe(b);
      expect(decryptToken(a)).toBe(plaintext);
      expect(decryptToken(b)).toBe(plaintext);
    });
  });

  describe("format and marker", () => {
    it("encrypted output starts with the version marker", () => {
      const encrypted = encryptToken("foo");
      expect(encrypted.startsWith("enc:v1:")).toBe(true);
    });

    it("isEncrypted detects encrypted values", () => {
      const encrypted = encryptToken("foo");
      expect(isEncrypted(encrypted)).toBe(true);
    });

    it("isEncrypted returns false for plaintext", () => {
      expect(isEncrypted("plain-token")).toBe(false);
      expect(isEncrypted("")).toBe(false);
      expect(isEncrypted(null)).toBe(false);
      expect(isEncrypted(undefined)).toBe(false);
    });
  });

  describe("idempotence", () => {
    it("encryptToken on already-encrypted returns the same value", () => {
      const once = encryptToken("foo");
      const twice = encryptToken(once);
      expect(twice).toBe(once);
    });
  });

  describe("legacy plaintext fallback", () => {
    it("decryptToken returns plaintext unchanged when not encrypted", () => {
      const legacy = "legacy-plaintext-token-from-2025";
      expect(decryptToken(legacy)).toBe(legacy);
    });
  });

  describe("nullable helpers", () => {
    it("encryptIfPresent passes through null/undefined/empty", () => {
      expect(encryptIfPresent(null)).toBeNull();
      expect(encryptIfPresent(undefined)).toBeUndefined();
      expect(encryptIfPresent("")).toBe("");
    });

    it("encryptIfPresent encrypts non-empty", () => {
      const encrypted = encryptIfPresent("token");
      expect(encrypted).not.toBeNull();
      expect(isEncrypted(encrypted!)).toBe(true);
    });

    it("decryptIfPresent passes through null/undefined/empty", () => {
      expect(decryptIfPresent(null)).toBeNull();
      expect(decryptIfPresent(undefined)).toBeUndefined();
      expect(decryptIfPresent("")).toBe("");
    });

    it("decryptIfPresent decrypts non-empty", () => {
      const original = "my-token";
      const encrypted = encryptIfPresent(original)!;
      expect(decryptIfPresent(encrypted)).toBe(original);
    });
  });

  describe("tamper detection", () => {
    it("throws when authentication tag is altered", () => {
      const encrypted = encryptToken("secret");
      const parts = encrypted.split(":");
      // Flip a byte in the tag (index 3)
      const tagBuf = Buffer.from(parts[3], "base64");
      tagBuf[0] = tagBuf[0] ^ 0xff;
      parts[3] = tagBuf.toString("base64");
      const tampered = parts.join(":");
      expect(() => decryptToken(tampered)).toThrow();
    });

    it("throws when ciphertext is altered", () => {
      const encrypted = encryptToken("secret-long-enough-to-flip-a-byte-in");
      const parts = encrypted.split(":");
      const ctBuf = Buffer.from(parts[4], "base64");
      ctBuf[0] = ctBuf[0] ^ 0xff;
      parts[4] = ctBuf.toString("base64");
      const tampered = parts.join(":");
      expect(() => decryptToken(tampered)).toThrow();
    });

    it("throws on malformed encrypted value", () => {
      expect(() => decryptToken("enc:v1:not-enough-parts")).toThrow();
    });
  });

  describe("key validation", () => {
    it("throws helpful error when key is missing", () => {
      delete process.env.TOKEN_ENCRYPTION_KEY;
      __resetKeyCacheForTests();
      expect(() => encryptToken("foo")).toThrow(/TOKEN_ENCRYPTION_KEY/);
    });

    it("throws when key is wrong length", () => {
      process.env.TOKEN_ENCRYPTION_KEY = Buffer.from("too-short").toString("base64");
      __resetKeyCacheForTests();
      expect(() => encryptToken("foo")).toThrow(/32 bytes/);
    });
  });

  describe("cross-key isolation", () => {
    it("ciphertext from key A cannot be decrypted with key B", () => {
      const encrypted = encryptToken("secret");
      // Swap to a different key
      setTestKey();
      expect(() => decryptToken(encrypted)).toThrow();
    });
  });
});
