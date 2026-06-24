/**
 * Real-Time Contextual Intelligence for POSTY
 *
 * Grounds generated posts in CURRENT events, trends and data so they read like
 * they were written by an expert who actually follows their industry.
 *
 * Architecture (since 2026-06): the PRIMARY data source is the keyless
 * multi-provider news engine (lib/services/news-engine — GDELT, Hacker News,
 * curated RSS, Wikimedia, arXiv). OpenAI is no longer the collector; it is used
 * only for an OPTIONAL gpt-4o-mini synthesis of the gathered headlines. The
 * legacy gpt-4o-mini-search-preview path is kept as a fallback, selectable via
 * the NEWS_ENGINE_PROVIDER env flag:
 *   - "apis"   (default) → news engine only (cheapest, no OpenAI search)
 *   - "hybrid"           → news engine first, OpenAI search if it returns null
 *   - "openai"           → legacy OpenAI search-preview only (pre-2026-06)
 *   - "off"              → no real-time grounding at all
 *
 * The public surface is unchanged: same isTopicTimeSensitive(),
 * fetchRealtimeContext(client, topic, language, userId) signature, RealtimeContext
 * shape and buildRealtimeContextBlock() — so /api/generate, the strategist and
 * the Firestore cache wrapper are untouched.
 *
 * Product decisions encoded here:
 *   - Sources stay INTERNAL (logged, anti-hallucination guard) — never surfaced.
 *   - Facts are woven into the post with NO links (LinkedIn penalizes them).
 *   - Plan-gated to Pro+ at the call site (lib/config/plans → hasRealtimeContext).
 *   - Non-blocking: any failure returns null and generation proceeds normally.
 */

import type OpenAI from "openai";
import { trackAIUsage, readUsageFromResponse } from "@/lib/ai-cost/tracker";
import { isTimeSensitive } from "@/lib/services/news-engine/keywords";
import { fetchRealtimeContextFromAPIs } from "@/lib/services/news-engine";

// ============================================
// TYPES
// ============================================

export interface RealtimeSource {
  title: string;
  url: string;
}

export interface RealtimeContext {
  /** Compact dated factual brief, injected into the generation system prompt. */
  brief: string;
  /** Web sources backing the brief — INTERNAL only (logging / verification). */
  sources: RealtimeSource[];
  /** Human-readable current date injected so the post is temporally anchored. */
  currentDate: string;
}

// ============================================
// TIME-SENSITIVITY DETECTION (zero-cost heuristic)
// ============================================

/**
 * Decide — with no API call — whether a topic warrants real-time grounding.
 *
 * Delegates to the shared keyword SSoT (news-engine/keywords) so this gate and
 * the provider router use ONE definition and can never drift. Behavior is
 * identical to the previous inline implementation (recency markers ∪ time-moving
 * domains ∪ explicit year reference). Cost is further bounded upstream: Pro+
 * only, PRODUCTION intent only, first message only.
 */
export function isTopicTimeSensitive(prompt: string): boolean {
  return isTimeSensitive(prompt);
}

// ============================================
// LEGACY OPENAI WEB-SEARCH PATH (fallback)
// ============================================

const RESEARCH_SYSTEM_PROMPT: Record<"fr" | "en", string> = {
  fr: `Tu es un analyste de veille. À partir d'un sujet, tu effectues une recherche web et tu renvoies un BRIEF FACTUEL des informations RÉCENTES et VÉRIFIABLES.

RÈGLES STRICTES:
- 4 à 7 puces maximum. Chaque puce = un fait, un chiffre, un événement ou une tendance RÉEL et récent (privilégie les derniers mois).
- Indique la date ou la période quand c'est pertinent (ex: "depuis mars 2026", "au T1 2026").
- N'invente RIEN. Pas de statistiques approximatives présentées comme exactes. Si un chiffre est une estimation, dis-le.
- Aucun lien, aucune URL dans le texte des puces.
- Reste neutre et factuel — pas d'opinion, pas de rédaction marketing.
- Si la recherche ne remonte AUCUN information récente pertinente, réponds EXACTEMENT: AUCUN_CONTEXTE

Format: uniquement les puces (préfixe "- "), rien d'autre.`,
  en: `You are a research analyst. Given a topic, you run a web search and return a FACTUAL BRIEF of RECENT and VERIFIABLE information.

STRICT RULES:
- 4 to 7 bullets maximum. Each bullet = one REAL, recent fact, figure, event or trend (favor the last few months).
- State the date or period when relevant (e.g. "since March 2026", "in Q1 2026").
- Invent NOTHING. No approximate statistics presented as exact. If a number is an estimate, say so.
- No links, no URLs in the bullet text.
- Stay neutral and factual — no opinion, no marketing copy.
- If the search surfaces NO relevant recent information, reply EXACTLY: AUCUN_CONTEXTE

Format: bullets only (prefix "- "), nothing else.`,
};

const NO_CONTEXT_SENTINEL = "AUCUN_CONTEXTE";

/**
 * Strip inline source citations and bare URLs from the brief.
 * The search-preview model inlines markdown citations regardless of instructions.
 */
function stripCitations(text: string): string {
  return text
    .replace(/\s*\(\[[^\]]*\]\([^)]*\)\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/https?:\/\/[^\s)]+/g, "")
    .replace(/\(\s*\)/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+$/gm, "")
    .trim();
}

/** Legacy search model. */
const RESEARCH_MODEL = "gpt-4o-mini-search-preview";
/** Hard ceiling so a slow search never hangs the generation stream. */
const RESEARCH_TIMEOUT_MS = 12_000;
/** OpenAI bills web_search as a fixed per-call tool fee on top of tokens
 *  (~$0.025/call at medium context). Tracked explicitly so rentability is honest. */
const WEB_SEARCH_SURCHARGE_USD = 0.025;

function formatCurrentDate(language: "fr" | "en"): string {
  return new Intl.DateTimeFormat(language === "fr" ? "fr-FR" : "en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
}

/**
 * LEGACY: one native OpenAI web-search call → dated factual brief, or null.
 * Kept as a fallback (NEWS_ENGINE_PROVIDER="openai"|"hybrid"). Never throws.
 */
async function fetchRealtimeContextOpenAI(
  client: OpenAI,
  topic: string,
  language: "fr" | "en",
  userId: string,
): Promise<RealtimeContext | null> {
  try {
    const response = await client.chat.completions.create(
      {
        model: RESEARCH_MODEL,
        // No `temperature` — search-preview models reject it with a 400.
        web_search_options: { search_context_size: "medium" },
        messages: [
          { role: "system", content: RESEARCH_SYSTEM_PROMPT[language] },
          { role: "user", content: topic.slice(0, 500) },
        ],
        max_tokens: 600,
      },
      { timeout: RESEARCH_TIMEOUT_MS },
    );

    // Cost accounting — token cost + the fixed web_search surcharge (the
    // dominant cost), so the rentability dashboard stops under-reporting it.
    const usage = readUsageFromResponse(response);
    void trackAIUsage({
      userId,
      route: "generate.realtime-context",
      model: RESEARCH_MODEL,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      cachedInputTokens: usage.cachedInputTokens,
      costUSD:
        (usage.inputTokens / 1_000_000) * 0.15 +
        (usage.outputTokens / 1_000_000) * 0.6 +
        WEB_SEARCH_SURCHARGE_USD,
      metadata: { language, websearch: true },
    });

    const message = response.choices[0]?.message;
    const raw = message?.content?.trim() ?? "";
    if (!raw || raw.toUpperCase().includes(NO_CONTEXT_SENTINEL)) return null;

    const brief = stripCitations(raw);
    if (!brief) return null;

    const sources: RealtimeSource[] = [];
    const annotations = message?.annotations ?? [];
    for (const a of annotations) {
      if (a.type === "url_citation" && a.url_citation?.url) {
        sources.push({
          title: a.url_citation.title?.trim() || a.url_citation.url,
          url: a.url_citation.url,
        });
      }
    }

    return { brief, sources, currentDate: formatCurrentDate(language) };
  } catch (error) {
    console.error("Realtime context (OpenAI) fetch failed (non-blocking):", error);
    return null;
  }
}

// ============================================
// MAIN: FETCH REAL-TIME CONTEXT (dispatcher)
// ============================================

type EngineMode = "apis" | "hybrid" | "openai" | "off";

function engineMode(): EngineMode {
  const m = (process.env.NEWS_ENGINE_PROVIDER || "apis").toLowerCase();
  return m === "openai" || m === "hybrid" || m === "off" ? (m as EngineMode) : "apis";
}

/**
 * Return a dated factual brief for `topic`, or null. Signature is UNCHANGED
 * (client kept for the OpenAI synth/fallback steps) so all call sites and the
 * Firestore cache wrapper are untouched. Never throws.
 *
 * @param client  An OpenAI client (honors user keys) — used only for synthesis
 *                and the legacy fallback, never as the primary collector.
 */
export async function fetchRealtimeContext(
  client: OpenAI,
  topic: string,
  language: "fr" | "en",
  userId: string,
): Promise<RealtimeContext | null> {
  const mode = engineMode();
  if (mode === "off") return null;
  if (mode === "openai") return fetchRealtimeContextOpenAI(client, topic, language, userId);

  // "apis" (default) and "hybrid": public-API engine first.
  const fromApis = await fetchRealtimeContextFromAPIs(topic, language, userId, client);
  if (fromApis) return fromApis;
  if (mode === "hybrid") return fetchRealtimeContextOpenAI(client, topic, language, userId);
  return null;
}

// ============================================
// PROMPT INJECTION HELPER
// ============================================

/**
 * Build the system-prompt block that injects the dated brief into generation.
 * Facts are to be WOVEN IN naturally, never listed, never linked.
 */
export function buildRealtimeContextBlock(
  ctx: RealtimeContext,
  language: "fr" | "en",
): string {
  if (language === "fr") {
    return `\n\nCONTEXTE TEMPS RÉEL (date du jour: ${ctx.currentDate}):
Voici des éléments d'actualité récents et factuels sur le sujet. Utilise-les pour ancrer le post dans le présent et lui donner de la crédibilité.

${ctx.brief}

RÈGLES D'UTILISATION:
- Intègre 1 à 3 de ces éléments NATURELLEMENT dans le post, comme le ferait un expert qui suit son secteur — jamais sous forme de liste ou de citation de source.
- N'utilise QUE ce qui sert vraiment le message. Ne force aucune référence.
- Ne mentionne JAMAIS de lien, d'URL ni de nom de média. Ne dis pas "selon une étude récente" de façon creuse.
- Ne réécris pas ces faits mot pour mot : reformule-les dans la voix de l'auteur.
- Le post doit rester humain et fluide, pas un bulletin d'actualité.`;
  }
  return `\n\nREAL-TIME CONTEXT (today's date: ${ctx.currentDate}):
Here are recent, factual items about the topic. Use them to anchor the post in the present and give it credibility.

${ctx.brief}

USAGE RULES:
- Weave 1 to 3 of these items NATURALLY into the post, the way an expert who follows their field would — never as a list or a source citation.
- Use ONLY what genuinely serves the message. Don't force any reference.
- NEVER mention a link, URL or media outlet. Don't hollowly say "according to a recent study".
- Don't restate these facts verbatim: rephrase them in the author's voice.
- The post must stay human and fluid, not a news bulletin.`;
}
