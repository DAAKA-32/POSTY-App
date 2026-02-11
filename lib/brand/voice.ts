/**
 * POSTY Brand Voice Guide
 * Defines the consistent tone, style, and messaging principles
 *
 * POSTY speaks like: "Un assistant IA premium pour professionnels exigeants"
 */

export const brandVoice = {
  // Core Identity
  identity: {
    tagline: "L'IA qui écrit vos posts LinkedIn",
    positioning: "Assistant IA premium pour professionnels ambitieux",
    promise: "Des posts LinkedIn impactants, en quelques secondes",
  },

  // Tone Guidelines
  tone: {
    primary: "professionnel", // Never casual or sloppy
    secondary: "confiant", // Assured, not arrogant
    tertiary: "inspirant", // Motivating, not pushy

    // What we ARE
    weAre: [
      "Professionnel et sérieux",
      "Confiant sans être arrogant",
      "Inspirant sans être vendeur",
      "Direct sans être froid",
      "Accessible sans être familier",
    ],

    // What we are NOT
    weAreNot: [
      "Agressif ou pushy",
      "Cheap ou discount",
      "Marketing bullshit",
      "Condescendant",
      "Faussement amical",
    ],
  },

  // Writing Principles
  principles: {
    // Clarity over cleverness
    clarity: "Préférer la clarté à l'originalité forcée",
    // Respect the user
    respect: "L'utilisateur est un professionnel intelligent",
    // Value first
    value: "Toujours montrer le bénéfice concret",
    // No pressure
    noPressure: "Inciter sans forcer, suggérer sans manipuler",
    // Premium feel
    premium: "Chaque mot doit renforcer l'image premium",
  },

  // Message Templates by Context
  messages: {
    // Success states - Celebrate without excess
    success: {
      pattern: "[Action accomplie]. [Bénéfice obtenu].",
      examples: [
        "Post généré. Prêt à publier.",
        "Copié dans le presse-papier.",
        "Publié sur LinkedIn avec succès.",
      ],
    },

    // Limits - Valorize, don't frustrate
    limits: {
      pattern: "[Constat neutre]. [Solution valorisante].",
      examples: [
        "Vous avez utilisé vos 3 posts cette semaine. Passez en Pro pour créer sans limite.",
        "Génération limitée en version gratuite. Débloquez l'illimité avec Pro.",
      ],
      avoid: [
        "Limite atteinte ! Achetez Pro !",
        "Vous ne pouvez plus générer...",
        "Upgrade maintenant pour continuer !",
      ],
    },

    // Upgrade prompts - Inspire, don't push
    upgrade: {
      pattern: "[Bénéfice Pro]. [Action simple].",
      examples: [
        "Générations illimitées, support prioritaire. Découvrir Pro.",
        "Publiez sans compter. Voir les avantages Pro.",
      ],
      avoid: [
        "Achetez maintenant !",
        "Offre limitée !",
        "Ne ratez pas cette occasion !",
      ],
    },

    // Empty states - Guide, don't blame
    empty: {
      pattern: "[Contexte]. [Suggestion d'action].",
      examples: [
        "Aucun post pour l'instant. Décrivez votre première idée.",
        "Historique vide. Vos posts apparaîtront ici.",
      ],
    },

    // Errors - Reassure, don't alarm
    errors: {
      pattern: "[Problème simple]. [Solution ou réassurance].",
      examples: [
        "Connexion interrompue. Réessayez dans quelques instants.",
        "Génération impossible pour le moment. Nos équipes sont informées.",
      ],
    },
  },

  // CTA Guidelines
  cta: {
    // Primary CTAs - Clear and valuable
    primary: {
      style: "Action + Bénéfice implicite",
      examples: [
        "Essayer gratuitement",
        "Générer mon post",
        "Commencer maintenant",
        "Voir les tarifs",
      ],
      avoid: [
        "Acheter",
        "S'abonner",
        "Payer",
        "Commander",
      ],
    },

    // Secondary CTAs - Soft and inviting
    secondary: {
      style: "Découverte sans engagement",
      examples: [
        "En savoir plus",
        "Découvrir les fonctionnalités",
        "Explorer",
        "Comparer les plans",
      ],
    },

    // Upgrade CTAs - Value-focused
    upgrade: {
      style: "Bénéfice > Prix",
      examples: [
        "Passer en illimité",
        "Débloquer toutes les fonctionnalités",
        "Découvrir Pro",
      ],
      avoid: [
        "Upgrader maintenant !",
        "Achetez Pro !",
        "Abonnez-vous !",
      ],
    },
  },

  // Conversion Psychology (Ethical)
  conversion: {
    // Soft scarcity - Honest limits
    scarcity: {
      do: "Afficher les limites réelles de façon neutre",
      dont: "Créer de fausse urgence ou rareté",
      example: "3 posts restants cette semaine",
    },

    // Social proof - Credible
    socialProof: {
      do: "Utiliser des chiffres réels ou réalistes",
      dont: "Inventer des témoignages ou gonfler les stats",
      example: "Rejoint par 10 000+ professionnels",
    },

    // Value framing - Benefits first
    valueFraming: {
      do: "Mettre en avant le gain professionnel",
      dont: "Insister sur le prix ou la promotion",
      example: "Gagnez 2h par semaine sur votre contenu LinkedIn",
    },

    // User respect - Always
    userRespect: {
      do: "Traiter l'utilisateur comme un professionnel intelligent",
      dont: "Utiliser des dark patterns ou manipulation émotionnelle",
      example: "Vous choisissez le plan qui vous convient",
    },
  },
} as const;

/**
 * Brand Voice Checker
 * Helper to validate copy against brand guidelines
 */
export function validateCopy(text: string): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  const lowerText = text.toLowerCase();

  // Check for forbidden patterns
  const forbiddenPatterns = [
    { pattern: /achet(ez|er) maintenant/i, issue: "Éviter 'Achetez maintenant' - trop agressif" },
    { pattern: /offre limit[ée]e/i, issue: "Éviter 'Offre limitée' - fausse urgence" },
    { pattern: /ne (ratez|manquez) pas/i, issue: "Éviter FOMO - manipulation émotionnelle" },
    { pattern: /upgrade(z)? maintenant/i, issue: "Éviter 'Upgrade maintenant' - trop pushy" },
    { pattern: /!/g, issue: "Limiter les points d'exclamation - ton trop agressif" },
  ];

  forbiddenPatterns.forEach(({ pattern, issue }) => {
    if (pattern.test(text)) {
      issues.push(issue);
    }
  });

  // Check for excessive exclamation marks
  const exclamationCount = (text.match(/!/g) || []).length;
  if (exclamationCount > 1) {
    issues.push(`Trop de points d'exclamation (${exclamationCount}) - ton trop agressif`);
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

export default brandVoice;
