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
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/db/firebase";
import { getTranslations, loadTranslations } from "@/lib/i18n";
import { useAuth } from "@/contexts/AuthContext";
import type { Language, Translations } from "@/lib/i18n";

const STORAGE_KEY = "posty-language";

const SUPPORTED_LANGUAGES: Language[] = ["en", "fr", "es", "de", "it", "pt", "nl", "zh", "ja", "ko"];

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
  // Bump on every successful async translation load so context consumers
  // re-render with the freshly hydrated dictionary.
  const [translationsTick, setTranslationsTick] = useState(0);

  const switchLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    // Eager (en/fr) resolves synchronously; the others are dynamic-imported
    // and will trigger a tick when ready so consumers re-render.
    loadTranslations(lang).then(() => {
      setTranslationsTick((n) => n + 1);
    });
  }, []);

  // Sync language from localStorage on first client render
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isValidLanguage(stored) && stored !== language) {
      switchLanguage(stored);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync language from user profile when user logs in.
  // Priority: localStorage (most recent explicit device choice) > Firestore profile > default "fr"
  useEffect(() => {
    if (userProfile) {
      const profileLang = userProfile.language as string | undefined;
      const stored = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;

      if (isValidLanguage(stored)) {
        // localStorage = user's most recent explicit choice on this device — always wins
        switchLanguage(stored);
      } else if (profileLang && isValidLanguage(profileLang)) {
        // No local preference → fall back to Firestore profile (cross-device sync)
        switchLanguage(profileLang);
        if (typeof window !== "undefined") {
          localStorage.setItem(STORAGE_KEY, profileLang);
        }
      } else if (user) {
        // No preference anywhere → default to French for existing francophone users
        switchLanguage("fr");
        if (typeof window !== "undefined") {
          localStorage.setItem(STORAGE_KEY, "fr");
        }
      }
    }
  }, [user, userProfile, switchLanguage]);

  // Update html lang attribute when language changes
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = language;
    }
  }, [language]);

  const setLanguage = useCallback((lang: Language) => {
    switchLanguage(lang);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, lang);
    }
    // Persist to Firestore so the preference survives cross-device sessions
    // and the profile-sync effect doesn't override localStorage on next load
    if (user) {
      updateDoc(doc(db, "users", user.uid), { language: lang }).catch(() => {});
    }
  }, [user, switchLanguage]);

  // Memoize context value so consumers only re-render when language actually changes.
  // `translationsTick` re-resolves the dictionary after a lazy chunk finishes loading.
  const contextValue = useMemo<LanguageContextType>(
    () => ({
      language,
      t: getTranslations(language),
      setLanguage,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [language, setLanguage, translationsTick]
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
