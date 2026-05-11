import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { adminDb, isAdminInitialized } from "@/lib/db/firebase-admin";
import { rateLimit, getClientIp } from "@/lib/api/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VID_REGEX = /^[A-Za-z0-9-]{8,64}$/;

function dayKey(): string {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export async function POST(request: NextRequest) {
  // Always return 204 — analytics is best-effort and we don't want to leak
  // info about why a track failed (validation, auth, db) to the client.
  const ack = () => new NextResponse(null, { status: 204 });

  if (!isAdminInitialized() || !adminDb) return ack();

  // Drop on the floor (still ack 204) when the per-IP burst is exceeded so an
  // attacker can't inflate pageview/unique counters. 60 events/min is far above
  // anything a real user would emit, but caps scripted spam.
  const rl = rateLimit(getClientIp(request), {
    namespace: "analytics-track",
    limit: 60,
    windowMs: 60 * 1000,
  });
  if (!rl.allowed) return ack();

  let body: {
    vid?: unknown;
    path?: unknown;
    isFirstEver?: unknown;
    isFirstOfDay?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return ack();
  }

  const vid = typeof body.vid === "string" ? body.vid : "";
  if (!VID_REGEX.test(vid)) return ack();

  const path = typeof body.path === "string" ? body.path.slice(0, 32) : "/";
  const isFirstEver = body.isFirstEver === true;
  const isFirstOfDay = body.isFirstOfDay === true;

  // Determine auth state from a Firebase ID token (server-verified — never
  // trust a client claim). Failures fall back to "anonymous".
  let isAuthed = false;
  const authHeader = request.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice("Bearer ".length).trim();
    if (token) {
      try {
        const decoded = await getAuth().verifyIdToken(token);
        isAuthed = !!decoded?.uid;
      } catch {
        isAuthed = false;
      }
    }
  }

  const day = dayKey();
  const ref = adminDb.collection("analytics_daily").doc(day);

  const updates: Record<string, unknown> = {
    day,
    pageviews: FieldValue.increment(1),
    [isAuthed ? "pageviewsAuthed" : "pageviewsAnon"]: FieldValue.increment(1),
    [`pathHits.${path.replace(/[^a-zA-Z0-9_/-]/g, "")}`]:
      FieldValue.increment(1),
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (isFirstOfDay) {
    updates.uniqueVisitors = FieldValue.increment(1);
    updates[isAuthed ? "uniqueAuthedVisitors" : "uniqueAnonVisitors"] =
      FieldValue.increment(1);
  }
  if (isFirstEver) {
    updates.newVisitors = FieldValue.increment(1);
  }

  try {
    await ref.set(updates, { merge: true });
  } catch (err) {
    console.error("[analytics/track] write failed", err);
  }

  return ack();
}
