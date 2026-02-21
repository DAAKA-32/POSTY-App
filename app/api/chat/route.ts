import { NextRequest } from "next/server";
import {
  createOpenAIService,
  createUserOpenAIService,
  isOpenAIConfigured,
  isValidApiKeyFormat,
  OpenAIModel,
  SYSTEM_PROMPTS,
} from "@/lib/openai";
import {
  checkHourlyQuotaAdmin,
  incrementUserQuotaAdmin,
} from "@/lib/firestore-admin";
import { isAdminInitialized } from "@/lib/firebase-admin";
import { getPlanLimits, getMaxTokensForPlan, PlanType } from "@/lib/plans";
import { verifyAuth } from "@/lib/auth";

/**
 * POST /api/chat
 * Conversational chat endpoint with streaming support
 *
 * Request body:
 * - messages: Array<{ role: "user" | "assistant", content: string }> - Conversation history
 * - language?: "fr" | "en" - Language for responses (default: "fr")
 * - userApiKey?: string - Optional user-provided OpenAI API key
 * - model?: string - OpenAI model to use
 * - context?: "linkedin" | "general" - Chat context for system prompt
 *
 * Response: Server-Sent Events stream
 * Event types:
 * - start: {} - Signals start of response
 * - chunk: { content: string } - Text chunk
 * - done: { fullContent: string } - Response complete with full content
 * - error: { message: string } - Error occurred
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (auth.error) return auth.error;

    const body = await request.json();
    const {
      userId: bodyUserId,
      messages,
      language = "fr",
      userApiKey,
      model = "gpt-4",
      context = "linkedin",
    } = body;

    // Use authenticated uid, fall back to body userId only in dev bypass mode
    const userId = auth.uid === "__dev_bypass__" ? bodyUserId : auth.uid;

    // Validate required fields
    if (!userId || typeof userId !== "string") {
      return new Response(
        JSON.stringify({ error: "userId is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Messages array is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // ========== QUOTA CHECK (SERVER-SIDE — HOURLY ROLLING WINDOW) ==========
    let userPlan: PlanType | null = null;
    if (isAdminInitialized()) {
      try {
        const quotaCheck = await checkHourlyQuotaAdmin(userId);
        userPlan = quotaCheck.plan as PlanType;

        if (!quotaCheck.canGenerate) {
          const resetMinutes = Math.ceil(quotaCheck.resetInSeconds / 60);
          return new Response(
            JSON.stringify({
              error: "quota_exceeded",
              message: language === "fr"
                ? `Vous avez utilisé vos ${quotaCheck.hourlyLimit} messages cette heure. Réessayez dans ${resetMinutes} min.`
                : `You've used your ${quotaCheck.hourlyLimit} messages this hour. Try again in ${resetMinutes} min.`,
              hourlyLimit: quotaCheck.hourlyLimit,
              usedThisHour: quotaCheck.usedThisHour,
              remaining: 0,
              resetInSeconds: quotaCheck.resetInSeconds,
              plan: quotaCheck.plan,
            }),
            { status: 429, headers: { "Content-Type": "application/json" } }
          );
        }
      } catch (quotaError) {
        console.error("Quota check error:", quotaError);
        if (process.env.NODE_ENV === "production") {
          return new Response(
            JSON.stringify({
              error: "service_unavailable",
              message: language === "fr"
                ? "Service temporairement indisponible. Veuillez réessayer."
                : "Service temporarily unavailable. Please try again.",
            }),
            { status: 503, headers: { "Content-Type": "application/json" } }
          );
        }
      }
    } else if (process.env.NODE_ENV === "production") {
      return new Response(
        JSON.stringify({
          error: "service_unavailable",
          message: language === "fr"
            ? "Service temporairement indisponible. Veuillez réessayer."
            : "Service temporarily unavailable. Please try again.",
        }),
        { status: 503, headers: { "Content-Type": "application/json" } }
      );
    }

    // ========== PLAN GUARD ==========
    if (!userPlan) {
      return new Response(
        JSON.stringify({
          error: "no_active_plan",
          message: language === "fr"
            ? "Vous devez souscrire à un abonnement pour utiliser cette fonctionnalité."
            : "You need an active subscription to use this feature.",
        }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    // ========== PROMPT LENGTH ENFORCEMENT ==========
    const planLimits = getPlanLimits(userPlan);
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.content && lastMessage.content.length > planLimits.maxCharactersPerPrompt) {
      return new Response(
        JSON.stringify({
          error: "prompt_too_long",
          message: language === "fr"
            ? `Votre message dépasse la limite de ${planLimits.maxCharactersPerPrompt} caractères pour votre plan.`
            : `Your message exceeds the ${planLimits.maxCharactersPerPrompt} character limit for your plan.`,
          limit: planLimits.maxCharactersPerPrompt,
          current: lastMessage.content.length,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Plan-based max tokens for response length
    const maxTokens = getMaxTokensForPlan(userPlan);

    // Check for API key
    const hasUserKey = userApiKey && isValidApiKeyFormat(userApiKey);
    const hasGlobalKey = isOpenAIConfigured();

    if (!hasUserKey && !hasGlobalKey) {
      return new Response(
        JSON.stringify({
          error: "No API key configured",
          code: "NO_API_KEY",
          message:
            language === "fr"
              ? "Aucune clé API configurée. Veuillez ajouter votre clé OpenAI dans les paramètres."
              : "No API key configured. Please add your OpenAI key in settings.",
        }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // Create OpenAI service
    const openaiService = hasUserKey
      ? createUserOpenAIService(userApiKey, { model: model as OpenAIModel })
      : createOpenAIService({ model: model as OpenAIModel });

    if (!openaiService) {
      return new Response(
        JSON.stringify({ error: "Failed to initialize OpenAI service" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get system prompt based on context
    const systemPrompt = SYSTEM_PROMPTS.chat[language as "fr" | "en"];

    // Create SSE stream
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

          // Build messages array with system prompt
          const chatMessages = [
            { role: "system" as const, content: systemPrompt },
            ...messages.map((msg: { role: string; content: string }) => ({
              role: msg.role as "user" | "assistant",
              content: msg.content,
            })),
          ];

          // Stream the response
          const streamResponse = await openaiService["client"].chat.completions.create({
            model: openaiService["model"],
            messages: chatMessages,
            temperature: 0.7,
            max_tokens: maxTokens,
            stream: true,
          });

          let fullContent = "";

          for await (const chunk of streamResponse) {
            const content = chunk.choices[0]?.delta?.content || "";
            if (content) {
              fullContent += content;
              sendEvent("chunk", { content });
            }
          }

          // Increment quota after successful response
          if (isAdminInitialized()) {
            try {
              await incrementUserQuotaAdmin(userId);
            } catch (incrementError) {
              console.error("Quota increment error:", incrementError);
            }
          }

          sendEvent("done", { fullContent });
        } catch (error) {
          console.error("Chat error:", error);
          const message =
            error instanceof Error ? error.message : "Chat failed";
          sendEvent("error", { message });
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
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

/**
 * GET /api/chat/status
 * Check if chat is available (API key configured)
 */
export async function GET() {
  const configured = isOpenAIConfigured();

  return new Response(
    JSON.stringify({
      available: configured,
      message: configured
        ? "Chat is ready"
        : "No global API key configured. Users must provide their own key.",
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
}
