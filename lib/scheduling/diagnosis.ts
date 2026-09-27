import type { ScheduledPublishErrorCode } from "@/types";

/**
 * "Why wasn't this post published?" — one verdict per scheduled post, from
 * its stored state + the scheduler heartbeat (systemHealth/scheduler).
 */
export type DiagnosisVerdict =
  | "scheduler_not_running"
  | "not_due_yet"
  | "waiting_for_scheduler"
  | "publishing"
  | "retry_scheduled"
  | "server_misconfigured"
  | "authentication_failed"
  | "token_expired"
  | "api_rejected"
  | "network_or_platform_unavailable"
  | "outcome_unknown"
  | "missed_window"
  | "duplicate_prevented"
  | "published"
  | "cancelled"
  | "unknown";

export interface DiagnosisInput {
  status: string;
  scheduledAtMs: number | null;
  errorCode: ScheduledPublishErrorCode | string | null;
  reconciled: boolean;
}

export interface SchedulerHeartbeatInput {
  lastRunAtMs: number | null;
}

/** The cron runs every minute; beyond this the scheduler is considered down. */
export const HEARTBEAT_STALE_MS = 5 * 60_000;

const CODE_VERDICT: Record<string, DiagnosisVerdict> = {
  CONFIG_ENCRYPTION_KEY_MISSING: "server_misconfigured",
  CONFIG_ENCRYPTION_KEY_INVALID: "server_misconfigured",
  CONFIG_ZERNIO_KEY_MISSING: "server_misconfigured",
  CONFIG_ZERNIO_KEY_INVALID: "server_misconfigured",
  CONNECTION_NOT_FOUND: "authentication_failed",
  TOKEN_DECRYPT_FAILED: "authentication_failed",
  AUTH_REJECTED: "authentication_failed",
  PERMISSION_DENIED: "authentication_failed",
  TOKEN_EXPIRED: "token_expired",
  CONTENT_REJECTED: "api_rejected",
  DUPLICATE_CONTENT: "api_rejected",
  MEDIA_REQUIRED: "api_rejected",
  MEDIA_UNAVAILABLE: "api_rejected",
  INVALID_POST_DATA: "api_rejected",
  UNSUPPORTED_PLATFORM: "api_rejected",
  RATE_LIMITED: "network_or_platform_unavailable",
  PLATFORM_UNAVAILABLE: "network_or_platform_unavailable",
  NETWORK_ERROR: "network_or_platform_unavailable",
  TIMEOUT: "network_or_platform_unavailable",
  WORKER_TIMEOUT: "network_or_platform_unavailable",
  DEADLINE_EXCEEDED: "network_or_platform_unavailable",
  INTERNAL_ERROR: "server_misconfigured",
  OUTCOME_UNKNOWN: "outcome_unknown",
  MISSED_PUBLISH_WINDOW: "missed_window",
};

export function isHeartbeatStale(heartbeat: SchedulerHeartbeatInput, nowMs: number): boolean {
  return heartbeat.lastRunAtMs === null || nowMs - heartbeat.lastRunAtMs > HEARTBEAT_STALE_MS;
}

export function diagnoseScheduledPost(
  post: DiagnosisInput,
  heartbeat: SchedulerHeartbeatInput,
  nowMs: number,
): DiagnosisVerdict {
  switch (post.status) {
    case "published":
      return post.reconciled ? "duplicate_prevented" : "published";
    case "cancelled":
      return "cancelled";
    case "processing":
      return "publishing";
    case "retrying":
      return "retry_scheduled";
    case "failed":
      return (post.errorCode && CODE_VERDICT[post.errorCode]) || "unknown";
    case "pending": {
      if (post.scheduledAtMs !== null && post.scheduledAtMs > nowMs) return "not_due_yet";
      return isHeartbeatStale(heartbeat, nowMs) ? "scheduler_not_running" : "waiting_for_scheduler";
    }
    default:
      return "unknown";
  }
}

/** Short French explanation for the admin view. */
export const VERDICT_LABELS: Record<DiagnosisVerdict, string> = {
  scheduler_not_running: "Le scheduler ne tourne pas (aucun heartbeat depuis plus de 5 min)",
  not_due_yet: "Pas encore l'heure de publication",
  waiting_for_scheduler: "Échu — sera pris au prochain passage du scheduler (≤ 1 min)",
  publishing: "Publication en cours",
  retry_scheduled: "Échec temporaire — nouvelle tentative programmée",
  server_misconfigured: "Configuration serveur (clé de chiffrement / clé API / erreur interne)",
  authentication_failed: "Authentification refusée (connexion absente, révoquée ou illisible)",
  token_expired: "Token expiré — reconnexion nécessaire",
  api_rejected: "Refusé par la plateforme (contenu, doublon, média, données)",
  network_or_platform_unavailable: "Plateforme indisponible / réseau / timeout",
  outcome_unknown: "Résultat inconnu après envoi — non réessayé pour éviter un doublon",
  missed_window: "Fenêtre de publication dépassée (> 24 h)",
  duplicate_prevented: "Publié — doublon évité (publication antérieure reconnue)",
  published: "Publié",
  cancelled: "Annulé par l'utilisateur",
  unknown: "Statut inconnu",
};
