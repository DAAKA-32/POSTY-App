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

interface ReviewData {
  author: string;
  reviewBody: string;
  ratingValue: number;
  datePublished?: string;
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
    name: seoConfig.siteName,
    url: seoConfig.siteUrl,
    description: "Générateur de posts LinkedIn IA - Créez du contenu impactant en quelques secondes",
    publisher: {
      "@type": "Organization",
      name: seoConfig.brandName,
    },
    inLanguage: ["fr-FR", "en-US"],
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
  lang?: "fr" | "en";
}) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name,
    description,
    inLanguage: lang === "fr" ? "fr-FR" : "en-US",
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
      name: "Posty - AI LinkedIn Post Generator",
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
  lang?: "fr" | "en";
}) {
  const serviceData = {
    fr: {
      name: "Génération de posts LinkedIn par IA",
      description:
        "Service de création de contenu LinkedIn professionnel utilisant l'intelligence artificielle. Générez des posts Storytelling et Business en quelques secondes.",
      serviceType: "Content Generation",
    },
    en: {
      name: "AI LinkedIn Post Generation",
      description:
        "Professional LinkedIn content creation service powered by artificial intelligence. Generate Storytelling and Business posts in seconds.",
      serviceType: "Content Generation",
    },
  };

  const data = serviceData[lang];

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
      name: lang === "fr" ? "France" : "United States",
    },
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: lang === "fr" ? "Plans Posty" : "Posty Plans",
      itemListElement: [
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "Free",
            description: lang === "fr" ? "3 posts par semaine" : "3 posts per week",
          },
          price: "0",
          priceCurrency: "EUR",
        },
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "Pro",
            description: lang === "fr" ? "Posts illimités" : "Unlimited posts",
          },
          price: "9.99",
          priceCurrency: "EUR",
          priceValidUntil: "2025-12-31",
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
 * Review Schema - For testimonials and reviews
 */
export function ReviewJsonLd({ reviews }: { reviews: ReviewData[] }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "Posty",
    description: "AI-powered LinkedIn post generator",
    brand: {
      "@type": "Brand",
      name: seoConfig.brandName,
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.9",
      reviewCount: reviews.length.toString(),
      bestRating: "5",
      worstRating: "1",
    },
    review: reviews.map((review) => ({
      "@type": "Review",
      author: {
        "@type": "Person",
        name: review.author,
      },
      reviewBody: review.reviewBody,
      reviewRating: {
        "@type": "Rating",
        ratingValue: review.ratingValue.toString(),
        bestRating: "5",
        worstRating: "1",
      },
      ...(review.datePublished && { datePublished: review.datePublished }),
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
  lang?: "fr" | "en";
}) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline,
    description,
    image: image || `${seoConfig.siteUrl}/og-image.png`,
    datePublished,
    dateModified: dateModified || datePublished,
    inLanguage: lang === "fr" ? "fr-FR" : "en-US",
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
export function PricingPageJsonLd({ lang = "fr" }: { lang?: "fr" | "en" }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: lang === "fr" ? "Tarifs Posty" : "Posty Pricing",
    description:
      lang === "fr"
        ? "Découvrez nos offres Posty : Gratuit, Pro et Max"
        : "Explore Posty plans: Free, Pro, and Max",
    mainEntity: {
      "@type": "ItemList",
      itemListElement: [
        {
          "@type": "Product",
          position: 1,
          name: "Posty Free",
          description: lang === "fr" ? "3 posts par semaine" : "3 posts per week",
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
          description: lang === "fr" ? "Posts illimités" : "Unlimited posts",
          offers: {
            "@type": "Offer",
            price: "9.99",
            priceCurrency: "EUR",
            priceValidUntil: "2025-12-31",
            availability: "https://schema.org/InStock",
          },
        },
        {
          "@type": "Product",
          position: 3,
          name: "Posty Max",
          description:
            lang === "fr" ? "Posts illimités + fonctionnalités avancées" : "Unlimited + advanced features",
          offers: {
            "@type": "Offer",
            price: "19.99",
            priceCurrency: "EUR",
            priceValidUntil: "2025-12-31",
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
    name: "Posty",
    url: seoConfig.siteUrl,
    logo: {
      "@type": "ImageObject",
      url: `${seoConfig.siteUrl}/favicon-512.png`,
      width: "512",
      height: "512",
    },
    description: "Posty est un générateur de posts LinkedIn alimenté par l'intelligence artificielle. Notre mission : démocratiser le contenu professionnel et automatiser le personal branding.",
    foundingDate: "2024",
    founder: [
      {
        "@type": "Person",
        "@id": `${seoConfig.siteUrl}/#founder-emilien`,
        name: "Emilien Nepveu",
        jobTitle: "Co-Founder & Co-CEO, CTO",
        sameAs: ["https://www.linkedin.com/in/e-nepveu-58a38127a/"],
      },
      {
        "@type": "Person",
        "@id": `${seoConfig.siteUrl}/#founder-come`,
        name: "Côme Maubert",
        jobTitle: "Co-Founder & Co-CEO, CFO",
      },
    ],
    sameAs: [
      "https://www.linkedin.com/company/posty-app",
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
    slogan: "Démocratiser le contenu professionnel",
    knowsAbout: [
      "LinkedIn Marketing",
      "Personal Branding",
      "Content Creation",
      "Artificial Intelligence",
      "Social Media Marketing",
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
      description: "Co-fondateur de Posty, responsable de la partie technique, UX/UI et intégration IA.",
      url: `${seoConfig.siteUrl}/about`,
      sameAs: ["https://www.linkedin.com/in/e-nepveu-58a38127a/"],
      worksFor: {
        "@type": "Organization",
        "@id": `${seoConfig.siteUrl}/#organization`,
        name: "Posty",
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
      description: "Co-fondateur de Posty, en charge du financement et de la stratégie commerciale.",
      url: `${seoConfig.siteUrl}/about`,
      worksFor: {
        "@type": "Organization",
        "@id": `${seoConfig.siteUrl}/#organization`,
        name: "Posty",
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
    name: "Posty",
    url: seoConfig.siteUrl,
    logo: `${seoConfig.siteUrl}/favicon-512.png`,
    description: "Posty est un générateur de posts LinkedIn alimenté par l'intelligence artificielle. Notre mission : démocratiser le contenu professionnel et automatiser le personal branding pour tous.",
    foundingDate: "2024",
    founder: [
      { "@id": `${seoConfig.siteUrl}/#founder-emilien` },
      { "@id": `${seoConfig.siteUrl}/#founder-come` },
    ],
    slogan: "Démocratiser le contenu professionnel",
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
    name: "À propos de Posty",
    description: "Découvrez Posty, l'IA qui démocratise le contenu LinkedIn professionnel. Notre mission, notre vision, et notre équipe.",
    url: `${seoConfig.siteUrl}/about`,
    isPartOf: {
      "@type": "WebSite",
      "@id": `${seoConfig.siteUrl}/#website`,
      name: "Posty",
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
        "Posty utilise l'intelligence artificielle pour générer des posts LinkedIn professionnels. Entrez simplement votre idée ou sujet, et l'IA crée instantanément 2 versions : une version Storytelling émotionnelle et une version Business factuelle.",
    },
    {
      question: "Posty est-il gratuit ?",
      answer:
        "Posty propose un essai gratuit de 7 jours pour le plan Pro. Ensuite, choisissez entre le plan Pro (12,90€/mois) et le plan Max (19,90€/mois). Garantie satisfait ou remboursé 7 jours.",
    },
    {
      question: "Puis-je modifier les posts générés ?",
      answer:
        "Absolument ! Les posts générés sont entièrement éditables. Vous pouvez les personnaliser, ajuster le ton, ou combiner des éléments des deux versions avant de les publier.",
    },
    {
      question: "Posty peut-il publier directement sur LinkedIn ?",
      answer:
        "Oui, avec la connexion LinkedIn, vous pouvez publier vos posts directement depuis Posty en un clic. Vous pouvez également copier le texte pour le coller manuellement.",
    },
    {
      question: "Les posts sont-ils optimisés pour l'algorithme LinkedIn ?",
      answer:
        "Oui, notre IA est entraînée sur les meilleures pratiques LinkedIn : structure optimale, hooks engageants, call-to-action efficaces, et longueur idéale pour maximiser la visibilité.",
    },
  ],
  en: [
    {
      question: "How does Posty work?",
      answer:
        "Posty uses artificial intelligence to generate professional LinkedIn posts. Simply enter your idea or topic, and AI instantly creates 2 versions: an emotional Storytelling version and a factual Business version.",
    },
    {
      question: "Does Posty offer a free trial?",
      answer:
        "Yes, Posty offers a 7-day free trial with full access to Pro features. A credit card is required to start the trial. You can cancel anytime during the trial period without being charged.",
    },
    {
      question: "Can I edit the generated posts?",
      answer:
        "Absolutely! Generated posts are fully editable. You can customize them, adjust the tone, or combine elements from both versions before publishing.",
    },
    {
      question: "Can Posty post directly to LinkedIn?",
      answer:
        "Yes, with LinkedIn connection, you can publish your posts directly from Posty with one click. You can also copy the text to paste manually.",
    },
    {
      question: "Are posts optimized for the LinkedIn algorithm?",
      answer:
        "Yes, our AI is trained on LinkedIn best practices: optimal structure, engaging hooks, effective CTAs, and ideal length to maximize visibility.",
    },
  ],
};

/**
 * Pre-built HowTo steps for Posty (bilingual)
 */
export const postyHowToData = {
  fr: {
    name: "Comment créer un post LinkedIn avec Posty",
    description:
      "Guide étape par étape pour générer des posts LinkedIn professionnels avec l'IA Posty en moins de 30 secondes.",
    steps: [
      {
        name: "Connectez-vous à Posty",
        text: "Créez un compte gratuit ou connectez-vous avec Google/LinkedIn pour accéder au générateur.",
      },
      {
        name: "Entrez votre idée",
        text: "Décrivez le sujet ou l'idée de votre post LinkedIn dans le champ prévu. Soyez précis pour de meilleurs résultats.",
      },
      {
        name: "Générez vos posts",
        text: "Cliquez sur 'Générer' et l'IA crée instantanément 2 versions : Storytelling (émotionnel) et Business (factuel).",
      },
      {
        name: "Personnalisez si besoin",
        text: "Modifiez le texte généré selon vos préférences : ajustez le ton, ajoutez des détails, ou combinez les deux versions.",
      },
      {
        name: "Publiez sur LinkedIn",
        text: "Copiez le post ou publiez directement via la connexion LinkedIn intégrée.",
      },
    ],
  },
  en: {
    name: "How to create a LinkedIn post with Posty",
    description:
      "Step-by-step guide to generate professional LinkedIn posts with Posty AI in under 30 seconds.",
    steps: [
      {
        name: "Sign in to Posty",
        text: "Create an account or sign in with Google/LinkedIn to access the generator.",
      },
      {
        name: "Enter your idea",
        text: "Describe your LinkedIn post topic or idea in the input field. Be specific for better results.",
      },
      {
        name: "Generate your posts",
        text: "Click 'Generate' and AI instantly creates 2 versions: Storytelling (emotional) and Business (factual).",
      },
      {
        name: "Customize if needed",
        text: "Edit the generated text to your preferences: adjust tone, add details, or combine both versions.",
      },
      {
        name: "Publish to LinkedIn",
        text: "Copy the post or publish directly via the integrated LinkedIn connection.",
      },
    ],
  },
};
