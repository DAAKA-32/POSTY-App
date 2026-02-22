import { NextRequest } from "next/server";
import {
  createOpenAIService,
  isOpenAIConfigured,
  ANALYSIS_PROMPT,
} from "@/lib/openai";
import { checkUserQuotaAdmin } from "@/lib/firestore-admin";
import { isAdminInitialized } from "@/lib/firebase-admin";
import { canAnalyzePosts } from "@/lib/plan-features";
import { SubscriptionPlan, PostAnalysis } from "@/types";
import { verifyAuth } from "@/lib/auth";

/**
 * POST /api/analyze
 * Analyzes a LinkedIn post and returns detailed feedback
 * Available for PRO and MAX plans only
 *
 * Request body:
 * - userId: string - The authenticated user's ID
 * - postContent: string - The post content to analyze
 * - language?: "fr" | "en" - Language for analysis (default: "fr")
 *
 * Response:
 * - analysis: PostAnalysis object with scores and feedback
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (auth.error) return auth.error;

    const body = await request.json();
    const { userId: bodyUserId, postContent, language = "fr" } = body;

    // Use authenticated uid, fall back to body userId only in dev bypass mode
    const userId = auth.uid === "__dev_bypass__" ? bodyUserId : auth.uid;

    // Validate required fields
    if (!postContent || typeof postContent !== "string") {
      return new Response(
        JSON.stringify({ error: "Post content is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!userId || typeof userId !== "string") {
      return new Response(
        JSON.stringify({ error: "userId is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // ========== PLAN CHECK ==========
    // Only PRO and MAX users can analyze posts
    let userPlan: SubscriptionPlan | null = null;
    if (isAdminInitialized()) {
      try {
        const quotaCheck = await checkUserQuotaAdmin(userId, auth.email);
        userPlan = quotaCheck.plan as SubscriptionPlan;
      } catch (error) {
        console.error("Plan check error:", error);
      }
    }

    if (!userPlan) {
      return new Response(
        JSON.stringify({
          error: "no_active_plan",
          message:
            language === "fr"
              ? "Vous devez souscrire à un abonnement pour utiliser cette fonctionnalité."
              : "You need an active subscription to use this feature.",
        }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!canAnalyzePosts(userPlan)) {
      return new Response(
        JSON.stringify({
          error: "feature_locked",
          message:
            language === "fr"
              ? "L'analyse de post est disponible avec le plan Pro ou Max."
              : "Post analysis is available with Pro or Max plan.",
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

    // Generate analysis
    const lang = language === "en" ? "en" : "fr";
    const response = await openaiService["client"].chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: ANALYSIS_PROMPT[lang] },
        { role: "user", content: postContent },
      ],
      temperature: 0.5,
      max_tokens: 800,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return new Response(
        JSON.stringify({ error: "No analysis generated" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Parse JSON response
    try {
      const analysis = JSON.parse(content) as PostAnalysis;

      // Validate required fields
      if (
        typeof analysis.hookScore === "number" &&
        typeof analysis.structureScore === "number" &&
        typeof analysis.ctaScore === "number" &&
        typeof analysis.overallScore === "number" &&
        Array.isArray(analysis.improvements)
      ) {
        return new Response(
          JSON.stringify({ analysis }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      throw new Error("Invalid analysis structure");
    } catch (parseError) {
      console.error("Failed to parse analysis JSON:", content);
      return new Response(
        JSON.stringify({ error: "Failed to parse analysis" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("Analyze API error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
