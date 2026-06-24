/**
 * arXiv adapter — optional TECH_AI deep cut (keyless; metadata is CC0).
 *
 * Surfaces very recent AI/ML research as a low-weight enrichment signal, only
 * when the topic is AI-heavy. arXiv asks for ≤1 req/3s — fine here because it's
 * behind the 12h cache and given a tight per-call timeout off the critical path.
 */

import type { NewsItem, NewsQuery } from "../types";
import { fetchText } from "../http";
import { parseFeed } from "./feed-parse";

const ENDPOINT = "https://export.arxiv.org/api/query";
const PER_CALL_TIMEOUT_MS = 4000;
const MAX_RESULTS = 8;

export async function fetchArxiv(q: NewsQuery, signal: AbortSignal): Promise<NewsItem[]> {
  const terms = q.keywords.slice(0, 4).join(" ");
  if (!terms.trim()) return [];

  const searchQuery = `all:${terms}`;
  const url =
    `${ENDPOINT}?search_query=${encodeURIComponent(searchQuery)}` +
    `&sortBy=submittedDate&sortOrder=descending&max_results=${MAX_RESULTS}`;

  try {
    const xml = await fetchText(url, { signal, timeoutMs: PER_CALL_TIMEOUT_MS });
    // arXiv returns Atom <entry> blocks — parseFeed handles them.
    return parseFeed(xml, MAX_RESULTS)
      .filter((e) => e.publishedAt === null || e.publishedAt >= q.sinceTs)
      .map<NewsItem>((e) => ({
        title: e.title.replace(/\s+/g, " ").trim(),
        url: e.link,
        source: "arxiv.org",
        publishedAt: e.publishedAt,
        provider: "arxiv",
        raw: e.summary ? { summary: e.summary.slice(0, 280) } : undefined,
      }));
  } catch {
    return [];
  }
}
