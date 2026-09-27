import { LeaseLostError, PublishError, toPublishError } from "./errors";
import type { SchedulerLogger } from "./logger";
import type { AttemptResult, FinalizeDecision } from "./policy";
import { isTemporaryScheduledUpload } from "./publishers/media";
import type { PlatformDeps, PublishContext, PublishSuccess, Publisher } from "./publishers/types";
import type { ClaimedPost, DueRef, SchedulerStore } from "./store";
import { isSchedulerPlatform, type ScheduledPostImage, type SchedulerPlatform } from "./types";

export const DEFAULT_BATCH_LIMIT = 25;
/** Due posts are spread over this window so they never hit an API in lockstep. */
export const SPREAD_WINDOW_MS = 45_000;
export const LEASE_RECOVERY_LIMIT = 50;
/** Upper bound on waiting for fire-and-forget work (warm-up pings) at the end of a run. */
export const BACKGROUND_WAIT_MS = 15_000;

export interface SeedCommentRequest {
  scheduledPostId: string;
  userId: string;
  parentPostUrn: string;
  parentPostUrl: string | null;
  actorUrn: string;
  text: string;
  delayMinutes: number;
}

export interface SchedulerDeps {
  store: SchedulerStore;
  publishers: Partial<Record<SchedulerPlatform, Publisher>>;
  platform: Omit<PlatformDeps, "background">;
  /** Idempotent per scheduled post. */
  enqueueSeedComment(request: SeedCommentRequest): Promise<"created" | "exists">;
  deleteStorageFile(storagePath: string): Promise<void>;
  now(): number;
  sleep(ms: number): Promise<void>;
  random(): number;
  log: SchedulerLogger;
  runId: string;
  /** Absolute epoch ms after which no new network step may start. */
  deadlineMs: number;
  /** Surfaced in logs + heartbeat, e.g. { encryptionKeyStatus: "missing" }. */
  configHealth: Record<string, string>;
  batchLimit?: number;
  spreadWindowMs?: number;
}

export interface TickStats {
  recovered: number;
  due: number;
  claimed: number;
  skipped: number;
  published: number;
  reconciled: number;
  retryScheduled: number;
  failed: number;
  leaseLost: number;
  errors: number;
}

function emptyStats(): TickStats {
  return {
    recovered: 0,
    due: 0,
    claimed: 0,
    skipped: 0,
    published: 0,
    reconciled: 0,
    retryScheduled: 0,
    failed: 0,
    leaseLost: 0,
    errors: 0,
  };
}

export function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Start offsets inside the spread window: a lone post gets a small natural
 * delay (never exactly HH:MM:00), several posts get one jittered slot each.
 */
export function spreadOffsets(count: number, windowMs: number, random: () => number): number[] {
  if (count <= 0) return [];
  if (count === 1) return [1000 + Math.floor(random() * 5000)];
  const slot = windowMs / count;
  return Array.from({ length: count }, (_, i) => Math.max(0, Math.floor(i * slot + (random() - 0.5) * slot * 0.8)));
}

const str = (value: unknown): string | null => (typeof value === "string" && value.length > 0 ? value : null);

function isImage(value: unknown): value is ScheduledPostImage {
  return !!value && typeof value === "object" && typeof (value as ScheduledPostImage).storagePath === "string";
}

function iso(ms: number | null): string | null {
  return ms === null ? null : new Date(ms).toISOString();
}

async function settleWithin(tasks: Promise<unknown>[], ms: number): Promise<void> {
  if (tasks.length === 0) return;
  let timer: ReturnType<typeof setTimeout> | undefined;
  await Promise.race([
    Promise.allSettled(tasks),
    new Promise<void>((resolve) => {
      timer = setTimeout(resolve, ms);
    }),
  ]);
  if (timer) clearTimeout(timer);
}

/** One scheduler tick. Never throws: every failure is logged and counted. */
export async function runSchedulerTick(deps: SchedulerDeps): Promise<TickStats> {
  const { log, runId } = deps;
  const startedAtMs = deps.now();
  const stats = emptyStats();
  const background: Promise<unknown>[] = [];
  const platformDeps: PlatformDeps = {
    ...deps.platform,
    background: (task) => {
      background.push(task.catch(() => undefined));
    },
  };

  log.log("INFO", "scheduler.tick_started", { runId, ...deps.configHealth });
  if (deps.configHealth.encryptionKeyStatus && deps.configHealth.encryptionKeyStatus !== "ok") {
    log.log("ERROR", "scheduler.config_invalid", {
      runId,
      encryptionKeyStatus: deps.configHealth.encryptionKeyStatus,
      hint:
        "Set TOKEN_ENCRYPTION_KEY in functions/.env.<projectId> to the exact value used by the Next.js app (Vercel), then redeploy. Every encrypted token fails to decrypt until then.",
    });
  }

  const contextFor = (post: ClaimedPost): PublishContext => {
    const d = post.data;
    const organizationUrn = str(d.organizationUrn);
    return {
      postId: post.id,
      userId: str(d.userId) ?? "",
      platform: post.state.platform as SchedulerPlatform,
      content: typeof d.content === "string" ? d.content : "",
      images: Array.isArray(d.images) ? d.images.filter(isImage) : [],
      visibility: d.visibility === "CONNECTIONS" ? "CONNECTIONS" : "PUBLIC",
      organizationUrn: organizationUrn && organizationUrn.startsWith("urn:li:organization:") ? organizationUrn : null,
      reddit: { subreddit: str(d.redditSubreddit), title: str(d.redditTitle) },
      attempt: post.attempt,
      priorSendUncertain: post.state.priorSendUncertain,
      resumeState: post.state.resumeState,
      deadlineMs: deps.deadlineMs,
      beforeSend: async (resumeState) => {
        const owned = await deps.store.markSending(post.id, runId, deps.now(), resumeState);
        if (!owned) throw new LeaseLostError(post.id);
      },
    };
  };

  const afterPublish = async (post: ClaimedPost, ctx: PublishContext, success: PublishSuccess): Promise<void> => {
    const seed = post.data.seedComment as { enabled?: unknown; text?: unknown; delayMinutes?: unknown } | undefined;
    const seedText = typeof seed?.text === "string" ? seed.text.trim() : "";
    if (ctx.platform === "linkedin" && seed?.enabled === true && seedText.length >= 10 && success.linkedinSeed) {
      try {
        const outcome = await deps.enqueueSeedComment({
          scheduledPostId: post.id,
          userId: ctx.userId,
          parentPostUrn: success.linkedinSeed.shareUrn,
          parentPostUrl: success.publishedUrl,
          actorUrn: success.linkedinSeed.actorUrn,
          text: seedText,
          delayMinutes: Number(seed.delayMinutes) || 5,
        });
        log.log("INFO", "scheduler.seed_comment_enqueued", { runId, postId: post.id, outcome });
      } catch (err) {
        log.log("WARNING", "scheduler.seed_comment_enqueue_failed", {
          runId,
          postId: post.id,
          detail: err instanceof Error ? err.message : String(err),
        });
      }
    }

    // Only files uploaded for this very post are temporary; library images
    // (e.g. Strategist visuals) are never deleted.
    const temporary = ctx.images.filter((img) => isTemporaryScheduledUpload(img, ctx.userId, post.id));
    for (const img of temporary) {
      try {
        await deps.deleteStorageFile(img.storagePath);
      } catch (err) {
        log.log("WARNING", "scheduler.image_cleanup_failed", {
          runId,
          postId: post.id,
          storagePath: img.storagePath,
          detail: err instanceof Error ? err.message : String(err),
        });
      }
    }
  };

  const processOne = async (ref: DueRef, offsetMs: number): Promise<void> => {
    const claim = await deps.store.claim(ref.id, deps.now(), runId);
    if (claim.kind === "skipped") {
      stats.skipped++;
      log.log("INFO", "scheduler.claim_skipped", {
        runId,
        postId: ref.id,
        reason: claim.reason,
        // "already_processing" / "terminal" = another run got there first:
        // the duplicate execution was prevented by the transactional claim.
        duplicatePrevented: claim.reason === "already_processing" || claim.reason === "terminal",
      });
      return;
    }
    if (claim.kind === "failed_without_attempt") {
      stats.failed++;
      log.log("ERROR", "scheduler.post_failed", { runId, postId: ref.id, code: claim.code, attempt: 0 });
      return;
    }

    stats.claimed++;
    const post = claim.post;
    const ctx = contextFor(post);
    const fields = {
      runId,
      postId: post.id,
      userId: ctx.userId,
      platform: post.state.platform,
      attempt: post.attempt,
      kind: ref.kind,
      scheduledAt: iso(post.state.scheduledAtMs),
      priorSendUncertain: ctx.priorSendUncertain,
      imageCount: ctx.images.length,
      contentLength: ctx.content.length,
    };

    if (offsetMs > 0) await deps.sleep(offsetMs);
    const attemptStartedAtMs = deps.now();
    log.log("INFO", "scheduler.attempt_started", { ...fields, latenessMs: attemptStartedAtMs - (post.state.scheduledAtMs ?? attemptStartedAtMs) });

    let result: AttemptResult;
    let success: PublishSuccess | null = null;
    try {
      const publisher = isSchedulerPlatform(ctx.platform) ? deps.publishers[ctx.platform] : undefined;
      if (!publisher) throw new PublishError({ code: "UNSUPPORTED_PLATFORM", platform: post.state.platform || "unknown" });
      if (!ctx.userId) throw new PublishError({ code: "INVALID_POST_DATA", platform: ctx.platform, detail: "userId missing" });
      success = await publisher(ctx, platformDeps);
      result = {
        kind: "success",
        externalPostId: success.externalPostId,
        publishedUrl: success.publishedUrl,
        reconciled: success.reconciled,
        warnings: success.warnings,
      };
    } catch (err) {
      if (err instanceof LeaseLostError) {
        stats.leaseLost++;
        log.log("WARNING", "scheduler.lease_lost_before_send", fields);
        return;
      }
      const error = toPublishError(err, post.state.platform || "unknown");
      result = {
        kind: "error",
        error: {
          code: error.code,
          platform: error.platform,
          retryable: error.retryable,
          ambiguous: error.ambiguous,
          httpStatus: error.httpStatus,
          detail: error.detail,
          retryAfterMs: error.retryAfterMs,
        },
      };
    }

    let decision: FinalizeDecision;
    try {
      decision = await deps.store.finalize(post.id, runId, deps.now(), attemptStartedAtMs, result, deps.random);
    } catch (err) {
      // The attempt's outcome is logged in full; the lease recovery will
      // reconcile the post (a success is re-detected, not re-published on
      // LinkedIn/Threads; other platforms end as OUTCOME_UNKNOWN).
      stats.errors++;
      log.log("ERROR", "scheduler.finalize_failed", {
        ...fields,
        result: result.kind,
        code: result.kind === "error" ? result.error.code : null,
        externalPostId: result.kind === "success" ? result.externalPostId : null,
        detail: err instanceof Error ? err.message : String(err),
      });
      return;
    }

    const durationMs = deps.now() - attemptStartedAtMs;
    switch (decision.kind) {
      case "published":
        stats.published++;
        if (result.kind === "success" && result.reconciled) stats.reconciled++;
        log.log("INFO", "scheduler.post_published", {
          ...fields,
          durationMs,
          externalPostId: result.kind === "success" ? result.externalPostId : null,
          publishedUrl: result.kind === "success" ? result.publishedUrl : null,
          reconciled: result.kind === "success" ? result.reconciled : false,
          warnings: result.kind === "success" ? result.warnings.map((w) => w.code).join(",") : "",
        });
        if (success) await afterPublish(post, ctx, success);
        break;
      case "retry":
        stats.retryScheduled++;
        log.log("WARNING", "scheduler.post_retry_scheduled", {
          ...fields,
          durationMs,
          code: decision.code,
          httpStatus: result.kind === "error" ? result.error.httpStatus : null,
          detail: result.kind === "error" ? result.error.detail : null,
          ambiguous: result.kind === "error" ? result.error.ambiguous : false,
          nextAttemptAt: iso(decision.nextAttemptAtMs),
        });
        break;
      case "failed":
        stats.failed++;
        log.log("ERROR", "scheduler.post_failed", {
          ...fields,
          durationMs,
          code: decision.code,
          rawCode: result.kind === "error" ? result.error.code : null,
          httpStatus: result.kind === "error" ? result.error.httpStatus : null,
          detail: result.kind === "error" ? result.error.detail : null,
        });
        break;
      case "noop":
        log.log("INFO", "scheduler.already_published", fields);
        break;
      case "gone":
        log.log("WARNING", "scheduler.post_deleted_during_attempt", { ...fields, result: result.kind });
        break;
      case "lease_lost":
        stats.leaseLost++;
        log.log("WARNING", "scheduler.lease_lost_on_finalize", { ...fields, result: result.kind });
        break;
    }
  };

  let runError: string | null = null;
  try {
    const expired = await deps.store.listExpiredLeases(deps.now(), LEASE_RECOVERY_LIMIT);
    for (const id of expired) {
      const decision = await deps.store.recoverLease(id, deps.now(), runId, deps.random);
      if (decision.kind === "skip") continue;
      stats.recovered++;
      log.log("WARNING", "scheduler.lease_recovered", {
        runId,
        postId: id,
        outcome: decision.kind,
        code: decision.code,
        nextAttemptAt: decision.kind === "retry" ? iso(decision.nextAttemptAtMs) : null,
      });
    }

    const due = await deps.store.listDue(deps.now(), deps.batchLimit ?? DEFAULT_BATCH_LIMIT);
    stats.due = due.length;
    const ordered = shuffle(due, deps.random);
    const offsets = spreadOffsets(ordered.length, deps.spreadWindowMs ?? SPREAD_WINDOW_MS, deps.random);
    const outcomes = await Promise.allSettled(ordered.map((ref, i) => processOne(ref, offsets[i])));
    for (const [i, outcome] of outcomes.entries()) {
      if (outcome.status === "rejected") {
        stats.errors++;
        log.log("ERROR", "scheduler.post_unhandled_error", {
          runId,
          postId: ordered[i].id,
          detail: outcome.reason instanceof Error ? outcome.reason.message : String(outcome.reason),
        });
      }
    }
  } catch (err) {
    stats.errors++;
    runError = err instanceof Error ? err.message : String(err);
    log.log("ERROR", "scheduler.tick_failed", { runId, detail: runError });
  }

  await settleWithin(background, BACKGROUND_WAIT_MS);
  const finishedAtMs = deps.now();
  try {
    await deps.store.writeHeartbeat({
      runId,
      startedAtMs,
      finishedAtMs,
      stats: { ...stats },
      config: deps.configHealth,
      error: runError,
    });
  } catch (err) {
    log.log("WARNING", "scheduler.heartbeat_failed", { runId, detail: err instanceof Error ? err.message : String(err) });
  }
  log.log(stats.errors > 0 ? "WARNING" : "INFO", "scheduler.tick_finished", {
    runId,
    durationMs: finishedAtMs - startedAtMs,
    ...stats,
  });
  return stats;
}
