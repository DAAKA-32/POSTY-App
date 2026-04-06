"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from "react";
import { fr } from "@/lib/i18n/translations/fr";
import { en } from "@/lib/i18n/translations/en";
import { es } from "@/lib/i18n/translations/es";
import { de } from "@/lib/i18n/translations/de";
import { it } from "@/lib/i18n/translations/it";
import { pt } from "@/lib/i18n/translations/pt";
import { nl } from "@/lib/i18n/translations/nl";
import { zh } from "@/lib/i18n/translations/zh";
import { ja } from "@/lib/i18n/translations/ja";
import { ko } from "@/lib/i18n/translations/ko";
import { useAuth } from "@/contexts/AuthContext";
import type { Language, Translations } from "@/lib/i18n";

const STORAGE_KEY = "posty-language";

const SUPPORTED_LANGUAGES: Language[] = ["en", "fr", "es", "de", "it", "pt", "nl", "zh", "ja", "ko"];

const translationMap: Record<Language, Translations> = {
  fr: fr as unknown as Translations,
  en: en as unknown as Translations,
  es: es as unknown as Translations,
  de: de as unknown as Translations,
  it: it as unknown as Translations,
  pt: pt as unknown as Translations,
  nl: nl as unknown as Translations,
  zh: zh as unknown as Translations,
  ja: ja as unknown as Translations,
  ko: ko as unknown as Translations,
};

function isValidLanguage(lang: string | null): lang is Language {
  return lang !== null && SUPPORTED_LANGUAGES.includes(lang as Language);
}

/**
 * LanguageContext — Full i18n support (10 languages)
 *
 * Priority for language detection:
 * 1. User profile preference (if logged in & has language set)
 * 2. localStorage preference
 * 3. Default: "en" for new users, "fr" for existing users without preference
 */

interface LanguageContextType {
  language: Language;
  t: Translations;
  setLanguage: (lang: Language) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined
);

interface LanguageProviderProps {
  children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const { user, userProfile } = useAuth();

  // Always start with "en" to match server render and avoid hydration mismatch.
  // localStorage sync happens in the useEffect below.
  const [language, setLanguageState] = useState<Language>("en");

  // Sync language from localStorage on first client render
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isValidLanguage(stored) && stored !== language) {
      setLanguageState(stored);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync language from user profile when user logs in
  useEffect(() => {
    if (userProfile) {
      const profileLang = userProfile.language as string | undefined;
      if (profileLang && isValidLanguage(profileLang)) {
        setLanguageState(profileLang);
        if (typeof window !== "undefined") {
          localStorage.setItem(STORAGE_KEY, profileLang);
        }
      } else if (user && !profileLang) {
        // Existing user without language in Firestore profile
        // Respect localStorage if already set (user may have changed language in Settings)
        const stored = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
        if (isValidLanguage(stored)) {
          setLanguageState(stored);
        } else {
          // No localStorage either → default to French for existing francophone users
          setLanguageState("fr");
          if (typeof window !== "undefined") {
            localStorage.setItem(STORAGE_KEY, "fr");
          }
        }
      }
    }
  }, [user, userProfile]);

  // Update html lang attribute when language changes
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = language;
    }
  }, [language]);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, lang);
    }
  }, []);

  // Memoize context value so consumers only re-render when language actually changes.
  const contextValue = useMemo<LanguageContextType>(
    () => ({
      language,
      t: translationMap[language],
      setLanguage,
    }),
    [language, setLanguage]
  );

  return (
    <LanguageContext.Provider value={contextValue}>
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
