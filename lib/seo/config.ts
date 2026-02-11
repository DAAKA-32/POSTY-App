/**
 * SEO Configuration for POSTY
 * Centralized SEO settings for scalability and consistency
 */

export const seoConfig = {
  // Site info
  siteName: "POSTY",
  siteUrl: process.env.NEXT_PUBLIC_BASE_URL || "https://posty-app.vercel.app",
  defaultLocale: "fr" as const,
  supportedLocales: ["fr", "en"] as const,

  // Branding
  brandName: "POSTY",
  tagline: "Générateur de Posts LinkedIn IA",

  // Social
  twitterHandle: "@posty_app",
  ogImageDefault: "/og-image.png",

  // Contact
  supportEmail: "support@posty.app",
  privacyEmail: "privacy@posty.app",

  // Founder - E-E-A-T: Authoritativeness
  founder: {
    name: "Emilien Nepveu",
    role: "Fondateur & CEO",
    linkedIn: "https://www.linkedin.com/in/e-nepveu-58a38127a/",
  },

  // Company - E-E-A-T: Trust
  company: {
    foundingYear: 2024,
    legalStatus: "Entreprise individuelle (en cours d'immatriculation)",
    country: "France",
  },

  // Mission - E-E-A-T: Expertise
  mission: "Démocratiser le contenu professionnel et automatiser le personal branding pour tous.",
};

/**
 * International SEO Configuration
 * Defines language-specific settings for FR and EN-US
 */
export const i18nSeoConfig = {
  // Supported locales with hreflang codes
  locales: [
    {
      code: "fr",
      hreflang: "fr",
      name: "Français",
      region: "France",
      htmlLang: "fr",
      ogLocale: "fr_FR",
    },
    {
      code: "en",
      hreflang: "en-us",
      name: "English (US)",
      region: "United States",
      htmlLang: "en-US",
      ogLocale: "en_US",
    },
  ],

  // Default locale for x-default hreflang
  defaultLocale: "fr",

  // URL strategy: "query" uses ?lang=fr, "path" would use /fr/
  urlStrategy: "query" as const,

  // Generate URL for a specific language
  getLocalizedUrl: (path: string, lang: string) => {
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    const basePath = cleanPath.split("?")[0];
    return `${seoConfig.siteUrl}${basePath}?lang=${lang}`;
  },

  // Generate canonical URL (without language param for default)
  getCanonicalUrl: (path: string) => {
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    const basePath = cleanPath.split("?")[0];
    return `${seoConfig.siteUrl}${basePath}`;
  },

  // Generate alternates object for metadata
  getAlternates: (path: string) => {
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    const basePath = cleanPath.split("?")[0];

    return {
      canonical: `${seoConfig.siteUrl}${basePath}`,
      languages: {
        "fr-FR": `${seoConfig.siteUrl}${basePath}?lang=fr`,
        "en-US": `${seoConfig.siteUrl}${basePath}?lang=en`,
        "x-default": `${seoConfig.siteUrl}${basePath}`,
      },
    };
  },
};

/**
 * Localized page metadata
 * SEO-optimized titles and descriptions for each language
 * Keywords are adapted (not just translated) for each market
 */
export const localizedPageSeo = {
  home: {
    fr: {
      title: "POSTY - Générateur de Posts LinkedIn IA | Créez du Contenu Impactant",
      description:
        "Générez des posts LinkedIn percutants en quelques secondes avec l'IA. POSTY crée 2 versions (Storytelling & Business) pour chaque idée. Essayez gratuitement.",
      keywords: [
        "générateur posts LinkedIn",
        "IA LinkedIn",
        "créer post LinkedIn",
        "contenu LinkedIn IA",
        "storytelling LinkedIn",
        "personal branding LinkedIn",
        "automatiser posts LinkedIn",
      ],
    },
    en: {
      title: "POSTY - AI LinkedIn Post Generator | Create Engaging Content",
      description:
        "Generate high-performing LinkedIn posts in seconds with AI. POSTY creates 2 versions (Storytelling & Business) for every idea. Try free today.",
      keywords: [
        "LinkedIn post generator",
        "AI LinkedIn tool",
        "create LinkedIn post",
        "LinkedIn content AI",
        "LinkedIn storytelling",
        "personal branding LinkedIn",
        "automate LinkedIn posts",
      ],
    },
  },
  pricing: {
    fr: {
      title: "Tarifs POSTY - Plans Gratuit, Pro et Max | Générateur LinkedIn IA",
      description:
        "Découvrez nos offres POSTY : 3 posts gratuits/semaine ou illimité en Pro. Générez des posts LinkedIn professionnels avec l'IA sans engagement.",
      keywords: [
        "tarifs POSTY",
        "prix générateur LinkedIn",
        "abonnement LinkedIn IA",
        "POSTY gratuit",
        "POSTY Pro",
      ],
    },
    en: {
      title: "POSTY Pricing - Free, Pro & Max Plans | AI LinkedIn Generator",
      description:
        "Explore POSTY plans: 3 free posts/week or unlimited with Pro. Create professional LinkedIn posts with AI. No commitment required.",
      keywords: [
        "POSTY pricing",
        "LinkedIn generator price",
        "LinkedIn AI subscription",
        "POSTY free",
        "POSTY Pro plan",
      ],
    },
  },
  login: {
    fr: {
      title: "Connexion | POSTY - Générateur de Posts LinkedIn IA",
      description:
        "Connectez-vous à votre compte POSTY pour générer des posts LinkedIn impactants avec l'IA.",
      keywords: ["connexion POSTY", "login POSTY"],
    },
    en: {
      title: "Login | POSTY - AI LinkedIn Post Generator",
      description:
        "Sign in to your POSTY account to generate impactful LinkedIn posts with AI.",
      keywords: ["POSTY login", "sign in POSTY"],
    },
  },
  signup: {
    fr: {
      title: "Inscription Gratuite | POSTY - Générateur de Posts LinkedIn IA",
      description:
        "Créez votre compte POSTY gratuitement et commencez à générer des posts LinkedIn impactants avec l'IA. Sans carte bancaire.",
      keywords: ["inscription POSTY", "créer compte POSTY", "essai gratuit LinkedIn IA"],
    },
    en: {
      title: "Free Sign Up | POSTY - AI LinkedIn Post Generator",
      description:
        "Create your free POSTY account and start generating impactful LinkedIn posts with AI. No credit card required.",
      keywords: ["POSTY signup", "create POSTY account", "free trial LinkedIn AI"],
    },
  },
};

/**
 * SEO Silos Structure for Future Content Strategy
 * Prepared for blog and content scaling
 */
export const seoSilos = {
  // Silo 1: LinkedIn & Visibility
  linkedinVisibility: {
    name: "LinkedIn & Visibilité",
    slug: "linkedin-visibility",
    description: "Tout sur la visibilité et le personal branding LinkedIn",
    pillarPage: "/guides/linkedin-visibility",
    topics: [
      "Comment augmenter sa visibilité LinkedIn",
      "Stratégie de personal branding",
      "Optimiser son profil LinkedIn",
      "Fréquence de publication idéale",
      "Algorithme LinkedIn expliqué",
    ],
  },

  // Silo 2: Storytelling Professional
  storytelling: {
    name: "Storytelling Professionnel",
    slug: "storytelling",
    description: "L'art du storytelling sur LinkedIn",
    pillarPage: "/guides/storytelling-linkedin",
    topics: [
      "Techniques de storytelling LinkedIn",
      "Structures de posts narratifs",
      "Créer l'émotion dans ses posts",
      "Storytelling B2B efficace",
      "Exemples de storytelling réussi",
    ],
  },

  // Silo 3: AI & Productivity
  aiProductivity: {
    name: "IA & Productivité",
    slug: "ia-productivite",
    description: "Utiliser l'IA pour créer du contenu",
    pillarPage: "/guides/ia-creation-contenu",
    topics: [
      "IA pour créer du contenu LinkedIn",
      "Prompts efficaces pour LinkedIn",
      "Automatiser sa création de contenu",
      "IA vs rédaction manuelle",
      "Outils IA pour LinkedIn",
    ],
  },

  // Silo 4: B2B Content Creation
  b2bContent: {
    name: "Création de Contenu B2B",
    slug: "contenu-b2b",
    description: "Stratégies de contenu pour le B2B",
    pillarPage: "/guides/contenu-b2b-linkedin",
    topics: [
      "Contenu LinkedIn pour le B2B",
      "Générer des leads via LinkedIn",
      "Thought leadership B2B",
      "Contenu éducatif vs promotionnel",
      "Mesurer le ROI du contenu LinkedIn",
    ],
  },
};

/**
 * Page-specific SEO configurations
 */
export const pageSeo = {
  home: {
    title: "POSTY - Générateur de Posts LinkedIn IA | Créez du Contenu Impactant",
    description:
      "Générez des posts LinkedIn percutants en quelques secondes avec l'IA. POSTY crée 2 versions (Storytelling & Business) pour chaque idée. Essayez gratuitement.",
    keywords: [
      "générateur posts LinkedIn",
      "IA LinkedIn",
      "créer post LinkedIn",
      "contenu LinkedIn IA",
      "storytelling LinkedIn",
    ],
  },
  pricing: {
    title: "Tarifs POSTY - Plans Gratuit, Pro et Max | Générateur LinkedIn IA",
    description:
      "Découvrez nos offres POSTY : 3 posts gratuits/semaine ou illimité en Pro. Générez des posts LinkedIn professionnels avec l'IA sans engagement.",
    keywords: [
      "tarifs POSTY",
      "prix générateur LinkedIn",
      "abonnement LinkedIn IA",
    ],
  },
  legal: {
    privacy: {
      title: "Politique de Confidentialité | POSTY",
      description:
        "Découvrez comment POSTY protège vos données personnelles conformément au RGPD.",
    },
    terms: {
      title: "Conditions Générales d'Utilisation | POSTY",
      description:
        "CGU de POSTY : consultez les conditions d'utilisation de notre générateur de posts LinkedIn IA.",
    },
    notices: {
      title: "Mentions Légales | POSTY",
      description:
        "Mentions légales de POSTY : informations sur l'éditeur, l'hébergeur et les droits applicables.",
    },
  },
};

/**
 * Structured Data Templates for Rich Snippets
 */
export const structuredData = {
  organization: {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${seoConfig.siteUrl}/#organization`,
    name: "POSTY",
    url: seoConfig.siteUrl,
    logo: {
      "@type": "ImageObject",
      url: `${seoConfig.siteUrl}/logo.jpg`,
      width: "512",
      height: "512",
    },
    description: seoConfig.mission,
    foundingDate: "2024",
    founder: {
      "@type": "Person",
      name: seoConfig.founder.name,
      jobTitle: seoConfig.founder.role,
      sameAs: [seoConfig.founder.linkedIn],
    },
    sameAs: [seoConfig.founder.linkedIn],
    contactPoint: {
      "@type": "ContactPoint",
      email: seoConfig.supportEmail,
      contactType: "customer support",
      availableLanguage: ["French", "English"],
    },
    address: {
      "@type": "PostalAddress",
      addressCountry: "FR",
    },
    slogan: "Démocratiser le contenu professionnel",
  },

  softwareApplication: {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "POSTY",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "EUR",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.9",
      ratingCount: "150",
    },
  },

  faqPage: (questions: { question: string; answer: string }[]) => ({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: questions.map((q) => ({
      "@type": "Question",
      name: q.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: q.answer,
      },
    })),
  }),
};

export default seoConfig;
