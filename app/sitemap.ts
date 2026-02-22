import { MetadataRoute } from "next";

const baseUrl =
  (process.env.NEXT_PUBLIC_BASE_URL || "https://postyapp.ai").trim();

// Supported languages for international SEO
const languages = ["fr", "en"] as const;

/**
 * Generate alternates for a given path
 * Creates hreflang links for each language version
 */
function generateAlternates(path: string) {
  const alternates: { [key: string]: string } = {};

  languages.forEach((lang) => {
    const hreflang = lang === "en" ? "en-US" : "fr-FR";
    alternates[hreflang] = `${baseUrl}${path}?lang=${lang}`;
  });

  // x-default for users without a specific language preference
  alternates["x-default"] = `${baseUrl}${path}`;

  return alternates;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const currentDate = new Date();

  // Public pages (indexable) with multilingual support
  const publicRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: currentDate,
      changeFrequency: "weekly",
      priority: 1.0,
      alternates: {
        languages: generateAlternates(""),
      },
    },
    {
      // About page - E-E-A-T critical
      url: `${baseUrl}/about`,
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.9,
      alternates: {
        languages: generateAlternates("/about"),
      },
    },
    {
      // /subscription is the canonical pricing page
      url: `${baseUrl}/subscription`,
      lastModified: currentDate,
      changeFrequency: "weekly",
      priority: 0.9,
      alternates: {
        languages: generateAlternates("/subscription"),
      },
    },
    {
      url: `${baseUrl}/login`,
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.7,
      alternates: {
        languages: generateAlternates("/login"),
      },
    },
    {
      url: `${baseUrl}/signup`,
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.7,
      alternates: {
        languages: generateAlternates("/signup"),
      },
    },
  ];

  // Legal pages with multilingual support
  const legalRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/legal/privacy`,
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.5,
      alternates: {
        languages: generateAlternates("/legal/privacy"),
      },
    },
    {
      url: `${baseUrl}/legal/terms`,
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.5,
      alternates: {
        languages: generateAlternates("/legal/terms"),
      },
    },
    {
      url: `${baseUrl}/legal/notices`,
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.3,
      alternates: {
        languages: generateAlternates("/legal/notices"),
      },
    },
  ];

  // Language-specific URLs (explicit language versions)
  // These help search engines discover all language versions
  const languageSpecificRoutes: MetadataRoute.Sitemap = [];

  // Add explicit language URLs for main pages
  const mainPaths = ["", "/about", "/subscription", "/login", "/signup"];
  languages.forEach((lang) => {
    mainPaths.forEach((path) => {
      languageSpecificRoutes.push({
        url: `${baseUrl}${path}?lang=${lang}`,
        lastModified: currentDate,
        changeFrequency: path === "" || path === "/subscription" ? "weekly" : "monthly",
        priority: path === "" ? 0.9 : path === "/subscription" ? 0.8 : 0.6,
      });
    });
  });

  return [...publicRoutes, ...legalRoutes, ...languageSpecificRoutes];
}
