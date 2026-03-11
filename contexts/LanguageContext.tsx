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
import { useAuth } from "@/contexts/AuthContext";
import type { Language } from "@/lib/i18n";

type TranslationKeys = typeof fr;

const STORAGE_KEY = "posty-language";

const translationMap: Record<Language, TranslationKeys> = {
  fr: fr as unknown as TranslationKeys,
  en: en as unknown as TranslationKeys,
};

/**
 * LanguageContext — Full i18n support (FR / EN)
 *
 * Priority for language detection:
 * 1. User profile preference (if logged in & has language set)
 * 2. localStorage preference
 * 3. Default: "en" for new users, "fr" for existing users without preference
 */

interface LanguageContextType {
  language: Language;
  t: TranslationKeys;
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

  // Initialize language from localStorage or default to "en"
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "fr" || stored === "en") return stored;
    }
    return "en"; // Default for public pages & new users
  });

  // Sync language from user profile when user logs in
  useEffect(() => {
    if (userProfile) {
      const profileLang = userProfile.language as Language | undefined;
      if (profileLang && (profileLang === "fr" || profileLang === "en")) {
        setLanguageState(profileLang);
        if (typeof window !== "undefined") {
          localStorage.setItem(STORAGE_KEY, profileLang);
        }
      } else if (user && !profileLang) {
        // Existing user without language in Firestore profile
        // Respect localStorage if already set (user may have changed language in Settings)
        const stored = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
        if (stored === "fr" || stored === "en") {
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
  // Without this, every LanguageProvider re-render (e.g., from parent auth state changes)
  // creates a new value object, which can cause React to skip descendant updates in edge cases.
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
