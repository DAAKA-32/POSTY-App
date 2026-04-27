// HMAC-signed OAuth `state` parameter.
//
// Why this exists: an OAuth provider's redirect to our callback hits Posty
// without the user's Firebase Authorization header (browser redirects strip
// custom headers). The only payload we control on the round-trip is the
// `state` parameter. By HMAC-signing it at the start route — *after* we have
// already verified the user's Firebase token — the callback can trust the
// embedded `uid` because nobody but our server can forge a valid signature.
//
// Without this, an attacker could call the callback URL directly with a state
// containing any victim uid, hijacking their social media connection.

import crypto from "node:crypto";

/**
 * Resolve the HMAC secret. Order of precedence:
 *  1. OAUTH_STATE_SECRET (preferred — clearly named, separate from other roles)
 *  2. STRIPE_WEBHOOK_SECRET (always set in production for Stripe webhooks)
 *  3. LINKEDIN_CLIENT_SECRET (set wherever LinkedIn integration runs)
 *
 * Throws in production if none of these is available — better to fail fast at
 * deploy time than to ship with a degraded signing key.
 */
function resolveSecret(): string {
  const candidates = [
    process.env.OAUTH_STATE_SECRET,
    process.env.STRIPE_WEBHOOK_SECRET,
    process.env.LINKEDIN_CLIENT_SECRET,
  ];
  for (const c of candidates) {
    if (c && c.length >= 16) return c;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "OAuth state signing secret missing — set OAUTH_STATE_SECRET (or STRIPE_WEBHOOK_SECRET / LINKEDIN_CLIENT_SECRET)"
    );
  }
  // Dev-only fallback. The signature is still consistent across one process
  // lifetime, so OAuth round-trips work, but nothing depends on it being
  // unguessable in dev.
  return "dev-only-do-not-use-in-production";
}

const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes — generous for slow OAuth UX

/**
 * Sign an arbitrary JSON-serializable payload and return a compact base64url
 * string. The payload is enriched with `iat` (issued-at) so the verifier can
 * reject stale states even if an attacker captures a valid one.
 */
export function signOAuthState(payload: Record<string, unknown>): string {
  const enriched = { ...payload, iat: Date.now() };
  const body = Buffer.from(JSON.stringify(enriched)).toString("base64url");
  const sig = crypto
    .createHmac("sha256", resolveSecret())
    .update(body)
    .digest("base64url");
  return `${body}.${sig}`;
}

/**
 * Verify a signed state and return the original payload (with `iat`).
 * Returns `null` on any failure: malformed input, bad signature, expired,
 * or unparseable JSON. Callers must reject the request when this returns
 * null — there is no recovery path.
 */
export function verifyOAuthState<T extends Record<string, unknown>>(
  state: string | null | undefined
): (T & { iat: number }) | null {
  if (!state || typeof state !== "string") return null;
  const parts = state.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  if (!body || !sig) return null;

  const expected = crypto
    .createHmac("sha256", resolveSecret())
    .update(body)
    .digest("base64url");

  // Constant-time comparison — protects against timing attacks on the
  // signature byte-by-byte.
  let sigBuf: Buffer;
  let expBuf: Buffer;
  try {
    sigBuf = Buffer.from(sig, "base64url");
    expBuf = Buffer.from(expected, "base64url");
  } catch {
    return null;
  }
  if (sigBuf.length !== expBuf.length) return null;
  if (!crypto.timingSafeEqual(sigBuf, expBuf)) return null;

  let payload: T & { iat: number };
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString());
  } catch {
    return null;
  }
  if (typeof payload?.iat !== "number") return null;
  if (Date.now() - payload.iat > STATE_TTL_MS) return null;
  return payload;
}
