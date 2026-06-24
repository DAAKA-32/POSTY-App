/**
 * Voice transcription post-processing.
 *
 * CRITICAL CONTRACT: this layer must NEVER summarize, reformulate, condense, or
 * change the meaning/length of a transcript. It only fixes *mechanical*
 * transcription artefacts — recurring proper-noun/brand mis-spellings and
 * stray whitespace — that the speech model gets wrong regardless of the
 * speaker. Every rule here is a whole-word, meaning-preserving substitution.
 *
 * If you are tempted to add a rule that rewrites a phrase, drops filler, or
 * "cleans up" grammar: DON'T. That belongs nowhere in the voice path. The user
 * explicitly requires 100% of the spoken content to be preserved verbatim.
 */

/**
 * Domain / brand post-hoc corrections. Each entry maps misheard variants to the
 * canonical spelling. This runs AFTER transcription, so the bar is extreme: a
 * variant may ONLY appear here if it can never collide with a legitimate word
 * in any language the user might dictate. Short, ambiguous tokens are forbidden
 * — e.g. "sas"→"SaaS" would wreck the French legal form "SAS", the everyday
 * word "sas" (airlock) and the CSS tool "Sass". Such terms are corrected the
 * SAFE way instead: as a decode-time spelling bias via DEFAULT_GLOSSARY_TERMS
 * (the transcription `prompt`), which never rewrites real words.
 *
 * Rule of thumb: only multi-word phrases or clearly-non-word misspellings.
 */
const CANONICAL_TERMS: { canonical: string; variants: string[] }[] = [
  { canonical: "LinkedIn", variants: ["linked in", "linked-in", "linkedine", "linkdin", "linkidin"] },
  { canonical: "B2B", variants: ["b to b"] },
  { canonical: "B2C", variants: ["b to c"] },
];

/**
 * The list of canonical terms we feed to the model as a spelling bias (the
 * transcription `prompt` parameter). This nudges the recogniser toward the
 * correct spelling at decode time — the most reliable form of "correction"
 * because it happens before any text is produced, with zero risk of rewriting.
 */
export const DEFAULT_GLOSSARY_TERMS: string[] = [
  "Posty",
  "LinkedIn",
  "SaaS",
  "B2B",
  "B2C",
  "CTO",
  "ESN",
  "growth",
  "storytelling",
  "personal branding",
  "ROI",
  "ICP",
  "copywriting",
];

/**
 * Build the `prompt` hint sent to the transcription API. It is purely a
 * spelling/context bias (proper nouns, jargon) — it must read as a glossary,
 * never as an instruction, so the model never treats it as content to act on.
 *
 * @param extraTerms domain-specific terms gathered from the user's context
 *                   (e.g. their sector / company) to further bias spelling.
 */
export function buildTranscriptionGlossary(extraTerms: string[] = []): string {
  const terms = Array.from(
    new Set([...DEFAULT_GLOSSARY_TERMS, ...extraTerms.map((t) => t.trim()).filter(Boolean)])
  );
  // A short lead-in keeps the model in "French business / LinkedIn" context
  // without instructing it to do anything. Terms follow as a plain list.
  return `Contexte : rédaction LinkedIn en français. Termes propres : ${terms.join(", ")}.`;
}

/** Escape a string for safe use inside a RegExp. */
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Apply conservative, meaning-preserving corrections to a raw transcript.
 *
 * Steps (all reversible / non-destructive to meaning):
 *   1. Normalise whitespace (collapse runs, trim) — speech models sometimes
 *      emit double spaces around disfluencies.
 *   2. Canonicalise known brand/proper-noun mis-spellings (whole-word only).
 *
 * Returns the corrected text. Empty input returns empty.
 */
export function postProcessTranscript(raw: string): string {
  if (!raw) return "";

  let text = raw;

  // 2. Canonical term substitutions (whole-word, case-insensitive). Done before
  //    whitespace collapse so multi-word variants ("linked in") match cleanly.
  for (const { canonical, variants } of CANONICAL_TERMS) {
    for (const variant of variants) {
      if (!variant) continue;
      if (variant.toLowerCase() === canonical.toLowerCase()) continue;
      // \b is unreliable around accents, but these variants are ASCII; guard the
      // edges so we never replace inside a larger word.
      const re = new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(variant)}(?![\\p{L}\\p{N}])`, "giu");
      text = text.replace(re, canonical);
    }
  }

  // 1. Whitespace: collapse 2+ spaces/tabs, strip space before French
  //    punctuation is NOT done (French uses a space before ; : ! ?), so we only
  //    collapse runs and trim. Newlines are preserved.
  text = text
    .replace(/[ \t]{2,}/g, " ")
    .replace(/ *\n */g, "\n")
    .trim();

  return text;
}
