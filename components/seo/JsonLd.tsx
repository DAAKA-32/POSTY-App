/**
 * JSON-LD Structured Data Components
 * Rich snippets for search engines
 * Comprehensive Schema.org implementation for Posty
 */

import { seoConfig, structuredData } from "@/lib/seo/config";

/**
 * Type definitions for structured data
 */
interface FAQItem {
  question: string;
  answer: string;
}

interface BreadcrumbItem {
  name: string;
  url?: string;
}

interface HowToStep {
  name: string;
  text: string;
  image?: string;
}

/**
 * Organization Schema - Global brand presence
 */
export function OrganizationJsonLd() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(structuredData.organization),
      }}
    />
  );
}

/**
 * Software Application Schema - App store presence
 */
export function SoftwareApplicationJsonLd() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(structuredData.softwareApplication),
      }}
    />
  );
}

/**
 * Website Schema - Site-wide search box
 */
export function WebsiteJsonLd() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${seoConfig.siteUrl}/#website`,
    // Site name shown by Google: matches the homepage title brand ("Posty AI").
    name: seoConfig.siteName,
    // Brand-entity disambiguation — see Organization.alternateName for rationale.
    alternateName: ["Posty", "Posty IA", "PostyApp", "Posty App"],
    url: seoConfig.siteUrl,
    description:
      "Posty AI — your AI marketing agent for professionals. It learns your business, writes your content and publishes it on your professional networks.",
    publisher: {
      "@type": "Organization",
      "@id": `${seoConfig.siteUrl}/#organization`,
      name: seoConfig.brandName,
    },
    // The server-rendered site is English (language switches client-side).
    inLanguage: "en",
    // No SearchAction: the site has no search results page (and Google retired
    // the sitelinks search box in 2024).
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(schema),
      }}
    />
  );
}

/**
 * FAQ Page Schema - For pages with FAQ sections
 */
export function FaqJsonLd({
  questions,
}: {
  questions: { question: string; answer: string }[];
}) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(structuredData.faqPage(questions)),
      }}
    />
  );
}

/**
 * Product Schema - For pricing page
 */
export function ProductJsonLd({
  name,
  description,
  price,
  currency = "EUR",
}: {
  name: string;
  description: string;
  price: number;
  currency?: string;
}) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    description,
    brand: {
      "@type": "Brand",
      name: seoConfig.brandName,
    },
    offers: {
      "@type": "Offer",
      price: price.toString(),
      priceCurrency: currency,
      availability: "https://schema.org/InStock",
      seller: {
        "@type": "Organization",
        name: seoConfig.brandName,
      },
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(schema),
      }}
    />
  );
}

/**
 * Breadcrumb Schema - For navigation clarity
 */
export function BreadcrumbJsonLd({
  items,
}: {
  items: { name: string; url?: string }[];
}) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      ...(item.url && { item: `${seoConfig.siteUrl}${item.url}` }),
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(schema),
      }}
    />
  );
}

/**
 * HowTo Schema - Step-by-step instructions for rich snippets
 * Perfect for showing process in Google search results
 */
export function HowToJsonLd({
  name,
  description,
  steps,
  totalTime,
  lang = "fr",
}: {
  name: string;
  description: string;
  steps: HowToStep[];
  totalTime?: string; // ISO 8601 duration format, e.g., "PT30S" for 30 seconds
  lang?: string;
}) {
  const langMap: Record<string, string> = { fr: "fr-FR", en: "en-US", es: "es-ES", pt: "pt-PT" };
  const schema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name,
    description,
    inLanguage: langMap[lang] || "en-US",
    ...(totalTime && { totalTime }),
    step: steps.map((step, index) => ({
      "@type": "HowToStep",
      position: index + 1,
      name: step.name,
      text: step.text,
      ...(step.image && { image: step.image }),
    })),
    tool: {
      "@type": "HowToTool",
      name: "Posty AI - AI marketing agent for LinkedIn",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(schema),
      }}
    />
  );
}

/**
 * Service Schema - For SaaS service description
 */
export function ServiceJsonLd({
  lang = "fr",
}: {
  lang?: string;
}) {
  const resolvedLang = (lang === "fr" ? "fr" : "en") as "fr" | "en";
  const serviceData = {
    fr: {
      name: "Agent marketing IA pour LinkedIn",
      description:
        "Posty apprend votre activité, construit votre stratégie de contenu LinkedIn et vous aide à créer, planifier et publier des contenus qui attirent la bonne audience.",
      serviceType: "Content Marketing",
    },
    en: {
      name: "AI Marketing Agent for LinkedIn",
      description:
        "Posty learns your business, builds your LinkedIn content strategy, and helps you create, schedule and publish content that attracts the right audience.",
      serviceType: "Content Marketing",
    },
  };

  const data = serviceData[resolvedLang];

  const schema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: data.name,
    description: data.description,
    serviceType: data.serviceType,
    provider: {
      "@type": "Organization",
      name: seoConfig.brandName,
      url: seoConfig.siteUrl,
    },
    areaServed: {
      "@type": "Place",
      name: resolvedLang === "fr" ? "France" : "United States",
    },
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: resolvedLang === "fr" ? "Plans Posty" : "Posty Plans",
      itemListElement: [
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "Free",
            description: resolvedLang === "fr" ? "Essai gratuit, sans carte bancaire" : "Free trial, no credit card required",
          },
          price: "0",
          priceCurrency: "EUR",
        },
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "Pro",
            description: resolvedLang === "fr" ? "Planification et publication sur LinkedIn" : "Scheduling and publishing on LinkedIn",
          },
          price: "12.90",
          priceCurrency: "EUR",
        },
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "Max",
            description: resolvedLang === "fr" ? "Pro + Marketing Strategist" : "Everything in Pro + Marketing Strategist",
          },
          price: "19.90",
          priceCurrency: "EUR",
        },
      ],
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(schema),
      }}
    />
  );
}

/**
 * Article Schema - For blog posts and guides (future content)
 */
export function ArticleJsonLd({
  headline,
  description,
  image,
  datePublished,
  dateModified,
  author,
  lang = "fr",
}: {
  headline: string;
  description: string;
  image?: string;
  datePublished: string;
  dateModified?: string;
  author: string;
  lang?: string;
}) {
  const articleLangMap: Record<string, string> = { fr: "fr-FR", en: "en-US", es: "es-ES", pt: "pt-PT" };
  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline,
    description,
    image: image || `${seoConfig.siteUrl}/og-image.png`,
    datePublished,
    dateModified: dateModified || datePublished,
    inLanguage: articleLangMap[lang || "en"] || "en-US",
    author: {
      "@type": "Person",
      name: author,
    },
    publisher: {
      "@type": "Organization",
      name: seoConfig.brandName,
      logo: {
        "@type": "ImageObject",
        url: `${seoConfig.siteUrl}/favicon-512.png`,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": seoConfig.siteUrl,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(schema),
      }}
    />
  );
}

/**
 * VideoObject Schema - For video tutorials (future content)
 */
export function VideoJsonLd({
  name,
  description,
  thumbnailUrl,
  uploadDate,
  duration,
  contentUrl,
}: {
  name: string;
  description: string;
  thumbnailUrl: string;
  uploadDate: string;
  duration: string; // ISO 8601 format
  contentUrl?: string;
}) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name,
    description,
    thumbnailUrl,
    uploadDate,
    duration,
    ...(contentUrl && { contentUrl }),
    publisher: {
      "@type": "Organization",
      name: seoConfig.brandName,
      logo: {
        "@type": "ImageObject",
        url: `${seoConfig.siteUrl}/favicon-512.png`,
      },
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(schema),
      }}
    />
  );
}

/**
 * Pricing Page Schema - Complete pricing structured data
 */
export function PricingPageJsonLd({ lang = "fr" }: { lang?: string }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: lang === "fr" ? "Tarifs Posty" : "Posty Pricing",
    description:
      lang === "fr"
        ? "Découvrez les offres Posty, votre agent marketing IA pour LinkedIn : Free, Pro et Max"
        : "Explore Posty plans, your AI marketing agent for LinkedIn: Free, Pro and Max",
    mainEntity: {
      "@type": "ItemList",
      itemListElement: [
        {
          "@type": "Product",
          position: 1,
          name: "Posty Free",
          description: lang === "fr" ? "Essai gratuit, sans carte bancaire" : "Free trial, no credit card required",
          offers: {
            "@type": "Offer",
            price: "0",
            priceCurrency: "EUR",
            availability: "https://schema.org/InStock",
          },
        },
        {
          "@type": "Product",
          position: 2,
          name: "Posty Pro",
          description: lang === "fr" ? "Planification, publication et IA personnalisée" : "Scheduling, publishing and personalized AI",
          offers: {
            "@type": "Offer",
            price: "12.90",
            priceCurrency: "EUR",
            availability: "https://schema.org/InStock",
          },
        },
        {
          "@type": "Product",
          position: 3,
          name: "Posty Max",
          description:
            lang === "fr" ? "Tout Pro + Marketing Strategist" : "Everything in Pro + Marketing Strategist",
          offers: {
            "@type": "Offer",
            price: "19.90",
            priceCurrency: "EUR",
            availability: "https://schema.org/InStock",
          },
        },
      ],
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(schema),
      }}
    />
  );
}

/**
 * Combined Schema for Homepage - All relevant schemas
 */
export function HomepageJsonLd() {
  return (
    <>
      <OrganizationJsonLd />
      <WebsiteJsonLd />
      <SoftwareApplicationJsonLd />
    </>
  );
}

/**
 * Person Schema - For founder/team member E-E-A-T signals
 */
export function PersonJsonLd({
  name,
  jobTitle,
  url,
  sameAs = [],
  worksFor,
  description,
}: {
  name: string;
  jobTitle: string;
  url?: string;
  sameAs?: string[];
  worksFor?: string;
  description?: string;
}) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Person",
    name,
    jobTitle,
    ...(url && { url }),
    ...(description && { description }),
    ...(sameAs.length > 0 && { sameAs }),
    ...(worksFor && {
      worksFor: {
        "@type": "Organization",
        name: worksFor,
        url: seoConfig.siteUrl,
      },
    }),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(schema),
      }}
    />
  );
}

/**
 * Enhanced Organization Schema with Founder - E-E-A-T Authority
 */
export function EnhancedOrganizationJsonLd() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${seoConfig.siteUrl}/#organization`,
    name: "Posty AI",
    alternateName: ["Posty", "PostyApp", "Posty App", "postyapp.ai"],
    url: seoConfig.siteUrl,
    logo: {
      "@type": "ImageObject",
      url: `${seoConfig.siteUrl}/favicon-512.png`,
      width: "512",
      height: "512",
    },
    description: seoConfig.mission,
    foundingDate: "2024",
    founder: [
      {
        "@type": "Person",
        "@id": `${seoConfig.siteUrl}/#founder-emilien`,
        name: "Emilien Nepveu",
        jobTitle: "Co-Founder & Co-CEO, CTO",
        sameAs: ["https://www.linkedin.com/in/emilien-nepveu-58a38127a/"],
      },
      {
        "@type": "Person",
        "@id": `${seoConfig.siteUrl}/#founder-come`,
        name: "Côme Maubert",
        jobTitle: "Co-Founder & Co-CEO, CFO",
        sameAs: ["https://www.linkedin.com/in/c%C3%B4me-maubert-delamoriniere-a884693b3/"],
      },
    ],
    sameAs: [
      "https://www.linkedin.com/company/posty-app",
      "https://twitter.com/posty_app",
      "https://x.com/posty_app",
    ],
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
      "AI Marketing Agent",
      "LinkedIn Content Strategy",
      "LinkedIn Post Automation",
      "Content Marketing Automation",
      "Personal Branding on LinkedIn",
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(schema),
      }}
    />
  );
}

/**
 * About Page Schema - Complete E-E-A-T structured data
 */
export function AboutPageJsonLd() {
  const foundersSchema = [
    {
      "@context": "https://schema.org",
      "@type": "Person",
      "@id": `${seoConfig.siteUrl}/#founder-emilien`,
      name: "Emilien Nepveu",
      jobTitle: "Co-Founder & Co-CEO, CTO",
      description: "Co-fondateur de Posty AI, responsable de la partie technique, UX/UI et intégration IA.",
      url: `${seoConfig.siteUrl}/about`,
      sameAs: ["https://www.linkedin.com/in/emilien-nepveu-58a38127a/"],
      worksFor: {
        "@type": "Organization",
        "@id": `${seoConfig.siteUrl}/#organization`,
        name: "Posty AI",
      },
      knowsAbout: [
        "Intelligence Artificielle",
        "Growth Marketing",
        "Product Development",
        "Personal Branding",
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "Person",
      "@id": `${seoConfig.siteUrl}/#founder-come`,
      name: "Côme Maubert",
      jobTitle: "Co-Founder & Co-CEO, CFO",
      description: "Co-fondateur de Posty AI, en charge du financement et de la stratégie commerciale.",
      url: `${seoConfig.siteUrl}/about`,
      worksFor: {
        "@type": "Organization",
        "@id": `${seoConfig.siteUrl}/#organization`,
        name: "Posty AI",
      },
      knowsAbout: [
        "Financement",
        "Stratégie Commerciale",
        "Publicité & Acquisition",
      ],
    },
  ];

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${seoConfig.siteUrl}/#organization`,
    name: "Posty AI",
    alternateName: ["Posty", "PostyApp", "Posty App", "postyapp.ai"],
    url: seoConfig.siteUrl,
    logo: `${seoConfig.siteUrl}/favicon-512.png`,
    description: seoConfig.mission,
    foundingDate: "2024",
    founder: [
      { "@id": `${seoConfig.siteUrl}/#founder-emilien` },
      { "@id": `${seoConfig.siteUrl}/#founder-come` },
    ],
    slogan: "Your marketing, moving forward",
    numberOfEmployees: {
      "@type": "QuantitativeValue",
      value: "1-10",
    },
    areaServed: {
      "@type": "Place",
      name: "Worldwide",
    },
    contactPoint: {
      "@type": "ContactPoint",
      email: seoConfig.supportEmail,
      contactType: "customer support",
    },
  };

  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    "@id": `${seoConfig.siteUrl}/about`,
    name: "À propos de Posty AI",
    description: "Découvrez Posty AI, votre agent marketing IA pour LinkedIn : notre mission, notre vision et notre équipe.",
    url: `${seoConfig.siteUrl}/about`,
    isPartOf: {
      "@type": "WebSite",
      "@id": `${seoConfig.siteUrl}/#website`,
      name: "Posty AI",
    },
    about: {
      "@id": `${seoConfig.siteUrl}/#organization`,
    },
    mainEntity: {
      "@id": `${seoConfig.siteUrl}/#organization`,
    },
    inLanguage: ["fr-FR", "en-US"],
  };

  return (
    <>
      {foundersSchema.map((schema, i) => (
        <script
          key={`founder-${i}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(schema),
          }}
        />
      ))}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationSchema),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(webPageSchema),
        }}
      />
    </>
  );
}

/**
 * Pre-built FAQ data for Posty (bilingual)
 */
export const postyFaqData = {
  fr: [
    {
      question: "Comment fonctionne Posty ?",
      answer:
        "Posty est un agent marketing IA pour LinkedIn. Vous lui présentez votre activité (offre, client idéal, ton), puis il vous aide à construire votre stratégie de contenu et à rédiger des posts adaptés à votre audience. Vous les modifiez, les planifiez (plans Pro et Max) et les publiez sur LinkedIn depuis Posty.",
    },
    {
      question: "Posty est-il gratuit ?",
      answer:
        "Vous pouvez démarrer gratuitement, sans carte bancaire, et tester les fonctions d'écriture de Posty. Pour accéder à toutes les fonctionnalités, choisissez entre le plan Pro (12,90 €/mois) et le plan Max (19,90 €/mois). Sans engagement.",
    },
    {
      question: "Puis-je modifier les posts générés ?",
      answer:
        "Absolument ! Les posts générés sont entièrement éditables. Vous pouvez les personnaliser, ajuster le ton ou combiner des éléments des deux styles (Storytelling et Business) avant de les publier.",
    },
    {
      question: "Posty peut-il publier directement sur LinkedIn ?",
      answer:
        "Oui, une fois votre compte LinkedIn connecté, vous pouvez publier vos posts directement depuis Posty. Les plans Pro et Max permettent aussi de les planifier à l'avance. Vous pouvez également copier le texte pour le coller manuellement.",
    },
    {
      question: "Posty m'aide-t-il à construire une stratégie de contenu LinkedIn ?",
      answer:
        "Oui. Posty s'appuie sur le contexte de votre entreprise pour que chaque post reste cohérent avec votre offre et votre audience. Avec le plan Max, le Marketing Strategist analyse votre présence LinkedIn, planifie votre semaine et rédige les posts que vous validez. Les résultats dépendent de votre offre, de votre audience et de votre régularité.",
    },
  ],
  en: [
    {
      question: "How does Posty work?",
      answer:
        "Posty is an AI marketing agent for LinkedIn. You tell it about your business (offer, ideal customer, tone), and it helps you build your content strategy and write posts for your audience. You edit them, schedule them (Pro and Max plans) and publish to LinkedIn from Posty.",
    },
    {
      question: "Is Posty free?",
      answer:
        "You can start free, with no credit card required, and try Posty's core writing features. To unlock everything, choose Pro (€12.90/month) or Max (€19.90/month). No commitment.",
    },
    {
      question: "Can I edit the generated posts?",
      answer:
        "Absolutely! Generated posts are fully editable. You can customize them, adjust the tone, or combine elements from both styles (Storytelling and Business) before publishing.",
    },
    {
      question: "Can Posty post directly to LinkedIn?",
      answer:
        "Yes. Once your LinkedIn account is connected, you can publish your posts directly from Posty, and Pro and Max plans let you schedule them in advance. You can also copy the text to paste manually.",
    },
    {
      question: "Does Posty help me build a LinkedIn content strategy?",
      answer:
        "Yes. Posty uses your business context so every post stays consistent with your offer and your audience. On the Max plan, the Marketing Strategist reviews your LinkedIn presence, plans your week and drafts the posts for you to approve. Results depend on your offer, your audience and your consistency.",
    },
  ],
};

/**
 * Pre-built HowTo steps for Posty (bilingual)
 */
export const postyHowToData = {
  fr: {
    name: "Comment construire votre contenu LinkedIn avec Posty",
    description:
      "Guide étape par étape pour présenter votre activité à Posty, générer des posts LinkedIn adaptés à votre audience, puis les planifier et les publier.",
    steps: [
      {
        name: "Créez votre compte",
        text: "Créez un compte gratuit ou connectez-vous avec Google/LinkedIn pour accéder à Posty.",
      },
      {
        name: "Présentez votre activité",
        text: "Indiquez votre offre, votre client idéal et votre ton. Posty s'appuie sur ce contexte pour que chaque post reste cohérent.",
      },
      {
        name: "Générez vos posts",
        text: "Donnez une idée ou un sujet : Posty rédige un post en style Storytelling (narratif) ou Business (factuel).",
      },
      {
        name: "Personnalisez si besoin",
        text: "Modifiez le texte généré selon vos préférences : ajustez le ton, ajoutez des détails, changez l'accroche.",
      },
      {
        name: "Planifiez ou publiez sur LinkedIn",
        text: "Connectez votre compte LinkedIn pour publier directement depuis Posty, ou planifiez vos posts à l'avance avec les plans Pro et Max.",
      },
    ],
  },
  en: {
    name: "How to build your LinkedIn content with Posty",
    description:
      "Step-by-step guide to tell Posty about your business, generate LinkedIn posts for your audience, then schedule and publish them.",
    steps: [
      {
        name: "Create your account",
        text: "Create an account or sign in with Google/LinkedIn to access Posty.",
      },
      {
        name: "Tell Posty about your business",
        text: "Add your offer, your ideal customer and your tone. Posty uses this context so every post stays consistent.",
      },
      {
        name: "Generate your posts",
        text: "Give Posty an idea or topic and it writes a post in a Storytelling (narrative) or Business (factual) style.",
      },
      {
        name: "Customize if needed",
        text: "Edit the generated text to your preferences: adjust the tone, add details, change the hook.",
      },
      {
        name: "Schedule or publish to LinkedIn",
        text: "Connect your LinkedIn account to publish directly from Posty, or schedule posts in advance on Pro and Max.",
      },
    ],
  },
};
