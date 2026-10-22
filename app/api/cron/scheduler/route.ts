import { NextRequest, NextResponse } from "next/server";
import { rejectUnlessCron } from "@/lib/scheduler/cron-auth";
import { runSchedulerFromVercel, runSeedCommentsFromVercel } from "@/lib/scheduler/vercel-scheduler";

/**
 * Publishes due scheduled posts (all users) + due seed comments.
 *
 * Triggered every ~10 min by the free GitHub Actions workflow
 * .github/workflows/scheduler.yml (Vercel Hobby crons are daily-only, and the
 * Firebase scheduled functions need the paid Blaze plan). Safe to call more
 * often or from several triggers at once: posts are claimed transactionally.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function handle(request: NextRequest) {
  const denied = rejectUnlessCron(request);
  if (denied) return denied;

  const startedAt = Date.now();
  try {
    // Stop starting new network steps 15 s before the function limit.
    const scheduler = await runSchedulerFromVercel(startedAt + (maxDuration - 15) * 1000);
    let seedComments: Record<string, number> | { error: string };
    try {
      seedComments = await runSeedCommentsFromVercel();
    } catch (err) {
      seedComments = { error: err instanceof Error ? err.message : String(err) };
      console.error("[cron/scheduler] seed comments failed:", err);
    }
    return NextResponse.json({ ok: true, ms: Date.now() - startedAt, scheduler, seedComments });
  } catch (err) {
    console.error("[cron/scheduler] tick failed:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "scheduler_failed" },
      { status: 500 }
    );
  }
}

export const GET = handle;
export const POST = handle;
