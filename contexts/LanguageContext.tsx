"use client";

import {
  createContext,
  useContext,
  ReactNode,
} from "react";
import { fr } from "@/lib/i18n/translations/fr";

type TranslationKeys = typeof fr;

/**
 * LanguageContext simplifié - Français uniquement
 *
 * Ce contexte fournit les traductions françaises à toute l'application.
 * La logique multi-langue a été supprimée car l'application est uniquement en français.
 */

interface LanguageContextType {
  language: "fr";
  t: TranslationKeys;
}

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined
);

interface LanguageProviderProps {
  children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  return (
    <LanguageContext.Provider
      value={{
        language: "fr",
        t: fr,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}

// Convenience hook for just translations
export function useTranslation() {
  const { t, language } = useLanguage();
  return { t, language };
}
