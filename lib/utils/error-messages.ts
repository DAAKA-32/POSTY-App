// ============================================================
// EMPATHETIC ERROR MESSAGE SYSTEM
// Transforms technical errors into user-friendly messages
// with clear explanations and actionable recovery solutions
// ============================================================

export interface FriendlyError {
  message: string;
  /** Optional action button label */
  actionLabel?: string;
  /** Optional action callback description (for context) */
  actionType?: "retry" | "refresh" | "contact" | "upgrade" | "reconnect" | "settings";
}

// Pattern-based error mapping: regex → friendly message
const ERROR_PATTERNS: Array<{
  pattern: RegExp;
  friendly: FriendlyError;
}> = [
  // Network / Connection errors
  {
    pattern: /fetch|network|ERR_INTERNET|ECONNREFUSED|ENOTFOUND|offline/i,
    friendly: {
      message: "Connexion perdue. Verifiez votre connexion internet et reessayez.",
      actionLabel: "Reessayer",
      actionType: "retry",
    },
  },
  {
    pattern: /timeout|ETIMEDOUT|took too long/i,
    friendly: {
      message: "Le serveur met plus de temps que prevu. Reessayez dans quelques instants.",
      actionLabel: "Reessayer",
      actionType: "retry",
    },
  },

  // Auth errors
  {
    pattern: /auth\/.*expired|token.*expired|session.*expired/i,
    friendly: {
      message: "Votre session a expire. Reconnectez-vous pour continuer.",
      actionLabel: "Se reconnecter",
      actionType: "reconnect",
    },
  },
  {
    pattern: /auth\/wrong-password|invalid.*password|mot de passe/i,
    friendly: {
      message: "Mot de passe incorrect. Verifiez et reessayez.",
    },
  },
  {
    pattern: /auth\/user-not-found|utilisateur.*introuvable/i,
    friendly: {
      message: "Aucun compte associe a cet email. Verifiez votre adresse ou creez un compte.",
    },
  },
  {
    pattern: /auth\/too-many-requests|rate.?limit|429/i,
    friendly: {
      message: "Trop de tentatives. Patientez quelques minutes avant de reessayer.",
    },
  },

  // API / Generation errors
  {
    pattern: /quota_exceeded|limit.*reached|limite.*atteinte/i,
    friendly: {
      message: "Vous avez atteint votre limite. Reessayez dans quelques minutes ou passez au plan superieur.",
      actionLabel: "Voir les plans",
      actionType: "upgrade",
    },
  },
  {
    pattern: /generation.*failed|openai|GPT|AI.*error/i,
    friendly: {
      message: "L'IA rencontre un souci temporaire. Reessayez dans quelques secondes.",
      actionLabel: "Reessayer",
      actionType: "retry",
    },
  },
  {
    pattern: /No response body|stream|SSE/i,
    friendly: {
      message: "La generation a ete interrompue. Reessayez votre demande.",
      actionLabel: "Reessayer",
      actionType: "retry",
    },
  },

  // Firestore / Database errors
  {
    pattern: /firestore|firebase.*error|permission.?denied|PERMISSION_DENIED/i,
    friendly: {
      message: "Impossible d'acceder a vos donnees. Rafraichissez la page.",
      actionLabel: "Rafraichir",
      actionType: "refresh",
    },
  },
  {
    pattern: /not.?found|introuvable|404|does not exist/i,
    friendly: {
      message: "Ce contenu n'est plus disponible. Il a peut-etre ete supprime.",
    },
  },

  // Stripe / Payment errors
  {
    pattern: /payment.*failed|card.*declined|carte.*refusee|stripe/i,
    friendly: {
      message: "Le paiement n'a pas abouti. Verifiez vos informations de paiement.",
      actionLabel: "Gerer le paiement",
      actionType: "settings",
    },
  },

  // LinkedIn / Social errors
  {
    pattern: /linkedin.*error|publication.*failed|echec.*publication/i,
    friendly: {
      message: "La publication a echoue. Verifiez votre connexion LinkedIn et reessayez.",
      actionLabel: "Reconnecter",
      actionType: "reconnect",
    },
  },
  {
    pattern: /linkedin.*token|linkedin.*expire|reconnect.*linkedin/i,
    friendly: {
      message: "Votre connexion LinkedIn a expire. Reconnectez votre compte.",
      actionLabel: "Reconnecter",
      actionType: "reconnect",
    },
  },

  // File / Upload errors
  {
    pattern: /file.*too.*large|trop.*lourde?|max.*size|upload.*fail/i,
    friendly: {
      message: "Le fichier est trop volumineux. Reduisez sa taille et reessayez.",
    },
  },
  {
    pattern: /format.*non.*support|unsupported.*format|type.*invalide/i,
    friendly: {
      message: "Ce format de fichier n'est pas pris en charge. Essayez un autre format.",
    },
  },

  // Clipboard
  {
    pattern: /copie|clipboard|copy/i,
    friendly: {
      message: "Impossible de copier. Selectionnez le texte manuellement.",
    },
  },

  // Scheduling
  {
    pattern: /date.*futur|past.*date|date.*passee/i,
    friendly: {
      message: "Choisissez une date future pour programmer votre publication.",
    },
  },

  // Server errors
  {
    pattern: /500|internal.*server|server.*error/i,
    friendly: {
      message: "Nos serveurs rencontrent un probleme. L'equipe est prevenue. Reessayez bientot.",
      actionLabel: "Reessayer",
      actionType: "retry",
    },
  },
  {
    pattern: /503|service.*unavailable|maintenance/i,
    friendly: {
      message: "Le service est temporairement indisponible. Reessayez dans quelques minutes.",
      actionLabel: "Reessayer",
      actionType: "retry",
    },
  },
];

// Default fallback for unmatched errors
const DEFAULT_ERROR: FriendlyError = {
  message: "Quelque chose n'a pas fonctionne. Reessayez ou contactez le support si le probleme persiste.",
  actionLabel: "Reessayer",
  actionType: "retry",
};

/**
 * Transform any error (string, Error, or unknown) into a user-friendly message.
 * Matches against known patterns and returns empathetic wording with recovery options.
 */
export function getFriendlyError(error: unknown): FriendlyError {
  const errorString = extractErrorString(error);

  for (const { pattern, friendly } of ERROR_PATTERNS) {
    if (pattern.test(errorString)) {
      return friendly;
    }
  }

  return DEFAULT_ERROR;
}

/**
 * Get just the user-friendly message string (shorthand for simple toast usage).
 */
export function getFriendlyMessage(error: unknown): string {
  return getFriendlyError(error).message;
}

/**
 * For cases where we already have a French message that's user-friendly,
 * pass it through. Otherwise, transform it.
 * This is useful for messages that are already written in the UI layer.
 */
export function ensureFriendly(message: string): string {
  // If the message is already user-friendly (no technical jargon), return as-is
  const technicalPatterns = /error \d{3}|API|exception|undefined|null|stack|ECONNR|ERR_|Failed to/i;
  if (!technicalPatterns.test(message)) {
    return message;
  }
  return getFriendlyError(message).message;
}

function extractErrorString(error: unknown): string {
  if (typeof error === "string") return error;
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return String(error);
}
