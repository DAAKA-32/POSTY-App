/**
 * SEO Keywords Strategy for POSTY
 * Long-tail keywords optimized for FR and EN-US markets
 */

/**
 * Long-tail Keywords - French Market
 * Recherches très ciblées pour le marché français
 */
export const longTailKeywordsFR = {
  // Intent: Informational (Comment faire)
  informational: [
    "comment écrire un post linkedin qui génère de l'engagement",
    "comment augmenter sa visibilité sur linkedin en 2024",
    "comment créer du contenu linkedin professionnel",
    "comment utiliser l'ia pour rédiger des posts linkedin",
    "comment améliorer son personal branding linkedin",
    "comment publier régulièrement sur linkedin sans perdre de temps",
    "comment rédiger un post linkedin storytelling",
    "comment faire un post linkedin viral",
    "quelle fréquence de publication sur linkedin",
    "comment trouver des idées de posts linkedin",
  ],

  // Intent: Commercial (Comparaison, recherche de solution)
  commercial: [
    "meilleur générateur de posts linkedin ia",
    "outil ia pour créer des posts linkedin",
    "alternative jasper pour linkedin",
    "logiciel rédaction posts linkedin automatique",
    "application pour générer du contenu linkedin",
    "outil gratuit pour écrire des posts linkedin",
    "comparatif outils ia linkedin",
    "posty vs taplio vs authory",
    "meilleure app création contenu linkedin",
    "outil storytelling linkedin professionnel",
  ],

  // Intent: Transactional (Prêt à acheter/essayer)
  transactional: [
    "générateur posts linkedin gratuit",
    "essayer posty gratuitement",
    "créer un post linkedin en 30 secondes",
    "générer post linkedin ia sans inscription",
    "outil linkedin ia prix",
    "abonnement générateur linkedin pas cher",
    "posty pro tarif mensuel",
    "générateur linkedin illimité",
  ],

  // Intent: Navigational (Recherche de marque)
  navigational: [
    "posty linkedin",
    "posty ia",
    "posty générateur",
    "posty app",
    "posty avis",
    "posty connexion",
    "posty inscription",
  ],
};

/**
 * Long-tail Keywords - US English Market
 * Highly targeted searches for the American market
 */
export const longTailKeywordsEN = {
  // Intent: Informational (How to)
  informational: [
    "how to write a linkedin post that gets engagement",
    "how to increase linkedin visibility in 2024",
    "how to create professional linkedin content",
    "how to use ai to write linkedin posts",
    "how to improve personal branding on linkedin",
    "how to post consistently on linkedin without wasting time",
    "how to write a storytelling linkedin post",
    "how to make a viral linkedin post",
    "best posting frequency for linkedin",
    "how to find linkedin post ideas",
  ],

  // Intent: Commercial (Comparison, solution seeking)
  commercial: [
    "best ai linkedin post generator",
    "ai tool to create linkedin posts",
    "jasper alternative for linkedin",
    "automated linkedin post writing software",
    "app to generate linkedin content",
    "free tool to write linkedin posts",
    "linkedin ai tools comparison",
    "posty vs taplio vs authory",
    "best linkedin content creation app",
    "professional linkedin storytelling tool",
  ],

  // Intent: Transactional (Ready to buy/try)
  transactional: [
    "free linkedin post generator",
    "try posty for free",
    "create linkedin post in 30 seconds",
    "generate linkedin post ai no signup",
    "linkedin ai tool pricing",
    "cheap linkedin generator subscription",
    "posty pro monthly price",
    "unlimited linkedin generator",
  ],

  // Intent: Navigational (Brand search)
  navigational: [
    "posty linkedin",
    "posty ai",
    "posty generator",
    "posty app",
    "posty reviews",
    "posty login",
    "posty signup",
  ],
};

/**
 * Keyword Clusters for Content Strategy
 * Grouped by topic for internal linking
 */
export const keywordClusters = {
  // Cluster 1: LinkedIn Visibility
  linkedinVisibility: {
    pillar: "visibilité linkedin",
    pillarEN: "linkedin visibility",
    related: [
      "algorithme linkedin",
      "engagement linkedin",
      "reach linkedin",
      "impressions linkedin",
      "croissance audience linkedin",
    ],
    relatedEN: [
      "linkedin algorithm",
      "linkedin engagement",
      "linkedin reach",
      "linkedin impressions",
      "linkedin audience growth",
    ],
  },

  // Cluster 2: AI Content Creation
  aiContentCreation: {
    pillar: "création contenu ia",
    pillarEN: "ai content creation",
    related: [
      "ia générative",
      "chatgpt linkedin",
      "automatisation contenu",
      "rédaction assistée ia",
      "intelligence artificielle marketing",
    ],
    relatedEN: [
      "generative ai",
      "chatgpt linkedin",
      "content automation",
      "ai-assisted writing",
      "artificial intelligence marketing",
    ],
  },

  // Cluster 3: Personal Branding
  personalBranding: {
    pillar: "personal branding linkedin",
    pillarEN: "linkedin personal branding",
    related: [
      "marque personnelle",
      "image professionnelle",
      "thought leadership",
      "expertise sectorielle",
      "crédibilité professionnelle",
    ],
    relatedEN: [
      "personal brand",
      "professional image",
      "thought leadership",
      "industry expertise",
      "professional credibility",
    ],
  },

  // Cluster 4: LinkedIn Storytelling
  storytelling: {
    pillar: "storytelling linkedin",
    pillarEN: "linkedin storytelling",
    related: [
      "narration professionnelle",
      "posts émotionnels",
      "histoire personnelle linkedin",
      "accroche linkedin",
      "hook post linkedin",
    ],
    relatedEN: [
      "professional narrative",
      "emotional posts",
      "linkedin personal story",
      "linkedin hook",
      "post hook linkedin",
    ],
  },
};

/**
 * Meta descriptions templates with keywords
 * Optimized for CTR and keyword inclusion
 */
export const metaTemplates = {
  home: {
    fr: {
      title: "POSTY - Générateur de Posts LinkedIn IA | {keyword}",
      description:
        "{keyword} en quelques secondes. POSTY crée 2 versions uniques (Storytelling & Business) pour chaque idée. Plan gratuit disponible.",
      keywords: ["Créez des posts LinkedIn percutants", "Générez du contenu LinkedIn professionnel"],
    },
    en: {
      title: "POSTY - AI LinkedIn Post Generator | {keyword}",
      description:
        "{keyword} in seconds. POSTY creates 2 unique versions (Storytelling & Business) for every idea. Start free today.",
      keywords: ["Create high-performing LinkedIn posts", "Generate professional LinkedIn content"],
    },
  },
};

/**
 * H1/H2 variations for A/B testing
 * With integrated long-tail keywords
 */
export const headingVariations = {
  home: {
    h1: {
      fr: [
        "Générez des posts LinkedIn percutants avec l'IA",
        "Créez du contenu LinkedIn professionnel en quelques secondes",
        "L'IA qui rédige vos posts LinkedIn à votre place",
      ],
      en: [
        "Generate high-performing LinkedIn posts with AI",
        "Create professional LinkedIn content in seconds",
        "The AI that writes your LinkedIn posts for you",
      ],
    },
    h2: {
      fr: [
        "Comment fonctionne le générateur de posts LinkedIn ?",
        "Pourquoi choisir POSTY pour vos posts LinkedIn ?",
        "2 versions pour chaque idée : Storytelling & Business",
      ],
      en: [
        "How does the LinkedIn post generator work?",
        "Why choose POSTY for your LinkedIn posts?",
        "2 versions for every idea: Storytelling & Business",
      ],
    },
  },
};

export default {
  longTailKeywordsFR,
  longTailKeywordsEN,
  keywordClusters,
  metaTemplates,
  headingVariations,
};
