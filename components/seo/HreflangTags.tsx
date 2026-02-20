/**
 * HreflangTags - International SEO Component
 * Tells search engines which language versions exist for each page
 */

import { seoConfig } from "@/lib/seo/config";

interface HreflangTagsProps {
  currentPath?: string;
}

/**
 * Supported locales with their hreflang codes
 * - fr: French (France)
 * - en-us: English (United States)
 * - x-default: Fallback for unmatched languages
 */
const LOCALES = [
  { code: "fr", hreflang: "fr", name: "Français" },
  { code: "en", hreflang: "en-us", name: "English (US)" },
] as const;

/**
 * Generate hreflang URLs for a given path
 * Uses query parameter approach: ?lang=fr or ?lang=en
 * This works with POSTY's client-side i18n system
 */
export function getHreflangUrls(path: string = "/") {
  const baseUrl = seoConfig.siteUrl;
  const cleanPath = path.startsWith("/") ? path : `/${path}`;

  return LOCALES.map((locale) => ({
    hreflang: locale.hreflang,
    href: `${baseUrl}${cleanPath}${cleanPath.includes("?") ? "&" : "?"}lang=${locale.code}`,
  }));
}

/**
 * HreflangTags Component
 * Renders link rel="alternate" tags for international SEO
 */
export default function HreflangTags({ currentPath = "/" }: HreflangTagsProps) {
  const baseUrl = seoConfig.siteUrl;
  const cleanPath = currentPath.startsWith("/") ? currentPath : `/${currentPath}`;

  // Remove any existing lang parameter from path
  const pathWithoutLang = cleanPath.split("?")[0];

  return (
    <>
      {/* French version */}
      <link
        rel="alternate"
        hrefLang="fr"
        href={`${baseUrl}${pathWithoutLang}?lang=fr`}
      />

      {/* English (US) version */}
      <link
        rel="alternate"
        hrefLang="en-us"
        href={`${baseUrl}${pathWithoutLang}?lang=en`}
      />

      {/* x-default: fallback for users whose language isn't specified */}
      <link
        rel="alternate"
        hrefLang="x-default"
        href={`${baseUrl}${pathWithoutLang}`}
      />
    </>
  );
}

/**
 * Static hreflang data for use in metadata
 * Can be used in generateMetadata() functions
 */
export function getAlternateLanguages(path: string = "/") {
  const baseUrl = seoConfig.siteUrl;
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const pathWithoutLang = cleanPath.split("?")[0];

  return {
    canonical: `${baseUrl}${pathWithoutLang}`,
    languages: {
      "fr-FR": `${baseUrl}${pathWithoutLang}?lang=fr`,
      "en-US": `${baseUrl}${pathWithoutLang}?lang=en`,
      "x-default": `${baseUrl}${pathWithoutLang}`,
    },
  };
}

/**
 * Get localized metadata for a specific page and language
 */
export function getLocalizedMetadata(
  page: "home" | "pricing" | "login" | "signup",
  lang: "fr" | "en" = "fr"
) {
  const metadata = {
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
        ],
      },
      en: {
        title: "POSTY - AI LinkedIn Post Generator | Create Engaging Content",
        description:
          "Generate high-performing LinkedIn posts in seconds with AI. POSTY creates 2 versions (Storytelling & Business) for every idea. Try free today.",
        keywords: [
          "LinkedIn post generator",
          "AI LinkedIn",
          "create LinkedIn post",
          "LinkedIn content AI",
          "LinkedIn storytelling",
        ],
      },
    },
    pricing: {
      fr: {
        title: "Tarifs POSTY - Plans Pro et Max | Générateur LinkedIn IA",
        description:
          "Découvrez nos offres POSTY : Pro et Max. Générez des posts LinkedIn professionnels avec l'IA. Essai gratuit 7 jours, sans engagement.",
        keywords: ["tarifs POSTY", "prix générateur LinkedIn", "abonnement LinkedIn IA"],
      },
      en: {
        title: "POSTY Pricing - Pro & Max Plans | AI LinkedIn Generator",
        description:
          "Explore POSTY plans: Pro and Max. Create professional LinkedIn posts with AI. Free 7-day trial, no commitment required.",
        keywords: ["POSTY pricing", "LinkedIn generator price", "LinkedIn AI subscription"],
      },
    },
    login: {
      fr: {
        title: "Connexion | POSTY",
        description: "Connectez-vous à votre compte POSTY pour générer des posts LinkedIn avec l'IA.",
        keywords: ["connexion POSTY", "login"],
      },
      en: {
        title: "Login | POSTY",
        description: "Sign in to your POSTY account to generate LinkedIn posts with AI.",
        keywords: ["POSTY login", "sign in"],
      },
    },
    signup: {
      fr: {
        title: "Inscription Gratuite | POSTY",
        description:
          "Créez votre compte POSTY gratuitement et commencez à générer des posts LinkedIn impactants avec l'IA.",
        keywords: ["inscription POSTY", "créer compte", "essai gratuit"],
      },
      en: {
        title: "Free Sign Up | POSTY",
        description:
          "Create your free POSTY account and start generating impactful LinkedIn posts with AI.",
        keywords: ["POSTY signup", "create account", "free trial"],
      },
    },
  };

  return metadata[page][lang];
}

export { LOCALES };
