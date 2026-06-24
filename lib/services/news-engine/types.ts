/**
 * News-engine shared types.
 *
 * The engine grounds generated posts in CURRENT events using free, keyless
 * public APIs (GDELT, Hacker News, RSS, Wikimedia, arXiv) instead of a paid LLM
 * web-search. OpenAI is demoted to an OPTIONAL synthesis step (see brief.ts).
 *
 * Design invariants:
 * - Adapters NEVER throw — they catch, log, and return [].
 * - Ground-and-cite-only: we surface titles/links/facts and let the writer LLM
 *   produce original copy. We never republish article bodies verbatim. This is
 *   what keeps the whole keyless stack commercially defensible.
 */

export type Domain =
  | "TECH_AI"
  | "BUSINESS_SAAS"
  | "FINANCE_MARKETS"
  | "CRYPTO"
  | "REGULATION"
  | "GENERAL"
  | "EVERGREEN";

/** Normalized query handed to every provider adapter. */
export interface NewsQuery {
  /** The cleaned post topic (URL/markers already stripped upstream). */
  topic: string;
  /** Significant keywords extracted from the topic (accent-stripped, deduped). */
  keywords: string[];
  language: "fr" | "en";
  /** Lower bound for "recent" — epoch ms. Items older than this are deprioritized. */
  sinceTs: number;
  /** Domains the router matched (a topic can match several). */
  domains: Domain[];
}

/** A single normalized news/context item produced by an adapter. */
export interface NewsItem {
  title: string;
  /** Canonical article/page URL. Internal-only (used as anti-hallucination guard). */
  url: string;
  /** Source domain, e.g. "techcrunch.com". */
  source: string;
  /** Publication time (epoch ms) or null when the provider exposes none. */
  publishedAt: number | null;
  /** Which adapter produced it (gdelt | hackernews | rss | wikimedia | arxiv). */
  provider: string;
  /** Computed by the scorer (0..1). Absent until scored. */
  score?: number;
  /** Provider-native signals used by the scorer / synthesis. */
  raw?: {
    points?: number;
    commentCount?: number;
    /** GDELT machine tone (-100..100), if present. */
    tone?: number;
    /** Short factual extract (Wikipedia summary, arXiv abstract) — facts, not bodies. */
    summary?: string;
  };
}
