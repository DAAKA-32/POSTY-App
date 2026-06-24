/**
 * Deterministic relevance scorer — NO LLM.
 *
 * score = wR·recency + wC·credibility + wT·topicMatch + wE·engagement + wB·businessImpact
 * (factors normalized 0..1). The provider's routing weight then gently modulates
 * the final score. Cheap, reproducible, and tunable — the opposite of paying a
 * model to decide what's relevant.
 */

import type { NewsItem, NewsQuery } from "./types";
import { tokenSet, normalizeToken } from "./keywords";
import { providerBaseCredibility } from "./providers";

const W = { recency: 0.35, topicMatch: 0.3, credibility: 0.15, engagement: 0.12, businessImpact: 0.08 };

const NEWS_HALF_LIFE_H = 48;
const EVERGREEN_HALF_LIFE_H = 168;

/** Tiered source-credibility allowlist (domain → 0..1). Unknown → 0.45. */
const TIER1 = new Set([
  "reuters.com", "apnews.com", "bloomberg.com", "wsj.com", "ft.com", "nytimes.com",
  "theguardian.com", "bbc.com", "bbc.co.uk", "economist.com", "cnbc.com", "wired.com",
  "techcrunch.com", "theverge.com", "arstechnica.com", "lemonde.fr", "lesechos.fr",
  "lefigaro.fr", "liberation.fr", "nature.com", "science.org",
]);
const TRADE = new Set([
  "venturebeat.com", "zdnet.com", "engadget.com", "businessinsider.com", "axios.com",
  "theinformation.com", "techradar.com", "thenextweb.com", "fastcompany.com",
  "usine-digitale.fr", "frenchweb.fr", "maddyness.com", "journaldunet.com", "01net.com",
  "siliconangle.com", "protocol.com", "restofworld.org", "theregister.com",
]);
const DENY = new Set(["msn.com", "news.google.com"]);

function domainCredibility(source: string): number {
  const s = source.replace(/^www\./, "").toLowerCase();
  if (TIER1.has(s)) return 0.9;
  if (TRADE.has(s)) return 0.7;
  if (DENY.has(s)) return 0.15;
  return 0.45;
}

function credibility(item: NewsItem): number {
  // Wikipedia/arXiv: the source IS the provider — trust its base.
  if (item.provider === "wikimedia" || item.provider === "arxiv") {
    return providerBaseCredibility(item.provider);
  }
  const dom = domainCredibility(item.source);
  // HN's upvote curation gives a small floor even for unknown link domains.
  return item.provider === "hackernews" ? Math.max(dom, 0.55) : dom;
}

function recencyScore(publishedAt: number | null, now: number, halfLifeH: number): number {
  if (publishedAt == null) return 0.4; // neutral for date-less items (RSS/Wikipedia)
  const ageH = Math.max(0, (now - publishedAt) / 3_600_000);
  return Math.min(1, Math.exp(-ageH / halfLifeH));
}

/**
 * How many of the query keywords appear in the item title (+summary).
 *
 * Uses query-CONTAINMENT (inter / |query|), NOT symmetric Dice: Dice's
 * denominator grows with the haystack, so summary-bearing providers
 * (RSS/arXiv/Wikipedia) would score systematically lower than title-only ones
 * (GDELT/HN) for the same match — distorting selection on the 0.30-weight axis.
 * Containment is insensitive to haystack length.
 */
function topicMatch(keywords: string[], item: NewsItem): number {
  const q = new Set(keywords.map(normalizeToken).filter(Boolean));
  if (q.size === 0) return 0.5;
  const hay = tokenSet(`${item.title} ${item.raw?.summary ?? ""}`);
  if (hay.size === 0) return 0;
  let inter = 0;
  for (const k of q) if (hay.has(k)) inter++;
  const cover = inter / q.size;
  const allPresent = inter === q.size ? 0.2 : 0;
  return Math.min(1, cover + allPresent);
}

function engagementScore(item: NewsItem): number {
  if (item.provider === "hackernews") {
    const pts = item.raw?.points ?? 0;
    const comments = item.raw?.commentCount ?? 0;
    const p = Math.min(1, Math.log10(pts + 1) / 3); // 1000 pts → ~1.0
    const c = Math.min(1, Math.log10(comments + 1) / 2.5);
    return 0.7 * p + 0.3 * c;
  }
  return 0.5; // neutral for sources without a popularity signal
}

const HIGH_IMPACT = [
  /\b(funding|raise[sd]?|raises|series [a-e]|seed round|lev[ée]e de fonds|ipo|m&a|acqui(re|res|red|sition)|rachat|valuation|valorisation)\b/i,
  /\b(layoffs?|licenciements?|shuts? down|faillite|bankruptcy)\b/i,
  /\b(launch(es|ed)?|lance|lancement|unveils?|release[sd]?|annonce|announces?)\b/i,
  /\b(regulation|r[ée]glementation|ai act|gdpr|rgpd|antitrust|ban[sn]?|interdiction|loi)\b/i,
  /\b(record|surge|plunge|all[- ]time high|chute|bond|breakthrough|perc[ée]e)\b/i,
];

function businessImpact(item: NewsItem): number {
  return HIGH_IMPACT.some((re) => re.test(item.title)) ? 0.9 : 0.3;
}

export interface ScoreOpts {
  now: number;
  /** True when the topic is evergreen (longer recency half-life). */
  evergreen?: boolean;
  /** providerId → routing weight (gently modulates final score). */
  weights: Map<string, number>;
}

/** Score every item (pure). Returns the same items with `.score` set, unsorted. */
export function scoreItems(items: NewsItem[], q: NewsQuery, opts: ScoreOpts): NewsItem[] {
  const halfLife = opts.evergreen ? EVERGREEN_HALF_LIFE_H : NEWS_HALF_LIFE_H;
  return items.map((item) => {
    const base =
      W.recency * recencyScore(item.publishedAt, opts.now, halfLife) +
      W.credibility * credibility(item) +
      W.topicMatch * topicMatch(q.keywords, item) +
      W.engagement * engagementScore(item) +
      W.businessImpact * businessImpact(item);
    // Gentle provider modulation: weight 1.0 → ×1.0, weight 0.4 → ×0.76.
    const w = opts.weights.get(item.provider) ?? 0.8;
    const score = base * (0.6 + 0.4 * w);
    return { ...item, score: Math.max(0, Math.min(1, score)) };
  });
}

/** Normalized key for dedupe: lowercased title head + host. */
function dedupeKey(item: NewsItem): string {
  const t = normalizeToken(item.title).replace(/[^a-z0-9 ]/g, "").slice(0, 60);
  return `${item.source}::${t}`;
}

export interface SelectOpts {
  threshold: number;
  maxItems: number;
  maxPerSource: number;
}

/**
 * Dedupe → drop below threshold → diversify (max N per source) → top-K.
 * If fewer than 2 pass the threshold, fall back to the top-2 by raw score so a
 * thin-but-real result still grounds the post.
 */
export function selectTop(scored: NewsItem[], opts: SelectOpts): NewsItem[] {
  // Dedupe keeping the highest-scored variant.
  const byKey = new Map<string, NewsItem>();
  for (const it of scored) {
    const k = dedupeKey(it);
    const prev = byKey.get(k);
    if (!prev || (it.score ?? 0) > (prev.score ?? 0)) byKey.set(k, it);
  }
  const unique = [...byKey.values()].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  const passing = unique.filter((it) => (it.score ?? 0) >= opts.threshold);
  const pool = passing.length >= 2 ? passing : unique.slice(0, 2);

  const perSource = new Map<string, number>();
  const out: NewsItem[] = [];
  for (const it of pool) {
    const n = perSource.get(it.source) ?? 0;
    if (n >= opts.maxPerSource) continue;
    perSource.set(it.source, n + 1);
    out.push(it);
    if (out.length >= opts.maxItems) break;
  }
  return out;
}
