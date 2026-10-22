import { NextRequest, NextResponse } from "next/server";
import { adminDb, isAdminInitialized } from "@/lib/db/firebase-admin";
import { rateLimit, getClientIp } from "@/lib/api/rate-limit";
import {
  clientEventSchema,
  normalizePath,
  trustOf,
  type AnalyticsEventName,
} from "@/lib/analytics/events";
import { ingestEvent } from "@/lib/analytics/ingest";
import {
  countryOf,
  isLikelyBot,
  optionalUid,
  readJsonLimited,
} from "@/lib/analytics/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Event ingestion for the browser tracker.
 *
 * Always answers 204 on every outcome (accepted, rejected, dropped, db down)
 * so the endpoint leaks nothing about why an event was refused and the
 * tracker never has to handle errors. The only non-204 is 413/429 hygiene.
 *
 * Trust rules (see lib/analytics/events.ts):
 *  - anonymous callers may only send CLIENT_EVENTS
 *  - CLIENT_AUTHED_EVENTS require a verified Firebase ID token
 *  - SERVER_EVENTS (signup, checkout, subscription, payment…) are refused
 *    here outright — only our own backend can emit them
 */
export async function POST(request: NextRequest) {
  const ack = () => new NextResponse(null, { status: 204 });

  if (!isAdminInitialized() || !adminDb) return ack();
  if (isLikelyBot(request)) return ack();

  const rl = rateLimit(getClientIp(request), {
    namespace: "analytics-event",
    limit: 120,
    windowMs: 60 * 1000,
  });
  if (!rl.allowed) return ack();

  const raw = await readJsonLimited(request, 4096);
  if (raw === null) return ack();

  const parsed = clientEventSchema.safeParse(raw);
  if (!parsed.success) return ack();
  const e = parsed.data;

  // Per-visitor cap on top of the per-IP one (shared NATs, scripted vids).
  const perVid = rateLimit(e.vid, {
    namespace: "analytics-event-vid",
    limit: 90,
    windowMs: 60 * 1000,
  });
  if (!perVid.allowed) return ack();

  const trust = trustOf(e.name);
  if (trust !== "client" && trust !== "client_authed") return ack();

  let uid: string | undefined;
  if (trust === "client_authed") {
    const verified = await optionalUid(request);
    if (!verified) return ack();
    uid = verified;
  } else {
    // Anonymous events still record whether the visitor is signed in, but
    // only from a verified token — never from a client claim.
    uid = (await optionalUid(request)) ?? undefined;
  }

  try {
    await ingestEvent(adminDb, {
      eventId: e.eventId,
      name: e.name as AnalyticsEventName,
      ts: Date.now(), // server clock is authoritative; client time is ignored
      trust,
      vid: e.vid,
      sid: e.sid,
      uid,
      path: normalizePath(e.path),
      plan: e.plan,
      interval: e.interval,
      props: e.props,
      touch: e.touch,
      country: countryOf(request),
    });
  } catch (err) {
    console.error("[analytics/event] ingest failed", err);
  }
  return ack();
}
