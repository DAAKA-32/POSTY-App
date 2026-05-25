/**
 * POST /api/strategist
 *
 * Marketing Strategist agent — Max-only conversational marketing advisor.
 *
 * Distinct from /api/chat (post generation):
 *   - /api/chat        → tactical, single-turn, generates LinkedIn posts
 *   - /api/strategist  → strategic, multi-turn, audits/plans/positioning
 *
 * Uses the existing OpenAIService streaming infra so the cost/latency profile
 * stays identical to the rest of the app. The differentiation is the system
 * prompt (advisor persona) + plan gating (Max only).
 */

import { NextRequest } from "next/server";
import {
  createOpenAIService,
  createUserOpenAIService,
  isOpenAIConfigured,
  isValidApiKeyFormat,
  OpenAIModel,
} from "@/lib/openai";
import { isAdminInitialized, adminDb } from "@/lib/db/firebase-admin";
import { checkHourlyQuotaAdmin, incrementUserQuotaAdmin } from "@/lib/db/firestore-admin";
import { getPlanLimits, PlanType } from "@/lib/config/plans";
import { verifyAuth } from "@/lib/auth";
import { STRATEGIST_SYSTEM_PROMPT } from "@/lib/ai/strategist-prompt";
import { isStrategistAllowedForEmail } from "@/lib/strategist/access";
import { hasLinkedInConnected } from "@/lib/strategist/access-server";

type StrategistMessage = { role: "user" | "assistant"; content: string };

/** Light user-profile snapshot the agent uses to personalize advice. */
type StrategistContext = {
  displayName?: string;
  sector?: string;
  role?: string;
  audience?: string;
  tone?: string;
  language?: "en" | "fr";
};

async function loadUserContext(uid: string): Promise<StrategistContext | null> {
  if (!isAdminInitialized() || !adminDb) return null;
  try {
    const snap = await adminDb.collection("users").doc(uid).get();
    if (!snap.exists) return null;
    const data = snap.data() ?? {};
    const profile = data.profile ?? {};
    return {
      displayName: data.name || data.displayName || undefined,
      sector: profile.sector || data.sector || undefined,
      role: profile.role || data.role || undefined,
      audience: profile.objective || undefined,
      tone: profile.linkedinStyle || undefined,
      language: data.language === "en" ? "en" : "fr",
    };
  } catch (err) {
    console.error("[strategist] loadUserContext error:", err);
    return null;
  }
}

function buildContextPreamble(ctx: StrategistContext | null, language: "fr" | "en"): string {
  if (!ctx) return "";
  const lines: string[] = [];
  if (ctx.displayName) lines.push(`- ${language === "fr" ? "Nom" : "Name"}: ${ctx.displayName}`);
  if (ctx.role) lines.push(`- ${language === "fr" ? "Rôle" : "Role"}: ${ctx.role}`);
  if (ctx.sector) lines.push(`- ${language === "fr" ? "Secteur" : "Industry"}: ${ctx.sector}`);
  if (ctx.audience) lines.push(`- ${language === "fr" ? "Audience cible" : "Target audience"}: ${ctx.audience}`);
  if (ctx.tone) lines.push(`- ${language === "fr" ? "Ton préféré" : "Preferred tone"}: ${ctx.tone}`);
  if (lines.length === 0) return "";
  const header =
    language === "fr"
      ? "PROFIL DE L'UTILISATEUR (utilise ces infos pour personnaliser tes conseils):"
      : "USER PROFILE (use this to personalize your advice):";
  return `\n\n${header}\n${lines.join("\n")}`;
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (auth.error) return auth.error;

    const body = await request.json();
    const {
      messages,
      language = "en",
      userApiKey,
      model = "gpt-4o",
    }: {
      messages: StrategistMessage[];
      language?: "fr" | "en";
      userApiKey?: string;
      model?: OpenAIModel;
    } = body;

    const userId = auth.uid;
    if (!userId || userId === "__dev_bypass__") {
      return jsonError("auth_required", "Authentication required", 401);
    }

    if (!Array.isArray(messages) || messages.length === 0) {
      return jsonError("invalid_payload", "messages array is required", 400);
    }

    // ── Access gate — enterprise email allowlist ────────────────────────
    if (!isStrategistAllowedForEmail(auth.email)) {
      return jsonError(
        "access_denied",
        language === "fr"
          ? "Le Stratège est réservé aux entreprises. Contacte-nous pour activer ton compte."
          : "The Strategist is reserved for enterprise accounts. Contact us to enable yours.",
        403
      );
    }

    // ── LinkedIn required ────────────────────────────────────────────────
    // The Strategist produces LinkedIn posts and schedules them through the
    // LinkedIn publishing pipeline — useless without a connected account.
    if (!(await hasLinkedInConnected(userId))) {
      return jsonError(
        "linkedin_required",
        language === "fr"
          ? "Connecte ton compte LinkedIn pour utiliser le Stratège."
          : "Connect your LinkedIn account to use the Strategist.",
        428 // Precondition Required
      );
    }

    let userPlan: PlanType | null = null;
    if (isAdminInitialized()) {
      try {
        const quota = await checkHourlyQuotaAdmin(userId, auth.email);
        userPlan = quota.plan as PlanType;

        if (!quota.canGenerate) {
          const resetMin = Math.ceil(quota.resetInSeconds / 60);
          return jsonError(
            "rate_limited",
            language === "fr"
              ? `Limite temporaire atteinte. Réessayez dans ${resetMin} min.`
              : `Rate limit reached. Try again in ${resetMin} min.`,
            429,
            { resetInSeconds: quota.resetInSeconds }
          );
        }
      } catch (err) {
        console.error("[strategist] quota check failed:", err);
        if (process.env.NODE_ENV === "production") {
          return jsonError("service_unavailable", "Service temporarily unavailable", 503);
        }
      }
    }

    // Prompt length guard (uses Max's high cap, but still enforced)
    const planLimits = userPlan ? getPlanLimits(userPlan) : getPlanLimits("max");
    const last = messages[messages.length - 1];
    if (last?.content && last.content.length > planLimits.maxCharactersPerPrompt) {
      return jsonError(
        "prompt_too_long",
        language === "fr"
          ? `Votre message dépasse ${planLimits.maxCharactersPerPrompt} caractères.`
          : `Your message exceeds ${planLimits.maxCharactersPerPrompt} characters.`,
        400,
        { limit: planLimits.maxCharactersPerPrompt }
      );
    }

    // ── OpenAI client ────────────────────────────────────────────────────
    const hasUserKey = userApiKey && isValidApiKeyFormat(userApiKey);
    const hasGlobalKey = isOpenAIConfigured();

    if (!hasUserKey && !hasGlobalKey) {
      return jsonError(
        "no_api_key",
        language === "fr"
          ? "Aucune clé OpenAI configurée."
          : "No OpenAI API key configured.",
        401
      );
    }

    const openaiService = hasUserKey
      ? createUserOpenAIService(userApiKey, { model })
      : createOpenAIService({ model });

    if (!openaiService) {
      return jsonError("init_failed", "Failed to initialize OpenAI service", 500);
    }

    // ── Build system prompt with user context ───────────────────────────
    const ctx = await loadUserContext(userId);
    const systemPrompt =
      STRATEGIST_SYSTEM_PROMPT[language] + buildContextPreamble(ctx, language);

    // ── Stream the response ──────────────────────────────────────────────
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const sendEvent = (event: string, data: object) => {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        };

        try {
          sendEvent("start", {});

          const chatMessages = [
            { role: "system" as const, content: systemPrompt },
            ...messages.map((m) => ({ role: m.role, content: m.content })),
          ];

          // We tap into the OpenAI client directly (same pattern as /api/chat)
          // to keep streaming low-latency. The Strategist runs on Max plan
          // tokens budget — generous, but still bounded.
          const streamResponse = await openaiService["client"].chat.completions.create({
            model: openaiService["model"],
            messages: chatMessages,
            // Slightly lower temperature than chat → more grounded advice,
            // less "creative writing" energy.
            temperature: 0.55,
            // Strategist replies are longer than post copy — let them breathe.
            max_tokens: 2200,
            stream: true,
          });

          let full = "";
          for await (const chunk of streamResponse) {
            const c = chunk.choices[0]?.delta?.content || "";
            if (c) {
              full += c;
              sendEvent("chunk", { content: c });
            }
          }

          if (isAdminInitialized()) {
            try {
              await incrementUserQuotaAdmin(userId);
            } catch (e) {
              console.error("[strategist] quota increment failed:", e);
            }
          }

          sendEvent("done", { fullContent: full });
        } catch (err) {
          console.error("[strategist] stream error:", err);
          sendEvent("error", {
            message: err instanceof Error ? err.message : "Stream failed",
          });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (err) {
    console.error("[strategist] route error:", err);
    return jsonError("internal", "Internal server error", 500);
  }
}

function jsonError(code: string, message: string, status: number, extra: object = {}) {
  return new Response(JSON.stringify({ error: code, message, ...extra }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
