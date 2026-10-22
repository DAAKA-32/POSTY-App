/**
 * Read-only view of the cookie-banner consent for the analytics layer.
 *
 * The banner (components/ui/CookieBanner.tsx) is the single writer. We only
 * read, and we fail CLOSED: no stored decision, an expired one, a different
 * consent version, an unreadable value, or a Global Privacy Control signal
 * all mean "no analytics".
 */

export const CONSENT_STORAGE_KEY = "posty_cookie_consent";
export const CONSENT_COOKIE_NAME = "posty_cookie_consent";
/** Fired on window by the banner whenever the user saves a choice. */
export const CONSENT_CHANGED_EVENT = "posty:consent-changed";

const CONSENT_VERSION = "2.0";
const CONSENT_MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;

interface StoredConsent {
  analytics?: boolean;
  timestamp?: string;
  version?: string;
}

function isValid(c: StoredConsent | null): c is StoredConsent {
  if (!c || c.version !== CONSENT_VERSION || !c.timestamp) return false;
  const age = Date.now() - new Date(c.timestamp).getTime();
  return Number.isFinite(age) && age >= 0 && age <= CONSENT_MAX_AGE_MS;
}

function readStored(): StoredConsent | null {
  try {
    const raw = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as StoredConsent;
      if (isValid(parsed)) return parsed;
    }
  } catch {
    // fall through to the cookie copy
  }
  try {
    const match = document.cookie
      .split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith(`${CONSENT_COOKIE_NAME}=`));
    if (match) {
      const parsed = JSON.parse(
        decodeURIComponent(match.slice(CONSENT_COOKIE_NAME.length + 1))
      ) as StoredConsent;
      if (isValid(parsed)) return parsed;
    }
  } catch {
    // unreadable → no consent
  }
  return null;
}

export function hasAnalyticsConsent(): boolean {
  if (typeof window === "undefined") return false;
  // Respect Global Privacy Control as an opt-out even if a banner "accept"
  // is on file.
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  if (nav.globalPrivacyControl === true) return false;
  return readStored()?.analytics === true;
}
