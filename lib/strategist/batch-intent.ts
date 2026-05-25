/**
 * Strategist batch-plan intent detector (client-side regex).
 *
 * Decides whether the user's free-form ask should be routed to the batch
 * plan endpoint instead of the conversational Strategist. Pure regex, runs
 * in <1ms — no LLM, no network. False positives default to "no batch" (the
 * user will just get the normal conversational advice, which is safe).
 *
 * Patterns matched (FR + EN):
 *   - "prépare/génère/crée-moi 5 posts"
 *   - "fais-moi 3 posts pour cette semaine"
 *   - "planning de la semaine / du mois / pour 3 jours"
 *   - "donne-moi 5 idées de posts" (idea batch counts here too)
 *   - "prepare/generate/give me 5 posts/post ideas"
 *
 * Returns the requested count, clamped to [1, 15]. Defaults vary by period
 * keyword: week=5, month=12, day=1, no period=5.
 */

const COUNT_RE = /(\d+)\s*(?:posts?|articles?|id[eé]es?|briefs?)/i;
const VERB_RE = /\b(?:pr[eé]pare|pr[eé]parer|g[eé]n[eè]re|g[eé]n[eè]rer|cr[eé]e|cr[eé]er|fais|fait|faire|donne|donner|prepare|generate|create|give|make|plan(?:ifie|ifier)?)\b/i;
const NOUN_RE = /\b(?:posts?|articles?|id[eé]es?\s+de\s+posts?|content|contenu|publications?|briefs?|planning|calendrier|plan(?:\s+(?:de|du|pour|d['’]))?)\b/i;
const WEEK_RE = /\b(?:semaine|cette\s+semaine|week|this\s+week)\b/i;
const MONTH_RE = /\b(?:mois|month|ce\s+mois)\b/i;
const DAY_RE = /\b(?:jours?|days?|aujourd['’]hui|today|tomorrow|demain)\b/i;

export type BatchIntent =
  | { shouldBatch: false }
  | { shouldBatch: true; count: number; period: "day" | "week" | "month" | "none" };

const CLAMP_MIN = 1;
const CLAMP_MAX = 15;

function clampCount(n: number): number {
  if (!Number.isFinite(n)) return 5;
  return Math.max(CLAMP_MIN, Math.min(CLAMP_MAX, Math.round(n)));
}

export function detectBatchPlanIntent(prompt: string): BatchIntent {
  const raw = (prompt ?? "").trim();
  if (raw.length < 6) return { shouldBatch: false };
  const lower = raw.toLowerCase();

  const hasVerb = VERB_RE.test(lower);
  const hasNoun = NOUN_RE.test(lower);
  if (!hasVerb || !hasNoun) return { shouldBatch: false };

  // Extract explicit count if present.
  const countMatch = lower.match(COUNT_RE);
  const explicitCount = countMatch ? parseInt(countMatch[1], 10) : NaN;

  // Period hint.
  const period: "day" | "week" | "month" | "none" = MONTH_RE.test(lower)
    ? "month"
    : WEEK_RE.test(lower)
      ? "week"
      : DAY_RE.test(lower)
        ? "day"
        : "none";

  // Sanity gate: if the user said neither a number nor a period word, we
  // require an extra signal so a casual "fais un post" doesn't trigger a
  // 5-brief batch. A single post ask flows through the regular post pipeline
  // elsewhere — Strategist batch is for plural intent.
  if (!Number.isFinite(explicitCount) && period === "none") {
    // Plural "posts" / "ideas" still counts as plural intent, but only if
    // it's actually plural in the surface form.
    const pluralNouns = /\b(?:posts|articles|id[eé]es|publications|briefs)\b/i;
    if (!pluralNouns.test(lower)) return { shouldBatch: false };
  }

  // Default counts when not explicit:
  //   day = 1, week = 5, month = 12, none-with-plural = 5
  const defaultCount =
    period === "day" ? 1 : period === "month" ? 12 : period === "week" ? 5 : 5;
  const count = Number.isFinite(explicitCount)
    ? clampCount(explicitCount)
    : clampCount(defaultCount);

  return { shouldBatch: true, count, period };
}
