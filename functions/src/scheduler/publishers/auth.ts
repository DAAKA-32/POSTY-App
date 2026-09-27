import { decryptToken, tokenKeyStatus } from "../../crypto/token-cipher";
import { PublishError, sanitizeDetail } from "../errors";
import { toMillis } from "../store-mapping";
import type { PublishContext } from "./types";

/**
 * Decrypts a stored OAuth credential. Tokens written by the Next.js app are
 * AES-256-GCM encrypted ("enc:v1:…") with TOKEN_ENCRYPTION_KEY, so this
 * runtime MUST hold the same key. Each failure mode gets its own code: a
 * missing/invalid key is a server misconfiguration (retried — fixable by a
 * redeploy), a failed decryption is a key mismatch or a corrupted token.
 */
export function decryptConnectionToken(value: unknown, platform: string, field = "accessToken"): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new PublishError({ code: "CONNECTION_NOT_FOUND", platform, detail: `${field} missing on the connection` });
  }
  try {
    return decryptToken(value);
  } catch (err) {
    const keyStatus = tokenKeyStatus();
    if (keyStatus === "missing") {
      throw new PublishError({
        code: "CONFIG_ENCRYPTION_KEY_MISSING",
        platform,
        detail: "TOKEN_ENCRYPTION_KEY is not set in the Cloud Functions runtime",
      });
    }
    if (keyStatus === "invalid") {
      throw new PublishError({
        code: "CONFIG_ENCRYPTION_KEY_INVALID",
        platform,
        detail: "TOKEN_ENCRYPTION_KEY does not decode to 32 bytes",
      });
    }
    const reason = err instanceof Error ? err.message : String(err);
    throw new PublishError({
      code: "TOKEN_DECRYPT_FAILED",
      platform,
      detail: sanitizeDetail(`${field}: ${reason} (key differs from the app's, or the token is corrupted)`),
    });
  }
}

/** Throws TOKEN_EXPIRED when a known expiry is in the past; returns it (ms) otherwise. */
export function assertNotExpired(expiresAt: unknown, nowMs: number, platform: string): number | null {
  const expiresAtMs = toMillis(expiresAt);
  if (expiresAtMs !== null && expiresAtMs <= nowMs) {
    throw new PublishError({
      code: "TOKEN_EXPIRED",
      platform,
      detail: `Token expired at ${new Date(expiresAtMs).toISOString()}`,
    });
  }
  return expiresAtMs;
}

/**
 * Refuses to start a network step that could not finish before the run's
 * deadline. Only used BEFORE the create call, so the error is never ambiguous.
 */
export function assertTimeLeft(ctx: PublishContext, nowMs: number, neededMs: number): void {
  if (ctx.deadlineMs - nowMs < neededMs) {
    throw new PublishError({
      code: "DEADLINE_EXCEEDED",
      platform: ctx.platform,
      detail: `Only ${Math.max(0, ctx.deadlineMs - nowMs)} ms left in this run, ${neededMs} ms needed`,
    });
  }
}
