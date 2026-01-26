import { fr } from "./translations/fr";
import { en } from "./translations/en";

export type Language = "fr" | "en";

// Create a flexible type based on the French structure
// This allows different string values while maintaining the same keys
type TranslationStructure = typeof fr;

export type TranslationKeys = {
  [K in keyof TranslationStructure]: TranslationStructure[K] extends object
    ? { [K2 in keyof TranslationStructure[K]]: TranslationStructure[K][K2] extends object
        ? { [K3 in keyof TranslationStructure[K][K2]]: string }
        : string
      }
    : string;
};

// Cast to any to avoid strict literal type checking between languages
export const translations: Record<Language, TranslationKeys> = {
  fr: fr as unknown as TranslationKeys,
  en: en as unknown as TranslationKeys,
};

export const languageNames: Record<Language, string> = {
  fr: "Francais",
  en: "English (US)",
};

export const defaultLanguage: Language = "fr";

export { fr, en };
