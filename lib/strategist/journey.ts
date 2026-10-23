/**
 * Strategist journey — the guided, step-by-step path that builds a strategy
 * before the plan is generated. Pure logic (no React, no Firestore) so every
 * rule is unit-tested: __tests__/strategist/journey.test.ts.
 *
 * The answers ARE the existing editorial settings (`StrategistAdvancedParams`,
 * persisted on `users/{uid}.strategistParams` and read by every Strategist
 * pipeline) plus three plan-shaping fields that only exist for this request
 * (how many posts, over which period, what to put forward). Nothing new is
 * stored server-side: the draft lives in localStorage so a reload keeps it.
 */

import { objectiveFromProfile } from "@/lib/ai/post-formats";
import type { BusinessProfile } from "@/lib/business/profile";
import type { StrategistAdvancedParams } from "@/types";

export const JOURNEY_STEPS = ["activity", "audience", "goal", "style", "content", "review"] as const;
export type JourneyStep = (typeof JOURNEY_STEPS)[number];
export type JourneyPeriod = "week" | "month";

export type Objective = NonNullable<StrategistAdvancedParams["objective"]>;
export type Cta = NonNullable<StrategistAdvancedParams["ctaIntensity"]>;
export type Hook = NonNullable<StrategistAdvancedParams["hookStyle"]>;
export type Orientation = NonNullable<StrategistAdvancedParams["orientation"]>;

export const OBJECTIVES: Objective[] = ["authority", "engagement", "lead-gen", "conversion", "branding", "storytelling"];
export const TONES = ["direct", "expert", "inspiring", "bold", "warm"] as const;
export const ORIENTATIONS: Orientation[] = ["personal", "balanced", "professional"];
export const HOOKS: Hook[] = ["auto", "contrarian", "story", "data", "question", "confession"];
export const CTAS: Cta[] = ["none", "soft", "assertive"];

export const CONTEXT_MIN = 15;
export const CONTEXT_MAX = 800;
export const AUDIENCE_MIN = 3;
export const AUDIENCE_MAX = 200;
export const FOCUS_MAX = 300;
export const COUNT_MIN = 3;
export const DEFAULT_COUNT = 5;
/** batch-plan accepts up to 15 posts; a week stays readable at 10. */
export const countMax = (period: JourneyPeriod) => (period === "month" ? 15 : 10);

export interface JourneyAnswers extends StrategistAdvancedParams {
  count: number;
  period: JourneyPeriod;
  /** Topics, launches or news to put forward in this plan (optional). */
  focus?: string;
}

/** The profile fields the journey can borrow from (onboarding + business). */
export interface PrefillProfile {
  objective?: string | string[];
  targetAudience?: string | string[];
  communicationTone?: string | string[];
  business?: BusinessProfile;
}

export interface PrefillSource {
  /** Saved editorial settings — always win over anything inferred. */
  params?: StrategistAdvancedParams;
  profile?: PrefillProfile;
  bio?: string;
  autonomousCount?: number;
}

const first = (v: string | string[] | undefined): string =>
  (Array.isArray(v) ? v.find((x) => typeof x === "string" && x.trim()) : v)?.trim() ?? "";

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

const clip = (s: string | undefined, max: number) => (s ?? "").slice(0, max);

export const clampCount = (n: unknown, period: JourneyPeriod): number => {
  const v = typeof n === "number" && Number.isFinite(n) ? Math.round(n) : DEFAULT_COUNT;
  return Math.min(countMax(period), Math.max(COUNT_MIN, v));
};

/** Onboarding tone label ("Direct et percutant", "Inspiring and motivating"…) → preset slug. */
export function toneFromProfile(text: string | undefined): string | undefined {
  const v = norm(text ?? "");
  if (!v) return undefined;
  if (v.includes("direct") || v.includes("percutant") || v.includes("punchy")) return "direct";
  if (v.includes("inspir") || v.includes("motiv")) return "inspiring";
  if (v.includes("provoc") || v.includes("bold") || v.includes("audac")) return "bold";
  if (v.includes("authent") || v.includes("personn") || v.includes("conversation") || v.includes("accessible") || v.includes("warm") || v.includes("chaleur")) return "warm";
  if (v.includes("formel") || v.includes("formal") || v.includes("profession") || v.includes("educ") || v.includes("pedag") || v.includes("expert")) return "expert";
  return undefined;
}

/** Business "preferred CTA" free text → CTA strength. */
export function ctaFromBusiness(text: string | undefined): Cta | undefined {
  const v = norm(text ?? "");
  if (!v) return undefined;
  if (/\b(aucun|none|pas d|no cta|sans)\b/.test(v)) return "none";
  if (v.includes("question") || v.includes("comment") || v.includes("avis")) return "soft";
  if (/(contact|appel|call|rdv|rendez|demo|book|reserv|essai|trial|inscri|sign up|achat|buy|devis|quote|dm|message)/.test(v)) return "assertive";
  return undefined;
}

/** What the user's business profile says about what they do. */
export function contextFromBusiness(business: BusinessProfile | undefined): string {
  if (!business) return "";
  const parts = [business.offer, business.differentiator].map((p) => (p ?? "").trim()).filter(Boolean);
  return clip(parts.join(" "), CONTEXT_MAX);
}

/**
 * Starting answers: the saved settings first, then whatever the profile
 * already knows (only to fill EMPTY fields — never overwrite a saved value).
 */
export function prefillAnswers(src: PrefillSource): JourneyAnswers {
  const p = src.params ?? {};
  const profile = src.profile ?? {};
  const business = profile.business;
  const context = p.context?.trim() || contextFromBusiness(business) || (src.bio ?? "").trim();
  const audience = p.audience?.trim() || (business?.idealCustomer ?? "").trim() || first(profile.targetAudience);
  const answers: JourneyAnswers = {
    ...p,
    count: clampCount(src.autonomousCount ?? DEFAULT_COUNT, "week"),
    period: "week",
  };
  if (context) answers.context = clip(context, CONTEXT_MAX);
  if (audience) answers.audience = clip(audience, AUDIENCE_MAX);
  const objective = p.objective ?? objectiveFromProfile(first(profile.objective));
  if (objective) answers.objective = objective;
  const tone = p.tone ?? toneFromProfile(first(profile.communicationTone));
  if (tone) answers.tone = tone;
  const cta = p.ctaIntensity ?? ctaFromBusiness(business?.preferredCta);
  if (cta) answers.ctaIntensity = cta;
  return answers;
}

export type StepIssue = "contextShort" | "audienceShort";

/** Why the user can't leave this step yet — `null` when they can. */
export function stepIssue(step: JourneyStep, a: JourneyAnswers): StepIssue | null {
  if (step === "activity" && (a.context ?? "").trim().length < CONTEXT_MIN) return "contextShort";
  if (step === "audience" && (a.audience ?? "").trim().length < AUDIENCE_MIN) return "audienceShort";
  if (step === "review") return stepIssue("activity", a) ?? stepIssue("audience", a);
  return null;
}

/** The first step that still blocks the plan, or "review" when nothing does. */
export function firstIncompleteStep(a: JourneyAnswers): JourneyStep {
  if (stepIssue("activity", a)) return "activity";
  if (stepIssue("audience", a)) return "audience";
  return "review";
}

export const stepIndex = (s: JourneyStep) => JOURNEY_STEPS.indexOf(s);

/** The editorial settings carried by the answers (what gets saved + sent). */
export function answersToParams(a: JourneyAnswers): StrategistAdvancedParams {
  const out: StrategistAdvancedParams = {};
  if (a.context?.trim()) out.context = clip(a.context.trim(), CONTEXT_MAX);
  if (a.audience?.trim()) out.audience = clip(a.audience.trim(), AUDIENCE_MAX);
  if (a.objective) out.objective = a.objective;
  if (a.tone) out.tone = a.tone;
  if (a.formality) out.formality = a.formality;
  if (a.emotion) out.emotion = a.emotion;
  if (a.ctaIntensity) out.ctaIntensity = a.ctaIntensity;
  if (a.hookStyle) out.hookStyle = a.hookStyle;
  if (a.orientation) out.orientation = a.orientation;
  return out;
}

/**
 * The request sent to the planner. The editorial line travels separately (as
 * `advanced`), so this only says what to plan and what to put forward.
 */
export function buildSourcePrompt(a: JourneyAnswers, lang: "fr" | "en"): string {
  const count = clampCount(a.count, a.period);
  const focus = (a.focus ?? "").trim().slice(0, FOCUS_MAX);
  const base =
    lang === "fr"
      ? `Construis mon plan de ${count} posts LinkedIn pour ${a.period === "month" ? "le mois" : "la semaine"} à venir, fidèle à ma ligne éditoriale et à mon objectif.`
      : `Build my plan of ${count} LinkedIn posts for the coming ${a.period === "month" ? "month" : "week"}, true to my editorial line and my goal.`;
  const extra = focus
    ? lang === "fr"
      ? ` À mettre en avant en priorité : ${focus}`
      : ` Put this forward first: ${focus}`
    : "";
  return (base + extra).slice(0, 2000);
}

// ─── Draft (localStorage) ────────────────────────────────────────────────────

export const DRAFT_VERSION = 1;
export const draftKey = (uid: string) => `posty-strategist-journey:${uid}`;

export interface JourneyDraft {
  step: JourneyStep;
  /** Furthest step reached — earlier steps stay clickable in the progress rail. */
  reached: JourneyStep;
  answers: JourneyAnswers;
}

export function serializeDraft(d: JourneyDraft): string {
  return JSON.stringify({ v: DRAFT_VERSION, ...d });
}

const pick = <T extends string>(v: unknown, allowed: readonly T[]): T | undefined =>
  typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : undefined;

const scale = (v: unknown): 1 | 2 | 3 | 4 | 5 | undefined =>
  typeof v === "number" && [1, 2, 3, 4, 5].includes(v) ? (v as 1 | 2 | 3 | 4 | 5) : undefined;

const str = (v: unknown, max: number): string | undefined =>
  typeof v === "string" && v.trim() ? v.slice(0, max) : undefined;

/** Parse a stored draft; anything malformed or from another version → null. */
export function parseDraft(raw: string | null | undefined): JourneyDraft | null {
  if (!raw) return null;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  if (d.v !== DRAFT_VERSION) return null;
  const step = pick(d.step, JOURNEY_STEPS);
  const reached = pick(d.reached, JOURNEY_STEPS) ?? step;
  const a = (d.answers && typeof d.answers === "object" ? d.answers : null) as Record<string, unknown> | null;
  if (!step || !reached || !a) return null;
  const period = pick(a.period, ["week", "month"] as const) ?? "week";
  const answers: JourneyAnswers = { count: clampCount(a.count, period), period };
  const context = str(a.context, CONTEXT_MAX);
  if (context) answers.context = context;
  const audience = str(a.audience, AUDIENCE_MAX);
  if (audience) answers.audience = audience;
  const focus = str(a.focus, FOCUS_MAX);
  if (focus) answers.focus = focus;
  const objective = pick(a.objective, OBJECTIVES);
  if (objective) answers.objective = objective;
  const tone = pick(a.tone, TONES);
  if (tone) answers.tone = tone;
  const orientation = pick(a.orientation, ORIENTATIONS);
  if (orientation) answers.orientation = orientation;
  const hookStyle = pick(a.hookStyle, HOOKS);
  if (hookStyle) answers.hookStyle = hookStyle;
  const ctaIntensity = pick(a.ctaIntensity, CTAS);
  if (ctaIntensity) answers.ctaIntensity = ctaIntensity;
  const formality = scale(a.formality);
  if (formality) answers.formality = formality;
  const emotion = scale(a.emotion);
  if (emotion) answers.emotion = emotion;
  return {
    step,
    reached: stepIndex(reached) >= stepIndex(step) ? reached : step,
    answers,
  };
}
