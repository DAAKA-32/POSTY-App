/**
 * Strategist server-only access checks.
 *
 * Split from `./access.ts` so the client bundle never reaches firestore-admin
 * (which requires `child_process`, a node-only module). Anything that touches
 * Firebase Admin lives here; the client-safe email allowlist stays in
 * `./access.ts`.
 *
 * Only API routes should import from this file.
 */

import { getLinkedInConnectionAdmin } from "@/lib/db/firestore-admin";

/**
 * Server-side check: does the user have an active LinkedIn connection?
 *
 * Reused by every Strategist API route. Defined here (and not inline in each
 * route) to keep the gating logic in one place — same pattern as
 * isStrategistAllowedForEmail. Returns a boolean so the caller decides how
 * to render the refusal (JSON shape, message, status).
 *
 * "Active" = connection doc exists AND has an accessToken. We deliberately
 * don't validate the token freshness server-side (LinkedIn doesn't expose a
 * cheap introspection endpoint) — a stale token surfaces as a publish-time
 * error, not at Strategist gate time.
 */
export async function hasLinkedInConnected(userId: string): Promise<boolean> {
  try {
    const conn = await getLinkedInConnectionAdmin(userId);
    return !!conn?.accessToken;
  } catch (err) {
    console.warn("[strategist/access-server] hasLinkedInConnected error:", err);
    return false;
  }
}
