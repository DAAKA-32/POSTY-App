import { NextRequest } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { adminDb, isAdminInitialized } from "@/lib/db/firebase-admin";
import { createOpenAIService, isOpenAIConfigured, MINI_MODEL } from "@/lib/openai";
import { trackAIUsage, readUsageFromResponse } from "@/lib/ai-cost/tracker";
import { sanitizeProfileField } from "@/lib/ai/sanitize-profile";
import { normalizeBusinessProfile } from "@/lib/business/profile";
import { renderBusinessBlock } from "@/lib/business/render";
import {
  canBuildStrategy,
  readContentStrategy,
  strategyModelOutputSchema,
  STRATEGY_PILLARS_MAX,
  STRATEGY_PILLARS_MIN,
  type ContentStrategy,
} from "@/lib/business/strategy";

/** One generation per user per minute — the call is cheap, this only blocks loops. */
const COOLDOWN_MS = 60_000;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function flat(v: unknown, max = 160): string {
  const raw = Array.isArray(v) ? v.filter((x) => typeof x === "string").join(", ") : v;
  return typeof raw === "string" ? sanitizeProfileField(raw, max) : "";
}

function buildPrompt(lang: "fr" | "en", profileLines: string, businessBlock: string): string {
  const n = `${STRATEGY_PILLARS_MIN}-${STRATEGY_PILLARS_MAX}`;
  if (lang === "fr") {
    return `Tu es stratège de contenu LinkedIn. À partir de l'entreprise ci-dessous, définis ${n} piliers éditoriaux propres à CETTE entreprise (jamais une liste générique).

${businessBlock}
${profileLines ? `\nProfil de l'auteur :\n${profileLines}\n` : ""}
Règles :
- Chaque pilier a un nom court, une finalité claire (ce qu'il apporte à l'audience ET à l'entreprise, en mots simples) et UNE idée de post concrète.
- Équilibre contenu éducatif, démonstration d'expertise et contenu qui présente l'offre. Au moins un pilier part des problèmes des clients.
- Le "cadence" propose un rythme réaliste et tenable avec une phrase de justification.
- N'invente AUCUN chiffre, client, témoignage ou résultat. Ne promets aucun résultat (leads, clients, ventes).
- Pas de jargon marketing creux.
Réponds uniquement en JSON : {"pillars":[{"name":"","purpose":"","example":""}],"cadence":""} en français.`;
  }
  return `You are a LinkedIn content strategist. From the business below, define ${n} editorial pillars specific to THIS business (never a generic list).

${businessBlock}
${profileLines ? `\nAuthor profile:\n${profileLines}\n` : ""}
Rules:
- Each pillar has a short name, a clear purpose (what it brings the audience AND the business, in plain words) and ONE concrete post idea.
- Balance educational content, expertise demonstration and content that presents the offer. At least one pillar starts from the customers' problems.
- "cadence" proposes a realistic, sustainable rhythm with one sentence of reasoning.
- Invent NO figure, client, testimonial or result. Promise no outcome (leads, customers, sales).
- No empty marketing jargon.
Reply with JSON only: {"pillars":[{"name":"","purpose":"","example":""}],"cadence":""} in English.`;
}

/**
 * POST /api/business/strategy
 * Builds the content pillars + publishing cadence from the user's business
 * context (users/{uid}.profile.business) and stores them on
 * users/{uid}.profile.strategy. Body: { language?: "fr" | "en" }.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (auth.error) return auth.error;
    const userId = auth.uid;
    if (!userId || userId === "__dev_bypass__" || !isAdminInitialized() || !adminDb) {
      return json({ error: "service_unavailable" }, 503);
    }

    const body = await request.json().catch(() => ({}));
    const lang: "fr" | "en" = body?.language === "en" ? "en" : "fr";

    const userRef = adminDb.collection("users").doc(userId);
    const snap = await userRef.get();
    const profile = (snap.data()?.profile ?? {}) as Record<string, unknown>;

    const business = normalizeBusinessProfile(profile.business);
    if (!canBuildStrategy(business)) {
      return json({ error: "business_context_required" }, 422);
    }

    const previous = readContentStrategy(profile.strategy);
    if (previous?.generatedAt) {
      const age = Date.now() - Date.parse(previous.generatedAt);
      if (Number.isFinite(age) && age < COOLDOWN_MS) {
        return json({ error: "too_many_requests", retryAfterSeconds: Math.ceil((COOLDOWN_MS - age) / 1000) }, 429);
      }
    }

    if (!isOpenAIConfigured()) return json({ error: "service_unavailable" }, 503);
    const openai = createOpenAIService();
    if (!openai) return json({ error: "service_unavailable" }, 503);

    const profileLines = [
      flat(profile.role) && `- ${lang === "fr" ? "Rôle" : "Role"}: ${flat(profile.role)}`,
      flat(profile.sector) && `- ${lang === "fr" ? "Secteur" : "Industry"}: ${flat(profile.sector)}`,
      flat(profile.objective) && `- ${lang === "fr" ? "Objectif LinkedIn" : "LinkedIn goal"}: ${flat(profile.objective)}`,
      flat(profile.targetAudience) && `- ${lang === "fr" ? "Audience" : "Audience"}: ${flat(profile.targetAudience)}`,
      flat(profile.communicationTone) && `- ${lang === "fr" ? "Ton" : "Tone"}: ${flat(profile.communicationTone)}`,
    ]
      .filter(Boolean)
      .join("\n");

    const model = MINI_MODEL;
    const response = await openai["client"].chat.completions.create({
      model,
      messages: [{ role: "system", content: buildPrompt(lang, profileLines, renderBusinessBlock(business, lang)) }],
      temperature: 0.6,
      max_tokens: 900,
      response_format: { type: "json_object" },
    });

    const usage = readUsageFromResponse(response);
    void trackAIUsage({
      userId,
      route: "business.strategy",
      model,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      cachedInputTokens: usage.cachedInputTokens,
      metadata: { language: lang },
    });

    let parsed;
    try {
      parsed = strategyModelOutputSchema.safeParse(JSON.parse(response.choices[0]?.message?.content ?? ""));
    } catch {
      parsed = null;
    }
    if (!parsed?.success) return json({ error: "generation_failed" }, 502);

    const strategy: ContentStrategy = {
      ...parsed.data,
      generatedAt: new Date().toISOString(),
      language: lang,
    };
    // Dotted path: only `profile.strategy` is written, onboarding fields and
    // `profile.business` are untouched.
    await userRef.update({ "profile.strategy": strategy });

    return json({ strategy });
  } catch (error) {
    console.error("[business/strategy] error:", error);
    return json({ error: "internal_error" }, 500);
  }
}
