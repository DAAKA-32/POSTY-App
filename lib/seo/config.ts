/**
 * SEO Configuration for POSTY
 * Centralized SEO settings for scalability and consistency
 */

export const seoConfig = {
  // Site info
  siteName: "Posty AI",
  siteUrl: process.env.NEXT_PUBLIC_BASE_URL || "https://postyapp.ai",
  defaultLocale: "fr" as const,
  supportedLocales: ["en", "fr", "es", "pt"] as const,

  // Branding
  brandName: "Posty AI",
  tagline: "Your marketing, moving forward",

  // Social
  twitterHandle: "@posty_app",
  ogImageDefault: "/og-image.jpg",

  // Contact
  supportEmail: "postygroup@gmail.com",
  privacyEmail: "postygroup@gmail.com",

  // Founders - E-E-A-T: Authoritativeness
  founders: [
    {
      name: "Emilien Nepveu",
      role: "Co-Founder & Co-CEO, CTO",
      linkedIn: "https://www.linkedin.com/in/emilien-nepveu-58a38127a/",
    },
    {
      name: "Côme Maubert",
      role: "Co-Founder & Co-CEO, CFO",
      linkedIn: "https://www.linkedin.com/in/c%C3%B4me-maubert-delamoriniere-a884693b3/",
    },
  ],

  // Company - E-E-A-T: Trust
  company: {
    foundingYear: 2024,
    legalStatus: "Micro-entreprise (Entreprise Individuelle) — SIRET 101 134 633 00011",
    country: "France",
  },

  // Mission - E-E-A-T: Expertise
  mission:
    "Posty is an AI marketing agent for LinkedIn: it learns your business, builds your content strategy, and helps you create, schedule and publish content that attracts the right audience.",
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

  // Generate alternates object for metadata: canonical only. No hreflang
  // languages: `?lang=xx` is a client-side switch, not a localized page
  // (see getAlternateLanguages in components/seo/HreflangTags.tsx).
  getAlternates: (path: string) => {
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    const basePath = cleanPath.split("?")[0];

    return {
      canonical: `${seoConfig.siteUrl}${basePath}`,
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
      title: "Posty – Votre agent marketing IA pour LinkedIn",
      description:
        "Posty apprend votre activité, construit votre stratégie de contenu LinkedIn et vous aide à créer, planifier et publier des contenus qui attirent la bonne audience. Démarrez gratuitement.",
      keywords: [
        "Posty",
        "Posty AI",
        "agent marketing IA",
        "assistant marketing IA",
        "stratégie de contenu LinkedIn",
        "automatisation des posts LinkedIn",
        "automatisation du marketing de contenu",
        "personal branding LinkedIn",
      ],
    },
    en: {
      title: "Posty – Your AI Marketing Agent for LinkedIn",
      description:
        "Posty learns your business, builds your LinkedIn content strategy, and helps you create, schedule and publish content that attracts the right audience. Start free.",
      keywords: [
        "Posty",
        "Posty AI",
        "AI marketing agent",
        "AI marketing assistant",
        "LinkedIn content strategy",
        "LinkedIn post automation",
        "content marketing automation",
        "personal branding on LinkedIn",
      ],
    },
  },
  pricing: {
    fr: {
      title: "Tarifs Posty - Plans Pro et Max | Agent marketing IA pour LinkedIn",
      description:
        "Découvrez les offres Posty : Free, Pro et Max. Choisissez la part de votre marketing LinkedIn que Posty prend en charge : stratégie, création, planification et publication.",
      keywords: [
        "tarifs Posty",
        "prix agent marketing IA",
        "abonnement automatisation LinkedIn",
        "Posty Pro",
        "Posty Max",
      ],
    },
    en: {
      title: "Posty Pricing - Pro & Max Plans | AI Marketing Agent for LinkedIn",
      description:
        "Explore Posty plans: Free, Pro and Max. Choose how much of your LinkedIn marketing Posty handles: strategy, content creation, scheduling and publishing.",
      keywords: [
        "Posty pricing",
        "AI marketing agent price",
        "LinkedIn post automation subscription",
        "Posty Pro plan",
        "Posty Max plan",
      ],
    },
  },
  login: {
    fr: {
      title: "Connexion | Posty - Agent marketing IA pour LinkedIn",
      description:
        "Connectez-vous à Posty, votre agent marketing IA pour LinkedIn : stratégie, création, planification et publication.",
      keywords: ["connexion Posty", "login Posty"],
    },
    en: {
      title: "Login | Posty - AI Marketing Agent for LinkedIn",
      description:
        "Sign in to Posty, your AI marketing agent for LinkedIn: strategy, content creation, scheduling and publishing.",
      keywords: ["Posty login", "sign in Posty"],
    },
  },
  signup: {
    fr: {
      title: "Inscription Gratuite | Posty - Agent marketing IA pour LinkedIn",
      description:
        "Créez votre compte Posty : votre agent marketing IA apprend votre activité et vous aide à créer, planifier et publier sur LinkedIn. Démarrez gratuitement.",
      keywords: ["inscription Posty", "créer compte Posty", "LinkedIn IA gratuit"],
    },
    en: {
      title: "Free Sign Up | Posty - AI Marketing Agent for LinkedIn",
      description:
        "Create your Posty account: your AI marketing agent learns your business and helps you create, schedule and publish on LinkedIn. Start free.",
      keywords: ["Posty signup", "create Posty account", "free LinkedIn AI"],
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
      "Agent marketing IA : ce qu'il peut faire pour votre entreprise",
      "Construire une stratégie de contenu LinkedIn avec l'IA",
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
      "Attirer la bonne audience grâce au contenu LinkedIn",
      "Thought leadership B2B",
      "Contenu éducatif vs promotionnel",
      "Mesurer l'impact de votre contenu LinkedIn",
    ],
  },
};

/**
 * Page-specific SEO configurations
 */
export const pageSeo = {
  home: {
    title: "Posty – Votre agent marketing IA pour LinkedIn",
    description:
      "Posty apprend votre activité, construit votre stratégie de contenu LinkedIn et vous aide à créer, planifier et publier des contenus qui attirent la bonne audience. Démarrez gratuitement.",
    keywords: [
      "Posty",
      "Posty AI",
      "agent marketing IA",
      "assistant marketing IA",
      "stratégie de contenu LinkedIn",
      "automatisation des posts LinkedIn",
    ],
  },
  pricing: {
    title: "Tarifs Posty - Plans Free, Pro et Max | Agent marketing IA pour LinkedIn",
    description:
      "Découvrez les offres Posty : Free, Pro et Max. Choisissez la part de votre marketing LinkedIn que Posty prend en charge : stratégie, création, planification et publication.",
    keywords: [
      "tarifs Posty",
      "prix agent marketing IA",
      "abonnement automatisation LinkedIn",
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
        "CGU de Posty : consultez les conditions d'utilisation de notre agent marketing IA pour LinkedIn.",
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
    // Brand-entity disambiguation: declare every name a user may search for.
    // Without this, Google indexes the entity as "Posty AI" only and
    // brand-search "Posty" loses to homonyms (Post Malone nickname,
    // Posty instant photo printer, posty.com.br, etc.).
    alternateName: ["Posty", "Posty IA", "PostyApp", "Posty App", "postyapp.ai"],
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
    // Identity cluster — ONLY verified profiles. The company LinkedIn page and
    // the X handle were removed (2026-10-22) because they are not confirmed to
    // exist; add them back here once claimed.
    sameAs: seoConfig.founders.map((f) => f.linkedIn).filter(Boolean),
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
    slogan: "Your marketing, moving forward",
    knowsAbout: [
      "AI marketing agent",
      "LinkedIn content strategy",
      "LinkedIn post automation",
      "Content marketing automation",
      "Personal branding on LinkedIn",
    ],
  },

  softwareApplication: {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Posty AI",
    alternateName: ["Posty", "Posty IA", "PostyApp", "Posty App"],
    description:
      "Posty AI is an AI marketing agent for professionals. It learns your business, writes your content and publishes it on your professional networks, starting with LinkedIn.",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: seoConfig.siteUrl,
    // Only features that exist in the product (see lib/config/plans.ts).
    featureList: [
      "AI LinkedIn post generation based on your business context",
      "LinkedIn content strategy and weekly planning with the Marketing Strategist (Max plan)",
      "Post scheduling (Pro and Max plans)",
      "Direct publishing to LinkedIn",
    ],
    // Prices mirror lib/config/plans.ts (EUR / month). The Free plan is a trial.
    offers: [
      { "@type": "Offer", name: "Free", price: "0", priceCurrency: "EUR" },
      { "@type": "Offer", name: "Pro", price: "12.90", priceCurrency: "EUR" },
      { "@type": "Offer", name: "Max", price: "19.90", priceCurrency: "EUR" },
    ],
    // aggregateRating / review intentionally absent: no verified reviews yet.
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
