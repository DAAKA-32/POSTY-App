// Scheduled-publishing domain types shared by the scheduler, the platform
// adapters and the tests.
//
// The Next.js app declares the same unions in `types/index.ts`
// (`ScheduleStatus`, `ScheduledPublishErrorCode`). Functions is a separate
// TypeScript project and cannot import from the app, so KEEP BOTH COPIES IN
// SYNC — the UI maps these exact strings to labels and recovery actions.

/**
 * Lifecycle of a `scheduledPosts` document.
 *
 *   pending ──claim──▶ processing ──▶ published
 *      ▲                   │  └─────▶ failed      (permanent error / attempts exhausted)
 *      │                   └────────▶ retrying ──claim──▶ processing …
 *   (reschedule)                          (transient error, nextAttemptAt set)
 *
 * `cancelled` is set by the owner from pending / retrying / failed.
 * `processing` is owned by exactly one scheduler run (lease) and is never
 * writable by clients.
 */
export type ScheduleStatus =
  | "pending"
  | "processing"
  | "retrying"
  | "published"
  | "failed"
  | "cancelled";

/**
 * Where a claimed post is inside its attempt:
 * - `claimed`: nothing sent to the platform yet → always safe to retry.
 * - `sending`: the non-idempotent create call may have reached the platform →
 *   the outcome is unknown until reconciled.
 */
export type PublishStage = "claimed" | "sending";

/** Platforms the scheduler can publish to (see `publishers/index.ts`). */
export const SCHEDULER_PLATFORMS = [
  "linkedin",
  "facebook",
  "threads",
  "x",
  "twitter",
  "instagram",
  "reddit",
  "threadsz",
] as const;
export type SchedulerPlatform = (typeof SCHEDULER_PLATFORMS)[number];

export function isSchedulerPlatform(value: unknown): value is SchedulerPlatform {
  return typeof value === "string" && (SCHEDULER_PLATFORMS as readonly string[]).includes(value);
}

/**
 * Machine-readable failure codes, persisted on `lastError.code`.
 * Every code has a catalog entry in `errors.ts` (retryability + message).
 */
export type PublishErrorCode =
  // Server configuration (Posty-side, not the user's fault)
  | "CONFIG_ENCRYPTION_KEY_MISSING"
  | "CONFIG_ENCRYPTION_KEY_INVALID"
  | "CONFIG_ZERNIO_KEY_MISSING"
  | "CONFIG_ZERNIO_KEY_INVALID"
  // Account / authentication
  | "CONNECTION_NOT_FOUND"
  | "TOKEN_DECRYPT_FAILED"
  | "TOKEN_EXPIRED"
  | "AUTH_REJECTED"
  | "PERMISSION_DENIED"
  // Content / media
  | "CONTENT_REJECTED"
  | "DUPLICATE_CONTENT"
  | "MEDIA_REQUIRED"
  | "MEDIA_UNAVAILABLE"
  | "INVALID_POST_DATA"
  | "UNSUPPORTED_PLATFORM"
  // Transient platform / network
  | "RATE_LIMITED"
  | "PLATFORM_UNAVAILABLE"
  | "NETWORK_ERROR"
  | "TIMEOUT"
  // Scheduler-level
  | "OUTCOME_UNKNOWN"
  | "MISSED_PUBLISH_WINDOW"
  | "WORKER_TIMEOUT"
  | "DEADLINE_EXCEEDED"
  | "INTERNAL_ERROR";

/** Non-fatal degradations recorded on a published post. */
export type PublishWarningCode = "IMAGE_DROPPED" | "ORGANIZATION_FALLBACK_PERSONAL";

export interface PublishWarning {
  code: PublishWarningCode;
  detail?: string;
}

export interface ScheduledPostImage {
  storagePath: string;
  downloadURL: string;
  fileName: string;
  contentType: string;
  size: number;
}

/** Persisted on the post as `lastError` (times as Firestore Timestamps). */
export interface PublishErrorRecord {
  code: PublishErrorCode;
  /** User-facing French fallback message (the UI localizes by `code`). */
  message: string;
  /** Sanitized platform/technical detail — never contains a token. */
  detail: string | null;
  platform: string;
  httpStatus: number | null;
  retryable: boolean;
  ambiguous: boolean;
  attempt: number;
  atMs: number;
}

/** One entry of the capped `attempts` history kept on each post. */
export interface AttemptRecord {
  attempt: number;
  runId: string;
  startedAtMs: number;
  finishedAtMs: number;
  outcome: "published" | "reconciled" | "retry_scheduled" | "failed" | "lease_expired";
  code: PublishErrorCode | null;
  httpStatus: number | null;
  detail: string | null;
}

/**
 * Normalized, storage-agnostic view of the fields the state machine reads.
 * Times are epoch milliseconds (null when absent/unparseable).
 */
export interface ScheduledPostState {
  status: string;
  platform: string;
  scheduledAtMs: number | null;
  attemptCount: number;
  nextAttemptAtMs: number | null;
  leaseExpiresAtMs: number | null;
  processingBy: string | null;
  processingStartedAtMs: number | null;
  publishStage: PublishStage | null;
  priorSendUncertain: boolean;
  resumeState: Record<string, string>;
}
