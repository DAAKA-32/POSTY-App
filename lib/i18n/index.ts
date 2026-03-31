import { fr } from "./translations/fr";
import { en } from "./translations/en";
import { es } from "./translations/es";
import { de } from "./translations/de";
import { it } from "./translations/it";
import { pt } from "./translations/pt";
import { nl } from "./translations/nl";
import { zh } from "./translations/zh";
import { ja } from "./translations/ja";
import { ko } from "./translations/ko";

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

// Cast to any to avoid strict literal type checking between languages
export const translations: Record<Language, TranslationKeys> = {
  fr: fr as unknown as TranslationKeys,
  en: en as unknown as TranslationKeys,
  es: es as unknown as TranslationKeys,
  de: de as unknown as TranslationKeys,
  it: it as unknown as TranslationKeys,
  pt: pt as unknown as TranslationKeys,
  nl: nl as unknown as TranslationKeys,
  zh: zh as unknown as TranslationKeys,
  ja: ja as unknown as TranslationKeys,
  ko: ko as unknown as TranslationKeys,
};

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

export { fr, en, es, de, it, pt, nl, zh, ja, ko };
