/**
 * LinkedIn-specific error UX writing.
 *
 * Maps API error codes (and legacy raw error strings) to user-friendly,
 * rassurant copy + a recovery action. The translations live in
 * `lib/i18n/translations/*.ts` under the `linkedinErrors` namespace —
 * never display backend error strings directly to the user.
 *
 * Convention on the server side: routes return
 *   { error: "<code>", message: "<EN fallback>" }
 * with HTTP status reflecting the error. The client picks `error` (preferred)
 * or falls back to pattern-matching the message.
 */

// Use the shared, structurally-widened Translations type (string leaves) so any
// locale's `t` is accepted — not fr's literal types.
import type { Translations } from "@/lib/i18n";

export type LinkedInErrorCode =
  | "session_expired"
  | "token_expired"
  | "publish_failed"
  | "not_connected"
  | "rate_limited"
  | "invalid_content"
  | "media_upload_failed"
  | "server_error"
  | "insufficient_permissions"
  | "generic";

export interface FriendlyLinkedInError {
  /** The full sentence to show (already translated). */
  message: string;
  /** The button label for the recovery CTA, or `null` if no button. */
  actionLabel: string | null;
  /** The recovery intent — drives what the CTA actually does. */
  actionType: "reconnect" | "connect" | "retry" | "wait" | null;
}

/**
 * Map an API error response (or any error-like value) to friendly UX copy.
 *
 *   const friendly = getLinkedInError({ code: "token_expired" }, t);
 *   toast.error(friendly.message);
 *
 * Pass either:
 *   - `code` extracted from the JSON response `error` field
 *   - `raw` the underlying error message (for legacy/unknown shapes)
 *   - both — `code` is preferred, `raw` is used as fallback
 */
export function getLinkedInError(
  input: { code?: string; raw?: string } | string | unknown,
  t: Translations
): FriendlyLinkedInError {
  const e = t.linkedinErrors;

  // Normalize input to { code, raw }
  let code: string | undefined;
  let raw: string | undefined;

  if (typeof input === "string") {
    raw = input;
  } else if (input && typeof input === "object") {
    const obj = input as { code?: string; raw?: string; error?: string; message?: string };
    code = obj.code ?? obj.error;
    raw = obj.raw ?? obj.message;
  }

  // ── Code-based mapping (preferred path) ────────────────────────────────
  switch (code) {
    case "session_expired":
    case "token_expired":
      return {
        message: e.sessionExpired,
        actionLabel: e.sessionExpiredAction,
        actionType: "reconnect",
      };
    case "publish_failed":
      return {
        message: e.publishFailed,
        actionLabel: e.publishFailedAction,
        actionType: "reconnect",
      };
    case "not_connected":
    case "no_connection":
      return {
        message: e.notConnected,
        actionLabel: e.notConnectedAction,
        actionType: "connect",
      };
    case "rate_limited":
    case "too_many_requests":
      return {
        message: e.rateLimited,
        actionLabel: null,
        actionType: "wait",
      };
    case "invalid_content":
    case "content_rejected":
      return {
        message: e.invalidContent,
        actionLabel: e.retryAction,
        actionType: "retry",
      };
    case "media_upload_failed":
    case "upload_failed":
      return {
        message: e.mediaUploadFailed,
        actionLabel: e.retryAction,
        actionType: "retry",
      };
    case "server_error":
    case "service_unavailable":
      return {
        message: e.serverError,
        actionLabel: e.retryAction,
        actionType: "retry",
      };
    case "insufficient_permissions":
    case "forbidden":
      return {
        message: e.insufficientPermissions,
        actionLabel: e.sessionExpiredAction,
        actionType: "reconnect",
      };
  }

  // ── Pattern-based fallback (raw string) ────────────────────────────────
  const s = (raw || "").toLowerCase();

  if (/expir|invalid.*token|401|unauthor/.test(s)) {
    return {
      message: e.sessionExpired,
      actionLabel: e.sessionExpiredAction,
      actionType: "reconnect",
    };
  }
  if (/rate.?limit|429|too many/.test(s)) {
    return { message: e.rateLimited, actionLabel: null, actionType: "wait" };
  }
  if (/upload|media.*fail|asset/.test(s)) {
    return {
      message: e.mediaUploadFailed,
      actionLabel: e.retryAction,
      actionType: "retry",
    };
  }
  if (/permission|forbidden|403|scope/.test(s)) {
    return {
      message: e.insufficientPermissions,
      actionLabel: e.sessionExpiredAction,
      actionType: "reconnect",
    };
  }
  if (/server|500|503|unavailable|down/.test(s)) {
    return {
      message: e.serverError,
      actionLabel: e.retryAction,
      actionType: "retry",
    };
  }
  if (/not.*connect|no.*connection/.test(s)) {
    return {
      message: e.notConnected,
      actionLabel: e.notConnectedAction,
      actionType: "connect",
    };
  }

  // Default: generic LinkedIn issue, recovery is reconnect (most common cause)
  return {
    message: e.generic,
    actionLabel: e.genericAction,
    actionType: "reconnect",
  };
}

/**
 * Shorthand when you only need the message string (e.g. simple toast.error).
 */
export function getLinkedInErrorMessage(
  input: { code?: string; raw?: string } | string | unknown,
  t: Translations
): string {
  return getLinkedInError(input, t).message;
}
