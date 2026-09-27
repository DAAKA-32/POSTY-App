import type { PublishErrorCode } from "./types";

/** What the user can do about a failure — drives the UI call-to-action. */
export type RecoveryAction = "reconnect" | "edit" | "reschedule" | "check_profile" | "none";

interface CatalogEntry {
  /** Default retryability; a thrown PublishError may override it. */
  retryable: boolean;
  action: RecoveryAction;
  /** French fallback stored in `failureReason` (legacy UI, admin, support). */
  message: (platform: string) => string;
}

const PLATFORM_NAMES: Record<string, string> = {
  linkedin: "LinkedIn",
  facebook: "Facebook",
  threads: "Threads",
  threadsz: "Threads",
  x: "X",
  twitter: "X",
  instagram: "Instagram",
  reddit: "Reddit",
};

export function platformName(platform: string): string {
  return PLATFORM_NAMES[platform] ?? platform;
}

const SERVICE_ERROR = () =>
  "Un incident technique côté Posty a empêché la publication. Reprogrammez ce post ; si le problème persiste, contactez le support.";

export const ERROR_CATALOG: Record<PublishErrorCode, CatalogEntry> = {
  CONFIG_ENCRYPTION_KEY_MISSING: { retryable: true, action: "reschedule", message: SERVICE_ERROR },
  CONFIG_ENCRYPTION_KEY_INVALID: { retryable: true, action: "reschedule", message: SERVICE_ERROR },
  CONFIG_ZERNIO_KEY_MISSING: { retryable: true, action: "reschedule", message: SERVICE_ERROR },
  CONFIG_ZERNIO_KEY_INVALID: { retryable: true, action: "reschedule", message: SERVICE_ERROR },
  CONNECTION_NOT_FOUND: {
    retryable: false,
    action: "reconnect",
    message: (p) => `Aucun compte ${p} n'est connecté. Connectez-le dans Paramètres, puis reprogrammez ce post.`,
  },
  // Wrong key or corrupted ciphertext. Retried (a key misconfiguration is
  // fixable server-side); if it persists, reconnecting rewrites the token.
  TOKEN_DECRYPT_FAILED: {
    retryable: true,
    action: "reconnect",
    message: (p) => `Impossible de lire votre connexion ${p}. Reconnectez votre compte dans Paramètres, puis reprogrammez ce post.`,
  },
  TOKEN_EXPIRED: {
    retryable: false,
    action: "reconnect",
    message: (p) => `Votre connexion ${p} a expiré. Reconnectez votre compte dans Paramètres, puis reprogrammez ce post.`,
  },
  AUTH_REJECTED: {
    retryable: false,
    action: "reconnect",
    message: (p) => `${p} a refusé l'accès (connexion expirée ou révoquée). Reconnectez votre compte, puis reprogrammez ce post.`,
  },
  PERMISSION_DENIED: {
    retryable: false,
    action: "reconnect",
    message: (p) => `${p} a refusé la publication : autorisations insuffisantes. Reconnectez votre compte en acceptant toutes les autorisations.`,
  },
  CONTENT_REJECTED: {
    retryable: false,
    action: "edit",
    message: (p) => `${p} a refusé ce contenu. Modifiez le post, puis reprogrammez-le.`,
  },
  DUPLICATE_CONTENT: {
    retryable: false,
    action: "edit",
    message: (p) => `${p} a refusé ce post : un contenu identique a déjà été publié sur votre profil.`,
  },
  MEDIA_REQUIRED: {
    retryable: false,
    action: "edit",
    message: (p) => `${p} exige une image : ajoutez un visuel, puis reprogrammez ce post.`,
  },
  MEDIA_UNAVAILABLE: {
    retryable: false,
    action: "edit",
    message: () => "L'image jointe est introuvable ou refusée. Ajoutez-la de nouveau, puis reprogrammez ce post.",
  },
  INVALID_POST_DATA: {
    retryable: false,
    action: "edit",
    message: (p) => `Des informations requises par ${p} manquent sur ce post. Modifiez-le, puis reprogrammez-le.`,
  },
  UNSUPPORTED_PLATFORM: {
    retryable: false,
    action: "none",
    message: (p) => `La programmation n'est pas disponible pour ${p}.`,
  },
  RATE_LIMITED: {
    retryable: true,
    action: "reschedule",
    message: (p) => `${p} a limité temporairement les publications. Reprogrammez ce post un peu plus tard.`,
  },
  PLATFORM_UNAVAILABLE: {
    retryable: true,
    action: "reschedule",
    message: (p) => `${p} est resté indisponible après plusieurs tentatives. Reprogrammez ce post.`,
  },
  NETWORK_ERROR: {
    retryable: true,
    action: "reschedule",
    message: (p) => `${p} est resté injoignable après plusieurs tentatives. Reprogrammez ce post.`,
  },
  TIMEOUT: {
    retryable: true,
    action: "reschedule",
    message: (p) => `${p} n'a pas répondu à temps après plusieurs tentatives. Reprogrammez ce post.`,
  },
  OUTCOME_UNKNOWN: {
    retryable: false,
    action: "check_profile",
    message: (p) =>
      `Impossible de confirmer si le post a été publié sur ${p}. Vérifiez votre profil avant de le reprogrammer pour éviter un doublon.`,
  },
  MISSED_PUBLISH_WINDOW: {
    retryable: false,
    action: "reschedule",
    message: () => "Non publié : l'heure prévue est dépassée de plus de 24 h. Reprogrammez ce post.",
  },
  WORKER_TIMEOUT: { retryable: true, action: "reschedule", message: SERVICE_ERROR },
  DEADLINE_EXCEEDED: { retryable: true, action: "reschedule", message: SERVICE_ERROR },
  INTERNAL_ERROR: { retryable: true, action: "reschedule", message: SERVICE_ERROR },
};

export interface PublishErrorInit {
  code: PublishErrorCode;
  platform: string;
  detail?: string | null;
  httpStatus?: number | null;
  /** Overrides the catalog default. */
  retryable?: boolean;
  /**
   * True when the request may have reached the platform and been applied
   * (timeout / dropped connection during the create call).
   */
  ambiguous?: boolean;
  retryAfterMs?: number;
}

/**
 * The only error type platform adapters throw. It carries everything the
 * policy needs to decide retry-vs-fail and everything support needs to answer
 * "why wasn't this published?" — nothing is reduced to a generic string.
 */
export class PublishError extends Error {
  readonly code: PublishErrorCode;
  readonly platform: string;
  readonly detail: string | null;
  readonly httpStatus: number | null;
  readonly retryable: boolean;
  readonly ambiguous: boolean;
  readonly retryAfterMs: number | undefined;

  constructor(init: PublishErrorInit) {
    super(`${init.code}${init.detail ? `: ${init.detail}` : ""}`);
    this.name = "PublishError";
    this.code = init.code;
    this.platform = init.platform;
    this.detail = init.detail ?? null;
    this.httpStatus = init.httpStatus ?? null;
    this.retryable = init.retryable ?? ERROR_CATALOG[init.code].retryable;
    this.ambiguous = init.ambiguous ?? false;
    this.retryAfterMs = init.retryAfterMs;
  }
}

/**
 * Thrown by `beforeSend` when this run no longer owns the post (its lease
 * expired and another run took over, or the owner deleted/cancelled it).
 * Not a publish failure: the current owner decides the post's fate.
 */
export class LeaseLostError extends Error {
  constructor(readonly postId: string) {
    super(`Lease lost for scheduled post ${postId}`);
    this.name = "LeaseLostError";
  }
}

export function userMessageFor(code: PublishErrorCode, platform: string): string {
  return ERROR_CATALOG[code].message(platformName(platform));
}

/** Wraps anything unexpected so the real message is kept, never swallowed. */
export function toPublishError(err: unknown, platform: string): PublishError {
  if (err instanceof PublishError) return err;
  const detail = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
  return new PublishError({ code: "INTERNAL_ERROR", platform, detail: sanitizeDetail(detail) });
}

// Every pattern captures the non-secret prefix in group 1 so the replacement
// keeps it ("Bearer [redacted]", "access_token=[redacted]", …).
const SECRET_PATTERNS: RegExp[] = [
  /(bearer\s+)[a-z0-9._~+/=-]+/gi,
  /((?:access_token|refresh_token|client_secret|token|key)=)[^&\s"']+/gi,
  /("(?:access_token|refresh_token|client_secret|accessToken|refreshToken)"\s*:\s*")[^"]*/gi,
  /(enc:v1:)[a-z0-9+/=:]+/gi,
];

/** Strips anything token-like and bounds the length of platform messages. */
export function sanitizeDetail(text: string | null | undefined, maxLength = 300): string | null {
  if (!text) return null;
  let out = text;
  for (const pattern of SECRET_PATTERNS) {
    out = out.replace(pattern, (_match: string, prefix: string) => `${prefix}[redacted]`);
  }
  out = out.replace(/\s+/g, " ").trim();
  return out.length > maxLength ? `${out.slice(0, maxLength)}…` : out;
}
