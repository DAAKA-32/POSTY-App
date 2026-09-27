import { NextRequest, NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { requireAdmin } from "@/lib/admin";
import { adminDb } from "@/lib/db/firebase-admin";
import { VERDICT_LABELS, diagnoseScheduledPost, isHeartbeatStale } from "@/lib/scheduling/diagnosis";

/**
 * GET /api/admin/scheduler-health[?postId=…]
 *
 * One call answers "why wasn't this post published?": the scheduler
 * heartbeat (is the cron running, is its config valid), counts per status,
 * overdue posts, the recent problems with their real error, and — with
 * `postId` — the full attempt history of one post plus a verdict.
 */

const STATUSES = ["pending", "processing", "retrying", "published", "failed", "cancelled"] as const;

const ms = (value: unknown): number | null =>
  value && typeof (value as Timestamp).toMillis === "function" ? (value as Timestamp).toMillis() : null;

function summarize(id: string, data: Record<string, unknown>, lastRunAtMs: number | null, nowMs: number) {
  const lastError = (data.lastError ?? null) as Record<string, unknown> | null;
  const verdict = diagnoseScheduledPost(
    {
      status: String(data.status ?? ""),
      scheduledAtMs: ms(data.scheduledAt),
      errorCode: typeof lastError?.code === "string" ? lastError.code : null,
      reconciled: data.reconciled === true,
    },
    { lastRunAtMs },
    nowMs,
  );
  return {
    id,
    userId: data.userId ?? null,
    platform: data.platform ?? null,
    status: data.status ?? null,
    verdict,
    verdictLabel: VERDICT_LABELS[verdict],
    scheduledAt: ms(data.scheduledAt),
    updatedAt: ms(data.updatedAt),
    attemptCount: data.attemptCount ?? 0,
    nextAttemptAt: ms(data.nextAttemptAt),
    externalPostId: data.externalPostId ?? null,
    lastError: lastError
      ? {
          code: lastError.code ?? null,
          detail: lastError.detail ?? null,
          httpStatus: lastError.httpStatus ?? null,
          ambiguous: lastError.ambiguous ?? false,
          at: ms(lastError.at),
        }
      : null,
    legacyFailureReason: lastError ? null : (data.failureReason ?? null),
  };
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;
  if (!adminDb) return NextResponse.json({ error: "Database unavailable" }, { status: 503 });

  const nowMs = Date.now();
  const posts = adminDb.collection("scheduledPosts");
  const healthSnap = await adminDb.doc("systemHealth/scheduler").get();
  const health = healthSnap.data() ?? {};
  const lastRunAtMs = ms(health.lastRunAt);
  const heartbeat = {
    lastRunAt: lastRunAtMs,
    lastRunId: health.lastRunId ?? null,
    lastRunDurationMs: health.lastRunDurationMs ?? null,
    lastRunStats: health.lastRunStats ?? null,
    lastRunError: health.lastRunError ?? null,
    config: health.config ?? null,
    stale: isHeartbeatStale({ lastRunAtMs }, nowMs),
  };

  const postId = request.nextUrl.searchParams.get("postId");
  if (postId) {
    const snap = await posts.doc(postId).get();
    if (!snap.exists) return NextResponse.json({ error: "not_found", heartbeat }, { status: 404 });
    const data = snap.data() as Record<string, unknown>;
    const attempts = Array.isArray(data.attempts)
      ? (data.attempts as Array<Record<string, unknown>>).map((a) => ({
          ...a,
          startedAt: ms(a.startedAt),
          finishedAt: ms(a.finishedAt),
        }))
      : [];
    return NextResponse.json({ heartbeat, post: { ...summarize(snap.id, data, lastRunAtMs, nowMs), attempts } });
  }

  const [counts, overdueSnap, problemSnap] = await Promise.all([
    Promise.all(STATUSES.map(async (s) => [s, (await posts.where("status", "==", s).count().get()).data().count] as const)),
    posts
      .where("status", "==", "pending")
      .where("scheduledAt", "<=", Timestamp.fromMillis(nowMs - 5 * 60_000))
      .limit(50)
      .get(),
    posts.where("status", "in", ["failed", "retrying", "processing"]).limit(200).get(),
  ]);

  const problems = problemSnap.docs
    .map((d) => summarize(d.id, d.data() as Record<string, unknown>, lastRunAtMs, nowMs))
    .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
    .slice(0, 50);

  return NextResponse.json({
    now: nowMs,
    heartbeat,
    counts: Object.fromEntries(counts),
    overdue: overdueSnap.docs.map((d) => summarize(d.id, d.data() as Record<string, unknown>, lastRunAtMs, nowMs)),
    problems,
  });
}
