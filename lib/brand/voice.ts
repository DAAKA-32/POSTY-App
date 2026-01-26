/**
 * POSTY Brand Voice Guide
 * Defines the consistent tone, style, and messaging principles
 *
 * POSTY speaks like: "Un assistant IA premium pour professionnels exigeants"
 */

export const brandVoice = {
  // Core Identity
  identity: {
    tagline: "L'IA qui ecrit vos posts LinkedIn",
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
      "Professionnel et serieux",
      "Confiant sans etre arrogant",
      "Inspirant sans etre vendeur",
      "Direct sans etre froid",
      "Accessible sans etre familier",
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
    clarity: "Preferer la clarte a l'originalite forcee",
    // Respect the user
    respect: "L'utilisateur est un professionnel intelligent",
    // Value first
    value: "Toujours montrer le benefice concret",
    // No pressure
    noPressure: "Inciter sans forcer, suggerer sans manipuler",
    // Premium feel
    premium: "Chaque mot doit renforcer l'image premium",
  },

  // Message Templates by Context
  messages: {
    // Success states - Celebrate without excess
    success: {
      pattern: "[Action accomplie]. [Benefice obtenu].",
      examples: [
        "Post genere. Pret a publier.",
        "Copie dans le presse-papier.",
        "Publie sur LinkedIn avec succes.",
      ],
    },

    // Limits - Valorize, don't frustrate
    limits: {
      pattern: "[Constat neutre]. [Solution valorisante].",
      examples: [
        "Vous avez utilise vos 3 posts cette semaine. Passez en Pro pour creer sans limite.",
        "Generation limitee en version gratuite. Debloquez l'illimite avec Pro.",
      ],
      avoid: [
        "Limite atteinte ! Achetez Pro !",
        "Vous ne pouvez plus generer...",
        "Upgrade maintenant pour continuer !",
      ],
    },

    // Upgrade prompts - Inspire, don't push
    upgrade: {
      pattern: "[Benefice Pro]. [Action simple].",
      examples: [
        "Generations illimitees, support prioritaire. Decouvrir Pro.",
        "Publiez sans compter. Voir les avantages Pro.",
      ],
      avoid: [
        "Achetez maintenant !",
        "Offre limitee !",
        "Ne ratez pas cette occasion !",
      ],
    },

    // Empty states - Guide, don't blame
    empty: {
      pattern: "[Contexte]. [Suggestion d'action].",
      examples: [
        "Aucun post pour l'instant. Decrivez votre premiere idee.",
        "Historique vide. Vos posts apparaitront ici.",
      ],
    },

    // Errors - Reassure, don't alarm
    errors: {
      pattern: "[Probleme simple]. [Solution ou reassurance].",
      examples: [
        "Connexion interrompue. Reessayez dans quelques instants.",
        "Generation impossible pour le moment. Nos equipes sont informees.",
      ],
    },
  },

  // CTA Guidelines
  cta: {
    // Primary CTAs - Clear and valuable
    primary: {
      style: "Action + Benefice implicite",
      examples: [
        "Essayer gratuitement",
        "Generer mon post",
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
      style: "Decouverte sans engagement",
      examples: [
        "En savoir plus",
        "Decouvrir les fonctionnalites",
        "Explorer",
        "Comparer les plans",
      ],
    },

    // Upgrade CTAs - Value-focused
    upgrade: {
      style: "Benefice > Prix",
      examples: [
        "Passer en illimite",
        "Debloquer toutes les fonctionnalites",
        "Decouvrir Pro",
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
      do: "Afficher les limites reelles de facon neutre",
      dont: "Creer de fausse urgence ou rarete",
      example: "3 posts restants cette semaine",
    },

    // Social proof - Credible
    socialProof: {
      do: "Utiliser des chiffres reels ou realistes",
      dont: "Inventer des temoignages ou gonfler les stats",
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
      dont: "Utiliser des dark patterns ou manipulation emotionnelle",
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
    { pattern: /achet(ez|er) maintenant/i, issue: "Eviter 'Achetez maintenant' - trop agressif" },
    { pattern: /offre limit[ée]e/i, issue: "Eviter 'Offre limitee' - fausse urgence" },
    { pattern: /ne (ratez|manquez) pas/i, issue: "Eviter FOMO - manipulation emotionnelle" },
    { pattern: /upgrade(z)? maintenant/i, issue: "Eviter 'Upgrade maintenant' - trop pushy" },
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
