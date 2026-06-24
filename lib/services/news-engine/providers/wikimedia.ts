/**
 * Wikimedia REST adapter — EVERGREEN factual-anchor fallback (keyless, needs UA).
 *
 * Used only as a last resort: when the news providers return nothing for a
 * topic the gate flagged, a Wikipedia summary still gives the writer a real
 * factual anchor (definition, who/what/when) instead of returning null. We feed
 * the extract as FACTS to the LLM — never republished verbatim — sidestepping
 * CC BY-SA share-alike.
 */

import type { NewsItem, NewsQuery } from "../types";
import { fetchJson } from "../http";

const PER_CALL_TIMEOUT_MS = 4000;

interface WikiSummary {
  type?: string;
  title?: string;
  extract?: string;
  content_urls?: { desktop?: { page?: string } };
}

/** Title-case a topic into a Wikipedia-friendly page slug candidate. */
function toTitle(topic: string): string {
  return topic
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 80)
    .replace(/ /g, "_");
}

export async function fetchWikimedia(q: NewsQuery, signal: AbortSignal): Promise<NewsItem[]> {
  // Use the most significant keyword (or the topic) as the page candidate.
  const candidate = q.keywords[0] ? q.keywords.slice(0, 3).join(" ") : q.topic;
  const title = toTitle(candidate);
  if (!title) return [];

  const lang = q.language === "fr" ? "fr" : "en";
  const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;

  try {
    const data = await fetchJson<WikiSummary>(url, { signal, timeoutMs: PER_CALL_TIMEOUT_MS });
    // Skip disambiguation / missing pages.
    if (!data.extract || data.type === "disambiguation") return [];
    const page = data.content_urls?.desktop?.page || `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(title)}`;
    return [
      {
        title: data.title || candidate,
        url: page,
        source: `${lang}.wikipedia.org`,
        publishedAt: null, // evergreen
        provider: "wikimedia",
        raw: { summary: data.extract.slice(0, 320) },
      },
    ];
  } catch {
    return [];
  }
}
