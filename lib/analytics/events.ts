/**
 * Shared analytics event taxonomy + payload validation.
 *
 * Used by the browser tracker, the ingestion route and the server-side
 * recorders so every layer agrees on names, trust levels and limits.
 *
 * Trust levels (who is allowed to emit what):
 *  - "client"        anonymous browser events: navigation + intent only
 *  - "client_authed" browser events carrying a verified Firebase ID token:
 *                    product usage (low stakes, user-asserted)
 *  - "server"        emitted by our own backend (Stripe webhook, checkout
 *                    route, identify route). The browser can NEVER send these.
 */

import { z } from "zod";

export const PLAN_IDS = ["free", "pro", "max"] as const;
export type PlanId = (typeof PLAN_IDS)[number];

export const INTERVALS = ["monthly", "yearly"] as const;
export type BillingIntervalId = (typeof INTERVALS)[number];

/** Anonymous browser events. */
export const CLIENT_EVENTS = [
  "page_view",
  "pricing_page_view",
  "feature_page_view",
  "faq_interaction",
  "cta_click",
  "plan_view",
  "plan_click",
  "signup_started",
] as const;

/** Browser events accepted only with a verified ID token. */
export const CLIENT_AUTHED_EVENTS = [
  "login_completed",
  "onboarding_started",
  "onboarding_completed",
  "business_profile_completed",
  "strategy_plan_approved",
  "post_created",
  "post_scheduled",
  "post_published",
  "post_publish_failed",
  "marketing_strategy_created",
] as const;

/** Emitted only by the backend. Rejected if a browser sends them. */
export const SERVER_EVENTS = [
  "signup_completed",
  "first_content_created",
  "first_post_published",
  "trial_started",
  "checkout_started",
  "subscription_created",
  "subscription_renewed",
  "subscription_cancelled",
  "payment_failed",
] as const;

export type ClientEventName = (typeof CLIENT_EVENTS)[number];
export type ClientAuthedEventName = (typeof CLIENT_AUTHED_EVENTS)[number];
export type ServerEventName = (typeof SERVER_EVENTS)[number];
export type AnalyticsEventName =
  | ClientEventName
  | ClientAuthedEventName
  | ServerEventName;

export const ALL_EVENT_NAMES: readonly AnalyticsEventName[] = [
  ...CLIENT_EVENTS,
  ...CLIENT_AUTHED_EVENTS,
  ...SERVER_EVENTS,
];

export type TrustLevel = "client" | "client_authed" | "server";

export function trustOf(name: string): TrustLevel | null {
  if ((CLIENT_EVENTS as readonly string[]).includes(name)) return "client";
  if ((CLIENT_AUTHED_EVENTS as readonly string[]).includes(name))
    return "client_authed";
  if ((SERVER_EVENTS as readonly string[]).includes(name)) return "server";
  return null;
}

/** Events that mark a session as "engaged" (besides a 2nd page view). */
export const ENGAGING_EVENTS: readonly string[] = [
  "plan_click",
  "cta_click",
  "faq_interaction",
  "signup_started",
];

// ───────────────────────── Payload validation ─────────────────────────

const ID_RE = /^[A-Za-z0-9_-]{8,64}$/;

const propValue = z.union([
  z.string().max(100),
  z.number().finite(),
  z.boolean(),
]);

/**
 * Raw acquisition signals captured in the browser. The SERVER classifies
 * them — the browser never gets to claim "this visit came from ChatGPT".
 */
// A malformed attribution field must never reject the whole event (the
// visit still happened): each field degrades to "absent" on its own.
const lenientStr = (max: number) => z.string().max(max).optional().catch(undefined);
const lenientFlag = z.boolean().optional().catch(undefined);

export const touchSchema = z.object({
  referrer: lenientStr(300),
  utm_source: lenientStr(100),
  utm_medium: lenientStr(100),
  utm_campaign: lenientStr(100),
  utm_content: lenientStr(100),
  utm_term: lenientStr(100),
  /** Click-id presence only (never the id itself). */
  gclid: lenientFlag,
  fbclid: lenientFlag,
  ttclid: lenientFlag,
  msclkid: lenientFlag,
});
export type RawTouch = z.infer<typeof touchSchema>;

export const clientEventSchema = z
  .object({
    eventId: z.string().regex(ID_RE),
    name: z.string().max(40),
    vid: z.string().regex(ID_RE),
    sid: z.string().regex(ID_RE),
    path: z.string().max(200).optional(),
    plan: z.enum(PLAN_IDS).optional(),
    interval: z.enum(INTERVALS).optional(),
    props: z.record(z.string().max(32), propValue).optional(),
    touch: touchSchema.optional().catch(undefined),
  })
  .strict()
  .refine((v) => !v.props || Object.keys(v.props).length <= 8, {
    message: "too_many_props",
  });
export type ClientEventInput = z.infer<typeof clientEventSchema>;

export const identifySchema = z
  .object({
    vid: z.string().regex(ID_RE).optional().catch(undefined),
    /** Plan the visitor last clicked before signing up (user-asserted). */
    planIntent: z.enum(PLAN_IDS).optional(),
  })
  .strict();
export type IdentifyInput = z.infer<typeof identifySchema>;

// ───────────────────────── Path normalisation ─────────────────────────

/**
 * Landing / page paths are reduced to a bounded vocabulary so a hostile
 * client cannot create unlimited distinct aggregate keys, and so IDs or
 * search queries in URLs never reach the analytics store.
 */
const KNOWN_PATHS = new Set([
  "/",
  "/subscription",
  "/pricing",
  "/signup",
  "/login",
  "/about",
  "/business",
  "/brand",
  "/legal",
  "/app",
  "/chat",
  "/onboarding",
  "/dashboard",
  "/history",
  "/schedule",
  "/settings",
  "/profile",
  "/strategist",
  "/checkout",
  "/forgot-password",
]);

export function normalizePath(raw: string | undefined | null): string {
  if (!raw) return "/";
  const noQuery = raw.split("?")[0].split("#")[0];
  const seg = noQuery.split("/").filter(Boolean)[0];
  if (!seg) return "/";
  const top = `/${seg.toLowerCase()}`;
  return KNOWN_PATHS.has(top) ? top : "/other";
}

export function isPricingPath(path: string): boolean {
  return path === "/subscription" || path === "/pricing";
}

// ───────────────────────── Day helpers (UTC) ─────────────────────────

/** All daily aggregation is done in UTC. */
export function utcDayKey(d: Date | number): string {
  const date = typeof d === "number" ? new Date(d) : d;
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
