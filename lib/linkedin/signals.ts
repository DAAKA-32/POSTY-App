/**
 * Shared LinkedIn API signal helpers for every direct-publish route.
 *
 * The Cloud Function scheduler (`functions/src/index.ts`) has its own copy of
 * these constants/helpers — Firebase Functions is a separate deploy unit with
 * its own tsconfig root and cannot import from this `lib/`. The two copies
 * MUST stay in sync: the whole point is that LinkedIn sees identical
 * headers + warmup behaviour whether a post lands via the scheduled cron or
 * via a direct API call, so the anti-spam pipeline cannot discriminate by
 * signature. If you touch the UA string or the warmup endpoints here, also
 * update `POSTY_LINKEDIN_UA`, `linkedInJsonHeaders`, and `runSelfWarmupPings`
 * in `functions/src/index.ts`.
 */

/** Stable App-identifying User-Agent shared with the scheduler. */
export const POSTY_LINKEDIN_UA =
  "Posty/1.0 (+https://posty.app; scheduled-publisher)";

/** JSON-call headers (ugcPosts, assets registerUpload, socialActions, /v2/me). */
export function linkedInJsonHeaders(accessToken: string): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    "X-Restli-Protocol-Version": "2.0.0",
    "User-Agent": POSTY_LINKEDIN_UA,
    Accept: "application/json",
  };
}

/** Binary-PUT headers for image/video uploads to the LinkedIn-issued uploadUrl. */
export function linkedInBinaryUploadHeaders(
  accessToken: string,
  contentType: string,
  contentLength?: number,
): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": contentType,
    "User-Agent": POSTY_LINKEDIN_UA,
  };
  if (typeof contentLength === "number") {
    headers["Content-Length"] = String(contentLength);
  }
  return headers;
}

/** Read-only authenticated GET headers (used by warmup pings). */
export function linkedInReadHeaders(accessToken: string): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
    "User-Agent": POSTY_LINKEDIN_UA,
    Accept: "application/json",
  };
}

/**
 * Fire-and-forget "author present" footprint right after a publish.
 *
 * The scheduler runs the same two GETs after every scheduled publish so the
 * algorithm sees an active session for the author in the first seconds. We
 * mirror that on the direct flow so the two flows are indistinguishable.
 * Callers MUST NOT await this — the response to the user must not block on
 * LinkedIn read latency.
 */
export async function runSelfWarmupPings(
  accessToken: string,
  shareId: string,
): Promise<void> {
  const headers = linkedInReadHeaders(accessToken);
  // Realistic "see-it-published" lag — humans never refresh in the same ms
  // they hit "post".
  await new Promise<void>((resolve) =>
    setTimeout(resolve, 1500 + Math.floor(Math.random() * 2500)),
  );
  await fetch("https://api.linkedin.com/v2/me", { headers }).catch(() => {});
  const encoded = encodeURIComponent(shareId);
  await fetch(`https://api.linkedin.com/v2/ugcPosts/${encoded}`, { headers }).catch(
    () => {},
  );
}
