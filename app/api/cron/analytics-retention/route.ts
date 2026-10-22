import { NextRequest, NextResponse } from "next/server";
import { rejectUnlessCron } from "@/lib/scheduler/cron-auth";
import { adminDb } from "@/lib/db/firebase-admin";
import { purgeExpired } from "@/lib/analytics/retention";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Daily purge of analytics records past their 13-month retention
 * (see lib/analytics/retention.ts). Triggered by Vercel Cron
 * (vercel.json); same CRON_SECRET check as the other cron endpoints.
 */
async function handle(request: NextRequest) {
  const denied = rejectUnlessCron(request);
  if (denied) return denied;
  if (!adminDb) {
    return NextResponse.json({ ok: false, error: "db_unavailable" }, { status: 503 });
  }

  const startedAt = Date.now();
  try {
    const result = await purgeExpired(adminDb, {
      // Stop starting new batches 10 s before the function limit.
      deadline: startedAt + (maxDuration - 10) * 1000,
    });
    return NextResponse.json({ ok: true, ms: Date.now() - startedAt, ...result });
  } catch (err) {
    console.error("[cron/analytics-retention] failed", err);
    return NextResponse.json({ ok: false, error: "purge_failed" }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
