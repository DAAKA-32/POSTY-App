/**
 * GDELT DOC 2.0 adapter — the keyless, commercial-OK global-news backbone.
 *
 * Covers any topic/industry/geo. Returns real article URLs + titles + domains +
 * machine tone, queryable by keyword with a recency window. No API key.
 *
 * Production note: GDELT enforces an undisclosed sub-1-QPS per-IP throttle. We
 * never call it synchronously per user without the 12h Firestore cache above us,
 * and a 429 simply yields [] (graceful degradation).
 */

import type { NewsItem, NewsQuery } from "../types";
import { fetchText, hostOf } from "../http";

const ENDPOINT = "https://api.gdeltproject.org/api/v2/doc/doc";
const PER_CALL_TIMEOUT_MS = 6000;
const MAX_RECORDS = 30;

interface GdeltArticle {
  url?: string;
  title?: string;
  seendate?: string; // "YYYYMMDDTHHMMSSZ"
  domain?: string;
  language?: string;
  tone?: string | number;
}

/** Parse GDELT's "20260622T143000Z" seendate → epoch ms (or null). */
function parseSeenDate(s?: string): number | null {
  if (!s) return null;
  const m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z?$/.exec(s.trim());
  if (!m) return null;
  const [, y, mo, d, h, mi, se] = m;
  const t = Date.UTC(+y, +mo - 1, +d, +h, +mi, +se);
  return Number.isFinite(t) ? t : null;
}

export async function fetchGdelt(q: NewsQuery, signal: AbortSignal): Promise<NewsItem[]> {
  // GDELT rejects very short queries; need ≥2 meaningful tokens or a phrase.
  const terms = q.keywords.slice(0, 3);
  const query = terms.length >= 2 ? terms.join(" ") : q.topic.slice(0, 100) || terms[0] || "";
  if (!query.trim()) return [];

  const url =
    `${ENDPOINT}?query=${encodeURIComponent(query)}` +
    `&mode=ArtList&format=json&timespan=7d&sort=DateDesc&maxrecords=${MAX_RECORDS}`;

  try {
    // GDELT signals its undisclosed per-IP throttle with an HTTP-200 PLAIN-TEXT
    // body ("Please limit requests to one every 5 seconds…"), not JSON and not a
    // 4xx — so we read text and guard before parsing. Throttle/invalid → [].
    const body = await fetchText(url, { signal, timeoutMs: PER_CALL_TIMEOUT_MS });
    const trimmed = body.trimStart();
    if (!trimmed.startsWith("{")) return []; // rate-limit notice or HTML error
    let data: { articles?: GdeltArticle[] };
    try {
      data = JSON.parse(trimmed);
    } catch {
      return [];
    }
    const articles = Array.isArray(data.articles) ? data.articles : [];
    const out: NewsItem[] = [];
    for (const a of articles) {
      if (!a.url || !a.title) continue;
      const tone = typeof a.tone === "string" ? parseFloat(a.tone) : a.tone;
      out.push({
        title: a.title.trim(),
        url: a.url,
        source: a.domain?.replace(/^www\./, "") || hostOf(a.url),
        publishedAt: parseSeenDate(a.seendate),
        provider: "gdelt",
        raw: { tone: Number.isFinite(tone as number) ? (tone as number) : undefined },
      });
    }
    return out;
  } catch {
    // Non-blocking: throttle / parse error / timeout → no items.
    return [];
  }
}
