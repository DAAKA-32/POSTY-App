/**
 * Lightweight, privacy-safe pageview tracker.
 *
 * Stores only an opaque random `vid` in localStorage — no IP, no UA, no
 * fingerprinting. Server-side aggregation is done by daily counters
 * (analytics_daily collection) using atomic increments — there is NO event
 * log of individual visits.
 */

import { getAuth } from "firebase/auth";

const VID_KEY = "posty_vid";
const LAST_DAY_KEY = "posty_vid_last_day";
const LAST_PATH_KEY = "posty_vid_last_path"; // throttle dedupe per session

function todayKey(): string {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function readVid(): { vid: string; isFirstEver: boolean } {
  if (typeof window === "undefined") {
    return { vid: "", isFirstEver: false };
  }
  const existing = window.localStorage.getItem(VID_KEY);
  if (existing) return { vid: existing, isFirstEver: false };

  // crypto.randomUUID is available in all evergreen browsers + iOS 14.6+
  const vid =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  try {
    window.localStorage.setItem(VID_KEY, vid);
  } catch {
    // localStorage might be disabled (private mode) — track as anon, no persistence
  }
  return { vid, isFirstEver: true };
}

function checkFirstOfDay(): boolean {
  if (typeof window === "undefined") return false;
  const today = todayKey();
  try {
    const last = window.localStorage.getItem(LAST_DAY_KEY);
    if (last === today) return false;
    window.localStorage.setItem(LAST_DAY_KEY, today);
    return true;
  } catch {
    return false;
  }
}

function checkPathDedupe(path: string): boolean {
  if (typeof window === "undefined") return true;
  try {
    const stamp = `${todayKey()}|${path}`;
    const last = window.sessionStorage.getItem(LAST_PATH_KEY);
    if (last === stamp) return false;
    window.sessionStorage.setItem(LAST_PATH_KEY, stamp);
    return true;
  } catch {
    return true;
  }
}

/**
 * Top-level slug only (e.g. "/", "/app", "/login"). We deliberately strip
 * everything past the first segment to avoid leaking IDs, search queries, or
 * deep PII-bearing paths into the analytics store.
 */
function topSlug(path: string): string {
  if (!path) return "/";
  const trimmed = path.split("?")[0].split("#")[0];
  if (trimmed === "/" || trimmed === "") return "/";
  const seg = trimmed.split("/").filter(Boolean)[0];
  return seg ? `/${seg}` : "/";
}

export async function trackPageview(rawPath: string): Promise<void> {
  if (typeof window === "undefined") return;

  const path = topSlug(rawPath);

  // Don't track admin or api paths from the client
  if (path.startsWith("/admin") || path.startsWith("/api")) return;

  // Per-session per-path dedupe (avoid double-fire on fast remounts/HMR)
  if (!checkPathDedupe(path)) return;

  const { vid, isFirstEver } = readVid();
  if (!vid) return;
  const isFirstOfDay = checkFirstOfDay();

  // Best-effort auth detection: attach Firebase ID token if a session exists.
  // Server is the authority — it verifies the token before crediting the
  // visit as authed.
  let idToken: string | null = null;
  try {
    const user = getAuth().currentUser;
    if (user) idToken = await user.getIdToken();
  } catch {
    // ignore — tracked as anonymous
  }

  const body = JSON.stringify({
    vid,
    path,
    isFirstEver,
    isFirstOfDay,
  });

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (idToken) headers.Authorization = `Bearer ${idToken}`;

  try {
    // Prefer fetch keepalive so we can attach Authorization header
    // (sendBeacon doesn't allow custom headers).
    await fetch("/api/analytics/track", {
      method: "POST",
      headers,
      body,
      keepalive: true,
    });
  } catch {
    // analytics is best-effort — never throw to the page
  }
}
