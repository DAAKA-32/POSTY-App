/**
 * Content strategy generated from the business context.
 *
 * Stored by the server on `users/{uid}.profile.strategy`. It is plain data
 * (pillars + a cadence suggestion) — a guide for the author, never a promise of
 * results — so everything here is length-capped and shape-checked on the way in
 * (model output) and on the way out (Firestore → UI).
 */

import { z } from "zod";

export const STRATEGY_PILLARS_MIN = 3;
export const STRATEGY_PILLARS_MAX = 5;

export const strategyPillarSchema = z.object({
  /** Short pillar name, e.g. "Chantiers expliqués". */
  name: z.string().min(1).max(60),
  /** What this pillar does for the audience and the business, in plain words. */
  purpose: z.string().min(1).max(220),
  /** One concrete post idea inside the pillar. */
  example: z.string().min(1).max(180),
});

/** What the model must return (no timestamps — the server adds them). */
export const strategyModelOutputSchema = z.object({
  pillars: z.array(strategyPillarSchema).min(STRATEGY_PILLARS_MIN).max(STRATEGY_PILLARS_MAX),
  /** Realistic publishing rhythm and why, e.g. "2 posts/week: …". */
  cadence: z.string().min(1).max(220),
});

export type StrategyPillar = z.infer<typeof strategyPillarSchema>;

export interface ContentStrategy {
  pillars: StrategyPillar[];
  cadence: string;
  /** ISO timestamp. */
  generatedAt: string;
  language: "fr" | "en";
}

/** Defensive read of whatever is in Firestore — returns null if unusable. */
export function readContentStrategy(raw: unknown): ContentStrategy | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const parsed = strategyModelOutputSchema.safeParse({ pillars: r.pillars, cadence: r.cadence });
  if (!parsed.success) return null;
  return {
    ...parsed.data,
    generatedAt: typeof r.generatedAt === "string" ? r.generatedAt : "",
    language: r.language === "en" ? "en" : "fr",
  };
}

/** Minimum context needed before a strategy is worth generating. */
export function canBuildStrategy(bp: { offer?: string; idealCustomer?: string } | null | undefined): boolean {
  return !!bp?.offer?.trim() && !!bp?.idealCustomer?.trim();
}
