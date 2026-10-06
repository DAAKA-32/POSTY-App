/**
 * Should a Strategist PLAN be grounded in a live news search?
 *
 * Stricter than the chat's isTopicTimeSensitive(), which fires on "linkedin",
 * "marketing", "saas"… — i.e. on almost every planning request — and turned
 * plans into news digests about LinkedIn itself. A plan is grounded in the
 * news only when the author explicitly asks for something current.
 *
 * Pure (no server deps) so it is unit-testable.
 */

/** Phrases that only describe the PLANNING request ("5 posts LinkedIn cette
 *  semaine") — stripped before looking for recency markers. */
const PLANNING_BOILERPLATE: RegExp[] = [
  /\b(?:posts?|publications?|contenus?|articles?)\s+(?:sur\s+|pour\s+|on\s+|for\s+)?linkedin\b/gi,
  /\blinkedin\s+posts?\b/gi,
  /\b(?:sur|pour|on|for)\s+linkedin\b/gi,
  /\b(?:cette|la)\s+semaine(?:\s+prochaine|\s+[àa]\s+venir)?\b/gi,
  /\bsemaine\s+prochaine\b/gi,
  /\b(?:this|next|the\s+coming)\s+week\b/gi,
  /\b(?:ce|le)\s+mois(?:-ci|\s+prochain)?\b/gi,
  /\b(?:this|next)\s+month\b/gi,
];

const NEWS_MARKERS: RegExp[] = [
  /\b(actualit[ée]s?|actus?|news|r[ée]cents?|r[ée]centes?|recently|latest|derni[èe]res?\s+(?:annonces?|tendances?|actus?|nouvelles|news|sorties?))\b/i,
  /\b(en ce moment|right now|ces derniers (?:jours|mois)|past (?:few )?(?:days|weeks|months)|cette ann[ée]e|this year)\b/i,
  /\b(tendances?|trends?|trending)\b/i,
  /\b20(?:2[3-9]|30)\b/,
];

export function planNeedsNews(prompt: string): boolean {
  let text = prompt;
  for (const re of PLANNING_BOILERPLATE) text = text.replace(re, " ");
  return NEWS_MARKERS.some((re) => re.test(text));
}
