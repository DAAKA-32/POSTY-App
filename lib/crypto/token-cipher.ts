// Token cipher for OAuth credentials stored in Firestore.
//
// All platform connection collections (linkedinConnections, blueskyConnections,
// facebookConnections, threadsConnections, mastodonConnections,
// discordConnections, instagramConnections, xConnections) store at least one
// long-lived secret (accessToken, refreshJwt, webhookUrl, etc.). Storing these
// in plaintext means a Firestore read leak == full account takeover for every
// affected user, on every connected platform.
//
// This module wraps those values in AES-256-GCM authenticated encryption.
// Encrypted values are tagged with the marker `enc:v1:` so reads can
// transparently fall back to plaintext during the migration window — a value
// without the marker is assumed legacy plaintext and returned unchanged by
// `decryptToken`. Writes ALWAYS go through `encryptToken`.

import { randomBytes, createCipheriv, createDecipheriv } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96-bit IV, recommended for GCM
const KEY_LENGTH = 32; // 256-bit key
const MARKER = "enc:v1:";

let cachedKey: Buffer | null = null;

/**
 * Resolve the master encryption key from the environment.
 *
 * Expected format: base64-encoded 32 bytes (44 chars with padding).
 * Generate one with: `openssl rand -base64 32` and put it in
 * `TOKEN_ENCRYPTION_KEY` (Vercel env var, NOT NEXT_PUBLIC_*).
 *
 * Cached after first read for performance.
 */
function getKey(): Buffer {
  if (cachedKey) return cachedKey;

  const raw = process.env.TOKEN_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "TOKEN_ENCRYPTION_KEY env var is missing. Generate one with `openssl rand -base64 32` and set it in your environment (Vercel + local .env.local).",
    );
  }

  let buf: Buffer;
  try {
    buf = Buffer.from(raw.trim(), "base64");
  } catch {
    throw new Error("TOKEN_ENCRYPTION_KEY must be valid base64");
  }

  if (buf.length !== KEY_LENGTH) {
    throw new Error(
      `TOKEN_ENCRYPTION_KEY must decode to exactly ${KEY_LENGTH} bytes (got ${buf.length})`,
    );
  }

  cachedKey = buf;
  return buf;
}

/**
 * Reset the cached key. Test-only.
 * @internal
 */
export function __resetKeyCacheForTests(): void {
  cachedKey = null;
}

/**
 * Detect whether a value has already been encrypted by this module.
 * Safe to call on any string (including legacy plaintext tokens).
 */
export function isEncrypted(value: string | null | undefined): boolean {
  if (!value || typeof value !== "string") return false;
  return value.startsWith(MARKER);
}

/**
 * Encrypt a plaintext secret. Returns a string of the form
 * `enc:v1:<base64(iv)>:<base64(tag)>:<base64(ciphertext)>`.
 *
 * Idempotent: if `plaintext` is already encrypted, returns it unchanged.
 * This makes it safe to wrap save paths without double-encrypting on retry.
 */
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

/**
 * Decrypt a value. If the value is not encrypted (no marker), returns it
 * unchanged — this is the migration fallback for legacy plaintext docs.
 *
 * Throws if the value is encrypted but tampered/wrong-key/corrupt.
 */
export function decryptToken(value: string): string {
  if (!isEncrypted(value)) return value;

  const parts = value.split(":");
  // ["enc", "v1", iv, tag, ciphertext]
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

/**
 * Encrypt only if not already encrypted. Same as `encryptToken` thanks to
 * idempotence, but named for clarity in migration scripts.
 */
export function ensureEncrypted(value: string): string {
  return encryptToken(value);
}

/**
 * Helper for nullable fields: encrypt if non-empty, otherwise return as-is.
 */
export function encryptIfPresent<T extends string | null | undefined>(value: T): T {
  if (!value) return value;
  return encryptToken(value) as T;
}

/**
 * Helper for nullable fields: decrypt if non-empty, otherwise return as-is.
 */
export function decryptIfPresent<T extends string | null | undefined>(value: T): T {
  if (!value) return value;
  return decryptToken(value) as T;
}
