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
const APPEARANCE_DELAY = 5000;

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
        fixed bottom-4 left-4 right-4 sm:bottom-6 sm:left-auto sm:right-6 z-[95]
        sm:max-w-[420px]
        transition-all duration-300 ease-out
        ${isShown
          ? "translate-y-0 opacity-100"
          : "translate-y-4 opacity-0 pointer-events-none"
        }
      `}
      style={{
        fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif",
        paddingBottom: "max(env(safe-area-inset-bottom, 0px), 0px)",
      }}
    >
      <div className="bg-white dark:bg-[#1a1d24] border border-gray-200 dark:border-gray-700/60 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
        <div className="px-5 py-5">

          {/* Main banner content */}
          {!showPreferences ? (
            <div className="flex flex-col gap-4">
              {/* Header with shield icon */}
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-[18px] h-[18px] text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold text-gray-900 dark:text-white leading-tight">
                    Confidentialité
                  </p>
                  <p className="text-[13px] leading-relaxed text-gray-500 dark:text-gray-400 mt-1">
                    Nous utilisons des cookies essentiels et, avec votre accord, des cookies optionnels pour améliorer votre expérience.{" "}
                    <Link
                      href="/legal/cookies"
                      className="text-gray-700 dark:text-gray-300 underline underline-offset-2 decoration-gray-300 dark:decoration-gray-600 hover:decoration-gray-500 dark:hover:decoration-gray-400 transition-colors duration-200"
                    >
                      En savoir plus
                    </Link>
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleAcceptAll}
                  className="flex-1 px-4 py-2 bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 text-white dark:text-gray-900 text-[13px] font-semibold rounded-lg active:scale-[0.97] transition-all duration-150"
                >
                  Accepter
                </button>
                <button
                  onClick={handleRefuseOptional}
                  className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-[13px] font-semibold rounded-lg active:scale-[0.97] transition-all duration-150"
                >
                  Refuser
                </button>
                <button
                  onClick={() => setShowPreferences(true)}
                  className="px-3 py-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-150"
                  aria-label="Personnaliser les cookies"
                >
                  <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
              </div>
            </div>
          ) : (
            /* Preferences panel */
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <p className="text-[14px] font-semibold text-gray-900 dark:text-white">
                  Préférences
                </p>
                <button
                  onClick={() => setShowPreferences(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1"
                  aria-label="Fermer les préférences"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-2.5">
                {/* Essential - always on */}
                <div className="flex items-center justify-between py-2.5 px-3 bg-gray-50 dark:bg-gray-800/40 rounded-lg">
                  <div className="flex-1 mr-3">
                    <p className="text-[13px] font-medium text-gray-900 dark:text-white">Essentiels</p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-500 mt-0.5 leading-relaxed">Authentification et sécurité. Toujours actifs.</p>
                  </div>
                  <div className="relative w-9 h-[22px] bg-gray-900 dark:bg-white rounded-full cursor-not-allowed opacity-50 flex-shrink-0">
                    <div className="absolute right-0.5 top-0.5 w-[18px] h-[18px] bg-white dark:bg-gray-900 rounded-full" />
                  </div>
                </div>

                {/* Functional */}
                <div className="flex items-center justify-between py-2.5 px-3 bg-gray-50 dark:bg-gray-800/40 rounded-lg">
                  <div className="flex-1 mr-3">
                    <p className="text-[13px] font-medium text-gray-900 dark:text-white">Fonctionnels</p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-500 mt-0.5 leading-relaxed">Préférences d&apos;interface et personnalisation.</p>
                  </div>
                  <button
                    onClick={() => setFunctional(!functional)}
                    className={`relative w-9 h-[22px] rounded-full transition-colors duration-200 flex-shrink-0 ${
                      functional ? "bg-gray-900 dark:bg-white" : "bg-gray-300 dark:bg-gray-600"
                    }`}
                    role="switch"
                    aria-checked={functional}
                  >
                    <div className={`absolute top-0.5 w-[18px] h-[18px] bg-white dark:bg-gray-900 rounded-full transition-all duration-200 ${
                      functional ? "right-0.5" : "left-0.5"
                    }`} />
                  </button>
                </div>

                {/* Analytics */}
                <div className="flex items-center justify-between py-2.5 px-3 bg-gray-50 dark:bg-gray-800/40 rounded-lg">
                  <div className="flex-1 mr-3">
                    <p className="text-[13px] font-medium text-gray-900 dark:text-white">Analytiques</p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-500 mt-0.5 leading-relaxed">Statistiques d&apos;usage anonymes. Aucun tiers.</p>
                  </div>
                  <button
                    onClick={() => setAnalytics(!analytics)}
                    className={`relative w-9 h-[22px] rounded-full transition-colors duration-200 flex-shrink-0 ${
                      analytics ? "bg-gray-900 dark:bg-white" : "bg-gray-300 dark:bg-gray-600"
                    }`}
                    role="switch"
                    aria-checked={analytics}
                  >
                    <div className={`absolute top-0.5 w-[18px] h-[18px] bg-white dark:bg-gray-900 rounded-full transition-all duration-200 ${
                      analytics ? "right-0.5" : "left-0.5"
                    }`} />
                  </button>
                </div>
              </div>

              {/* Save preferences */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSavePreferences}
                  className="flex-1 px-4 py-2 bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 text-white dark:text-gray-900 text-[13px] font-semibold rounded-lg active:scale-[0.97] transition-all duration-150"
                >
                  Enregistrer
                </button>
                <Link
                  href="/legal/cookies"
                  className="text-[11px] text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 underline underline-offset-2 transition-colors ml-1"
                >
                  Politique cookies
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
