"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { STORAGE_KEYS } from "@/hooks/useLocalStorage";

export interface CookieConsent {
  essential: boolean; // Always true
  functional: boolean;
  analytics: boolean;
  timestamp: string;
  version: string;
}

const CONSENT_VERSION = "2.0";
const CONSENT_COOKIE_NAME = "posty_cookie_consent";
const COOKIE_EXPIRY_DAYS = 365;
const CONSENT_MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000; // 12 months
const APPEARANCE_DELAY = 1500;

function setCookie(name: string, value: string, days: number) {
  if (typeof window === "undefined") return;
  const date = new Date();
  date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
  const expires = `expires=${date.toUTCString()}`;
  document.cookie = `${name}=${value};${expires};path=/;SameSite=Lax;Secure`;
}

function getCookie(name: string): string | null {
  if (typeof window === "undefined") return null;
  const nameEQ = `${name}=`;
  const cookies = document.cookie.split(";");
  for (let cookie of cookies) {
    cookie = cookie.trim();
    if (cookie.indexOf(nameEQ) === 0) {
      return cookie.substring(nameEQ.length);
    }
  }
  return null;
}

function isConsentExpired(consent: CookieConsent): boolean {
  if (!consent.timestamp) return true;
  const age = Date.now() - new Date(consent.timestamp).getTime();
  return age > CONSENT_MAX_AGE_MS;
}

function getStoredConsent(): CookieConsent | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = localStorage.getItem(STORAGE_KEYS.COOKIE_CONSENT);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.version === CONSENT_VERSION && !isConsentExpired(parsed)) return parsed;
    }
  } catch {
    // localStorage failed
  }

  try {
    const cookieValue = getCookie(CONSENT_COOKIE_NAME);
    if (cookieValue) {
      const parsed = JSON.parse(decodeURIComponent(cookieValue));
      if (parsed.version === CONSENT_VERSION && !isConsentExpired(parsed)) return parsed;
    }
  } catch {
    // Cookie parse failed
  }

  return null;
}

function storeConsent(consent: CookieConsent) {
  if (typeof window === "undefined") return;

  const consentString = JSON.stringify(consent);

  try {
    localStorage.setItem(STORAGE_KEYS.COOKIE_CONSENT, consentString);
  } catch {
    // localStorage failed
  }

  setCookie(CONSENT_COOKIE_NAME, encodeURIComponent(consentString), COOKIE_EXPIRY_DAYS);
}

/**
 * CookieBanner — RGPD compliant with granular cookie preferences
 *
 * 3 actions: Accept all, Refuse optional, Customize
 * Customize panel: toggle functional + analytics cookies
 */
export default function CookieBanner() {
  const [phase, setPhase] = useState<"hidden" | "entering" | "visible" | "exiting">("hidden");
  const [showPreferences, setShowPreferences] = useState(false);
  const [functional, setFunctional] = useState(false);
  const [analytics, setAnalytics] = useState(false);

  useEffect(() => {
    const consent = getStoredConsent();
    if (!consent) {
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

  const saveConsent = useCallback((opts: { functional: boolean; analytics: boolean }) => {
    const consent: CookieConsent = {
      essential: true,
      functional: opts.functional,
      analytics: opts.analytics,
      timestamp: new Date().toISOString(),
      version: CONSENT_VERSION,
    };
    storeConsent(consent);
    dismissBanner();
  }, [dismissBanner]);

  const handleAcceptAll = useCallback(() => {
    saveConsent({ functional: true, analytics: true });
  }, [saveConsent]);

  const handleRefuseOptional = useCallback(() => {
    saveConsent({ functional: false, analytics: false });
  }, [saveConsent]);

  const handleSavePreferences = useCallback(() => {
    saveConsent({ functional, analytics });
  }, [saveConsent, functional, analytics]);

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
      style={{
        paddingBottom: "max(env(safe-area-inset-bottom, 0px), 0px)",
      }}
    >
      <div className="bg-white dark:bg-[#1c1f26] border-t border-gray-200/80 dark:border-gray-700/50 shadow-[0_-4px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_24px_rgba(0,0,0,0.3)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-5">

          {/* Main banner content */}
          {!showPreferences ? (
            <div className="flex flex-col gap-4">
              {/* Message */}
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                  Nous respectons votre vie privée
                </p>
                <p className="text-[13px] leading-relaxed text-gray-600 dark:text-gray-400">
                  Posty utilise des cookies essentiels pour son fonctionnement. Les cookies fonctionnels et analytiques sont optionnels et nous aident à améliorer votre expérience.{" "}
                  <Link
                    href="/legal/cookies"
                    className="text-[#F8935D] hover:text-[#F76B54] transition-colors duration-200 whitespace-nowrap"
                  >
                    En savoir plus
                  </Link>
                </p>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                <button
                  onClick={handleAcceptAll}
                  className="px-5 py-2.5 bg-[#F8935D] hover:bg-[#F76B54] text-white text-[13px] font-semibold rounded-lg active:scale-[0.97] transition-all duration-150 order-1"
                >
                  Tout accepter
                </button>
                <button
                  onClick={handleRefuseOptional}
                  className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-[13px] font-semibold rounded-lg active:scale-[0.97] transition-all duration-150 order-2"
                >
                  Refuser les optionnels
                </button>
                <button
                  onClick={() => setShowPreferences(true)}
                  className="px-5 py-2.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-[13px] font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-150 order-3"
                >
                  Personnaliser
                </button>
              </div>
            </div>
          ) : (
            /* Preferences panel */
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Préférences de cookies
                </p>
                <button
                  onClick={() => setShowPreferences(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  aria-label="Fermer les préférences"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-3">
                {/* Essential - always on */}
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <div className="flex-1 mr-3">
                    <p className="text-[13px] font-medium text-gray-900 dark:text-white">Cookies essentiels</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Nécessaires au fonctionnement (authentification, sécurité). Ne peuvent pas être désactivés.</p>
                  </div>
                  <div className="relative w-10 h-6 bg-[#F8935D] rounded-full cursor-not-allowed opacity-70 flex-shrink-0">
                    <div className="absolute right-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow-sm" />
                  </div>
                </div>

                {/* Functional */}
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <div className="flex-1 mr-3">
                    <p className="text-[13px] font-medium text-gray-900 dark:text-white">Cookies fonctionnels</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Améliorent votre expérience (préférences d&apos;interface, barre latérale).</p>
                  </div>
                  <button
                    onClick={() => setFunctional(!functional)}
                    className={`relative w-10 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ${
                      functional ? "bg-[#F8935D]" : "bg-gray-300 dark:bg-gray-600"
                    }`}
                    role="switch"
                    aria-checked={functional}
                  >
                    <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
                      functional ? "right-0.5" : "left-0.5"
                    }`} />
                  </button>
                </div>

                {/* Analytics */}
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <div className="flex-1 mr-3">
                    <p className="text-[13px] font-medium text-gray-900 dark:text-white">Cookies analytiques</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Nous aident à comprendre l&apos;utilisation de l&apos;application pour l&apos;améliorer. Aucun tiers.</p>
                  </div>
                  <button
                    onClick={() => setAnalytics(!analytics)}
                    className={`relative w-10 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ${
                      analytics ? "bg-[#F8935D]" : "bg-gray-300 dark:bg-gray-600"
                    }`}
                    role="switch"
                    aria-checked={analytics}
                  >
                    <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
                      analytics ? "right-0.5" : "left-0.5"
                    }`} />
                  </button>
                </div>
              </div>

              {/* Save preferences */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSavePreferences}
                  className="px-5 py-2.5 bg-[#F8935D] hover:bg-[#F76B54] text-white text-[13px] font-semibold rounded-lg active:scale-[0.97] transition-all duration-150"
                >
                  Enregistrer mes choix
                </button>
                <Link
                  href="/legal/cookies"
                  className="text-xs text-gray-500 dark:text-gray-400 hover:text-[#F8935D] transition-colors ml-2"
                >
                  Politique de cookies
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
