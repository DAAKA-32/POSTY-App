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

import { adminDb } from "@/lib/db/firebase-admin";
import { getLinkedInConnectionAdmin } from "@/lib/db/firestore-admin";
import { strategistAccessFromUserDoc } from "./access";

/**
 * Server-side check: may this user use the Strategist? (Pro/Max plan, founder
 * or gift account, or allowlisted email — see ./access.ts.) THE gate: the
 * client only decides what to show.
 *
 * Reads `users/{uid}`; fails CLOSED (false) on any error or when the Admin SDK
 * is not initialised, like `hasLinkedInConnected`.
 */
export async function hasStrategistAccess(
  userId: string,
  authEmail?: string | null
): Promise<boolean> {
  try {
    if (!adminDb) return false;
    const snap = await adminDb.collection("users").doc(userId).get();
    return strategistAccessFromUserDoc(snap.exists ? snap.data() : null, authEmail);
  } catch (err) {
    console.warn("[strategist/access-server] hasStrategistAccess error:", err);
    return false;
  }
}

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
