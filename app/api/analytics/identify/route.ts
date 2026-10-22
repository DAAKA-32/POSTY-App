import { NextRequest, NextResponse } from "next/server";
import { adminDb, isAdminInitialized } from "@/lib/db/firebase-admin";
import { rateLimit, getClientIp } from "@/lib/api/rate-limit";
import { identifySchema } from "@/lib/analytics/events";
import { recordServerEvent } from "@/lib/analytics/ingest";
import { optionalUid, readJsonLimited } from "@/lib/analytics/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** An account older than this is a login, not a signup we can attribute. */
const SIGNUP_WINDOW_MS = 48 * 60 * 60 * 1000;

/**
 * Called by the browser right after account creation. The browser only
 * supplies the pseudonymous visitor id and (optionally) the plan it last
 * clicked; whether a signup REALLY happened is decided here:
 *   - a verified ID token is required (uid is never taken from the body)
 *   - users/{uid} must exist and have been created within 48 h
 * Result is `signup_completed`, idempotent per uid (`signup_<uid>`), linked
 * to the visitor's first-touch attribution when a visitor doc exists.
 *
 * Works without analytics consent too: then no vid is sent, and the signup
 * is counted as an unattributed account creation (an operational count,
 * not behavioural tracking).
 */
export async function POST(request: NextRequest) {
  const ack = () => new NextResponse(null, { status: 204 });
  if (!isAdminInitialized() || !adminDb) return ack();

  const rl = rateLimit(getClientIp(request), {
    namespace: "analytics-identify",
    limit: 20,
    windowMs: 60 * 1000,
  });
  if (!rl.allowed) return ack();

  const uid = await optionalUid(request);
  if (!uid) return ack();

  const raw = (await readJsonLimited(request, 1024)) ?? {};
  const parsed = identifySchema.safeParse(raw);
  const body = parsed.success ? parsed.data : {};

  try {
    const userDoc = await adminDb.collection("users").doc(uid).get();
    if (!userDoc.exists) return ack();

    const created = userDoc.get("createdAt");
    const createdMs: number | null =
      typeof created?.toMillis === "function" ? created.toMillis() : null;
    // createdAt is a server timestamp: if it's still pending (null) the
    // account is brand new by definition.
    const isRecent = createdMs === null || Date.now() - createdMs <= SIGNUP_WINDOW_MS;
    if (!isRecent) return ack();

    await recordServerEvent(adminDb, {
      eventId: `signup_${uid}`,
      name: "signup_completed",
      uid,
      vid: body.vid,
      plan: body.planIntent,
    });
  } catch (err) {
    console.error("[analytics/identify] failed", err);
  }
  return ack();
}
