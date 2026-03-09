"use client";

import { useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

/**
 * Sets document.title dynamically based on the current language.
 * @param pageKey - Key from pageTitles translations (e.g. "settings", "dashboard")
 */
export function usePageTitle(pageKey: keyof typeof import("@/lib/i18n/translations/fr").fr.pageTitles) {
  const { t } = useLanguage();

  useEffect(() => {
    const title = t.pageTitles[pageKey];
    document.title = title ? `${title} | Posty AI` : "Posty AI";
  }, [t, pageKey]);
}
