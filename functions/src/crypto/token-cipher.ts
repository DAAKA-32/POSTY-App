// Cloud Functions copy of lib/crypto/token-cipher.ts (Next.js).
//
// Functions runs in its own TypeScript project — it cannot import from the
// app-side `@/lib/...` paths, so the cipher logic is duplicated here. KEEP THIS
// FILE IN SYNC with `lib/crypto/token-cipher.ts`. Both must share:
//   - the same ALGORITHM (aes-256-gcm)
//   - the same IV length (12 bytes)
//   - the same MARKER ("enc:v1:")
//   - the same TOKEN_ENCRYPTION_KEY value (set as Functions env var)
// Otherwise tokens written on one side cannot be read on the other.

import { randomBytes, createCipheriv, createDecipheriv } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const KEY_LENGTH = 32;
const MARKER = "enc:v1:";

let cachedKey: Buffer | null = null;

function getKey(): Buffer {
  if (cachedKey) return cachedKey;

  const raw = process.env.TOKEN_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "TOKEN_ENCRYPTION_KEY env var is missing in Cloud Functions. Set it via Firebase Functions runtime env vars and redeploy.",
    );
  }

  const buf = Buffer.from(raw.trim(), "base64");
  if (buf.length !== KEY_LENGTH) {
    throw new Error(
      `TOKEN_ENCRYPTION_KEY must decode to exactly ${KEY_LENGTH} bytes (got ${buf.length})`,
    );
  }

  cachedKey = buf;
  return buf;
}

export function isEncrypted(value: string | null | undefined): boolean {
  if (!value || typeof value !== "string") return false;
  return value.startsWith(MARKER);
}

export function encryptToken(plaintext: string): string {
  if (isEncrypted(plaintext)) return plaintext;
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    MARKER.replace(/:$/, ""),
    iv.toString("base64"),
    tag.toString("base64"),
    ciphertext.toString("base64"),
  ].join(":");
}

export function decryptToken(value: string): string {
  if (!isEncrypted(value)) return value;
  const parts = value.split(":");
  if (parts.length !== 5) {
    throw new Error("Encrypted token has invalid format");
  }
  const [, , ivB64, tagB64, ctB64] = parts;
  const key = getKey();
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const ciphertext = Buffer.from(ctB64, "base64");
  if (iv.length !== IV_LENGTH) {
    throw new Error("Encrypted token has invalid IV length");
  }
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString("utf8");
}
