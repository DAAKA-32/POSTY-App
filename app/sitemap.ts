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
      // Subscription page - transactional
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

  // SEO landing pages — high-value programmatic content
  const seoRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/ai-linkedin-post-generator`,
      lastModified: currentDate,
      changeFrequency: "weekly",
      priority: 0.9,
      alternates: { languages: generateAlternates("/ai-linkedin-post-generator") },
    },
    {
      url: `${baseUrl}/write-linkedin-post`,
      lastModified: currentDate,
      changeFrequency: "weekly",
      priority: 0.9,
      alternates: { languages: generateAlternates("/write-linkedin-post") },
    },
    {
      url: `${baseUrl}/linkedin-post-ideas`,
      lastModified: currentDate,
      changeFrequency: "weekly",
      priority: 0.8,
      alternates: { languages: generateAlternates("/linkedin-post-ideas") },
    },
    {
      url: `${baseUrl}/generate-linkedin-content`,
      lastModified: currentDate,
      changeFrequency: "weekly",
      priority: 0.8,
      alternates: { languages: generateAlternates("/generate-linkedin-content") },
    },
    {
      url: `${baseUrl}/linkedin-post-examples`,
      lastModified: currentDate,
      changeFrequency: "weekly",
      priority: 0.8,
      alternates: { languages: generateAlternates("/linkedin-post-examples") },
    },
    {
      url: `${baseUrl}/linkedin-algorithm`,
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.9,
      alternates: { languages: generateAlternates("/linkedin-algorithm") },
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
        changeFrequency: path === "" ? "weekly" : "monthly",
        priority: path === "" ? 0.9 : 0.6,
      });
    });
  });

  return [...publicRoutes, ...seoRoutes, ...legalRoutes, ...languageSpecificRoutes];
}
