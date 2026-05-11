import { en } from "./translations/en";
import { fr } from "./translations/fr";

export type Language = "fr" | "en" | "es" | "de" | "it" | "pt" | "nl" | "zh" | "ja" | "ko";

// Exact type of the French translation file (canonical structure)
export type Translations = typeof fr;

// Recursive utility type: preserves key structure, widens all leaf values to string
type DeepStringify<T> = T extends (infer U)[]
  ? DeepStringify<U>[]
  : T extends object
    ? { [K in keyof T]: DeepStringify<T[K]> }
    : string;

export type TranslationKeys = DeepStringify<typeof fr>;

/* Eager bundle:
 * - `en`: server-render default and universal fallback
 * - `fr`: legacy francophone audience — always available synchronously
 * The other 8 languages are split into their own chunks and loaded on demand
 * when the user explicitly switches via `setLanguage()`. Each translation file
 * is ~3300 lines (≈100 KB minified before tree-shaking), so eagerly loading
 * 10 of them adds ~1 MB of JS to every route's first compile — a major dev
 * server tax that Turbopack had to pay even on the public landing page.
 */
const cache: Partial<Record<Language, Translations>> = {
  en: en as unknown as Translations,
  fr: fr as unknown as Translations,
};

const loaders: Record<Exclude<Language, "en" | "fr">, () => Promise<Translations>> = {
  es: () => import("./translations/es").then((m) => m.es as unknown as Translations),
  de: () => import("./translations/de").then((m) => m.de as unknown as Translations),
  it: () => import("./translations/it").then((m) => m.it as unknown as Translations),
  pt: () => import("./translations/pt").then((m) => m.pt as unknown as Translations),
  nl: () => import("./translations/nl").then((m) => m.nl as unknown as Translations),
  zh: () => import("./translations/zh").then((m) => m.zh as unknown as Translations),
  ja: () => import("./translations/ja").then((m) => m.ja as unknown as Translations),
  ko: () => import("./translations/ko").then((m) => m.ko as unknown as Translations),
};

const inflight: Partial<Record<Language, Promise<Translations>>> = {};

/** Async loader — guarantees the requested language is cached, returns it. */
export async function loadTranslations(lang: Language): Promise<Translations> {
  const hit = cache[lang];
  if (hit) return hit;
  if (lang === "en" || lang === "fr") return cache.en!; // unreachable, kept for type narrowing
  let pending = inflight[lang];
  if (!pending) {
    pending = loaders[lang]().then((t) => {
      cache[lang] = t;
      return t;
    });
    inflight[lang] = pending;
  }
  return pending;
}

/** Synchronous read — returns the cached translation or falls back to English.
 *  Use this when you only need a one-off string and can't await. */
export function getTranslations(lang: Language): Translations {
  return cache[lang] ?? cache.en!;
}

/* Backwards-compat shim for code that does `translations[lang]`. The Proxy
 * returns the cached translation or English; it also kicks off a background
 * load for any language not yet cached so the next read resolves correctly. */
export const translations = new Proxy({} as Record<Language, TranslationKeys>, {
  get(_target, prop) {
    if (typeof prop !== "string") return undefined;
    const lang = prop as Language;
    const cached = cache[lang];
    if (cached) return cached as unknown as TranslationKeys;
    if (lang in loaders) {
      // Fire-and-forget — caller gets `en` now, the right language on next render.
      void loadTranslations(lang);
    }
    return cache.en! as unknown as TranslationKeys;
  },
  has(_target, prop) {
    return typeof prop === "string" && (prop === "en" || prop === "fr" || prop in loaders);
  },
});

export const languageNames: Record<Language, string> = {
  en: "English (US)",
  fr: "Français",
  es: "Español",
  de: "Deutsch",
  it: "Italiano",
  pt: "Português",
  nl: "Nederlands",
  zh: "中文",
  ja: "日本語",
  ko: "한국어",
};

export const defaultLanguage: Language = "en";

// Re-export the eagerly-loaded translations only — non-eager languages must
// go through `loadTranslations(lang)` or the `translations` Proxy above.
export { fr, en };
