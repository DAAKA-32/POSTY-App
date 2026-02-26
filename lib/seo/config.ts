/**
 * SEO Configuration for POSTY
 * Centralized SEO settings for scalability and consistency
 */

export const seoConfig = {
  // Site info
  siteName: "Posty AI",
  siteUrl: process.env.NEXT_PUBLIC_BASE_URL || "https://postyapp.ai",
  defaultLocale: "fr" as const,
  supportedLocales: ["fr", "en"] as const,

  // Branding
  brandName: "Posty AI",
  tagline: "Générez plus de prospects LinkedIn avec l'IA",

  // Social
  twitterHandle: "@posty_app",
  ogImageDefault: "/og-image.png",

  // Contact
  supportEmail: "postygroup@gmail.com",
  privacyEmail: "postygroup@gmail.com",

  // Founders - E-E-A-T: Authoritativeness
  founders: [
    {
      name: "Emilien Nepveu",
      role: "Co-Founder & Co-CEO, CTO",
      linkedIn: "https://www.linkedin.com/in/e-nepveu-58a38127a/",
    },
    {
      name: "Côme Maubert",
      role: "Co-Founder & Co-CEO, CFO",
    },
  ],

  // Company - E-E-A-T: Trust
  company: {
    foundingYear: 2024,
    legalStatus: "Micro-entreprise (Entreprise Individuelle) — SIRET 101 134 633 00011",
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
      title: "Posty AI – Attirez plus de prospects avec l'intelligence artificielle",
      description:
        "Automatisez votre présence LinkedIn et attirez des prospects qualifiés grâce à l'IA. Créez des posts professionnels percutants en quelques secondes. Essai gratuit.",
      keywords: [
        "Posty",
        "Posty AI",
        "prospects LinkedIn",
        "automatisation LinkedIn",
        "IA LinkedIn",
        "générer prospects",
        "contenu LinkedIn IA",
        "personal branding LinkedIn",
      ],
    },
    en: {
      title: "Posty AI – Generate More LinkedIn Leads with Artificial Intelligence",
      description:
        "Automate your LinkedIn presence and attract qualified prospects with AI. Create professional posts in seconds. Free trial included.",
      keywords: [
        "Posty",
        "Posty AI",
        "LinkedIn leads",
        "LinkedIn automation",
        "AI LinkedIn tool",
        "generate prospects",
        "LinkedIn content AI",
        "personal branding LinkedIn",
      ],
    },
  },
  pricing: {
    fr: {
      title: "Tarifs Posty - Plans Pro et Max | Automatisation LinkedIn IA",
      description:
        "Découvrez les offres Posty : Pro et Max. Automatisez LinkedIn et générez des prospects qualifiés avec l'IA. Essai gratuit 7 jours.",
      keywords: [
        "tarifs Posty",
        "prix automatisation LinkedIn",
        "abonnement LinkedIn IA",
        "Posty Pro",
        "Posty Max",
      ],
    },
    en: {
      title: "Posty Pricing - Pro & Max Plans | LinkedIn AI Automation",
      description:
        "Explore Posty plans: Pro and Max. Automate LinkedIn and generate qualified leads with AI. 7-day free trial included.",
      keywords: [
        "Posty pricing",
        "LinkedIn automation price",
        "LinkedIn AI subscription",
        "Posty trial",
        "Posty Pro plan",
      ],
    },
  },
  login: {
    fr: {
      title: "Connexion | Posty - Automatisation LinkedIn IA",
      description:
        "Connectez-vous à Posty pour automatiser votre LinkedIn et générer des prospects qualifiés avec l'IA.",
      keywords: ["connexion Posty", "login Posty"],
    },
    en: {
      title: "Login | Posty - LinkedIn AI Automation",
      description:
        "Sign in to Posty to automate your LinkedIn and generate qualified leads with AI.",
      keywords: ["Posty login", "sign in Posty"],
    },
  },
  signup: {
    fr: {
      title: "Inscription Gratuite | Posty - Automatisation LinkedIn IA",
      description:
        "Créez votre compte Posty et automatisez votre LinkedIn. Générez des prospects qualifiés avec l'IA. Essai gratuit 7 jours.",
      keywords: ["inscription Posty", "créer compte Posty", "essai gratuit LinkedIn IA"],
    },
    en: {
      title: "Free Sign Up | Posty - LinkedIn AI Automation",
      description:
        "Create your free Posty account and start automating LinkedIn. Generate qualified leads with AI.",
      keywords: ["Posty signup", "create Posty account", "free trial LinkedIn AI"],
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
    title: "Posty AI – Attirez plus de prospects avec l'intelligence artificielle",
    description:
      "Automatisez votre présence LinkedIn et attirez des prospects qualifiés grâce à l'IA. Créez des posts professionnels percutants en quelques secondes. Essai gratuit.",
    keywords: [
      "Posty",
      "Posty AI",
      "prospects LinkedIn",
      "automatisation LinkedIn",
      "IA LinkedIn",
      "générer prospects",
    ],
  },
  pricing: {
    title: "Tarifs Posty - Plans Pro et Max | Automatisation LinkedIn IA",
    description:
      "Découvrez les offres Posty : Pro et Max. Automatisez LinkedIn et générez des prospects qualifiés avec l'IA. Essai gratuit 7 jours.",
    keywords: [
      "tarifs Posty",
      "prix automatisation LinkedIn",
      "abonnement LinkedIn IA",
    ],
  },
  legal: {
    privacy: {
      title: "Politique de Confidentialité | Posty",
      description:
        "Découvrez comment Posty protège vos données personnelles conformément au RGPD.",
    },
    terms: {
      title: "Conditions Générales d'Utilisation | Posty",
      description:
        "CGU de Posty : consultez les conditions d'utilisation de notre outil d'automatisation LinkedIn IA.",
    },
    notices: {
      title: "Mentions Légales | Posty",
      description:
        "Mentions légales de Posty : informations sur l'éditeur, l'hébergeur et les droits applicables.",
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
    name: "Posty AI",
    url: seoConfig.siteUrl,
    logo: {
      "@type": "ImageObject",
      url: `${seoConfig.siteUrl}/favicon-512.png`,
      width: "512",
      height: "512",
    },
    description: seoConfig.mission,
    foundingDate: "2024",
    founder: seoConfig.founders.map((f) => ({
      "@type": "Person",
      name: f.name,
      jobTitle: f.role,
      ...(f.linkedIn ? { sameAs: [f.linkedIn] } : {}),
    })),
    sameAs: [seoConfig.founders[0].linkedIn].filter(Boolean),
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
    slogan: "Générez plus de prospects LinkedIn avec l'IA",
  },

  softwareApplication: {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Posty AI",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "EUR",
    },
    // aggregateRating removed: no verified reviews yet
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
