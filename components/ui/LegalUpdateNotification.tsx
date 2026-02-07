"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { LEGAL_VERSIONS } from "@/lib/i18n/legal";

const STORAGE_KEY = "posty_legal_versions_seen";

interface SeenVersions {
  privacy?: string;
  terms?: string;
  notices?: string;
  cookies?: string;
}

function getSeenVersions(): SeenVersions {
  if (typeof window === "undefined") return {};
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function markVersionsSeen(versions: SeenVersions) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(versions));
}

/**
 * Displays a non-intrusive notification when legal documents have been updated
 * since the user last acknowledged them. Only shows for logged-in users who
 * have previously seen older versions.
 */
export default function LegalUpdateNotification() {
  const [updatedDocs, setUpdatedDocs] = useState<{ name: string; href: string }[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const seen = getSeenVersions();

    // Only show if user has seen at least one version before (not first visit)
    const hasSeenBefore = Object.keys(seen).length > 0;
    if (!hasSeenBefore) {
      // First time: save current versions silently
      markVersionsSeen({
        privacy: LEGAL_VERSIONS.privacy.version,
        terms: LEGAL_VERSIONS.terms.version,
        notices: LEGAL_VERSIONS.notices.version,
        cookies: LEGAL_VERSIONS.cookies.version,
      });
      return;
    }

    const docs: { name: string; href: string }[] = [];

    if (seen.privacy && seen.privacy !== LEGAL_VERSIONS.privacy.version) {
      docs.push({ name: "Politique de confidentialite", href: "/legal/privacy" });
    }
    if (seen.terms && seen.terms !== LEGAL_VERSIONS.terms.version) {
      docs.push({ name: "Conditions d'utilisation", href: "/legal/terms" });
    }
    if (seen.notices && seen.notices !== LEGAL_VERSIONS.notices.version) {
      docs.push({ name: "Mentions legales", href: "/legal/notices" });
    }
    if (seen.cookies && seen.cookies !== LEGAL_VERSIONS.cookies.version) {
      docs.push({ name: "Politique de cookies", href: "/legal/cookies" });
    }

    if (docs.length > 0) {
      setUpdatedDocs(docs);
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    markVersionsSeen({
      privacy: LEGAL_VERSIONS.privacy.version,
      terms: LEGAL_VERSIONS.terms.version,
      notices: LEGAL_VERSIONS.notices.version,
      cookies: LEGAL_VERSIONS.cookies.version,
    });
    setIsVisible(false);
  };

  if (!isVisible || updatedDocs.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[90] max-w-sm animate-fade-in">
      <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl shadow-lg p-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 shrink-0 rounded-lg bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center">
            <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
              Documents legaux mis a jour
            </p>
            <p className="text-xs text-gray-500 dark:text-text-muted mb-2">
              Les documents suivants ont ete modifies :
            </p>
            <ul className="space-y-1 mb-3">
              {updatedDocs.map((doc) => (
                <li key={doc.href}>
                  <Link
                    href={doc.href}
                    className="text-xs text-primary hover:text-accent transition-colors"
                    onClick={handleDismiss}
                  >
                    {doc.name}
                  </Link>
                </li>
              ))}
            </ul>
            <button
              onClick={handleDismiss}
              className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-text-secondary transition-colors"
            >
              J&apos;ai compris
            </button>
          </div>
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors shrink-0"
            aria-label="Fermer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
