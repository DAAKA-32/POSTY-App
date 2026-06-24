/**
 * News-engine orchestrator.
 *
 * Public entry: fetchRealtimeContextFromAPIs(topic, language, userId, client?).
 * Returns the SAME RealtimeContext shape as the legacy OpenAI search path (or
 * null), so realtime-context.ts can dispatch to it transparently.
 *
 * Flow: extract keywords → detect domain(s) → route providers → fan-out fetch
 * under a global deadline (Promise.allSettled, graceful degradation) → score
 * (deterministic) → select top-N with source diversity → build brief. The
 * optional synth LLM call runs within the REMAINING global budget (so total
 * wall time stays near GLOBAL_TIMEOUT_MS). If the news providers surface nothing
 * usable, fall back to a Wikipedia factual anchor; if even that is empty, return
 * null (generate without facts). Every path is non-blocking — failures degrade
 * to the lite brief or null, generation always proceeds.
 */

import type OpenAI from "openai";
import type { RealtimeContext } from "@/lib/services/realtime-context";
import type { NewsItem, NewsQuery } from "./types";
import { extractKeywords } from "./keywords";
import { detectTopicDomain, routeProviders } from "./router";
import { getProvider } from "./providers";
import { scoreItems, selectTop } from "./scorer";
import { buildBrief, buildBriefLite } from "./brief";

/** Hard ceiling so a slow provider never hangs the generation stream
 *  (same budget as the legacy RESEARCH_TIMEOUT_MS). */
const GLOBAL_TIMEOUT_MS = 10_000;
// Hard recall floor — generous so providers actually return items; the scorer's
// 48h recency half-life is what enforces "current", not this window.
const WINDOW_MS = 14 * 24 * 60 * 60 * 1000;
const MAX_ITEMS = 6;
const MAX_PER_SOURCE = 2;

function scoreThreshold(): number {
  const v = parseFloat(process.env.NEWS_SCORE_MIN || "");
  return Number.isFinite(v) ? v : 0.4;
}

export async function fetchRealtimeContextFromAPIs(
  topic: string,
  language: "fr" | "en",
  userId: string,
  client?: OpenAI | null,
): Promise<RealtimeContext | null> {
  const keywords = extractKeywords(topic);
  const domains = detectTopicDomain(topic);
  const routed = routeProviders(domains);
  const weights = new Map<string, number>(routed.map((r) => [r.id, r.weight]));
  const query: NewsQuery = {
    topic,
    keywords,
    language,
    sinceTs: Date.now() - WINDOW_MS,
    domains,
  };

  // ── Fan-out under one global deadline ────────────────────────────────────
  const startedAt = Date.now();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), GLOBAL_TIMEOUT_MS);
  const items: NewsItem[] = [];
  try {
    const results = await Promise.allSettled(
      routed.map((rp) => {
        const def = getProvider(rp.id);
        return def ? def.fetch(query, ctrl.signal) : Promise.resolve<NewsItem[]>([]);
      }),
    );
    for (const r of results) {
      if (r.status === "fulfilled") items.push(...r.value);
    }
  } finally {
    clearTimeout(timer);
  }

  // ── Score + select ───────────────────────────────────────────────────────
  const scored = scoreItems(items, query, { now: Date.now(), weights });
  const selected = selectTop(scored, {
    threshold: scoreThreshold(),
    maxItems: MAX_ITEMS,
    maxPerSource: MAX_PER_SOURCE,
  });

  if (selected.length > 0) {
    // Keep the OPTIONAL synth call inside the same overall budget as the
    // fan-out, so total wall time stays near GLOBAL_TIMEOUT_MS.
    const synthBudget = Math.max(2500, GLOBAL_TIMEOUT_MS - (Date.now() - startedAt));
    return buildBrief(selected, language, { client, userId, timeoutMs: synthBudget });
  }

  // ── Evergreen fallback: a Wikipedia anchor beats returning nothing ────────
  const wiki = getProvider("wikimedia");
  if (wiki && !routed.some((r) => r.id === "wikimedia")) {
    const wCtrl = new AbortController();
    const wTimer = setTimeout(() => wCtrl.abort(), 5000);
    try {
      const wItems = await wiki.fetch(query, wCtrl.signal);
      if (wItems.length > 0) return buildBriefLite(wItems.slice(0, 1), language);
    } catch {
      /* non-blocking */
    } finally {
      clearTimeout(wTimer);
    }
  }

  // Nothing usable — caller generates without facts (current behavior).
  return null;
}
