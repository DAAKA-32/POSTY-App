import { NextRequest } from "next/server";
import { createOpenAIService, isOpenAIConfigured } from "@/lib/openai";
import { checkUserQuotaAdmin } from "@/lib/db/firestore-admin";
import { isAdminInitialized } from "@/lib/db/firebase-admin";
import { SubscriptionPlan } from "@/types";
import { verifyAuth } from "@/lib/auth";

/**
 * POST /api/analytics/ai-insights
 * Analyzes user's post history and generates actionable coaching insights.
 *
 * Request body:
 * - posts: Array<{ content: string; likes?: number; comments?: number; shares?: number }>
 * - language?: string
 * - userProfile?: { sector?: string; objective?: string; linkedinStyle?: string }
 *
 * Response:
 * - insights: { summary, strengths, improvements, nextSteps, bestPerforming }
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (auth.error) return auth.error;

    const body = await request.json();
    const { posts, language = "en", userProfile } = body;

    const userId = auth.uid === "__dev_bypass__" ? body.userId : auth.uid;

    if (!posts || !Array.isArray(posts) || posts.length === 0) {
      return new Response(
        JSON.stringify({ error: "Posts array is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Plan check
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
        JSON.stringify({ error: "no_active_plan" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    // Build AI prompt
    if (!isOpenAIConfigured()) {
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const service = createOpenAIService();
    if (!service) {
      return new Response(
        JSON.stringify({ error: "Failed to create AI service" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Prepare post summaries (limit to last 10 posts, truncate content)
    const postSummaries = posts.slice(0, 10).map((p: {
      content: string;
      likes?: number;
      comments?: number;
      shares?: number;
    }, i: number) => {
      const content = p.content?.substring(0, 300) || "";
      const engagement = [
        p.likes ? `${p.likes} likes` : null,
        p.comments ? `${p.comments} comments` : null,
        p.shares ? `${p.shares} shares` : null,
      ].filter(Boolean).join(", ");
      return `Post ${i + 1}: "${content}..."${engagement ? ` [${engagement}]` : ""}`;
    }).join("\n\n");

    const profileContext = userProfile
      ? `\nUser profile: sector=${userProfile.sector || "unknown"}, objective=${userProfile.objective || "unknown"}, style=${userProfile.linkedinStyle || "unknown"}`
      : "";

    const systemPrompt = language === "fr"
      ? `Tu es un coach LinkedIn expert. Analyse les posts de cet utilisateur et fournis des insights actionnables.${profileContext}

Réponds UNIQUEMENT avec un objet JSON valide (sans markdown, sans backticks):
{
  "summary": "Résumé en 1-2 phrases de la stratégie de contenu observée",
  "strengths": ["Point fort 1", "Point fort 2", "Point fort 3"],
  "improvements": ["Amélioration 1 avec explication concrète", "Amélioration 2 avec explication concrète", "Amélioration 3 avec explication concrète"],
  "nextSteps": ["Action concrète 1 pour le prochain post", "Action concrète 2"],
  "bestPerformingPattern": "Description du type de contenu qui performe le mieux",
  "contentScore": 7
}
Le contentScore est de 1 à 10. Sois constructif et encourageant mais honnête.`
      : `You are an expert LinkedIn coach. Analyze this user's posts and provide actionable insights.${profileContext}

Respond ONLY with a valid JSON object (no markdown, no backticks):
{
  "summary": "1-2 sentence summary of observed content strategy",
  "strengths": ["Strength 1", "Strength 2", "Strength 3"],
  "improvements": ["Improvement 1 with concrete explanation", "Improvement 2 with concrete explanation", "Improvement 3 with concrete explanation"],
  "nextSteps": ["Concrete action 1 for next post", "Concrete action 2"],
  "bestPerformingPattern": "Description of best-performing content type",
  "contentScore": 7
}
contentScore is 1-10. Be constructive and encouraging but honest.`;

    const response = await service["client"].chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Here are the user's recent LinkedIn posts:\n\n${postSummaries}` },
      ],
      temperature: 0.5,
      max_tokens: 800,
    });

    const result = response.choices[0]?.message?.content?.trim();
    if (!result) {
      return new Response(
        JSON.stringify({ error: "No response from AI" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Parse JSON response
    try {
      const insights = JSON.parse(result);
      return new Response(
        JSON.stringify({ insights }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } catch {
      // Try to extract JSON from response
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const insights = JSON.parse(jsonMatch[0]);
        return new Response(
          JSON.stringify({ insights }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ error: "Failed to parse AI response" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("AI analytics error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
