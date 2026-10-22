/**
 * Server-side analytics writer (Firestore Admin SDK).
 *
 * Wraps the pure planner (`plan.ts`) with the reads/writes around it:
 *  1. one transaction reads event/visitor/session/user, asks the planner what
 *     to write, and writes the documents — the event doc is created only if
 *     absent, which is what makes retries and duplicate webhooks idempotent;
 *  2. after the commit, the counter increments are applied atomically with
 *     FieldValue.increment (no hot-document transaction contention).
 *
 * Step 2 is a separate write by design: a crash between 1 and 2 under-counts
 * one event in an aggregate, it never double-counts and never blocks a
 * payment webhook. Aggregates are documented as approximate to that degree.
 *
 * Collections (all client-denied in firestore.rules — Admin SDK only):
 *   analytics_events    one doc per event            (13 months, purged daily)
 *   analytics_visitors  pseudonymous visitor state   (13 months, purged daily)
 *   analytics_sessions  per-session attribution      (13 months, purged daily)
 *   analytics_users     uid ↔ cohort/first-touch link (lives with the account)
 *   analytics_daily     UTC day counters (anonymous, no personal data)
 *   analytics_dims      per-day counters by source/campaign/landing/referrer
 *   analytics_admin_audit  sensitive admin actions (exports, journeys)
 */

import {
  FieldValue,
  Timestamp,
  type Firestore,
} from "firebase-admin/firestore";
import { keySlug } from "./attribution";
import {
  planIngest,
  type Counters,
  type DimOp,
  type EventDoc,
  type PlanEvent,
  type PlanResult,
  type SessionDoc,
  type UserDoc,
  type VisitorDoc,
} from "./plan";

export const COL = {
  events: "analytics_events",
  visitors: "analytics_visitors",
  sessions: "analytics_sessions",
  users: "analytics_users",
  daily: "analytics_daily",
  dims: "analytics_dims",
  audit: "analytics_admin_audit",
} as const;

/** `<kind>~<day>~<slug>` — sorts by kind then day, so a date range is one
 *  documentId() range query with no composite index. */
export function dimDocId(kind: string, day: string, key: string): string {
  return `${kind}~${day}~${keySlug(key)}`;
}

/** Dotted counter paths → nested object of FieldValue.increment(n). */
export function nestIncrements(counters: Counters): Record<string, unknown> {
  const root: Record<string, unknown> = {};
  for (const [path, n] of Object.entries(counters)) {
    if (!n) continue;
    const parts = path.split(".");
    let cur = root;
    for (let i = 0; i < parts.length - 1; i++) {
      cur = (cur[parts[i]] ??= {}) as Record<string, unknown>;
    }
    cur[parts[parts.length - 1]] = FieldValue.increment(n);
  }
  return root;
}

function withExpiry<T extends { expireAt: number }>(doc: T) {
  return { ...doc, expireAt: Timestamp.fromMillis(doc.expireAt) };
}

function dimFields(op: DimOp): Record<string, unknown> {
  const base: Record<string, unknown> = {
    day: op.day,
    kind: op.kind,
    key: op.key,
  };
  if (op.kind === "campaign") {
    const [campaign, key] = op.key.split("|");
    const [source, medium] = (key ?? "").split("/");
    Object.assign(base, { campaign, source, medium });
  } else if (op.kind === "source") {
    const [source, medium] = op.key.split("/");
    Object.assign(base, { source, medium });
  }
  return base;
}

export type IngestStatus = "ok" | "duplicate" | "dropped" | "error";

export async function ingestEvent(
  db: Firestore,
  event: PlanEvent
): Promise<{ status: IngestStatus; reason?: string; plan?: PlanResult }> {
  const eventRef = db.collection(COL.events).doc(event.eventId);
  const visitorRef = event.vid ? db.collection(COL.visitors).doc(event.vid) : null;
  const sessionRef =
    event.sid && event.trust !== "server"
      ? db.collection(COL.sessions).doc(event.sid)
      : null;
  const userRef = event.uid ? db.collection(COL.users).doc(event.uid) : null;

  const plan = await db.runTransaction(async (tx) => {
    const [evSnap, vSnap, sSnap, uSnap] = await Promise.all([
      tx.get(eventRef),
      visitorRef ? tx.get(visitorRef) : Promise.resolve(null),
      sessionRef ? tx.get(sessionRef) : Promise.resolve(null),
      userRef ? tx.get(userRef) : Promise.resolve(null),
    ]);

    const result = planIngest(event, {
      eventExists: evSnap.exists,
      visitor: vSnap?.exists ? (vSnap.data() as unknown as VisitorDoc) : undefined,
      session: sSnap?.exists ? (sSnap.data() as unknown as SessionDoc) : undefined,
      user: uSnap?.exists ? (uSnap.data() as unknown as UserDoc) : undefined,
    });
    if (result.status !== "ok" || !result.event) return result;

    tx.create(eventRef, withExpiry(result.event as EventDoc));
    for (const d of result.derived) {
      tx.set(db.collection(COL.events).doc(d.id), withExpiry(d), { merge: true });
    }
    if (visitorRef && result.visitor) tx.set(visitorRef, withExpiry(result.visitor));
    if (sessionRef && result.session) tx.set(sessionRef, withExpiry(result.session));
    if (userRef && result.user) tx.set(userRef, result.user);
    return result;
  });

  if (plan.status !== "ok") {
    return { status: plan.status, reason: plan.reason };
  }
  await applyCounters(db, plan);
  return { status: "ok", plan };
}

async function applyCounters(db: Firestore, plan: PlanResult): Promise<void> {
  const batch = db.batch();
  for (const [day, counters] of Object.entries(plan.daily)) {
    batch.set(
      db.collection(COL.daily).doc(day),
      {
        day,
        updatedAt: FieldValue.serverTimestamp(),
        ...nestIncrements(counters),
      },
      { merge: true }
    );
  }
  for (const op of plan.dims) {
    batch.set(
      db.collection(COL.dims).doc(dimDocId(op.kind, op.day, op.key)),
      {
        ...dimFields(op),
        updatedAt: FieldValue.serverTimestamp(),
        ...nestIncrements(op.counters),
      },
      { merge: true }
    );
  }
  await batch.commit();
}

// ───────────────────────── Server-side recorders ─────────────────────────

export interface ServerEventInput {
  eventId: string;
  name: PlanEvent["name"];
  uid?: string;
  vid?: string;
  plan?: PlanEvent["plan"];
  interval?: string;
  /** Minor units (cents), verified by the payment provider. */
  amount?: number;
  currency?: string;
  ts?: number;
}

/**
 * Record a backend-verified event. NEVER throws: analytics must not be able
 * to fail a Stripe webhook or a checkout. Returns the ingest status for logs
 * and tests.
 */
export async function recordServerEvent(
  db: Firestore | undefined | null,
  input: ServerEventInput
): Promise<IngestStatus> {
  if (!db) return "dropped";
  try {
    const res = await ingestEvent(db, {
      eventId: input.eventId,
      name: input.name,
      ts: input.ts ?? Date.now(),
      trust: "server",
      uid: input.uid,
      vid: input.vid,
      plan: input.plan,
      interval: input.interval,
      amount: input.amount,
      currency: input.currency,
    });
    return res.status;
  } catch (err) {
    console.error("[analytics] recordServerEvent failed", input.name, err);
    return "error";
  }
}

// ───────────────────────── Deletion (GDPR) ─────────────────────────

async function deleteQuery(
  db: Firestore,
  q: FirebaseFirestore.Query
): Promise<number> {
  let total = 0;
  for (;;) {
    const snap = await q.limit(300).get();
    if (snap.empty) return total;
    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    total += snap.size;
    if (snap.size < 300) return total;
  }
}

/**
 * Erase everything the analytics store holds that is tied to this account or
 * its pseudonymous visitor id. Daily/dimension aggregates are anonymous
 * counters and are intentionally left in place.
 */
export async function deleteAnalyticsForUser(
  db: Firestore,
  uid: string
): Promise<{ events: number; sessions: number; visitors: number }> {
  const userRef = db.collection(COL.users).doc(uid);
  const userSnap = await userRef.get();
  const vids = new Set<string>();
  const known = userSnap.data()?.vid;
  if (typeof known === "string") vids.add(known);

  const visitorsByUser = await db
    .collection(COL.visitors)
    .where("userId", "==", uid)
    .get();
  visitorsByUser.docs.forEach((d) => vids.add(d.id));

  let events = await deleteQuery(db, db.collection(COL.events).where("uid", "==", uid));
  let sessions = 0;
  for (const vid of vids) {
    events += await deleteQuery(db, db.collection(COL.events).where("vid", "==", vid));
    sessions += await deleteQuery(db, db.collection(COL.sessions).where("vid", "==", vid));
    await db.collection(COL.visitors).doc(vid).delete();
  }
  await userRef.delete();
  return { events, sessions, visitors: vids.size };
}
