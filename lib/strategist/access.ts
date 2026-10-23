/**
 * Strategist access control.
 *
 * The Strategist is included in the Pro and Max plans (plan feature
 * `hasMarketingStrategist`, lib/config/plans.ts). On top of the plan, an email
 * allowlist grants access regardless of plan — enterprise contacts and testers
 * (`NEXT_PUBLIC_STRATEGIST_ALLOWED_EMAILS`, comma-separated). So:
 *
 *   access = plan has the Strategist  OR  email is on the allowlist
 *
 * Free is excluded unless allowlisted. Founder / gift accounts are Max through
 * `getFounderOverridePlan`, so they pass by plan.
 *
 * This file is client-safe (no Admin SDK): the same pure rule runs in the
 * browser (hooks) and on the server (`access-server.ts` reads the user doc and
 * calls `strategistAccessFromUserDoc`). The SERVER is the real gate; the client
 * only decides what to show.
 *
 * Why the allowlist is NEXT_PUBLIC_ (visible client-side): it lists *who has
 * access*, not secrets, and lets the client hide the nav entry without an API
 * round-trip.
 */

import { getFounderOverridePlan, planHasFeature, type PlanType } from "@/lib/config/plans";

/** Parse the env var once at module load. Lowercased + trimmed for
 *  case-insensitive matching.
 *
 *  MUST be a literal `process.env.NEXT_PUBLIC_…` member access: Next.js only
 *  inlines NEXT_PUBLIC_ vars into the client bundle for static lookups. The
 *  previous `process.env[ENV_KEY]` came out empty in the browser under webpack,
 *  so every user got the "reserved for companies" toast (API routes, which run
 *  on the server, were unaffected). */
function loadAllowedEmails(): Set<string> {
  const raw = process.env.NEXT_PUBLIC_STRATEGIST_ALLOWED_EMAILS ?? "";
  if (!raw) return new Set();
  return new Set(
    raw
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
  );
}

let _cached: Set<string> | null = null;
function getAllowedEmails(): Set<string> {
  if (_cached === null) _cached = loadAllowedEmails();
  return _cached;
}

/**
 * Is this email on the allowlist? An override that grants access whatever the
 * plan — NOT the whole rule (see `canUseStrategist`).
 *
 * `null` / `undefined` / empty strings return false — never grant access to
 * an unauthenticated or anonymized user.
 */
export function isStrategistAllowedForEmail(
  email: string | null | undefined
): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  if (!normalized) return false;
  return getAllowedEmails().has(normalized);
}

/** Does this plan include the Strategist (Pro and Max)? */
export function isStrategistPlan(plan: PlanType | null | undefined): boolean {
  return !!plan && planHasFeature(plan, "hasMarketingStrategist");
}

/**
 * THE access rule: the plan includes the Strategist, or the email is on the
 * allowlist. `plan` is the EFFECTIVE plan (founder/gift override applied).
 */
export function canUseStrategist(
  email: string | null | undefined,
  plan: PlanType | null | undefined
): boolean {
  return isStrategistPlan(plan) || isStrategistAllowedForEmail(email);
}

/**
 * A stored `subscription.plan` as a PlanType: casing and the legacy "starter"
 * (= pro) are normalised, anything unknown is null. Same mapping as
 * normalizePlan in lib/db/firestore-admin.ts and SubscriptionContext, kept
 * here so client code needn't import the Admin SDK module.
 */
export function strategistPlanFromStored(raw: unknown): PlanType | null {
  if (typeof raw !== "string") return null;
  const lower = raw.toLowerCase().trim();
  if (lower === "starter") return "pro";
  if (lower === "free" || lower === "pro" || lower === "max") return lower;
  return null;
}

/**
 * The rule applied to a `users/{uid}` document: effective plan = founder/gift
 * override (by email) else the stored plan. `authEmail` is the verified
 * Firebase Auth email, used when the document carries none yet.
 */
export function strategistAccessFromUserDoc(
  data: { email?: unknown; subscription?: { plan?: unknown } | null } | null | undefined,
  authEmail?: string | null
): boolean {
  const email = (typeof data?.email === "string" && data.email) || authEmail || null;
  const plan = getFounderOverridePlan(email) ?? strategistPlanFromStored(data?.subscription?.plan);
  return canUseStrategist(email, plan);
}

/** What a refused API call says (FR/EN) — one wording for every route. */
export function strategistDeniedMessage(language: string | null | undefined): string {
  return language === "fr"
    ? "Le Stratège est inclus dans les plans Pro et Max. Passe à Pro pour l'activer."
    : "The Strategist is included in the Pro and Max plans. Upgrade to Pro to unlock it.";
}

/** Total number of allowed emails — useful for diagnostics / debug pages. */
export function strategistAllowlistSize(): number {
  return getAllowedEmails().size;
}

// Server-only checks (`hasLinkedInConnected`, `hasStrategistAccess`) live in
// `./access-server.ts` — they import firestore-admin which requires node-only
// modules. Keeping this file client-safe means the browser bundle never tries
// to resolve them.
