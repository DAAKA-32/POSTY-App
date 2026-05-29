/**
 * Real-Time Contextual Intelligence for POSTY
 *
 * Grounds generated posts in CURRENT events, trends and data so they read like
 * they were written by an expert who actually follows their industry — not by a
 * timeless content machine.
 *
 * Architecture: "search-first, generate-second".
 *   1. isTopicTimeSensitive() — cheap, zero-API heuristic: does this topic move
 *      with the news (AI, markets, tech, crypto, a named company, "in 2026"…)?
 *   2. fetchRealtimeContext() — ONE call to OpenAI's native web search model
 *      (gpt-4o-mini-search-preview via Chat Completions) that returns a compact,
 *      DATED factual brief. The brief is later injected verbatim into the existing
 *      buildOptimizedPrompt → gpt-4 generation pipeline (unchanged streaming,
 *      temperature, variation and humanization layers).
 *
 * Why a separate call instead of letting the search model write the post:
 *   - gpt-4o-*-search-preview rejects `temperature` (400) — our variation/
 *     humanization engine depends on it. Decoupling preserves the full pipeline.
 *   - Keeps facts and voice as independent concerns: facts come from the web,
 *     voice comes from the user's profile + variation seed.
 *
 * Product decisions encoded here:
 *   - Sources stay INTERNAL (logged, used as an anti-hallucination guard) and are
 *     NOT surfaced to the user. Facts are woven into the post with NO links
 *     (LinkedIn penalizes outbound links).
 *   - Plan-gated to Pro+ at the call site (lib/config/plans → hasRealtimeContext).
 *   - Non-blocking: any failure returns null and generation proceeds normally.
 */

import type OpenAI from "openai";
import { trackAIUsage, readUsageFromResponse } from "@/lib/ai-cost/tracker";

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
 * Domains whose "truth" shifts month to month. A post about any of these reads
 * as stale the moment it ignores what's happening right now. Matching one of
 * these is enough to justify a web search.
 */
const TIME_SENSITIVE_DOMAINS: RegExp[] = [
  // AI / tech
  /\b(ia|a\.?i\.?|intelligence artificielle|machine learning|llm|gpt|chatgpt|claude|gemini|mistral|openai|anthropic|deep ?learning|generative|g[ée]n[ée]rative)\b/i,
  /\b(tech|technologie|technology|logiciel|software|saas|startup|scale[- ]?up|no[- ]?code)\b/i,
  // Markets / finance / economy
  /\b(bourse|march[ée]s?|stock ?market|trading|investissement|investing|invest|action(s|naires)?|[ée]conomie|economy|economic|inflation|r[ée]cession|taux d'?int[ée]r[êe]t|interest rates?)\b/i,
  /\b(crypto|bitcoin|btc|ethereum|eth|blockchain|web3|nft|d[ée]fi|token)\b/i,
  // Business / strategy that tracks current events
  /\b(lev[ée]e de fonds|fundraising|ipo|m&a|acquisition|valorisation|valuation|licenciements?|layoffs?)\b/i,
  /\b(r[ée]glementation|regulation|loi|law|rgpd|gdpr|ai act|directive europ[ée]enne)\b/i,
  // Marketing / social platforms (algorithms change constantly)
  /\b(algorithme|algorithm|linkedin|tiktok|instagram|seo|reach|portée|growth hacking)\b/i,
  // Named recency: any year 2023-2030 referenced explicitly
  /\b(20(2[3-9]|30))\b/,
];

/**
 * Explicit recency markers — the user is asking about "what's new / latest /
 * right now". Even an otherwise-evergreen noun becomes time-sensitive.
 */
const RECENCY_MARKERS: RegExp[] = [
  /\b(actualit[ée]s?|news|r[ée]cent(e|es|s)?|recent(ly)?|derni[èe]res?|latest|nouveau(t[ée]s?|x)?|new(est)?)\b/i,
  /\b(en ce moment|right now|aujourd'?hui|today|cette (semaine|ann[ée]e)|this (week|year)|ces derniers (jours|mois)|past (few )?(days|weeks|months))\b/i,
  /\b(tendances?|trends?|trending|en vogue|hype|buzz|viral)\b/i,
  /\b(mise[- ]?à[- ]?jour|update|annonce|announcement|sortie|release|lancement|launch)\b/i,
];

/**
 * Decide — with no API call — whether a topic warrants a real-time web search.
 *
 * Intentionally inclusive on genuinely-evolving domains, but deliberately does
 * NOT fire on evergreen subjects (leadership, productivity, mindset, recipes…)
 * so we don't pay for search when the present moment adds nothing. Cost is
 * further bounded upstream: Pro+ only, PRODUCTION intent only, first message only.
 */
export function isTopicTimeSensitive(prompt: string): boolean {
  const text = prompt.trim();
  if (text.length < 3) return false;

  for (const re of RECENCY_MARKERS) {
    if (re.test(text)) return true;
  }
  for (const re of TIME_SENSITIVE_DOMAINS) {
    if (re.test(text)) return true;
  }
  return false;
}

// ============================================
// RESEARCH PROMPTS
// ============================================

const RESEARCH_SYSTEM_PROMPT: Record<"fr" | "en", string> = {
  fr: `Tu es un analyste de veille. À partir d'un sujet, tu effectues une recherche web et tu renvoies un BRIEF FACTUEL des informations RÉCENTES et VÉRIFIABLES.

RÈGLES STRICTES:
- 4 à 7 puces maximum. Chaque puce = un fait, un chiffre, un événement ou une tendance RÉEL et récent (privilégie les derniers mois).
- Indique la date ou la période quand c'est pertinent (ex: "depuis mars 2026", "au T1 2026").
- N'invente RIEN. Pas de statistiques approximatives présentées comme exactes. Si un chiffre est une estimation, dis-le.
- Aucun lien, aucune URL dans le texte des puces.
- Reste neutre et factuel — pas d'opinion, pas de rédaction marketing.
- Si la recherche ne remonte AUCUNE information récente pertinente, réponds EXACTEMENT: AUCUN_CONTEXTE

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
 *
 * The search-preview model inlines markdown citations like "([domain](url))"
 * regardless of instructions. We capture sources separately from `annotations`,
 * so the brief text itself must be link-free before it's injected into the
 * generation prompt — otherwise the writer model could leak a domain/URL into
 * the post (violates LinkedIn's no-outbound-links rule + "hidden sources").
 */
function stripCitations(text: string): string {
  return text
    // "([label](url))" — the parenthesized citation form the model emits
    .replace(/\s*\(\[[^\]]*\]\([^)]*\)\)/g, "")
    // any remaining "[label](url)" markdown links → keep just the label
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    // bare URLs
    .replace(/https?:\/\/[^\s)]+/g, "")
    // tidy leftover empty parens / double spaces / trailing spaces per line
    .replace(/\(\s*\)/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+$/gm, "")
    .trim();
}

/** Search model — the "mini" search-preview is cheap and sufficient for fact-gathering. */
const RESEARCH_MODEL = "gpt-4o-mini-search-preview";

/** Hard ceiling so a slow search never hangs the generation stream. */
const RESEARCH_TIMEOUT_MS = 12_000;

// ============================================
// MAIN: FETCH REAL-TIME CONTEXT
// ============================================

/**
 * Format today's date for prompt injection (server-side; `new Date()` is fine
 * in a Next.js route handler).
 */
function formatCurrentDate(language: "fr" | "en"): string {
  return new Intl.DateTimeFormat(language === "fr" ? "fr-FR" : "en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
}

/**
 * Run ONE native web-search call and return a dated factual brief, or null.
 *
 * Never throws — on timeout, API error, empty result or the AUCUN_CONTEXTE
 * sentinel it resolves to null and the caller proceeds without real-time facts.
 *
 * @param client  An OpenAI client (pass `service["client"]` to honor user keys).
 * @param topic   The cleaned post topic (URL/markers already stripped upstream).
 */
export async function fetchRealtimeContext(
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

    // Cost accounting — same shape as every other AI call in the app.
    const usage = readUsageFromResponse(response);
    void trackAIUsage({
      userId,
      route: "generate.realtime-context",
      model: RESEARCH_MODEL,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      cachedInputTokens: usage.cachedInputTokens,
      metadata: { language },
    });

    const message = response.choices[0]?.message;
    const raw = message?.content?.trim() ?? "";

    // No usable content, or the model explicitly signalled "nothing recent".
    if (!raw || raw.toUpperCase().includes(NO_CONTEXT_SENTINEL)) {
      return null;
    }

    // Remove inline citations/URLs — facts only, sources stay structured+internal.
    const brief = stripCitations(raw);
    if (!brief) return null;

    // Collect citations for INTERNAL use only (never surfaced to the user).
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

    return {
      brief,
      sources,
      currentDate: formatCurrentDate(language),
    };
  } catch (error) {
    // Non-blocking: log and let generation continue without real-time facts.
    console.error("Realtime context fetch failed (non-blocking):", error);
    return null;
  }
}

// ============================================
// PROMPT INJECTION HELPER
// ============================================

/**
 * Build the system-prompt block that injects the dated brief into generation.
 *
 * Designed to coexist with the existing anti-AI / no-external-links rules:
 * facts are to be WOVEN IN naturally, never listed, never linked, and only when
 * they genuinely strengthen the message.
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
