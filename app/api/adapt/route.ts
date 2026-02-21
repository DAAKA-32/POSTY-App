import { NextRequest } from "next/server";
import {
  createOpenAIService,
  isOpenAIConfigured,
  PLATFORM_PROMPTS,
} from "@/lib/openai";
import { checkUserQuotaAdmin } from "@/lib/firestore-admin";
import { isAdminInitialized } from "@/lib/firebase-admin";
import { canAdaptToMultiPlatform } from "@/lib/plan-features";
import { SubscriptionPlan, AdaptationPlatform, PlatformAdaptation } from "@/types";
import { verifyAuth } from "@/lib/auth";

/**
 * POST /api/adapt
 * Adapts a LinkedIn post to other social media platforms
 * Available for MAX plan only
 *
 * Request body:
 * - userId: string - The authenticated user's ID
 * - postContent: string - The LinkedIn post content to adapt
 * - platform: "threads" | "twitter" | "facebook" - Target platform
 * - language?: "fr" | "en" - Language for adaptation (default: "fr")
 *
 * Response:
 * - adaptation: PlatformAdaptation object with adapted content
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (auth.error) return auth.error;

    const body = await request.json();
    const { userId: bodyUserId, postContent, platform, language = "fr" } = body;

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

    const validPlatforms: AdaptationPlatform[] = ["threads", "twitter", "facebook"];
    if (!platform || !validPlatforms.includes(platform)) {
      return new Response(
        JSON.stringify({
          error: "Invalid platform. Must be: threads, twitter, or facebook",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // ========== PLAN CHECK ==========
    // Only MAX users can adapt to other platforms
    let userPlan: SubscriptionPlan | null = null;
    if (isAdminInitialized()) {
      try {
        const quotaCheck = await checkUserQuotaAdmin(userId);
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

    if (!canAdaptToMultiPlatform(userPlan)) {
      return new Response(
        JSON.stringify({
          error: "feature_locked",
          message:
            language === "fr"
              ? "L'adaptation multi-plateforme est disponible avec le plan Max."
              : "Multi-platform adaptation is available with Max plan.",
          requiredPlan: "max",
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

    // Get the platform-specific prompt
    const lang = language === "en" ? "en" : "fr";
    const platformPrompt = PLATFORM_PROMPTS[platform as AdaptationPlatform][lang];

    // Generate adaptation
    const response = await openaiService["client"].chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: platformPrompt },
        { role: "user", content: postContent },
      ],
      temperature: 0.6,
      max_tokens: 600,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return new Response(
        JSON.stringify({ error: "No adaptation generated" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Parse JSON response
    try {
      const parsed = JSON.parse(content);

      const adaptation: PlatformAdaptation = {
        platform: platform as AdaptationPlatform,
        content: parsed.content || "",
        characterCount: parsed.characterCount || parsed.content?.length || 0,
        hashtags: parsed.hashtags || [],
        notes: parsed.notes || "",
      };

      // Validate content exists
      if (!adaptation.content) {
        throw new Error("No content in adaptation");
      }

      return new Response(
        JSON.stringify({ adaptation }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } catch (parseError) {
      console.error("Failed to parse adaptation JSON:", content);
      return new Response(
        JSON.stringify({ error: "Failed to parse adaptation" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("Adapt API error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
