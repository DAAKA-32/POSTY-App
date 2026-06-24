/**
 * Brief builder — turns the selected NewsItems into the SAME RealtimeContext
 * shape the prompt layer already consumes, so buildRealtimeContextBlock() and
 * both call sites stay unchanged.
 *
 * Two modes (NEWS_BRIEF_MODE):
 *   - "synth" (default): ONE gpt-4o-mini Chat Completions call compresses the
 *     headlines into 4-7 dated factual bullets — same prose quality as the old
 *     search-preview brief, ~100x cheaper, and NOT the search model.
 *   - "lite": zero-LLM deterministic bullets ($0) — also the automatic fallback
 *     when the synth call fails / is disabled / no client is available.
 *
 * Ground-and-cite-only: bullets are facts/paraphrase, never verbatim bodies;
 * sources stay internal (logging / anti-hallucination), never surfaced.
 */

import type OpenAI from "openai";
import type { RealtimeContext, RealtimeSource } from "@/lib/services/realtime-context";
import type { NewsItem } from "./types";
import { MINI_MODEL } from "@/lib/openai";
import { trackAIUsage, readUsageFromResponse } from "@/lib/ai-cost/tracker";

const NO_CONTEXT_SENTINEL = "AUCUN_CONTEXTE";

function formatCurrentDate(language: "fr" | "en"): string {
  return new Intl.DateTimeFormat(language === "fr" ? "fr-FR" : "en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
}

function shortDate(ts: number | null, language: "fr" | "en"): string {
  if (ts == null) return "";
  return new Intl.DateTimeFormat(language === "fr" ? "fr-FR" : "en-US", {
    day: "numeric",
    month: "short",
  }).format(new Date(ts));
}

function sourcesFrom(items: NewsItem[]): RealtimeSource[] {
  return items.map((i) => ({ title: i.title, url: i.url }));
}

/** Strip any stray URL so a fact bullet never leaks a link into the post. */
function stripUrls(text: string): string {
  return text.replace(/https?:\/\/[^\s)]+/g, "").replace(/[ \t]{2,}/g, " ").trim();
}

/** Zero-LLM deterministic brief. */
export function buildBriefLite(items: NewsItem[], language: "fr" | "en"): RealtimeContext {
  const bullets = items
    .map((i) => {
      const d = shortDate(i.publishedAt, language);
      const meta = [i.source, d].filter(Boolean).join(", ");
      return `- ${i.title}${meta ? ` (${meta})` : ""}`;
    })
    .join("\n");
  return { brief: bullets, sources: sourcesFrom(items), currentDate: formatCurrentDate(language) };
}

const SYNTH_SYSTEM: Record<"fr" | "en", string> = {
  fr: `Tu es un analyste de veille. On te donne une liste de titres d'actualité RÉCENTS (avec source et date). Tu en tires un BRIEF FACTUEL compact.
RÈGLES:
- 4 à 7 puces maximum. Chaque puce = un fait, un chiffre, un événement ou une tendance réel tiré des titres fournis.
- Indique la période quand c'est pertinent (ex: "fin juin", "cette semaine").
- N'invente RIEN au-delà des titres fournis. Pas de lien, pas d'URL, pas de nom de média.
- Reste neutre et factuel. Si rien n'est exploitable, réponds EXACTEMENT: ${NO_CONTEXT_SENTINEL}
Format: uniquement les puces (préfixe "- ").`,
  en: `You are a research analyst. You are given a list of RECENT news headlines (with source and date). Produce a compact FACTUAL BRIEF.
RULES:
- 4 to 7 bullets maximum. Each bullet = one real fact, figure, event or trend drawn from the provided headlines.
- State the period when relevant (e.g. "late June", "this week").
- Invent NOTHING beyond the provided headlines. No links, no URLs, no media names.
- Stay neutral and factual. If nothing is usable, reply EXACTLY: ${NO_CONTEXT_SENTINEL}
Format: bullets only (prefix "- ").`,
};

/**
 * gpt-4o-mini synthesis of the selected headlines into the dated brief.
 * Falls back to the lite brief on any failure / empty / sentinel.
 */
export async function buildBriefSynth(
  client: OpenAI,
  items: NewsItem[],
  language: "fr" | "en",
  userId: string,
  timeoutMs = 6000,
): Promise<RealtimeContext> {
  const headlineList = items
    .map((i, idx) => {
      const d = shortDate(i.publishedAt, language);
      const extra = i.raw?.summary ? ` — ${i.raw.summary}` : "";
      return `${idx + 1}. ${i.title} [${i.source}${d ? `, ${d}` : ""}]${extra}`;
    })
    .join("\n");

  try {
    const response = await client.chat.completions.create(
      {
        model: MINI_MODEL,
        temperature: 0.3,
        max_tokens: 500,
        messages: [
          { role: "system", content: SYNTH_SYSTEM[language] },
          { role: "user", content: headlineList },
        ],
      },
      { timeout: Math.max(2000, timeoutMs) },
    );

    const usage = readUsageFromResponse(response);
    void trackAIUsage({
      userId,
      route: "generate.realtime-context.synth",
      model: MINI_MODEL,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      cachedInputTokens: usage.cachedInputTokens,
      metadata: { language, items: items.length },
    });

    const raw = response.choices[0]?.message?.content?.trim() ?? "";
    if (!raw || raw.toUpperCase().includes(NO_CONTEXT_SENTINEL)) {
      return buildBriefLite(items, language);
    }
    const brief = stripUrls(raw);
    if (!brief) return buildBriefLite(items, language);
    return { brief, sources: sourcesFrom(items), currentDate: formatCurrentDate(language) };
  } catch {
    return buildBriefLite(items, language);
  }
}

/** Choose synth vs lite based on env + client availability. */
export async function buildBrief(
  items: NewsItem[],
  language: "fr" | "en",
  opts: { client?: OpenAI | null; userId: string; timeoutMs?: number },
): Promise<RealtimeContext> {
  const mode = (process.env.NEWS_BRIEF_MODE || "synth").toLowerCase();
  if (mode === "synth" && opts.client) {
    return buildBriefSynth(opts.client, items, language, opts.userId, opts.timeoutMs);
  }
  return buildBriefLite(items, language);
}
