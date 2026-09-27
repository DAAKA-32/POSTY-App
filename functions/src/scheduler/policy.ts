// Pure scheduling state machine: every status transition of a scheduled post
// is decided here, from (current state, clock, attempt result) → patch.
// No I/O — the stores apply the patches inside a transaction, which is what
// makes claims atomic and the whole pipeline idempotent.

import { userMessageFor } from "./errors";
import type {
  AttemptRecord,
  PublishErrorCode,
  PublishErrorRecord,
  PublishStage,
  PublishWarning,
  ScheduleStatus,
  ScheduledPostState,
} from "./types";

/** Total attempts per post (the first one included). */
export const MAX_ATTEMPTS = 5;
/** Wait before attempt n+1 once attempt n failed: 1 → 5 → 15 → 30 min (≈51 min window). */
export const RETRY_DELAYS_MS = [60_000, 5 * 60_000, 15 * 60_000, 30 * 60_000];
export const RETRY_JITTER_RATIO = 0.2;
/** Upper bound applied to a platform's Retry-After header. */
export const MAX_RETRY_AFTER_MS = 60 * 60_000;
/**
 * How long a run owns a claimed post. Must exceed the function timeout
 * (540 s) so a live run never loses its claim; after it, the post is
 * considered abandoned (crash) and recovered.
 */
export const LEASE_MS = 15 * 60_000;
/**
 * A first attempt discovered more than this long after its scheduled time
 * (scheduler outage) is not published — stale content is worse than a
 * clear "rescheduling needed" message.
 */
export const MAX_LATENESS_MS = 24 * 60 * 60_000;
export const ATTEMPT_HISTORY_LIMIT = 10;

/**
 * Platforms whose create call can be replayed after an ambiguous outcome
 * without risking a double post:
 * - linkedin: an identical re-submission is rejected as a duplicate that
 *   names the original share URN → reconciled as published.
 * - threads: the persisted container is published at most once and its
 *   status is queryable → reconciled from the container.
 * Every other platform fails with OUTCOME_UNKNOWN instead of retrying.
 */
export const RECONCILABLE_PLATFORMS: ReadonlySet<string> = new Set(["linkedin", "threads"]);

/** Storage-agnostic patch (times in epoch ms). Stores map it to their format. */
export interface ScheduledPostPatch {
  updatedAtMs: number;
  status?: ScheduleStatus;
  attemptCount?: number;
  lastAttemptAtMs?: number | null;
  nextAttemptAtMs?: number | null;
  leaseExpiresAtMs?: number | null;
  processingBy?: string | null;
  processingStartedAtMs?: number | null;
  publishStage?: PublishStage | null;
  sendingAtMs?: number | null;
  priorSendUncertain?: boolean;
  resumeState?: Record<string, string>;
  publishedAtMs?: number | null;
  publishedUrl?: string | null;
  externalPostId?: string | null;
  reconciled?: boolean;
  warnings?: PublishWarning[];
  lastError?: PublishErrorRecord | null;
  failureReason?: string | null;
  /** Appended to the capped `attempts` history by the store. */
  appendAttempt?: AttemptRecord;
}

export interface AttemptError {
  code: PublishErrorCode;
  platform: string;
  retryable: boolean;
  ambiguous: boolean;
  httpStatus: number | null;
  detail: string | null;
  retryAfterMs?: number;
}

export type AttemptResult =
  | {
      kind: "success";
      externalPostId: string | null;
      publishedUrl: string | null;
      reconciled: boolean;
      warnings: PublishWarning[];
    }
  | { kind: "error"; error: AttemptError };

export type SkipReason = "not_found" | "not_due" | "already_processing" | "terminal" | "unknown_status";

export type ClaimDecision =
  | { kind: "claim"; attempt: number; patch: ScheduledPostPatch }
  | { kind: "skip"; reason: SkipReason }
  | { kind: "fail"; code: PublishErrorCode; patch: ScheduledPostPatch };

export type TransitionDecision =
  | { kind: "published"; patch: ScheduledPostPatch }
  | { kind: "retry"; nextAttemptAtMs: number; code: PublishErrorCode; patch: ScheduledPostPatch }
  | { kind: "failed"; code: PublishErrorCode; patch: ScheduledPostPatch };

export type FinalizeDecision =
  | TransitionDecision
  | { kind: "noop"; reason: "already_published" }
  | { kind: "gone" }
  | { kind: "lease_lost" };

/** Outcome of a failed (or abandoned) attempt: never "published". */
export type ErrorTransition = Extract<TransitionDecision, { kind: "retry" | "failed" }>;

export type RecoveryDecision = ErrorTransition | { kind: "skip" };

/** Delay before the next attempt, with ±20 % jitter and Retry-After honoured. */
export function retryDelayMs(attempt: number, random: () => number, retryAfterMs?: number): number {
  const index = Math.min(Math.max(attempt, 1), RETRY_DELAYS_MS.length) - 1;
  const jitter = 1 + (random() * 2 - 1) * RETRY_JITTER_RATIO;
  let delay = Math.round(RETRY_DELAYS_MS[index] * jitter);
  if (retryAfterMs !== undefined && Number.isFinite(retryAfterMs)) {
    delay = Math.max(delay, Math.min(retryAfterMs, MAX_RETRY_AFTER_MS));
  }
  return delay;
}

function errorRecord(error: AttemptError, code: PublishErrorCode, attempt: number, nowMs: number): PublishErrorRecord {
  // When the final code differs from the raw one (e.g. an ambiguous TIMEOUT
  // escalated to OUTCOME_UNKNOWN) keep the raw code in the detail.
  const detail = code === error.code ? error.detail : `${error.code}${error.detail ? ` — ${error.detail}` : ""}`;
  return {
    code,
    message: userMessageFor(code, error.platform),
    detail,
    platform: error.platform,
    httpStatus: error.httpStatus,
    retryable: code === error.code ? error.retryable : false,
    ambiguous: error.ambiguous,
    attempt,
    atMs: nowMs,
  };
}

const RELEASE_CLAIM = {
  leaseExpiresAtMs: null,
  processingBy: null,
  publishStage: null,
  sendingAtMs: null,
} as const;

/** Decides whether `runId` may take ownership of a post right now. */
export function decideClaim(state: ScheduledPostState | null, nowMs: number, runId: string): ClaimDecision {
  if (!state) return { kind: "skip", reason: "not_found" };

  let attempt: number;
  switch (state.status) {
    case "pending": {
      if (state.scheduledAtMs === null || state.scheduledAtMs > nowMs) return { kind: "skip", reason: "not_due" };
      if (state.attemptCount === 0 && nowMs - state.scheduledAtMs > MAX_LATENESS_MS) {
        const code: PublishErrorCode = "MISSED_PUBLISH_WINDOW";
        const lastError = errorRecord(
          {
            code,
            platform: state.platform,
            retryable: false,
            ambiguous: false,
            httpStatus: null,
            detail: `Picked up ${Math.round((nowMs - state.scheduledAtMs) / 60_000)} min after the scheduled time`,
          },
          code,
          0,
          nowMs,
        );
        return {
          kind: "fail",
          code,
          patch: {
            updatedAtMs: nowMs,
            status: "failed",
            nextAttemptAtMs: null,
            lastError,
            failureReason: lastError.message,
          },
        };
      }
      attempt = state.attemptCount + 1;
      break;
    }
    case "retrying": {
      if (state.nextAttemptAtMs !== null && state.nextAttemptAtMs > nowMs) return { kind: "skip", reason: "not_due" };
      attempt = state.attemptCount + 1;
      break;
    }
    case "processing":
      return { kind: "skip", reason: "already_processing" };
    case "published":
    case "failed":
    case "cancelled":
      return { kind: "skip", reason: "terminal" };
    default:
      return { kind: "skip", reason: "unknown_status" };
  }

  return {
    kind: "claim",
    attempt,
    patch: {
      updatedAtMs: nowMs,
      status: "processing",
      attemptCount: attempt,
      lastAttemptAtMs: nowMs,
      nextAttemptAtMs: null,
      leaseExpiresAtMs: nowMs + LEASE_MS,
      processingBy: runId,
      processingStartedAtMs: nowMs,
      publishStage: "claimed",
      sendingAtMs: null,
    },
  };
}

/**
 * Marks the point of no return (the create call is about to be sent) and
 * persists what a retry needs to reconcile. Refused unless `runId` still
 * owns a live lease — a run that lost its claim must never send.
 */
export function decideSending(
  state: ScheduledPostState | null,
  runId: string,
  nowMs: number,
  resumeState: Record<string, string> = {},
): { ok: true; patch: ScheduledPostPatch } | { ok: false } {
  if (
    !state ||
    state.status !== "processing" ||
    state.processingBy !== runId ||
    state.leaseExpiresAtMs === null ||
    state.leaseExpiresAtMs <= nowMs
  ) {
    return { ok: false };
  }
  return {
    ok: true,
    patch: {
      updatedAtMs: nowMs,
      publishStage: "sending",
      sendingAtMs: nowMs,
      resumeState: { ...state.resumeState, ...resumeState },
    },
  };
}

function decideAfterError(
  state: ScheduledPostState,
  nowMs: number,
  error: AttemptError,
  attemptRecord: Omit<AttemptRecord, "outcome" | "code">,
  random: () => number,
  outcomeOverride?: AttemptRecord["outcome"],
): ErrorTransition {
  const attempt = state.attemptCount;
  const reconcilable = RECONCILABLE_PLATFORMS.has(state.platform);
  const uncertain = error.ambiguous || state.priorSendUncertain;

  let finalCode: PublishErrorCode | null = null;
  if (error.ambiguous && !reconcilable) finalCode = "OUTCOME_UNKNOWN";
  else if (!error.retryable && !error.ambiguous) finalCode = error.code;
  else if (attempt >= MAX_ATTEMPTS) finalCode = uncertain ? "OUTCOME_UNKNOWN" : error.code;

  if (finalCode !== null) {
    const lastError = errorRecord(error, finalCode, attempt, nowMs);
    return {
      kind: "failed",
      code: finalCode,
      patch: {
        updatedAtMs: nowMs,
        status: "failed",
        ...RELEASE_CLAIM,
        nextAttemptAtMs: null,
        priorSendUncertain: uncertain,
        lastError,
        failureReason: lastError.message,
        appendAttempt: { ...attemptRecord, outcome: outcomeOverride ?? "failed", code: finalCode },
      },
    };
  }

  const nextAttemptAtMs = nowMs + retryDelayMs(attempt, random, error.retryAfterMs);
  return {
    kind: "retry",
    nextAttemptAtMs,
    code: error.code,
    patch: {
      updatedAtMs: nowMs,
      status: "retrying",
      ...RELEASE_CLAIM,
      nextAttemptAtMs,
      priorSendUncertain: uncertain,
      lastError: errorRecord(error, error.code, attempt, nowMs),
      failureReason: null,
      appendAttempt: { ...attemptRecord, outcome: outcomeOverride ?? "retry_scheduled", code: error.code },
    },
  };
}

/** Records the result of an attempt made by `runId`. */
export function decideFinalize(
  state: ScheduledPostState | null,
  runId: string,
  nowMs: number,
  attemptStartedAtMs: number,
  result: AttemptResult,
  random: () => number,
): FinalizeDecision {
  if (!state) return { kind: "gone" };

  const attemptRecord = {
    attempt: state.attemptCount,
    runId,
    startedAtMs: attemptStartedAtMs,
    finishedAtMs: nowMs,
    httpStatus: result.kind === "error" ? result.error.httpStatus : null,
    detail: result.kind === "error" ? result.error.detail : null,
  };

  if (result.kind === "success") {
    // A confirmed publication is a fact: record it even if the claim was
    // lost meanwhile (e.g. lease recovery moved it to retrying), otherwise
    // the next attempt would try to publish it again.
    if (state.status === "published") return { kind: "noop", reason: "already_published" };
    return {
      kind: "published",
      patch: {
        updatedAtMs: nowMs,
        status: "published",
        ...RELEASE_CLAIM,
        nextAttemptAtMs: null,
        publishedAtMs: nowMs,
        publishedUrl: result.publishedUrl,
        externalPostId: result.externalPostId,
        reconciled: result.reconciled,
        warnings: result.warnings,
        priorSendUncertain: false,
        resumeState: {},
        lastError: null,
        failureReason: null,
        appendAttempt: {
          ...attemptRecord,
          outcome: result.reconciled ? "reconciled" : "published",
          code: null,
        },
      },
    };
  }

  if (state.status !== "processing" || state.processingBy !== runId) return { kind: "lease_lost" };
  return decideAfterError(state, nowMs, result.error, attemptRecord, random);
}

/** Recovers a post whose owning run died (lease expired while processing). */
export function decideLeaseRecovery(
  state: ScheduledPostState | null,
  nowMs: number,
  runId: string,
  random: () => number,
): RecoveryDecision {
  if (!state || state.status !== "processing") return { kind: "skip" };
  if (state.leaseExpiresAtMs !== null && state.leaseExpiresAtMs > nowMs) return { kind: "skip" };

  const sent = state.publishStage === "sending";
  const error: AttemptError = {
    code: "WORKER_TIMEOUT",
    platform: state.platform,
    retryable: true,
    ambiguous: sent,
    httpStatus: null,
    detail: sent
      ? `Run ${state.processingBy ?? "?"} stopped after sending the create call — outcome unknown`
      : `Run ${state.processingBy ?? "?"} stopped before sending anything`,
  };
  return decideAfterError(
    state,
    nowMs,
    error,
    {
      attempt: state.attemptCount,
      runId,
      startedAtMs: state.processingStartedAtMs ?? nowMs,
      finishedAtMs: nowMs,
      httpStatus: null,
      detail: error.detail,
    },
    random,
    "lease_expired",
  );
}
