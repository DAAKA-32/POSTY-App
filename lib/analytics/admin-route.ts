/**
 * Shared guard + helpers for every /api/admin/analytics/* route.
 *
 * Authorization is `requireAdmin` (lib/admin.ts): Firebase ID token verified
 * server-side, email_verified required, email on the server-side allowlist,
 * every failure collapsed into an identical 404. Each route calls
 * `guardAdmin` FIRST, before reading any query parameter.
 */

import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { requireAdmin } from "@/lib/admin";
import { adminDb } from "@/lib/db/firebase-admin";
import { rateLimit } from "@/lib/api/rate-limit";
import { COL } from "./ingest";

export type AdminGuard =
  | { ok: true; uid: string; email: string; db: FirebaseFirestore.Firestore }
  | { ok: false; response: NextResponse };

const notFound = () => NextResponse.json({ error: "not_found" }, { status: 404 });

export async function guardAdmin(request: NextRequest): Promise<AdminGuard> {
  const auth = await requireAdmin(request);
  if (auth.error) return { ok: false, response: auth.error };
  if (!adminDb) return { ok: false, response: notFound() };

  const rl = rateLimit(auth.uid, {
    namespace: "admin-analytics",
    limit: 120,
    windowMs: 60_000,
  });
  if (!rl.allowed) {
    return {
      ok: false,
      response: NextResponse.json({ error: "rate_limited" }, { status: 429 }),
    };
  }
  return { ok: true, uid: auth.uid, email: auth.email, db: adminDb };
}

export const noStore = { "Cache-Control": "no-store" } as const;

export function badRequest(message = "invalid_request") {
  return NextResponse.json({ error: message }, { status: 400, headers: noStore });
}

/** Append-only record of sensitive admin actions (exports, journey views). */
export async function auditAdmin(
  db: FirebaseFirestore.Firestore,
  entry: { action: string; uid: string; detail?: Record<string, string | number> }
): Promise<void> {
  try {
    await db.collection(COL.audit).add({
      ...entry,
      at: FieldValue.serverTimestamp(),
      expireAt: new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000),
    });
  } catch (err) {
    console.error("[analytics] audit write failed", err);
  }
}
