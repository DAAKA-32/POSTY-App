import type { Translations } from "@/lib/i18n";
import type { ScheduledPost, ScheduledPublishErrorCode, ScheduleStatus } from "@/types";
import { platformDisplayName } from "./platforms";

/** What the user can do about a failed post — drives the card's call-to-action. */
export type RecoveryAction = "reconnect" | "edit" | "reschedule" | "check_profile" | "none";

type FailureKey = keyof Translations["scheduledPublish"]["errors"];
type RetryReasonKey = keyof Translations["scheduledPublish"]["retryReasons"];

/**
 * Error code → localized message + recovery action. Mirrors ERROR_CATALOG in
 * functions/src/scheduler/errors.ts (the scheduler stores a French fallback
 * in `failureReason`; the UI always prefers the localized message).
 */
const FAILURES: Record<ScheduledPublishErrorCode, { key: FailureKey; action: RecoveryAction; retryReason: RetryReasonKey }> = {
  CONFIG_ENCRYPTION_KEY_MISSING: { key: "serviceError", action: "reschedule", retryReason: "serviceError" },
  CONFIG_ENCRYPTION_KEY_INVALID: { key: "serviceError", action: "reschedule", retryReason: "serviceError" },
  CONFIG_ZERNIO_KEY_MISSING: { key: "serviceError", action: "reschedule", retryReason: "serviceError" },
  CONFIG_ZERNIO_KEY_INVALID: { key: "serviceError", action: "reschedule", retryReason: "serviceError" },
  CONNECTION_NOT_FOUND: { key: "notConnected", action: "reconnect", retryReason: "generic" },
  TOKEN_DECRYPT_FAILED: { key: "reconnect", action: "reconnect", retryReason: "unreadableConnection" },
  TOKEN_EXPIRED: { key: "reconnect", action: "reconnect", retryReason: "generic" },
  AUTH_REJECTED: { key: "reconnect", action: "reconnect", retryReason: "generic" },
  PERMISSION_DENIED: { key: "permission", action: "reconnect", retryReason: "generic" },
  CONTENT_REJECTED: { key: "contentRejected", action: "edit", retryReason: "generic" },
  DUPLICATE_CONTENT: { key: "duplicate", action: "edit", retryReason: "generic" },
  MEDIA_REQUIRED: { key: "mediaRequired", action: "edit", retryReason: "generic" },
  MEDIA_UNAVAILABLE: { key: "mediaMissing", action: "edit", retryReason: "generic" },
  INVALID_POST_DATA: { key: "invalidPost", action: "edit", retryReason: "generic" },
  UNSUPPORTED_PLATFORM: { key: "unsupportedPlatform", action: "none", retryReason: "generic" },
  RATE_LIMITED: { key: "temporary", action: "reschedule", retryReason: "temporary" },
  PLATFORM_UNAVAILABLE: { key: "temporary", action: "reschedule", retryReason: "temporary" },
  NETWORK_ERROR: { key: "temporary", action: "reschedule", retryReason: "temporary" },
  TIMEOUT: { key: "temporary", action: "reschedule", retryReason: "temporary" },
  OUTCOME_UNKNOWN: { key: "outcomeUnknown", action: "check_profile", retryReason: "confirming" },
  MISSED_PUBLISH_WINDOW: { key: "missedWindow", action: "reschedule", retryReason: "generic" },
  WORKER_TIMEOUT: { key: "serviceError", action: "reschedule", retryReason: "serviceError" },
  DEADLINE_EXCEEDED: { key: "serviceError", action: "reschedule", retryReason: "serviceError" },
  INTERNAL_ERROR: { key: "serviceError", action: "reschedule", retryReason: "serviceError" },
};

function fill(template: string, platform: string): string {
  return template.split("{platform}").join(platformDisplayName(platform));
}

export interface FailureDescription {
  message: string;
  action: RecoveryAction;
  /** Technical detail for support (already sanitized server-side). */
  detail: string | null;
}

/** Localized, actionable explanation of why a `failed` post was not published. */
export function describeScheduledFailure(post: ScheduledPost, t: Translations): FailureDescription | null {
  const code = post.lastError?.code;
  const entry = code ? FAILURES[code] : undefined;
  if (entry) {
    return {
      message: fill(t.scheduledPublish.errors[entry.key], post.platform),
      action: entry.action,
      detail: post.lastError?.detail ?? null,
    };
  }
  // Legacy rows (before error codes existed) only carry a French string.
  if (post.failureReason) return { message: post.failureReason, action: "reschedule", detail: null };
  if (post.status === "failed") return { message: t.scheduledPublish.errors.generic, action: "reschedule", detail: null };
  return null;
}

/** Short localized reason of the last failed attempt of a `retrying` post. */
export function describeRetryReason(post: ScheduledPost, t: Translations): string {
  const code = post.lastError?.code;
  const key: RetryReasonKey = code && FAILURES[code] ? FAILURES[code].retryReason : "generic";
  return fill(t.scheduledPublish.retryReasons[key], post.platform);
}

/** Not finished yet: waiting for its time, being published, or retrying. */
export function isUpcomingStatus(status: ScheduleStatus): boolean {
  return status === "pending" || status === "processing" || status === "retrying";
}

/** Mirrors firestore.rules (isOwnerCancel). */
export function canCancelScheduledPost(status: ScheduleStatus): boolean {
  return status === "pending" || status === "retrying" || status === "failed";
}

/** Mirrors firestore.rules (isOwnerReschedule). */
export function canRescheduleScheduledPost(status: ScheduleStatus): boolean {
  return status === "pending" || status === "retrying" || status === "failed" || status === "cancelled";
}

/** A post being published, or already published, must not be deleted from the UI. */
export function canDeleteScheduledPost(status: ScheduleStatus): boolean {
  return status !== "processing" && status !== "published";
}
