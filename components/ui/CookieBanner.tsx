"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { STORAGE_KEYS } from "@/hooks/useLocalStorage";

export interface CookieConsent {
  essential: boolean; // Always true
  analytics: boolean;
  timestamp: string;
  version: string;
}

const CONSENT_VERSION = "1.0";

// Appear after 7s — let the user settle and experience the page first
const APPEARANCE_DELAY = 7000;

function getStoredConsent(): CookieConsent | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.COOKIE_CONSENT);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

function storeConsent(consent: CookieConsent) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEYS.COOKIE_CONSENT, JSON.stringify(consent));
}

/**
 * CookieBanner — Full-width slim bar, premium & discreet
 *
 * Design: Subtle bottom bar, full width, single-line on desktop.
 * Appearance: Gentle slide-up after 7s delay.
 * Dismissal: Smooth slide-down before unmounting.
 */
export default function CookieBanner() {
  const [phase, setPhase] = useState<"hidden" | "entering" | "visible" | "exiting">("hidden");
  const [showPreferences, setShowPreferences] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);

  useEffect(() => {
    const consent = getStoredConsent();
    if (!consent || consent.version !== CONSENT_VERSION) {
      const timer = setTimeout(() => {
        setPhase("entering");
        requestAnimationFrame(() => {
          requestAnimationFrame(() => setPhase("visible"));
        });
      }, APPEARANCE_DELAY);
      return () => clearTimeout(timer);
    }
  }, []);

  const dismissBanner = useCallback(() => {
    setPhase("exiting");
    setTimeout(() => setPhase("hidden"), 400);
  }, []);

  const handleAcceptAll = useCallback(() => {
    storeConsent({ essential: true, analytics: true, timestamp: new Date().toISOString(), version: CONSENT_VERSION });
    dismissBanner();
  }, [dismissBanner]);

  const handleRejectOptional = useCallback(() => {
    storeConsent({ essential: true, analytics: false, timestamp: new Date().toISOString(), version: CONSENT_VERSION });
    dismissBanner();
  }, [dismissBanner]);

  const handleSavePreferences = useCallback(() => {
    storeConsent({ essential: true, analytics: analyticsEnabled, timestamp: new Date().toISOString(), version: CONSENT_VERSION });
    dismissBanner();
  }, [analyticsEnabled, dismissBanner]);

  if (phase === "hidden") return null;

  const isShown = phase === "visible";

  return (
    <div
      className={`
        fixed bottom-0 left-0 right-0 z-[95]
        transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]
        ${isShown
          ? "translate-y-0 opacity-100"
          : "translate-y-full opacity-0 pointer-events-none"
        }
      `}
    >
      <div className="bg-white dark:bg-[#1c1f26] border-t border-gray-200/80 dark:border-gray-700/50 shadow-[0_-4px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_24px_rgba(0,0,0,0.3)]">

        {!showPreferences ? (
          /* ── Main Banner — slim single-row bar ── */
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 md:py-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-6">
              {/* Message */}
              <p className="text-[13px] leading-relaxed text-gray-600 dark:text-gray-400 sm:flex-1">
                Posty utilise des cookies essentiels et analytiques optionnels.{" "}
                <Link
                  href="/legal/cookies"
                  className="text-[#F8935D] hover:text-[#F76B54] transition-colors duration-200 whitespace-nowrap"
                >
                  En savoir plus
                </Link>
              </p>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => setShowPreferences(true)}
                  className="px-3.5 py-2 text-gray-500 dark:text-gray-400 text-[13px] font-medium hover:text-gray-800 dark:hover:text-gray-200 transition-colors duration-150"
                >
                  Parametrer
                </button>
                <button
                  onClick={handleRejectOptional}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-[13px] font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 active:scale-[0.97] transition-all duration-150"
                >
                  Refuser
                </button>
                <button
                  onClick={handleAcceptAll}
                  className="px-4 py-2 bg-[#F8935D] hover:bg-[#F76B54] text-white text-[13px] font-semibold rounded-lg active:scale-[0.97] transition-all duration-150"
                >
                  Accepter
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ── Preferences Panel — expands within the bar ── */
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                Preferences de cookies
              </p>
              <button
                onClick={() => setShowPreferences(false)}
                className="p-1.5 -mr-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                aria-label="Retour"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 mb-4">
              {/* Essential — always on */}
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-gray-900 dark:text-white">Essentiels</p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">Toujours actifs</p>
                </div>
                <div className="flex-shrink-0 w-9 h-[22px] bg-[#F8935D]/60 rounded-full relative cursor-not-allowed">
                  <div className="absolute right-[2px] top-[2px] w-[18px] h-[18px] bg-white rounded-full shadow-sm" />
                </div>
              </div>

              {/* Analytics — toggleable */}
              <label className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 cursor-pointer">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-gray-900 dark:text-white">Analytiques</p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">Ameliorer Posty</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={analyticsEnabled}
                  onClick={() => setAnalyticsEnabled(!analyticsEnabled)}
                  className={`
                    flex-shrink-0 relative w-9 h-[22px] rounded-full transition-colors duration-200
                    ${analyticsEnabled ? "bg-[#F8935D]" : "bg-gray-300 dark:bg-gray-600"}
                  `}
                >
                  <span
                    className={`
                      absolute top-[2px] w-[18px] h-[18px] bg-white rounded-full shadow-sm transition-all duration-200
                      ${analyticsEnabled ? "right-[2px]" : "left-[2px]"}
                    `}
                  />
                </button>
              </label>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2.5">
              <button
                onClick={handleSavePreferences}
                className="px-4 py-2 bg-[#F8935D] hover:bg-[#F76B54] text-white text-[13px] font-semibold rounded-lg active:scale-[0.97] transition-all duration-150"
              >
                Enregistrer
              </button>
              <Link
                href="/legal/cookies"
                className="px-3 py-2 text-gray-500 dark:text-gray-400 text-[13px] hover:text-gray-800 dark:hover:text-gray-200 transition-colors duration-150"
              >
                Politique de cookies
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
