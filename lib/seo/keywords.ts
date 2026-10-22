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
    "comment augmenter sa visibilité sur linkedin",
    "comment construire une stratégie de contenu linkedin",
    "qu'est-ce qu'un agent marketing ia",
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
    "agent marketing ia pour linkedin",
    "assistant marketing ia",
    "outil de stratégie de contenu linkedin",
    "automatisation des posts linkedin",
    "automatisation du marketing de contenu",
    "outil storytelling linkedin professionnel",
  ],

  // Intent: Transactional (Prêt à acheter/essayer)
  transactional: [
    "générateur posts linkedin gratuit",
    "essayer posty gratuitement",
    "créer un post linkedin en 30 secondes",
    "outil linkedin ia prix",
    "abonnement générateur linkedin pas cher",
    "posty pro tarif mensuel",
  ],

  // Intent: Navigational (Recherche de marque)
  navigational: [
    "posty linkedin",
    "posty ia",
    "posty générateur",
    "posty app",
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
    "how to increase linkedin visibility",
    "how to build a linkedin content strategy",
    "what is an ai marketing agent",
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
    "ai marketing agent for linkedin",
    "ai marketing assistant",
    "linkedin content strategy tool",
    "linkedin post automation",
    "content marketing automation tool",
    "professional linkedin storytelling tool",
  ],

  // Intent: Transactional (Ready to buy/try)
  transactional: [
    "free linkedin post generator",
    "try posty for free",
    "create linkedin post in 30 seconds",
    "linkedin ai tool pricing",
    "cheap linkedin generator subscription",
    "posty pro monthly price",
  ],

  // Intent: Navigational (Brand search)
  navigational: [
    "posty linkedin",
    "posty ai",
    "posty generator",
    "posty app",
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

  // Cluster 2b: AI Marketing Agent
  aiMarketingAgent: {
    pillar: "agent marketing ia",
    pillarEN: "ai marketing agent",
    related: [
      "assistant marketing ia",
      "stratégie de contenu linkedin",
      "automatisation des posts linkedin",
      "automatisation du marketing de contenu",
      "marketing de contenu linkedin",
    ],
    relatedEN: [
      "ai marketing assistant",
      "linkedin content strategy",
      "linkedin post automation",
      "content marketing automation",
      "linkedin content marketing",
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
      title: "Posty - Votre agent marketing IA pour LinkedIn | {keyword}",
      description:
        "{keyword} avec Posty : il apprend votre activité, construit votre stratégie de contenu LinkedIn et vous aide à créer, planifier et publier. Démarrez gratuitement.",
      keywords: ["Agent marketing IA pour LinkedIn", "Stratégie de contenu LinkedIn"],
    },
    en: {
      title: "Posty - Your AI Marketing Agent for LinkedIn | {keyword}",
      description:
        "{keyword} with Posty: it learns your business, builds your LinkedIn content strategy, and helps you create, schedule and publish. Start free.",
      keywords: ["AI marketing agent for LinkedIn", "LinkedIn content strategy"],
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
        "Votre marketing, toujours en avant",
        "Votre agent marketing IA pour LinkedIn",
        "Une stratégie de contenu LinkedIn qui se déroule sans vous épuiser",
      ],
      en: [
        "Your marketing, moving forward",
        "Your AI marketing agent for LinkedIn",
        "A LinkedIn content strategy that runs without the burnout",
      ],
    },
    h2: {
      fr: [
        "Comment fonctionne votre agent marketing IA ?",
        "Pourquoi choisir Posty pour votre contenu LinkedIn ?",
        "De votre activité au post publié : stratégie, création, publication",
      ],
      en: [
        "How does your AI marketing agent work?",
        "Why choose Posty for your LinkedIn content?",
        "From your business to a published post: strategy, creation, publishing",
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
