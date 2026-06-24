/**
 * Provider registry — maps a provider id to its adapter + base credibility,
 * with env-gating so any source can be disabled in production without a deploy
 * (NEWS_ENGINE_DISABLE="arxiv,wikimedia").
 *
 * Adding a KEYED provider later (NewsAPI, a finance API) is a single entry here
 * + an adapter file — the router/scorer/brief layers are unchanged.
 */

import type { NewsItem, NewsQuery } from "../types";
import { fetchGdelt } from "./gdelt";
import { fetchHackerNews } from "./hackernews";
import { fetchRss } from "./rss";
import { fetchWikimedia } from "./wikimedia";
import { fetchArxiv } from "./arxiv";

export type ProviderId = "gdelt" | "hackernews" | "rss" | "wikimedia" | "arxiv";

export interface ProviderDef {
  id: ProviderId;
  fetch: (q: NewsQuery, signal: AbortSignal) => Promise<NewsItem[]>;
  /** Floor credibility for items from this provider (refined by domain table). */
  baseCredibility: number;
}

const ALL: Record<ProviderId, ProviderDef> = {
  gdelt: { id: "gdelt", fetch: fetchGdelt, baseCredibility: 0.4 },
  hackernews: { id: "hackernews", fetch: fetchHackerNews, baseCredibility: 0.6 },
  rss: { id: "rss", fetch: fetchRss, baseCredibility: 0.6 },
  wikimedia: { id: "wikimedia", fetch: fetchWikimedia, baseCredibility: 0.85 },
  arxiv: { id: "arxiv", fetch: fetchArxiv, baseCredibility: 0.85 },
};

const DISABLED = new Set(
  (process.env.NEWS_ENGINE_DISABLE || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
);

export function getProvider(id: ProviderId): ProviderDef | null {
  if (DISABLED.has(id)) return null;
  return ALL[id] ?? null;
}

export function providerBaseCredibility(id: string): number {
  return (ALL as Record<string, ProviderDef>)[id]?.baseCredibility ?? 0.4;
}
