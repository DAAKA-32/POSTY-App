/**
 * First-party analytics tracker (browser side).
 *
 * Privacy contract
 *  - NOTHING is stored or sent until the visitor has accepted the "analytics"
 *    category in the cookie banner (and no Global Privacy Control signal is
 *    present). Before that, landing signals (referrer / UTM) are held in
 *    memory only so the first page is still attributed once consent arrives
 *    in the same visit.
 *  - Identifiers: a random visitor id and a random session id. No IP, no
 *    user-agent, no fingerprinting. Referrer is reduced to its origin; click
 *    ids are reduced to a present/absent flag.
 *  - Withdrawing consent erases the stored ids.
 *  - Best-effort: every failure is swallowed, the page is never affected.
 *
 * What the browser sends is RAW signals. The server classifies the source
 * (lib/analytics/attribution.ts) and decides what counts as a conversion.
 */

import { getAuth } from "firebase/auth";
import {
  CONSENT_CHANGED_EVENT,
  hasAnalyticsConsent,
} from "./consent";
import {
  isPricingPath,
  normalizePath,
  type AnalyticsEventName,
  type BillingIntervalId,
  type PlanId,
  type RawTouch,
} from "./events";

const VID_KEY = "posty_vid";
const SID_KEY = "posty_sid";
/** Legacy keys from the previous counter-only tracker. */
const LEGACY_KEYS = ["posty_vid_last_day", "posty_vid_last_path"];
const SESSION_IDLE_MS = 30 * 60 * 1000;
const DEDUPE_MS = 1500;

let landingTouch: RawTouch | null = null;
let landingConsumed = false;
const recent = new Map<string, number>();

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

// ───────────────────────── Landing capture ─────────────────────────

function safeReferrer(ref: string): string | undefined {
  if (!ref) return undefined;
  try {
    const url = new URL(ref);
    if (url.protocol === "android-app:") return `android-app://${url.host}`;
    if (url.protocol === "http:" || url.protocol === "https:") return url.origin;
  } catch {
    // ignore
  }
  return undefined;
}

/**
 * Snapshot the landing referrer + campaign parameters (memory only). Called
 * once per document load, before consent is known.
 */
export function captureLanding(): void {
  if (typeof window === "undefined" || landingTouch) return;
  const touch: RawTouch = {};
  const referrer = safeReferrer(document.referrer);
  if (referrer) touch.referrer = referrer;
  try {
    const p = new URLSearchParams(window.location.search);
    for (const k of [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_content",
      "utm_term",
    ] as const) {
      const v = p.get(k);
      if (v) touch[k] = v.slice(0, 100);
    }
    if (p.has("gclid")) touch.gclid = true;
    if (p.has("fbclid")) touch.fbclid = true;
    if (p.has("ttclid")) touch.ttclid = true;
    if (p.has("msclkid")) touch.msclkid = true;
  } catch {
    // malformed query string → no campaign data, visit still counted
  }
  landingTouch = touch;
}

// ───────────────────────── Ids ─────────────────────────

function readVid(): string | null {
  try {
    let vid = window.localStorage.getItem(VID_KEY);
    if (!vid || !/^[A-Za-z0-9_-]{8,64}$/.test(vid)) {
      vid = uuid();
      window.localStorage.setItem(VID_KEY, vid);
    }
    return vid;
  } catch {
    return null;
  }
}

/** Current session id + the raw touch to attach (only for a fresh session). */
function readSession(now: number): { sid: string; touch?: RawTouch } | null {
  try {
    const raw = window.sessionStorage.getItem(SID_KEY);
    if (raw) {
      const s = JSON.parse(raw) as { sid: string; last: number };
      if (s?.sid && now - s.last < SESSION_IDLE_MS) {
        window.sessionStorage.setItem(SID_KEY, JSON.stringify({ sid: s.sid, last: now }));
        return { sid: s.sid };
      }
    }
    const sid = uuid();
    window.sessionStorage.setItem(SID_KEY, JSON.stringify({ sid, last: now }));
    // The landing referrer/UTM belong to the FIRST session of this document
    // only. A session that restarts after idling is a new, direct visit.
    let touch: RawTouch | undefined;
    if (!landingConsumed) {
      touch = landingTouch ?? undefined;
      landingConsumed = true;
    }
    return { sid, touch: touch ?? {} };
  } catch {
    return null;
  }
}

function purgeIds(): void {
  try {
    window.localStorage.removeItem(VID_KEY);
    for (const k of LEGACY_KEYS) window.localStorage.removeItem(k);
    window.sessionStorage.removeItem(SID_KEY);
  } catch {
    // nothing to purge
  }
}

// ───────────────────────── Sending ─────────────────────────

async function authHeader(): Promise<Record<string, string>> {
  try {
    const user = getAuth().currentUser;
    if (user) return { Authorization: `Bearer ${await user.getIdToken()}` };
  } catch {
    // anonymous
  }
  return {};
}

function throttled(key: string): boolean {
  const now = Date.now();
  const last = recent.get(key);
  if (last && now - last < DEDUPE_MS) return true;
  recent.set(key, now);
  if (recent.size > 50) recent.clear();
  return false;
}

export interface TrackOptions {
  plan?: PlanId;
  interval?: BillingIntervalId;
  path?: string;
  props?: Record<string, string | number | boolean>;
}

export async function trackEvent(
  name: AnalyticsEventName,
  opts: TrackOptions = {}
): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    if (!hasAnalyticsConsent()) {
      purgeIds();
      return;
    }
    captureLanding();

    const path = normalizePath(opts.path ?? window.location.pathname);
    if (path.startsWith("/admin") || path.startsWith("/api")) return;
    if (throttled(`${name}|${opts.plan ?? ""}|${path}`)) return;

    const vid = readVid();
    const session = readSession(Date.now());
    if (!vid || !session) return;

    const body = JSON.stringify({
      eventId: uuid(),
      name,
      vid,
      sid: session.sid,
      path,
      ...(opts.plan ? { plan: opts.plan } : {}),
      ...(opts.interval ? { interval: opts.interval } : {}),
      ...(opts.props ? { props: opts.props } : {}),
      ...(session.touch ? { touch: { ...session.touch } } : {}),
    });

    await fetch("/api/analytics/event", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeader()) },
      body,
      keepalive: true,
    });
  } catch {
    // analytics must never throw into the page
  }
}

export async function trackPageview(rawPath: string): Promise<void> {
  const path = normalizePath(rawPath);
  await trackEvent("page_view", { path });
  if (isPricingPath(path)) await trackEvent("pricing_page_view", { path });
}

const planViewSeen = new Set<string>();
/** A plan card became visible. Once per plan per surface per page load. */
export function trackPlanView(plan: PlanId, surface: string): void {
  const k = `${plan}|${surface}`;
  if (planViewSeen.has(k)) return;
  planViewSeen.add(k);
  void trackEvent("plan_view", { plan, props: { surface } });
}

export function trackPlanClick(
  plan: PlanId,
  surface: string,
  interval?: BillingIntervalId
): void {
  void trackEvent("plan_click", { plan, interval, props: { surface } });
}

/**
 * Tell the server an account was just created so it can verify the signup
 * and link it to this visitor's first-touch attribution. Safe to call
 * without consent: then it sends no visitor id and the signup is counted as
 * an unattributed account creation.
 */
export async function reportSignup(): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const consented = hasAnalyticsConsent();
    const vid = consented ? window.localStorage.getItem(VID_KEY) : null;
    await fetch("/api/analytics/identify", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeader()) },
      body: JSON.stringify(vid ? { vid } : {}),
      keepalive: true,
    });
  } catch {
    // best-effort
  }
}

/** Subscribe to consent changes; returns an unsubscribe function. */
export function onConsentChange(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => {
    if (!hasAnalyticsConsent()) purgeIds();
    cb();
  };
  window.addEventListener(CONSENT_CHANGED_EVENT, handler);
  return () => window.removeEventListener(CONSENT_CHANGED_EVENT, handler);
}
