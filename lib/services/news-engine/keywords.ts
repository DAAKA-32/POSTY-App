/**
 * Single source of truth for time-sensitivity + domain detection + keyword
 * extraction. Lifted from the regex groups that used to live inline in
 * realtime-context.ts so that the cheap gate (isTimeSensitive) and the
 * provider router share ONE definition and can never drift.
 */

import type { Domain } from "./types";

/**
 * Domain → patterns. A topic matching a group is routed to that domain's
 * providers. GENERAL/EVERGREEN are computed, not pattern-matched.
 */
export const DOMAIN_PATTERNS: Record<Exclude<Domain, "GENERAL" | "EVERGREEN">, RegExp[]> = {
  TECH_AI: [
    /\b(ia|a\.?i\.?|artificial intelligence|intelligence artificielle|machine learning|ml|llms?|gpt|chatgpt|claude|gemini|mistral|openai|anthropic|deep ?learning|neural net|transformers?|generative|g[ée]n[ée]rative|agent(ic)?|rag)\b/i,
    /\b(tech|technologie|technology|logiciel|software|dev(eloppe(ur|ment))?|cloud|api|data|cyber(s[ée]curit[ée])?|cybersecurity|hacking|breach|vuln[ée]rabilit[ée])\b/i,
  ],
  BUSINESS_SAAS: [
    /\b(saas|startup|scale[- ]?up|no[- ]?code|product[- ]?led|b2b|go[- ]?to[- ]?market|gtm|product manager|founder|fondateur)\b/i,
  ],
  FINANCE_MARKETS: [
    /\b(bourse|march[ée]s?|stock ?market|trading|investissement|investing|invest|action(s|naires)?|[ée]conomie|economy|economic|inflation|r[ée]cession|taux d'?int[ée]r[êe]t|interest rates?|pib|gdp)\b/i,
  ],
  CRYPTO: [
    /\b(crypto|bitcoin|btc|ethereum|eth|blockchain|web3|nft|d[ée]fi|token|stablecoin)\b/i,
  ],
  REGULATION: [
    /\b(r[ée]glementation|regulation|loi|law|rgpd|gdpr|ai act|directive europ[ée]enne|compliance|conformit[ée]|antitrust)\b/i,
    /\b(lev[ée]e de fonds|fundraising|ipo|m&a|acquisition|valorisation|valuation|licenciements?|layoffs?)\b/i,
  ],
};

/** Marketing / social-platform signals also imply time-sensitivity (algos shift). */
const PLATFORM_PATTERNS: RegExp[] = [
  /\b(algorithme|algorithm|linkedin|tiktok|instagram|seo|reach|portée|growth hacking|marketing)\b/i,
];

/** Explicit recency markers — "what's new / latest / right now". */
export const RECENCY_MARKERS: RegExp[] = [
  /\b(actualit[ée]s?|news|r[ée]cent(e|es|s)?|recent(ly)?|derni[èe]res?|latest|nouveau(t[ée]s?|x)?|new(est)?)\b/i,
  /\b(en ce moment|right now|aujourd'?hui|today|cette (semaine|ann[ée]e)|this (week|year)|ces derniers (jours|mois)|past (few )?(days|weeks|months))\b/i,
  /\b(tendances?|trends?|trending|en vogue|hype|buzz|viral)\b/i,
  /\b(mise[- ]?à[- ]?jour|update|annonce|announcement|sortie|release|lancement|launch)\b/i,
];

/** Any explicit year 2023-2030 reference also signals recency. */
const YEAR_MARKER = /\b(20(2[3-9]|30))\b/;

/**
 * Cheap, zero-API gate: does this topic move with the news? Mirrors the old
 * isTopicTimeSensitive() exactly (RECENCY_MARKERS ∪ all domain patterns ∪ year).
 */
export function isTimeSensitive(prompt: string): boolean {
  const text = prompt.trim();
  if (text.length < 3) return false;
  if (YEAR_MARKER.test(text)) return true;
  for (const re of RECENCY_MARKERS) if (re.test(text)) return true;
  for (const re of PLATFORM_PATTERNS) if (re.test(text)) return true;
  for (const group of Object.values(DOMAIN_PATTERNS)) {
    for (const re of group) if (re.test(text)) return true;
  }
  return false;
}

/**
 * Classify a topic into 0+ domains. A topic can match several (e.g. "crypto
 * regulation in 2026" → CRYPTO + REGULATION). Returns [] when no domain matches
 * (the router then falls back to GENERAL).
 */
export function detectDomains(prompt: string): Domain[] {
  const text = prompt.trim();
  const out: Domain[] = [];
  (Object.keys(DOMAIN_PATTERNS) as Array<keyof typeof DOMAIN_PATTERNS>).forEach((d) => {
    if (DOMAIN_PATTERNS[d].some((re) => re.test(text))) out.push(d);
  });
  if (PLATFORM_PATTERNS.some((re) => re.test(text)) && !out.includes("BUSINESS_SAAS")) {
    out.push("BUSINESS_SAAS");
  }
  return out;
}

// ── Keyword extraction (for query building + topicMatch scoring) ──────────────

const STOPWORDS = new Set([
  // fr
  "le", "la", "les", "un", "une", "des", "de", "du", "et", "ou", "à", "au", "aux",
  "en", "dans", "sur", "pour", "par", "avec", "sans", "ce", "cette", "ces", "mon",
  "ma", "mes", "ton", "ta", "tes", "son", "sa", "ses", "qui", "que", "quoi", "dont",
  "est", "sont", "fais", "fait", "faire", "crée", "créer", "écris", "écrire", "post",
  "publication", "linkedin", "sujet", "propos", "moi", "nous", "vous", "comment",
  // en
  "the", "a", "an", "of", "and", "or", "to", "in", "on", "for", "by", "with", "without",
  "this", "that", "these", "those", "my", "your", "our", "is", "are", "be", "write",
  "create", "make", "draft", "about", "me", "us", "how", "post", "linkedin",
]);

/** Lowercase + strip diacritics so "événement" matches "evenement". */
export function normalizeToken(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/**
 * Extract significant keywords from a topic for querying + scoring. Keeps order,
 * drops stopwords and short tokens, caps the set so a query stays tight.
 */
export function extractKeywords(topic: string, max = 6): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const rawTok of topic.split(/[^\p{L}\p{N}]+/u)) {
    const tok = rawTok.trim();
    // Keep 2-char tokens: critical acronyms like IA / AI / ML / VR would
    // otherwise be dropped, gutting queries for those exact domains.
    if (tok.length < 2) continue;
    const norm = normalizeToken(tok);
    if (STOPWORDS.has(norm) || seen.has(norm)) continue;
    seen.add(norm);
    out.push(tok);
    if (out.length >= max) break;
  }
  // Fallback: if everything got stripped (very short topic), keep the raw words.
  if (out.length === 0) {
    return topic
      .split(/\s+/)
      .filter((w) => w.length >= 2)
      .slice(0, max);
  }
  return out;
}

/** Token set (normalized) for topicMatch scoring. */
export function tokenSet(text: string): Set<string> {
  const set = new Set<string>();
  for (const rawTok of text.split(/[^\p{L}\p{N}]+/u)) {
    if (rawTok.length < 2) continue;
    const norm = normalizeToken(rawTok);
    if (STOPWORDS.has(norm)) continue;
    set.add(norm);
  }
  return set;
}
