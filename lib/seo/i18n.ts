/**
 * SEO page i18n utilities
 * Resolves the correct translation from page-level translation objects
 */

/** Languages supported in SEO pages */
export type SeoLocale = "en" | "fr" | "es" | "pt";

const SEO_LOCALES: SeoLocale[] = ["en", "fr", "es", "pt"];

/**
 * Resolves the best available translation from a page's translations object.
 * Falls back: user language → initialLang → "en"
 */
export function resolveSeoTranslation<T extends Record<string, unknown>>(
  translations: T,
  language: string,
  initialLang?: string
): T[keyof T] {
  if (language in translations) return translations[language as keyof T];
  if (initialLang && initialLang in translations) return translations[initialLang as keyof T];
  return translations["en" as keyof T];
}

/**
 * Resolves a SeoLocale from a raw lang string (query param or context value).
 * Returns the locale if supported, otherwise "en".
 */
export function resolveSeoLocale(lang?: string | null): SeoLocale {
  if (lang && SEO_LOCALES.includes(lang as SeoLocale)) return lang as SeoLocale;
  return "en";
}

export { SEO_LOCALES };
