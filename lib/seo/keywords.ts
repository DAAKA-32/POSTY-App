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
    "comment ecrire un post linkedin qui genere de l'engagement",
    "comment augmenter sa visibilite sur linkedin en 2024",
    "comment creer du contenu linkedin professionnel",
    "comment utiliser l'ia pour rediger des posts linkedin",
    "comment ameliorer son personal branding linkedin",
    "comment publier regulierement sur linkedin sans perdre de temps",
    "comment rediger un post linkedin storytelling",
    "comment faire un post linkedin viral",
    "quelle frequence de publication sur linkedin",
    "comment trouver des idees de posts linkedin",
  ],

  // Intent: Commercial (Comparaison, recherche de solution)
  commercial: [
    "meilleur generateur de posts linkedin ia",
    "outil ia pour creer des posts linkedin",
    "alternative jasper pour linkedin",
    "logiciel redaction posts linkedin automatique",
    "application pour generer du contenu linkedin",
    "outil gratuit pour ecrire des posts linkedin",
    "comparatif outils ia linkedin",
    "posty vs taplio vs authory",
    "meilleure app creation contenu linkedin",
    "outil storytelling linkedin professionnel",
  ],

  // Intent: Transactional (Prêt à acheter/essayer)
  transactional: [
    "generateur posts linkedin gratuit",
    "essayer posty gratuitement",
    "creer un post linkedin en 30 secondes",
    "generer post linkedin ia sans inscription",
    "outil linkedin ia prix",
    "abonnement generateur linkedin pas cher",
    "posty pro tarif mensuel",
    "generateur linkedin illimite",
  ],

  // Intent: Navigational (Recherche de marque)
  navigational: [
    "posty linkedin",
    "posty ia",
    "posty generateur",
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
    pillar: "visibilite linkedin",
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
    pillar: "creation contenu ia",
    pillarEN: "ai content creation",
    related: [
      "ia generative",
      "chatgpt linkedin",
      "automatisation contenu",
      "redaction assistee ia",
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
      "credibilite professionnelle",
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
      "posts emotionnels",
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
      title: "POSTY - Generateur de Posts LinkedIn IA | {keyword}",
      description:
        "{keyword} en quelques secondes. POSTY cree 2 versions uniques (Storytelling & Business) pour chaque idee. Essai gratuit, sans carte bancaire.",
      keywords: ["Creez des posts LinkedIn percutants", "Generez du contenu LinkedIn professionnel"],
    },
    en: {
      title: "POSTY - AI LinkedIn Post Generator | {keyword}",
      description:
        "{keyword} in seconds. POSTY creates 2 unique versions (Storytelling & Business) for every idea. Free trial, no credit card.",
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
        "Generez des posts LinkedIn percutants avec l'IA",
        "Creez du contenu LinkedIn professionnel en quelques secondes",
        "L'IA qui redige vos posts LinkedIn a votre place",
      ],
      en: [
        "Generate high-performing LinkedIn posts with AI",
        "Create professional LinkedIn content in seconds",
        "The AI that writes your LinkedIn posts for you",
      ],
    },
    h2: {
      fr: [
        "Comment fonctionne le generateur de posts LinkedIn ?",
        "Pourquoi choisir POSTY pour vos posts LinkedIn ?",
        "2 versions pour chaque idee : Storytelling & Business",
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
