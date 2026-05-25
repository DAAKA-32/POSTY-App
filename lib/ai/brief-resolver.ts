/**
 * Image brief resolver — decides whether an image-generation request should
 * use the user's literal prompt OR derive the brief from the active post.
 *
 * The bug this solves: when a user types "Ajoute des images" right after
 * Posty generated a post, the intent classifier correctly routes to the
 * image pipeline but the cleaned brief (e.g. "images" or "ajoute des images
 * au post") is a useless directive — the art director ends up generating
 * something generic about "adding images" instead of visuals that fit the
 * post's actual topic.
 *
 * The post text is already passed to /api/image/generate as `postContext`,
 * but the model treats `brief` as the primary directive and `postContext`
 * as supporting context. So if the brief is referential ("regenere",
 * "ajoute des images", "mets des visuels"…) we MUST substitute it with a
 * post-derived brief, otherwise the visual misses the topic.
 *
 * The resolver is conservative: when the user gives a concrete creative
 * direction ("Fais une image moderne sur la tech", "Carrousel storytelling
 * pour le SaaS"), we leave the brief alone. Only thin / referential briefs
 * trigger the substitution.
 */

/** Patterns that signal "the user is referring to the existing post, not
 *  introducing a new creative direction". When any match, the brief is
 *  treated as referential and should be substituted with a post-derived
 *  brief if a post is available. */
const REFERENTIAL_VERB_PATTERN =
  /\b(?:ajoute|ajouter|rajoute|rajouter|mets|met|mettre|inclus|inclu|colle|joins|joindre|complete|compl[eè]te|adjoint|r[eé]g[eé]n[eè]re|r[eé]g[eé]n[eé]rer|refais|refaire|recommence|recommencer|recr[eé]e|recr[eé]er|nouvelle|nouveau|encore|d'autres|autres)\b/i;

/** Briefs that are just a visual-asset noun (after the classifier's cleaning
 *  pass strips creation verbs). Pure nouns like "images" / "visuels" /
 *  "carrousel" carry no topic on their own. */
const PURE_NOUN_PATTERN =
  /^(?:images?|visuels?|illustrations?|photos?|carrousels?|carousels?|cr[eé]as?|assets?|slides?|infographies?|infographics?|mockups?|vignettes?|publicit[eé]s?|banni[eè]res?|covers?|graphiques?)(?:\s+(?:premium|moderne|moderne?s|pro|professionnel|cool|sympa|stylé|stylés|stylée|stylées))?\s*$/i;

const POST_CONTEXT_HEAD_CHARS = 400;

/** Returns true when the brief looks referential (the user is talking ABOUT
 *  an existing post, not specifying new creative direction).
 *
 *  Pure length-based heuristics over-trigger: "Visuel moderne sur la tech"
 *  is 26 chars but carries a concrete topic ("la tech"). So we only
 *  substitute when the brief is structurally referential — a pure asset
 *  noun, an empty string, or a referential verb on a short brief. */
export function isReferentialBrief(brief: string): boolean {
  const trimmed = brief.trim();
  if (trimmed.length === 0) return true;
  if (PURE_NOUN_PATTERN.test(trimmed)) return true;
  // Referential verb on a short-ish brief (≤ 80 chars) — "refais les visuels
  // en plus moderne" → still referential to the existing post. Beyond ~80
  // chars the user has likely typed enough new direction that we should
  // trust their wording.
  if (trimmed.length <= 80 && REFERENTIAL_VERB_PATTERN.test(trimmed)) return true;
  return false;
}

/** Build a post-derived brief that's well-scoped for the art director. The
 *  post head (~400 chars) gives the model the topic + tone without blowing
 *  past the 800-char API cap. Newlines collapsed so it reads as one line. */
function buildBriefFromPost(postContent: string): string {
  const head = postContent
    .slice(0, POST_CONTEXT_HEAD_CHARS)
    .replace(/\s+/g, " ")
    .trim();
  return `Visuel marketing carré premium illustrant ce post LinkedIn: ${head}`;
}

/**
 * Resolve the effective image brief for a generation request.
 *
 * - When the user typed a concrete creative direction, return it as-is.
 * - When the user typed a referential / thin prompt AND a post is available
 *   in the conversation, return a post-derived brief so the visual hits the
 *   right topic.
 * - When the brief is referential BUT no post is available, return the brief
 *   as-is (the user is opening a fresh image request without prior context;
 *   the AI will do its best with the literal phrasing).
 */
export function resolveImageBrief(input: {
  /** What the classifier (or the caller) thought the brief was. Usually the
   *  cleaned imageBrief from /api/intent. */
  rawBrief: string;
  /** Active post text the user is implicitly referring to. Null when no
   *  post has been generated yet. */
  postContent: string | null | undefined;
}): { brief: string; substituted: boolean } {
  const trimmed = (input.rawBrief ?? "").trim();
  const postContent = input.postContent?.trim();

  if (!postContent || postContent.length < 20) {
    return { brief: trimmed, substituted: false };
  }
  if (!isReferentialBrief(trimmed)) {
    return { brief: trimmed, substituted: false };
  }
  return { brief: buildBriefFromPost(postContent), substituted: true };
}
