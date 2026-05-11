import { NextRequest, NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { requireAdmin } from "@/lib/admin";
import { adminDb } from "@/lib/db/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DAYS_WINDOW = 30;

type DayPoint = {
  day: string;
  pageviews: number;
  pageviewsAuthed: number;
  pageviewsAnon: number;
  uniqueVisitors: number;
  uniqueAuthedVisitors: number;
  uniqueAnonVisitors: number;
  newVisitors: number;
  signups: number;
};

function dayKey(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function readNumber(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  if (!adminDb) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Build the rolling list of day keys (UTC) for the window.
  const today = new Date();
  const dayKeys: string[] = [];
  for (let i = DAYS_WINDOW - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(today.getUTCDate() - i);
    dayKeys.push(dayKey(d));
  }

  // Window start (UTC midnight DAYS_WINDOW-1 days ago) — used to bucket
  // user signups by day.
  const windowStart = new Date(today);
  windowStart.setUTCDate(today.getUTCDate() - (DAYS_WINDOW - 1));
  windowStart.setUTCHours(0, 0, 0, 0);

  try {
    const [analyticsDocs, signupsSnap] = await Promise.all([
      adminDb
        .collection("analytics_daily")
        .where("__name__", ">=", dayKeys[0])
        .where("__name__", "<=", dayKeys[dayKeys.length - 1])
        .get(),
      adminDb
        .collection("users")
        .where("createdAt", ">=", Timestamp.fromDate(windowStart))
        .select("createdAt")
        .get(),
    ]);

    const byDay = new Map<string, Record<string, unknown>>();
    for (const doc of analyticsDocs.docs) {
      byDay.set(doc.id, doc.data());
    }

    const signupsByDay = new Map<string, number>();
    for (const doc of signupsSnap.docs) {
      const created = doc.get("createdAt");
      if (!created) continue;
      const ts =
        created instanceof Timestamp
          ? created.toDate()
          : created?.toDate?.() ?? null;
      if (!ts) continue;
      const k = dayKey(ts);
      signupsByDay.set(k, (signupsByDay.get(k) || 0) + 1);
    }

    const series: DayPoint[] = dayKeys.map((day) => {
      const d = byDay.get(day) || {};
      return {
        day,
        pageviews: readNumber(d.pageviews),
        pageviewsAuthed: readNumber(d.pageviewsAuthed),
        pageviewsAnon: readNumber(d.pageviewsAnon),
        uniqueVisitors: readNumber(d.uniqueVisitors),
        uniqueAuthedVisitors: readNumber(d.uniqueAuthedVisitors),
        uniqueAnonVisitors: readNumber(d.uniqueAnonVisitors),
        newVisitors: readNumber(d.newVisitors),
        signups: signupsByDay.get(day) || 0,
      };
    });

    // Today + last 7 days summaries
    const today0 = series[series.length - 1];
    const last7 = series.slice(-7);
    const totals7 = last7.reduce(
      (acc, p) => {
        acc.pageviews += p.pageviews;
        acc.uniqueVisitors += p.uniqueVisitors;
        acc.uniqueAuthedVisitors += p.uniqueAuthedVisitors;
        acc.uniqueAnonVisitors += p.uniqueAnonVisitors;
        acc.newVisitors += p.newVisitors;
        acc.signups += p.signups;
        return acc;
      },
      {
        pageviews: 0,
        uniqueVisitors: 0,
        uniqueAuthedVisitors: 0,
        uniqueAnonVisitors: 0,
        newVisitors: 0,
        signups: 0,
      }
    );

    return NextResponse.json(
      {
        windowDays: DAYS_WINDOW,
        series,
        today: today0,
        last7,
        totals7,
      },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("[admin/analytics] query failed", error);
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
}
