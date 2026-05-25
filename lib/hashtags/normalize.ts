/**
 * Hashtag normalization layer.
 *
 * Single source of truth for hashtag typography across Posty.
 *
 * Conventions (LinkedIn-modern):
 *   - Single word: first letter lowercase   #Engagement       → #engagement
 *   - Multi word:  camelCase                #PersonalBranding → #personalBranding
 *   - Brand:       always #posty            #Posty / #POSTY   → #posty
 *
 * Mechanically: lowercase the first character, preserve the rest.
 * PascalCase input becomes camelCase output; already-camelCase input is idempotent.
 *
 * Apply at every boundary where hashtags reach storage or the UI:
 *   - After LLM post generation (post body)
 *   - After multi-platform JSON adaptation (hashtag arrays)
 *   - Before rendering in LinkedInPreview (defense in depth)
 */

export const POSTY_BRAND_HASHTAG = "#posty";

const HASHTAG_TOKEN = /#[\p{L}\p{N}_-]+/gu;

/**
 * Normalize a single hashtag. Accepts "#word" or bare "word".
 * Returns the canonical "#word" form. Non-hashtag-looking input is returned
 * unchanged (so callers can pass through stray punctuation safely).
 */
export function normalizeHashtag(input: string): string {
  if (typeof input !== "string") return input;
  const trimmed = input.trim();
  if (!trimmed) return trimmed;

  const withHash = trimmed.startsWith("#") ? trimmed : "#" + trimmed;
  const body = withHash.slice(1);
  if (!body) return withHash;

  if (body.toLowerCase() === "posty") return POSTY_BRAND_HASHTAG;

  return "#" + body.charAt(0).toLowerCase() + body.slice(1);
}

/**
 * Normalize every hashtag inside a free-text post body.
 * Non-hashtag content is untouched.
 */
export function normalizeHashtagsInText(text: string): string {
  if (!text) return text;
  return text.replace(HASHTAG_TOKEN, (m) => normalizeHashtag(m));
}

/**
 * Normalize an array of hashtags coming from a multi-platform adaptation
 * (Threads / Bluesky / Mastodon / Facebook JSON outputs).
 *
 * Accepts entries with or without a leading "#", trims whitespace,
 * drops empty entries, and returns the canonical "#word" form.
 */
export function normalizeHashtagList(
  tags: readonly string[] | null | undefined,
): string[] {
  if (!tags || !Array.isArray(tags)) return [];
  const out: string[] = [];
  for (const raw of tags) {
    if (typeof raw !== "string") continue;
    const t = raw.trim();
    if (!t) continue;
    out.push(normalizeHashtag(t));
  }
  return out;
}
