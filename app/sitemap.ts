import { MetadataRoute } from "next";

const baseUrl =
  (process.env.NEXT_PUBLIC_BASE_URL || "https://postyapp.ai").trim();

/**
 * Sitemap — canonical, indexable URLs only.
 *
 * - No `?lang=` variants: the language is switched client-side, those URLs
 *   serve the same HTML and canonicalize to the clean URL.
 * - No /login or /signup: utility pages, `noindex` (see their layouts).
 * - No /pricing: 308 to /subscription (next.config.ts).
 * - No priority / changeFrequency (ignored by Google) and no `lastModified`
 *   stamped with the request time, which would claim every page changes
 *   constantly. Add a real date per page if one becomes available.
 */
const PATHS = [
  "", // homepage: the brand's reference page
  "/about",
  "/subscription",
  "/business",
  // Intent-specific SEO pages
  "/ai-linkedin-post-generator",
  "/write-linkedin-post",
  "/linkedin-post-ideas",
  "/generate-linkedin-content",
  "/linkedin-post-examples",
  "/linkedin-algorithm",
  // Legal
  "/legal/privacy",
  "/legal/terms",
  "/legal/notices",
  "/legal/cookies",
];

export default function sitemap(): MetadataRoute.Sitemap {
  return PATHS.map((path) => ({ url: `${baseUrl}${path}` }));
}
