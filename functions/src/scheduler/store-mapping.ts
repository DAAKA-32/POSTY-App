import { Timestamp } from "firebase-admin/firestore";
import { ATTEMPT_HISTORY_LIMIT, type ScheduledPostPatch } from "./policy";
import type { AttemptRecord, PublishErrorRecord, PublishStage, ScheduledPostState } from "./types";

/**
 * Converts any timestamp representation found in Firestore to epoch ms.
 * Accepts native Timestamps (the only format the app writes) plus Date,
 * numbers and ISO strings defensively, so a malformed legacy doc yields
 * `null` instead of crashing the whole batch.
 */
export function toMillis(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "object" && typeof (value as { toMillis?: unknown }).toMillis === "function") {
    const ms = (value as { toMillis: () => number }).toMillis();
    return Number.isFinite(ms) ? ms : null;
  }
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.getTime() : null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const ms = Date.parse(value);
    return Number.isFinite(ms) ? ms : null;
  }
  return null;
}

function toStringRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, string> = {};
  for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
    if (typeof v === "string") out[key] = v;
  }
  return out;
}

export function readState(data: Record<string, unknown> | null | undefined): ScheduledPostState | null {
  if (!data) return null;
  const stage = data.publishStage;
  return {
    status: typeof data.status === "string" ? data.status : "",
    platform: typeof data.platform === "string" ? data.platform : "",
    scheduledAtMs: toMillis(data.scheduledAt),
    attemptCount:
      typeof data.attemptCount === "number" && Number.isFinite(data.attemptCount) ? Math.max(0, data.attemptCount) : 0,
    nextAttemptAtMs: toMillis(data.nextAttemptAt),
    leaseExpiresAtMs: toMillis(data.leaseExpiresAt),
    processingBy: typeof data.processingBy === "string" ? data.processingBy : null,
    processingStartedAtMs: toMillis(data.processingStartedAt),
    publishStage: stage === "claimed" || stage === "sending" ? (stage as PublishStage) : null,
    priorSendUncertain: data.priorSendUncertain === true,
    resumeState: toStringRecord(data.resumeState),
  };
}

const ts = (ms: number | null): Timestamp | null => (ms === null ? null : Timestamp.fromMillis(ms));

function errorToFirestore(error: PublishErrorRecord): Record<string, unknown> {
  const { atMs, ...rest } = error;
  return { ...rest, at: Timestamp.fromMillis(atMs) };
}

function attemptToFirestore(record: AttemptRecord): Record<string, unknown> {
  const { startedAtMs, finishedAtMs, ...rest } = record;
  return {
    ...rest,
    startedAt: Timestamp.fromMillis(startedAtMs),
    finishedAt: Timestamp.fromMillis(finishedAtMs),
  };
}

/**
 * Maps a policy patch to a Firestore update. `current` is the document as
 * read in the same transaction (needed to append to the capped history).
 */
export function toFirestoreUpdate(
  patch: ScheduledPostPatch,
  current: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { updatedAt: Timestamp.fromMillis(patch.updatedAtMs) };

  if (patch.status !== undefined) out.status = patch.status;
  if (patch.attemptCount !== undefined) out.attemptCount = patch.attemptCount;
  if (patch.lastAttemptAtMs !== undefined) out.lastAttemptAt = ts(patch.lastAttemptAtMs);
  if (patch.nextAttemptAtMs !== undefined) out.nextAttemptAt = ts(patch.nextAttemptAtMs);
  if (patch.leaseExpiresAtMs !== undefined) out.leaseExpiresAt = ts(patch.leaseExpiresAtMs);
  if (patch.processingBy !== undefined) out.processingBy = patch.processingBy;
  if (patch.processingStartedAtMs !== undefined) out.processingStartedAt = ts(patch.processingStartedAtMs);
  if (patch.publishStage !== undefined) out.publishStage = patch.publishStage;
  if (patch.sendingAtMs !== undefined) out.sendingAt = ts(patch.sendingAtMs);
  if (patch.priorSendUncertain !== undefined) out.priorSendUncertain = patch.priorSendUncertain;
  if (patch.resumeState !== undefined) out.resumeState = patch.resumeState;
  if (patch.publishedAtMs !== undefined) out.publishedAt = ts(patch.publishedAtMs);
  if (patch.publishedUrl !== undefined) out.publishedUrl = patch.publishedUrl;
  if (patch.externalPostId !== undefined) out.externalPostId = patch.externalPostId;
  if (patch.reconciled !== undefined) out.reconciled = patch.reconciled;
  if (patch.warnings !== undefined) out.warnings = patch.warnings;
  if (patch.lastError !== undefined) out.lastError = patch.lastError === null ? null : errorToFirestore(patch.lastError);
  if (patch.failureReason !== undefined) out.failureReason = patch.failureReason;

  if (patch.appendAttempt) {
    const history = Array.isArray(current.attempts) ? current.attempts : [];
    out.attempts = [...history, attemptToFirestore(patch.appendAttempt)].slice(-ATTEMPT_HISTORY_LIMIT);
  }
  return out;
}
