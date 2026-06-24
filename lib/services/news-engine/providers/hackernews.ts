/**
 * Hacker News (Algolia Search) adapter — keyless, 10k req/hr/IP.
 *
 * Best "what tech/startup/AI is discussing right now" signal. Query by keyword,
 * filtered to stories above the `sinceTs` window with a minimum points floor so
 * we ground on what actually got traction, not noise.
 */

import type { NewsItem, NewsQuery } from "../types";
import { fetchJson, hostOf } from "../http";

// Date-sorted endpoint: returns genuinely RECENT stories (the /search relevance
// endpoint surfaces all-time-popular items, which defeats "current events").
// Recall comes from using FEW keywords + a low points floor; the scorer then
// ranks by recency/engagement/topicMatch.
const ENDPOINT = "https://hn.algolia.com/api/v1/search_by_date";
const PER_CALL_TIMEOUT_MS = 5000;
const MIN_POINTS = 2;
const HITS = 25;

interface HnHit {
  objectID?: string;
  title?: string;
  url?: string | null;
  points?: number;
  num_comments?: number;
  created_at_i?: number; // unix seconds
}

export async function fetchHackerNews(q: NewsQuery, signal: AbortSignal): Promise<NewsItem[]> {
  // Few keywords = higher recall (search_by_date still requires query match
  // before date-sorting); the scorer's topicMatch handles precision afterward.
  const query = q.keywords.slice(0, 2).join(" ") || q.topic.slice(0, 100);
  if (!query.trim()) return [];

  const sinceSec = Math.floor(q.sinceTs / 1000);
  const numericFilters = `created_at_i>${sinceSec},points>${MIN_POINTS}`;
  const url =
    `${ENDPOINT}?query=${encodeURIComponent(query)}` +
    `&tags=story&hitsPerPage=${HITS}&numericFilters=${encodeURIComponent(numericFilters)}`;

  try {
    const data = await fetchJson<{ hits?: HnHit[] }>(url, { signal, timeoutMs: PER_CALL_TIMEOUT_MS });
    const hits = Array.isArray(data.hits) ? data.hits : [];
    const out: NewsItem[] = [];
    for (const h of hits) {
      if (!h.title) continue;
      // Ask/Show HN posts have no external url → link to the HN item.
      const itemUrl = h.url || (h.objectID ? `https://news.ycombinator.com/item?id=${h.objectID}` : "");
      if (!itemUrl) continue;
      out.push({
        title: h.title.trim(),
        url: itemUrl,
        source: hostOf(itemUrl) || "news.ycombinator.com",
        publishedAt: typeof h.created_at_i === "number" ? h.created_at_i * 1000 : null,
        provider: "hackernews",
        raw: { points: h.points ?? 0, commentCount: h.num_comments ?? 0 },
      });
    }
    return out;
  } catch {
    return [];
  }
}
