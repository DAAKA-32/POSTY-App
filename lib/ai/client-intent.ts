/**
 * Client-side intent pre-classifier.
 *
 * Mirrors the regex fast-path of {@link fastClassifyIntent} in
 * `lib/ai/content-intent.ts` so the browser can:
 *
 *   1. Pre-flag obvious image / multimodal asks BEFORE calling `/api/intent`,
 *      enabling an instant route decision in ~99% of common cases.
 *   2. Recover gracefully when `/api/intent` fails or times out — instead of
 *      silently defaulting to "post" (the historical bug that ate every
 *      "fais un post avec des images" request and produced a text-only
 *      result with a generic CTA below), we apply the same regex locally
 *      and route to "both" / "image" when the user's wording was explicit.
 *
 * Stays in sync with the server prompt (`SYSTEM_PROMPT` in content-intent.ts)
 * — keep the noun / verb lists aligned when one side changes.
 */

export type ClientFastIntent =
  | { intent: "image"; confidence: number; postBrief?: undefined; imageBrief: string; hasImageMention: true; hasPostMention: false }
  | { intent: "both"; confidence: number; postBrief: string; imageBrief: string; hasImageMention: true; hasPostMention: true }
  | { intent: "post"; confidence: number; postBrief: string; imageBrief?: undefined; hasImageMention: false; hasPostMention: true }
  | { intent: "unknown"; confidence: number; postBrief?: undefined; imageBrief?: undefined; hasImageMention: boolean; hasPostMention: boolean };

// Image asset nouns (FR + EN). Keep aligned with content-intent.ts L250.
const IMAGE_NOUNS = /\b(?:images?|visuels?|illustrations?|photos?|publicit[eé]s?|banni[eè]res?|covers?|graphiques?|cr[eé]as?|assets?|slides?|carrousels?|carousels?|infographies?|infographics?|mockups?|vignettes?|pictures?)\b/i;

// Post / text nouns (FR + EN). Keep aligned with content-intent.ts L251.
const POST_NOUNS = /\b(?:posts?|articles?|captions?|copys?|copies?|r[eé]dig(?:e|er)|drafts?|contenus?|publications?|stor(?:y|ies))\b/i;

// Conversational openers (questions / requests for advice).
const QUESTION_OPENERS = /^(?:comment|pourquoi|quand|qui|est-?ce|peux-tu|tu connais|tu peux|donne-?moi des id[eé]es|explique|c'est quoi|qu'est-?ce|how|why|when|who|what|can you|do you know)/i;

// Additive verbs that pair with an image noun ("ajoute des images").
const ADDITIVE_VERBS = /\b(?:ajoute|ajouter|rajoute|rajouter|mets|met|mettre|inclus|inclu|colle|joins|joindre|complete|compl[eè]te|adjoint|add)/i;

// Strong creation verbs that pair with either noun.
const CREATE_VERBS = /\b(?:fais|fait|cr[eé]e|cr[eé]é|[eé]cris|[eé]crit|g[eé]n[eè]re|r[eé]dige|compose|pr[eé]pare|write|create|generate|make|draft)/i;

/**
 * Strip the leading verb so the downstream pipeline gets a clean brief
 * ("visuel moderne sur l'IA" instead of "fais un visuel moderne sur l'IA").
 */
function cleanBrief(prompt: string): string {
  return prompt
    .replace(/^(fais|cr[eé]e?|g[eé]n[eè]re|montre-?moi|donne-?moi|ajoute(?:-moi)?|rajoute|mets(?:-moi)?|inclus|write|create|generate|make|draft|add)\s+(?:une?|des|le|la|quelques|plusieurs|\d+)?\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Run the regex on a free-form prompt and return a tentative classification.
 * NEVER guesses — returns `intent: "unknown"` when ambiguous, letting the
 * caller fall back to the LLM classifier or apply a domain-specific default.
 */
export function clientFastIntent(prompt: string): ClientFastIntent {
  const raw = (prompt || "").trim();
  if (!raw) {
    return { intent: "unknown", confidence: 0, hasImageMention: false, hasPostMention: false };
  }
  const lower = raw.toLowerCase();
  const hasImageMention = IMAGE_NOUNS.test(lower);
  const hasPostMention = POST_NOUNS.test(lower);
  const hasQuestion = QUESTION_OPENERS.test(lower) || raw.endsWith("?");
  const hasCreateVerb = CREATE_VERBS.test(lower);
  const hasAdditiveVerb = ADDITIVE_VERBS.test(lower);

  // both = post noun + image noun in the same prompt, not a pure question.
  if (hasPostMention && hasImageMention && !hasQuestion) {
    return {
      intent: "both",
      confidence: 0.95,
      postBrief: raw,
      imageBrief: raw,
      hasImageMention: true,
      hasPostMention: true,
    };
  }

  // image-only = image noun present, no post noun, and either:
  //   - a clear creation/additive verb is present, OR
  //   - no question opener (so "fais une image sur X" / "ajoute des visuels"
  //     both land here, but "c'est quoi une bonne image LinkedIn ?" does not).
  if (hasImageMention && !hasPostMention && !hasQuestion && (hasCreateVerb || hasAdditiveVerb || !hasQuestion)) {
    return {
      intent: "image",
      confidence: hasCreateVerb || hasAdditiveVerb ? 0.95 : 0.75,
      imageBrief: cleanBrief(raw),
      hasImageMention: true,
      hasPostMention: false,
    };
  }

  // post-only = explicit post mention, no image mention, not a pure question.
  if (hasPostMention && !hasImageMention && !hasQuestion) {
    return {
      intent: "post",
      confidence: 0.9,
      postBrief: raw,
      hasImageMention: false,
      hasPostMention: true,
    };
  }

  return {
    intent: "unknown",
    confidence: 0,
    hasImageMention,
    hasPostMention,
  };
}
