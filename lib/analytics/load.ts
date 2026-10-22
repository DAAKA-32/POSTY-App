/**
 * Admin-side Firestore readers for the analytics dashboard. Server only.
 *
 * Every read is bounded: the report reads one aggregate doc per day plus the
 * per-day dimension docs inside the range (never the raw event log); the
 * feed reads one page at a time.
 */

import {
  FieldPath,
  Timestamp,
  type Firestore,
} from "firebase-admin/firestore";
import { COL } from "./ingest";
import { buildReport, type Report } from "./report";
import type { DayRange } from "./range";
import { ALL_EVENT_NAMES, PLAN_IDS } from "./events";

const DIM_KINDS = ["source", "campaign", "landing", "referrer"] as const;
const MAX_DIM_DOCS_PER_KIND = 5000;

export async function loadReport(db: Firestore, range: DayRange): Promise<Report & { truncated: boolean }> {
  const startTs = Timestamp.fromDate(new Date(`${range.start}T00:00:00.000Z`));
  const endTs = Timestamp.fromDate(
    new Date(new Date(`${range.end}T00:00:00.000Z`).getTime() + 86_400_000)
  );

  const dailyQ = db
    .collection(COL.daily)
    .where(FieldPath.documentId(), ">=", range.start)
    .where(FieldPath.documentId(), "<=", range.end)
    .get();

  const dimQs = DIM_KINDS.map((kind) =>
    db
      .collection(COL.dims)
      .where(FieldPath.documentId(), ">=", `${kind}~${range.start}~`)
      .where(FieldPath.documentId(), "<=", `${kind}~${range.end}~`)
      .limit(MAX_DIM_DOCS_PER_KIND)
      .get()
  );

  // Accounts actually created in the period, regardless of analytics consent.
  const accountsQ = db
    .collection("users")
    .where("createdAt", ">=", startTs)
    .where("createdAt", "<", endTs)
    .count()
    .get()
    .then((s) => s.data().count)
    .catch(() => null);

  const [dailySnap, accountsCreated, ...dimSnaps] = await Promise.all([
    dailyQ,
    accountsQ,
    ...dimQs,
  ]);

  const dims = dimSnaps.flatMap((s) => s.docs.map((d) => d.data()));
  const truncated = dimSnaps.some((s) => s.size >= MAX_DIM_DOCS_PER_KIND);
  const report = buildReport({
    range,
    daily: dailySnap.docs.map((d) => ({ day: d.id, ...d.data() })),
    dims,
    accountsCreated,
  });
  return { ...report, truncated };
}

// ───────────────────────── Activity feed ─────────────────────────

export interface FeedFilters {
  range: DayRange;
  name?: string;
  source?: string; // "<source>/<medium>" or just "<source>"
  plan?: string;
  registered?: "yes" | "no";
  status?: "ok" | "failed";
  cursor?: string; // "<ts>_<eventId>"
  limit?: number;
}

export interface FeedRow {
  id: string;
  name: string;
  ts: number;
  source: string | null;
  campaign: string | null;
  path: string | null;
  plan: string | null;
  status: "ok" | "failed";
  registered: boolean;
  /** Masked pseudonymous references — never the raw uid or email. */
  visitor: string | null;
  account: string | null;
  sid: string | null;
  amount: number | null;
  currency: string | null;
}

const mask = (id: string | undefined, prefix: string) =>
  id ? `${prefix}_${id.slice(0, 6)}…` : null;

export function toFeedRow(id: string, d: Record<string, unknown>): FeedRow {
  return {
    id,
    name: String(d.name),
    ts: typeof d.ts === "number" ? d.ts : 0,
    source: typeof d.key === "string" ? d.key : null,
    campaign: typeof d.campaign === "string" ? d.campaign : null,
    path: typeof d.path === "string" ? d.path : null,
    plan: typeof d.plan === "string" ? d.plan : null,
    status: d.status === "failed" ? "failed" : "ok",
    registered: d.registered === true,
    visitor: mask(d.vid as string | undefined, "v"),
    account: mask(d.uid as string | undefined, "u"),
    sid: typeof d.sid === "string" ? d.sid : null,
    amount: typeof d.amount === "number" ? d.amount : null,
    currency: typeof d.currency === "string" ? d.currency : null,
  };
}

export function feedMatches(row: FeedRow, f: FeedFilters): boolean {
  if (f.source) {
    const want = f.source.toLowerCase();
    const have = (row.source ?? "").toLowerCase();
    if (!(have === want || have.startsWith(`${want}/`))) return false;
  }
  if (f.plan && row.plan !== f.plan) return false;
  if (f.registered === "yes" && !row.registered) return false;
  if (f.registered === "no" && row.registered) return false;
  if (f.status && row.status !== f.status) return false;
  return true;
}

export async function loadFeed(
  db: Firestore,
  f: FeedFilters
): Promise<{ rows: FeedRow[]; nextCursor: string | null }> {
  const limit = Math.min(Math.max(f.limit ?? 50, 1), 100);
  const startMs = new Date(`${f.range.start}T00:00:00.000Z`).getTime();
  const endMs = new Date(`${f.range.end}T00:00:00.000Z`).getTime() + 86_400_000;

  const rows: FeedRow[] = [];
  let cursor: [number, string] | null = null;
  if (f.cursor) {
    const i = f.cursor.indexOf("_");
    const ts = Number(f.cursor.slice(0, i));
    if (Number.isFinite(ts) && i > 0) cursor = [ts, f.cursor.slice(i + 1)];
  }

  // Name is the only filter pushed to Firestore (index: name + ts). The
  // rest are applied to each fetched page, with a bounded number of pages
  // so a rare filter can't turn into a full scan.
  const MAX_PAGES = 6;
  let exhausted = false;
  let last: [number, string] | null = cursor;

  for (let page = 0; page < MAX_PAGES && rows.length < limit && !exhausted; page++) {
    let q: FirebaseFirestore.Query = db
      .collection(COL.events)
      .where("ts", ">=", startMs)
      .where("ts", "<", endMs);
    if (f.name && (ALL_EVENT_NAMES as readonly string[]).includes(f.name)) {
      q = q.where("name", "==", f.name);
    }
    q = q.orderBy("ts", "desc").orderBy(FieldPath.documentId(), "desc");
    if (last) q = q.startAfter(last[0], last[1]);
    const snap = await q.limit(limit * 2).get();
    if (snap.size < limit * 2) exhausted = true;
    for (const doc of snap.docs) {
      last = [doc.get("ts") as number, doc.id];
      const row = toFeedRow(doc.id, doc.data());
      if (feedMatches(row, f)) rows.push(row);
      if (rows.length >= limit) break;
    }
    if (snap.empty) exhausted = true;
  }

  const more = !exhausted || rows.length >= limit;
  return {
    rows,
    nextCursor: more && last ? `${last[0]}_${last[1]}` : null,
  };
}

export async function loadJourney(db: Firestore, sid: string) {
  const [eventsSnap, sessionSnap] = await Promise.all([
    db.collection(COL.events).where("sid", "==", sid).orderBy("ts", "asc").limit(200).get(),
    db.collection(COL.sessions).doc(sid).get(),
  ]);
  const s = sessionSnap.data();
  return {
    sid,
    session: s
      ? {
          startedAt: s.startedAt as number,
          lastAt: s.lastAt as number,
          pageViews: s.pageViews as number,
          engaged: !!s.engaged,
          country: (s.country as string | undefined) ?? null,
          source: (s.touch?.key as string | undefined) ?? null,
          campaign: (s.touch?.campaign as string | undefined) ?? null,
          landing: (s.touch?.landing as string | undefined) ?? null,
          referrerDomain: (s.touch?.referrerDomain as string | undefined) ?? null,
          registered: !!s.userId,
        }
      : null,
    events: eventsSnap.docs.map((d) => toFeedRow(d.id, d.data())),
  };
}

export const FEED_PLAN_FILTERS = PLAN_IDS;
