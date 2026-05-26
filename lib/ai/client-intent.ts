/**
 * Client-side intent pre-classifier.
 *
 * Mirrors the regex fast-path of {@link fastClassifyIntent} in
 * `lib/ai/content-intent.ts` so the browser can:
 *
 *   1. Pre-flag obvious image / multimodal asks BEFORE calling `/api/intent`,
 *      enabling an instant route decision in the common cases.
 *   2. Recover gracefully when `/api/intent` fails or times out without
 *      regressing into the old "any image noun → both" trap that triggered
 *      a phantom image loader on prompts like "fais un post sur la photo de
 *      mariage" (where `photo` is the SUBJECT of the post, not a deliverable).
 *
 * Design rule (post-2026-05-26 refactor): an image noun in the prompt is
 * NEVER enough on its own to route to image/both. We require a clear
 * DELIVERABLE signal — an additive verb ("ajoute des visuels"), a
 * standalone creation verb without a post noun ("fais une image"), or a
 * deliverable preposition that pairs the image noun with the post noun
 * ("post AVEC une image", "post + visuel"). Everything else stays on the
 * post pipeline. The "Ajouter des visuels" CTA under each finished post
 * is the user-facing escape hatch when they want a visual after the fact.
 */

export type ClientFastIntent =
  | { intent: "image"; confidence: number; postBrief?: undefined; imageBrief: string; hasImageMention: true; hasPostMention: false; isAdditive: boolean }
  | { intent: "both"; confidence: number; postBrief: string; imageBrief: string; hasImageMention: true; hasPostMention: true; isAdditive: boolean }
  | { intent: "post"; confidence: number; postBrief: string; imageBrief?: undefined; hasImageMention: boolean; hasPostMention: true; isAdditive: false }
  | { intent: "unknown"; confidence: number; postBrief?: undefined; imageBrief?: undefined; hasImageMention: boolean; hasPostMention: boolean; isAdditive: false };

// Image asset nouns (FR + EN). Keep aligned with content-intent.ts.
// IMPORTANT: matching a noun here is necessary but NOT sufficient to route
// to the image pipeline — the noun must also appear in a DELIVERABLE
// context (additive verb / deliverable preposition / standalone creation).
const IMAGE_NOUNS_SRC = `images?|visuels?|illustrations?|photos?|publicit[eé]s?|banni[eè]res?|banners?|covers?|graphiques?|cr[eé]as?|assets?|slides?|carrousels?|carousels?|infographies?|infographics?|mockups?|vignettes?|pictures?`;
// Unicode-aware "word boundaries" — JS's native `\b` only treats
// [A-Za-z0-9_] as word chars, so it fails AFTER accented letters
// ("publicité" + space wouldn't match `\b` because `é` is treated as
// non-word). Lookbehind / lookahead with an explicit class covering Latin
// accented chars fixes the boundary on both sides without requiring the
// `u` flag (kept off for compatibility with older runtimes).
const WB_PRE = `(?<![A-Za-z\\u00C0-\\u024F0-9_])`;
const WB_POST = `(?![A-Za-z\\u00C0-\\u024F0-9_])`;
const IMAGE_NOUNS = new RegExp(`${WB_PRE}(?:${IMAGE_NOUNS_SRC})${WB_POST}`, "i");

// Post / text nouns (FR + EN). Keep aligned with content-intent.ts.
const POST_NOUNS_SRC = `posts?|articles?|captions?|copys?|copies?|drafts?|contenus?|publications?|stor(?:y|ies)`;
const POST_NOUNS = new RegExp(`${WB_PRE}(?:${POST_NOUNS_SRC})${WB_POST}`, "i");
const POST_REDIGE = new RegExp(`${WB_PRE}r[eé]dig(?:e|er|es|ent)${WB_POST}`, "i");

// Conversational openers (questions / requests for advice).
const QUESTION_OPENERS = /^(?:comment|pourquoi|quand|qui|est-?ce|peux-tu|tu connais|tu peux|donne-?moi des id[eé]es|explique|c'est quoi|qu'est-?ce|how|why|when|who|what|can you|do you know)/i;

// Additive verbs (FR + EN) — explicitly request adding a visual to an
// existing post. "ajoute des images", "mets-moi un visuel", "add an image".
const ADDITIVE_VERBS_SRC = `ajoute|ajouter|rajoute|rajouter|mets|met|mettre|inclus|inclu|colle|joins|joindre|compl[eè]te|compl[eè]ter|adjoint|add(?:s|ed|ing)?|attach(?:es|ed|ing)?`;

// Strong creation verbs (FR + EN).
const CREATE_VERBS_SRC = `fais|fait|faire|cr[eé]e|cr[eé]er|cr[eé]é|[eé]cris|[eé]crit|[eé]crire|g[eé]n[eè]re|g[eé]n[eè]rer|r[eé]dige|r[eé]diger|compose|composer|pr[eé]pare|pr[eé]parer|write|create|generate|make|draft|design`;
const CREATE_VERBS = new RegExp(`\\b(?:${CREATE_VERBS_SRC})\\b`, "i");

// "Subject" prepositions — when one of these precedes an image noun, the
// noun is the TOPIC of the post ("post SUR la photo de mariage"), not a
// deliverable. We must NOT route to image/both in that case.
const SUBJECT_PREP_BEFORE_IMAGE = new RegExp(
  `${WB_PRE}(?:sur|[aà]\\s+propos\\s+de|au\\s+sujet\\s+de|concernant|about|on|regarding|over|de(?:\\s+la)?)${WB_POST}\\s+(?:un|une|des|le|la|les|l['’]|mon|ma|mes|ton|ta|tes|son|sa|ses|leur|leurs|du|de\\s+l['’]?|d['’])?\\s*(?:[\\w\\u00C0-\\u024F]+\\s+){0,3}(?:${IMAGE_NOUNS_SRC})${WB_POST}`,
  "i"
);

// Some "visuel"/"graphique" patterns are adjective-noun compounds, not
// deliverables. "Impact visuel", "style graphique", "aspect visuel" —
// these talk ABOUT a visual quality, they don't ask for a rendered image.
const IMAGE_AS_ADJECTIVE = new RegExp(
  `${WB_PRE}(?:impact|aspect|style|c[oô]t[eé]|design|rendu|effet|attrait|appel|approche|fil|guideline|charte|identit[eé])\\s+(?:visuels?|graphiques?)${WB_POST}`,
  "i"
);

// Additive deliverable: "ajoute des visuels", "mets-moi 3 images", "add a banner"
// Allows up to 2 intervening qualifier words ("ajoute 3 belles illustrations").
const ADDITIVE_DELIVERABLE = new RegExp(
  `${WB_PRE}(?:${ADDITIVE_VERBS_SRC})${WB_POST}(?:[- ](?:moi|me|nous|us))?\\s+(?:un|une|des|le|la|les|quelques|plusieurs|mes|tes|ses|leur|leurs|\\d+|trois|quatre|cinq|two|three|four|five)?\\s*(?:[\\w\\u00C0-\\u024F]+\\s+){0,2}(?:${IMAGE_NOUNS_SRC})${WB_POST}`,
  "i"
);

// Standalone creation deliverable: "fais une image", "génère un visuel",
// "create a banner". The caller checks `hasPostMention` separately to
// decide whether this becomes "image" (no post) or part of "both".
const STANDALONE_IMAGE_CREATION = new RegExp(
  `${WB_PRE}(?:${CREATE_VERBS_SRC})${WB_POST}(?:[- ](?:moi|me|nous|us))?\\s+(?:un|une|des|le|la|les|quelques|plusieurs|\\d+|trois|quatre|cinq|two|three|four|five)?\\s*(?:[\\w\\u00C0-\\u024F]+\\s+){0,2}(?:${IMAGE_NOUNS_SRC})${WB_POST}`,
  "i"
);

// Deliverable preposition / conjunction. Joins an image noun to the rest
// of the request as a separately-rendered output. Matches:
//   "post avec une image", "post + visuel", "post & banner",
//   "post accompagné d'un visuel", "post illustré par une image".
const DELIVERABLE_PREP_IMAGE = new RegExp(
  `(?:${WB_PRE}(?:avec|with|accompagn[eé](?:s|es|[eé]es?)?\\s+(?:d['’]?|de|par)?|illustr[eé](?:s|es|[eé]es?)?\\s+(?:par|d['’]?|de|avec)?|including|incluant|inclu(?:s|ses)?|comprenant)${WB_POST}|[+&])\\s*(?:un|une|des|le|la|les|quelques|plusieurs|\\d+|trois|quatre|cinq|two|three|four|five)?\\s*(?:[\\w\\u00C0-\\u024F]+\\s+){0,2}(?:${IMAGE_NOUNS_SRC})${WB_POST}`,
  "i"
);

// "et" / "and" conjunction — only counts as deliverable when it sits
// BETWEEN a post noun and an image noun in the same clause. Avoids the
// false positive on "fais un post et explique-moi X" (which doesn't ask
// for an image despite the "et").
const POST_AND_IMAGE = new RegExp(
  `${WB_PRE}(?:${POST_NOUNS_SRC})${WB_POST}[^.!?]*?\\s(?:et|and|puis)\\s+(?:un|une|des|le|la|quelques|plusieurs|\\d+)?\\s*(?:[\\w\\u00C0-\\u024F]+\\s+){0,2}(?:${IMAGE_NOUNS_SRC})${WB_POST}`,
  "i"
);

/**
 * Decide whether a prompt contains a clear DELIVERABLE signal for an
 * image. Conservative — false here means "do not route to image" so the
 * default is always the post pipeline. The four flags it returns let the
 * caller choose between image / both / post (with confidence).
 */
function detectImageDeliverable(lower: string): {
  isAdditive: boolean;
  isStandaloneCreation: boolean;
  isPairedWithPost: boolean;
} {
  // Adjective compound first — strip its match from the surface so
  // "impact visuel" doesn't trip the deliverable patterns below.
  const cleaned = lower.replace(IMAGE_AS_ADJECTIVE, " ");

  // Image noun used as a subject ("post sur la photo") — never a
  // deliverable on its own. Note we keep going (the prompt may also
  // have a separate deliverable mention elsewhere).
  const subjectMatch = SUBJECT_PREP_BEFORE_IMAGE.test(cleaned);

  const isAdditive = ADDITIVE_DELIVERABLE.test(cleaned);
  const pairedPrep = DELIVERABLE_PREP_IMAGE.test(cleaned) || POST_AND_IMAGE.test(cleaned);
  const standalone = STANDALONE_IMAGE_CREATION.test(cleaned) && !POST_NOUNS.test(cleaned) && !POST_REDIGE.test(cleaned);

  // If the ONLY image mention is a subject mention and there's no
  // deliverable preposition / additive verb anywhere, we don't route to
  // image/both — `subjectMatch` short-circuits the standalone path.
  const standaloneSafe = standalone && (!subjectMatch || ADDITIVE_DELIVERABLE.test(cleaned) || DELIVERABLE_PREP_IMAGE.test(cleaned));

  return {
    isAdditive,
    isStandaloneCreation: standaloneSafe,
    isPairedWithPost: pairedPrep,
  };
}

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
 * Returns `intent: "unknown"` when the deliverable signal is ambiguous,
 * letting the caller fall back to the LLM classifier. The conservative
 * bias means we'd rather flag "unknown" than guess "both" wrong.
 */
export function clientFastIntent(prompt: string): ClientFastIntent {
  const raw = (prompt || "").trim();
  if (!raw) {
    return { intent: "unknown", confidence: 0, hasImageMention: false, hasPostMention: false, isAdditive: false };
  }
  const lower = raw.toLowerCase();
  const hasImageMention = IMAGE_NOUNS.test(lower);
  const hasPostMention = POST_NOUNS.test(lower) || POST_REDIGE.test(lower);
  const hasQuestion = QUESTION_OPENERS.test(lower) || raw.endsWith("?");

  const deliverable = detectImageDeliverable(lower);

  // -------- intent="both" — post deliverable AND image deliverable --------
  // The user asked for a post AND a visual, signalled by either an
  // explicit deliverable preposition ("avec une image") or the "post and
  // image" conjunction pattern. Pure questions never reach here.
  if (hasPostMention && deliverable.isPairedWithPost && !hasQuestion) {
    return {
      intent: "both",
      confidence: 0.95,
      postBrief: raw,
      imageBrief: raw,
      hasImageMention: true,
      hasPostMention: true,
      isAdditive: false,
    };
  }

  // -------- intent="image" — image is the primary deliverable --------
  // Two surfaces:
  //   (a) additive in a conversation: "ajoute des visuels"
  //   (b) standalone creation without a post noun: "fais une image moderne"
  if (deliverable.isAdditive && !hasQuestion) {
    return {
      intent: "image",
      confidence: 0.95,
      imageBrief: cleanBrief(raw),
      hasImageMention: true,
      hasPostMention: false,
      isAdditive: true,
    };
  }
  if (deliverable.isStandaloneCreation && !hasPostMention && !hasQuestion) {
    return {
      intent: "image",
      confidence: 0.9,
      imageBrief: cleanBrief(raw),
      hasImageMention: true,
      hasPostMention: false,
      isAdditive: false,
    };
  }

  // -------- intent="post" — post mention, no image deliverable --------
  // CRITICAL: image-noun-as-subject lands here. "Fais un post sur la
  // photo de mariage" matches POST_NOUNS + IMAGE_NOUNS but the deliverable
  // detector returned false, so we route to the post pipeline. The user
  // gets a text post and the "Ajouter des visuels" CTA shows underneath
  // if they want a visual after the fact.
  if (hasPostMention && !hasQuestion) {
    return {
      intent: "post",
      confidence: hasImageMention ? 0.75 : 0.9, // lower confidence when subject mentions an asset noun
      postBrief: raw,
      hasImageMention,
      hasPostMention: true,
      isAdditive: false,
    };
  }

  // -------- unknown — hand to LLM --------
  return {
    intent: "unknown",
    confidence: 0,
    hasImageMention,
    hasPostMention,
    isAdditive: false,
  };
}
