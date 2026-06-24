"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { LEGAL_VERSIONS } from "@/lib/i18n/legal";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { updateUserProfile } from "@/lib/db/firestore";

const STORAGE_KEY = "posty_legal_versions_seen";

interface SeenVersions {
  privacy?: string;
  terms?: string;
  notices?: string;
  cookies?: string;
}

/** The versions currently shipped — what "fully acknowledged" looks like. */
function currentVersions(): SeenVersions {
  return {
    privacy: LEGAL_VERSIONS.privacy.version,
    terms: LEGAL_VERSIONS.terms.version,
    notices: LEGAL_VERSIONS.notices.version,
    cookies: LEGAL_VERSIONS.cookies.version,
  };
}

/** localStorage cache — anti-flash before the profile loads, and the only
 *  store for logged-out visitors (who have no account to sync to). */
function getLocalSeenVersions(): SeenVersions {
  if (typeof window === "undefined") return {};
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function writeLocalSeen(versions: SeenVersions) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(versions));
  } catch {
    /* localStorage disabled — ignore */
  }
}

/**
 * Displays a non-intrusive notification when legal documents have been updated
 * since the user last acknowledged them. Only shows for logged-in users who
 * have previously seen older versions.
 */
export default function LegalUpdateNotification() {
  const { t } = useLanguage();
  const { user, userProfile, refreshUserProfile } = useAuth();
  const [updatedDocs, setUpdatedDocs] = useState<{ name: string; href: string }[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  // Guard so the silent first-visit baseline persists at most once per mount.
  const baselinedRef = useRef(false);

  // Persist acknowledged versions: account-level for logged-in users (so it
  // syncs across every browser/device), localStorage always (anti-flash cache
  // + the only store available to logged-out visitors).
  const persistSeen = (versions: SeenVersions) => {
    writeLocalSeen(versions);
    if (user) {
      updateUserProfile(user.uid, { legalVersionsSeen: versions })
        .then(() => refreshUserProfile())
        .catch((err) =>
          console.warn("Failed to persist legal acknowledgement:", err)
        );
    }
  };

  useEffect(() => {
    // For logged-in users, wait for the profile so the account record is the
    // authoritative source before deciding whether to nag.
    if (user && !userProfile) return;

    // Source of truth: the account field when present, else the localStorage
    // cache (covers logged-out visitors and the pre-load / pre-migration window).
    const accountSeen = user ? userProfile?.legalVersionsSeen : undefined;
    const seen: SeenVersions =
      accountSeen && Object.keys(accountSeen).length > 0
        ? accountSeen
        : getLocalSeenVersions();

    // Only show if the user has acknowledged at least one version before
    // (not a brand-new visitor).
    const hasSeenBefore = Object.keys(seen).length > 0;
    if (!hasSeenBefore) {
      // First time: baseline current versions silently (once per mount).
      if (!baselinedRef.current) {
        baselinedRef.current = true;
        persistSeen(currentVersions());
      }
      return;
    }

    const docs: { name: string; href: string }[] = [];

    if (seen.privacy && seen.privacy !== LEGAL_VERSIONS.privacy.version) {
      docs.push({ name: t.modals.privacyPolicyDoc, href: "/legal/privacy" });
    }
    if (seen.terms && seen.terms !== LEGAL_VERSIONS.terms.version) {
      docs.push({ name: t.modals.termsOfUseDoc, href: "/legal/terms" });
    }
    if (seen.notices && seen.notices !== LEGAL_VERSIONS.notices.version) {
      docs.push({ name: t.modals.legalNoticesDoc, href: "/legal/notices" });
    }
    if (seen.cookies && seen.cookies !== LEGAL_VERSIONS.cookies.version) {
      docs.push({ name: t.modals.cookiePolicyDoc, href: "/legal/cookies" });
    }

    if (docs.length > 0) {
      setUpdatedDocs(docs);
      setIsVisible(true);
    } else {
      // Acknowledged elsewhere (another device) → make sure we're hidden.
      setIsVisible(false);
    }
    // persistSeen is a stable-enough closure; deps kept minimal on purpose.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t, user, userProfile]);

  const handleDismiss = () => {
    persistSeen(currentVersions());
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
              {t.modals.legalDocsUpdated}
            </p>
            <p className="text-xs text-gray-500 dark:text-text-muted mb-2">
              {t.modals.legalDocsModified}
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
              {t.modals.understood}
            </button>
          </div>
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors shrink-0"
            aria-label={t.common.close}
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
