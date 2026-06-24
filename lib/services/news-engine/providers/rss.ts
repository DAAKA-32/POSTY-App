/**
 * Curated-RSS adapter — keyless editorial layer.
 *
 * RSS feeds aren't keyword-queryable, so we fetch the recent items of a small,
 * reliable allowlist and keyword-filter them locally (the scorer then ranks).
 * The allowlist is config-driven (env override) so feeds can be added/removed
 * without code changes and we never depend on an undocumented endpoint.
 *
 * Ground-and-cite-only: we keep title + link + date (+ short summary as a fact
 * hint), never the full article body.
 */

import type { NewsItem, NewsQuery } from "../types";
import { fetchText, hostOf } from "../http";
import { parseFeed } from "./feed-parse";
import { normalizeToken, tokenSet } from "../keywords";

const PER_CALL_TIMEOUT_MS = 5000;

/** Reliable, stable default feeds. FR feeds are env-extendable (see below). */
const DEFAULT_FEEDS_EN = [
  "https://techcrunch.com/feed/",
  "https://www.theverge.com/rss/index.xml",
  "https://feeds.arstechnica.com/arstechnica/index",
];

/** Parse a comma-separated env list of extra feed URLs (per language). */
function envFeeds(name: string): string[] {
  return (process.env[name] || "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^https?:\/\//.test(s));
}

function feedsFor(language: "fr" | "en"): string[] {
  const base = [...DEFAULT_FEEDS_EN, ...envFeeds("NEWS_RSS_FEEDS_EN")];
  if (language === "fr") base.push(...envFeeds("NEWS_RSS_FEEDS_FR"));
  // Dedupe.
  return Array.from(new Set(base));
}

export async function fetchRss(q: NewsQuery, signal: AbortSignal): Promise<NewsItem[]> {
  const feeds = feedsFor(q.language);
  if (feeds.length === 0) return [];

  const normKeywords = q.keywords.map(normalizeToken).filter(Boolean);
  const matches = (title: string, summary?: string): boolean => {
    if (normKeywords.length === 0) return true;
    const text = `${title} ${summary ?? ""}`;
    const hay = normalizeToken(text);
    const hayTokens = tokenSet(text);
    // Short keywords (acronyms like "ia") must match a WHOLE token, else "ia"
    // would match "social"/"media"; longer keywords allow substring (stems).
    return normKeywords.some((k) => (k.length <= 3 ? hayTokens.has(k) : hay.includes(k)));
  };

  // Fetch all feeds in parallel; a dead feed just contributes nothing.
  const perFeed = await Promise.allSettled(
    feeds.map(async (feedUrl) => {
      const xml = await fetchText(feedUrl, { signal, timeoutMs: PER_CALL_TIMEOUT_MS });
      return parseFeed(xml)
        .filter((e) => e.publishedAt === null || e.publishedAt >= q.sinceTs)
        .filter((e) => matches(e.title, e.summary))
        .map<NewsItem>((e) => ({
          title: e.title,
          url: e.link,
          source: hostOf(e.link) || hostOf(feedUrl),
          publishedAt: e.publishedAt,
          provider: "rss",
          raw: e.summary ? { summary: e.summary.slice(0, 280) } : undefined,
        }));
    })
  );

  const out: NewsItem[] = [];
  for (const r of perFeed) {
    if (r.status === "fulfilled") out.push(...r.value);
  }
  return out;
}
