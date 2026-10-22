/**
 * Structured business context — the "what does this business actually do"
 * layer the marketing agent reuses across every AI workflow (post generation,
 * assistant, Strategist chat, batch planning, materialization).
 *
 * Stored on `users/{uid}.profile.business`. It deliberately lives INSIDE the
 * existing `profile` map: `profile` is already in firestore.rules'
 * userClientKeys(), so no rules deploy is needed, and getUserProfile() already
 * returns `data.profile` whole. Write it with a dotted path
 * (`"profile.business"`) so the onboarding fields are never clobbered.
 *
 * This file is pure (no imports) so the client form and the server prompt
 * code share the same field list and caps. Prompt sanitization lives in
 * ./render.ts (server side) — never put these strings in a prompt without it.
 */

export interface BusinessProfile {
  /** Company / brand name. */
  name?: string;
  /** Public website. */
  website?: string;
  /** What is sold: products/services and the main offer. */
  offer?: string;
  /** Who the ideal customer is (role, company type). */
  idealCustomer?: string;
  /** The problems those customers have, in the author's words. */
  customerProblems?: string;
  /** What makes the business different. */
  differentiator?: string;
  /** Substantiated proof the author can stand behind (results, clients, years).
   *  The AI is told it may ONLY cite figures that appear here. */
  proofPoints?: string;
  /** Topics / claims the content must never touch. */
  avoidTopics?: string;
  /** Preferred call to action (e.g. "book a call", "comment below"). */
  preferredCta?: string;
  /** ISO timestamp of the last edit (informational). */
  updatedAt?: string;
}

export type BusinessField = Exclude<keyof BusinessProfile, "updatedAt">;

/** Field order = form order. `core` fields drive the completeness meter. */
export const BUSINESS_FIELDS: ReadonlyArray<{
  key: BusinessField;
  max: number;
  multiline: boolean;
  core: boolean;
}> = [
  { key: "name", max: 80, multiline: false, core: true },
  { key: "offer", max: 400, multiline: true, core: true },
  { key: "idealCustomer", max: 300, multiline: true, core: true },
  { key: "customerProblems", max: 400, multiline: true, core: false },
  { key: "differentiator", max: 300, multiline: true, core: false },
  { key: "proofPoints", max: 400, multiline: true, core: false },
  { key: "website", max: 200, multiline: false, core: false },
  { key: "preferredCta", max: 120, multiline: false, core: false },
  { key: "avoidTopics", max: 300, multiline: true, core: false },
];

const CAPS: Record<BusinessField, number> = Object.fromEntries(
  BUSINESS_FIELDS.map((f) => [f.key, f.max]),
) as Record<BusinessField, number>;

/** Trim + cap every known field, drop unknown keys and empty values.
 *  Safe to run on untrusted Firestore data. */
export function normalizeBusinessProfile(raw: unknown): BusinessProfile {
  if (!raw || typeof raw !== "object") return {};
  const src = raw as Record<string, unknown>;
  const out: BusinessProfile = {};
  for (const { key } of BUSINESS_FIELDS) {
    const v = src[key];
    if (typeof v !== "string") continue;
    const cleaned = v
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
      .trim()
      .slice(0, CAPS[key]);
    if (cleaned) out[key] = cleaned;
  }
  if (typeof src.updatedAt === "string") out.updatedAt = src.updatedAt;
  return out;
}

export function hasBusinessContext(bp: BusinessProfile | undefined | null): boolean {
  return !!bp && BUSINESS_FIELDS.some(({ key }) => !!bp[key]?.trim());
}

export interface BusinessCompleteness {
  /** Core fields filled / total core fields. */
  filledCore: number;
  totalCore: number;
  /** All fields filled / total. */
  filled: number;
  total: number;
  /** Core fields still empty, in form order. */
  missingCore: BusinessField[];
  /** 0–100 over all fields. */
  percent: number;
}

export function businessCompleteness(bp: BusinessProfile | undefined | null): BusinessCompleteness {
  const core = BUSINESS_FIELDS.filter((f) => f.core);
  const has = (k: BusinessField) => !!bp?.[k]?.trim();
  const filledCore = core.filter((f) => has(f.key)).length;
  const filled = BUSINESS_FIELDS.filter((f) => has(f.key)).length;
  return {
    filledCore,
    totalCore: core.length,
    filled,
    total: BUSINESS_FIELDS.length,
    missingCore: core.filter((f) => !has(f.key)).map((f) => f.key),
    percent: Math.round((filled / BUSINESS_FIELDS.length) * 100),
  };
}
