import { NextRequest } from "next/server";
import {
  createOpenAIService,
  isOpenAIConfigured,
  IMPROVE_PROMPT,
  INSIGHTS_PROMPT,
} from "@/lib/openai";
import {
  checkUserQuotaAdmin,
  incrementUserQuotaAdmin,
} from "@/lib/firestore-admin";
import { isAdminInitialized } from "@/lib/firebase-admin";
import { canImprovePost } from "@/lib/plan-features";
import { SubscriptionPlan, PostInsights } from "@/types";

/**
 * POST /api/improve
 * Improves an existing post with AI suggestions
 * Available for PRO and MAX plans only
 *
 * Request body:
 * - userId: string - The authenticated user's ID
 * - existingPost: string - The original post to improve
 * - instructions?: string - Optional specific improvement instructions
 * - language?: "fr" | "en" - Language for improvement (default: "fr")
 *
 * Response: Server-Sent Events stream
 * Event types:
 * - start: { type: "improved" } - Signals start of improved post
 * - chunk: { content: string, type: "improved" } - Text chunk
 * - done: { type: "improved" } - Signals end of improved post
 * - insights: { insights: PostInsights } - AI-generated insights
 * - complete: {} - All done
 * - error: { message: string } - Error occurred
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, existingPost, instructions = "", language = "fr" } = body;

    // Validate required fields
    if (!existingPost || typeof existingPost !== "string") {
      return new Response(
        JSON.stringify({ error: "Existing post is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!userId || typeof userId !== "string") {
      return new Response(
        JSON.stringify({ error: "userId is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // ========== PLAN & QUOTA CHECK ==========
    let userPlan: SubscriptionPlan = "free";
    let canGenerate = true;

    if (isAdminInitialized()) {
      try {
        const quotaCheck = await checkUserQuotaAdmin(userId);
        userPlan = quotaCheck.plan as SubscriptionPlan;
        canGenerate = quotaCheck.canGenerate;

        if (!canGenerate) {
          return new Response(
            JSON.stringify({
              error: "quota_exceeded",
              message:
                language === "fr"
                  ? "Vous avez atteint votre limite quotidienne de messages."
                  : "You have reached your daily message limit.",
            }),
            { status: 429, headers: { "Content-Type": "application/json" } }
          );
        }
      } catch (error) {
        console.error("Plan check error:", error);
      }
    }

    // Only PRO and MAX users can improve posts
    if (!canImprovePost(userPlan)) {
      return new Response(
        JSON.stringify({
          error: "feature_locked",
          message:
            language === "fr"
              ? "L'amélioration de post est disponible avec le plan Pro ou Max."
              : "Post improvement is available with Pro or Max plan.",
          requiredPlan: "pro",
        }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    // Check OpenAI availability
    if (!isOpenAIConfigured()) {
      return new Response(
        JSON.stringify({ error: "OpenAI not configured" }),
        { status: 503, headers: { "Content-Type": "application/json" } }
      );
    }

    const openaiService = createOpenAIService();
    if (!openaiService) {
      return new Response(
        JSON.stringify({ error: "Failed to create OpenAI service" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Build the improvement prompt
    const lang = language === "en" ? "en" : "fr";
    const systemPrompt = IMPROVE_PROMPT[lang];
    let userMessage = existingPost;
    if (instructions) {
      const instructionLabel =
        lang === "fr" ? "Instructions spécifiques" : "Specific instructions";
      userMessage = `${existingPost}\n\n${instructionLabel}: ${instructions}`;
    }

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
          sendEvent("start", {
            type: "improved",
            title: language === "fr" ? "Version Améliorée" : "Improved Version",
          });

          // Generate improved post with streaming
          const openaiStream = await openaiService["client"].chat.completions.create({
            model: "gpt-4",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userMessage },
            ],
            temperature: 0.7,
            max_tokens: 1200,
            stream: true,
          });

          let fullContent = "";
          for await (const chunk of openaiStream) {
            const content = chunk.choices[0]?.delta?.content || "";
            if (content) {
              fullContent += content;
              sendEvent("chunk", { content, type: "improved" });
            }
          }

          sendEvent("done", { type: "improved" });

          // Generate insights for the improved post
          try {
            const insightsResponse = await openaiService["client"].chat.completions.create({
              model: "gpt-3.5-turbo",
              messages: [
                { role: "system", content: INSIGHTS_PROMPT[lang] },
                { role: "user", content: fullContent },
              ],
              temperature: 0.5,
              max_tokens: 500,
            });

            const insightsContent = insightsResponse.choices[0]?.message?.content;
            if (insightsContent) {
              try {
                const insights = JSON.parse(insightsContent) as PostInsights;
                if (insights.whyEffective && insights.bestTimeToPost) {
                  sendEvent("insights", { insights });
                }
              } catch {
                console.error("Failed to parse insights");
              }
            }
          } catch (insightsError) {
            console.error("Insights generation error:", insightsError);
          }

          // Increment quota
          if (isAdminInitialized()) {
            try {
              await incrementUserQuotaAdmin(userId);
            } catch (incrementError) {
              console.error("Quota increment error:", incrementError);
            }
          }

          sendEvent("complete", {});
        } catch (error) {
          console.error("Improvement generation error:", error);
          const message =
            error instanceof Error ? error.message : "Improvement failed";
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
    console.error("Improve API error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
