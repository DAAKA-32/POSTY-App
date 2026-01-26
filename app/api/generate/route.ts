import { NextRequest } from "next/server";
import { getMockResponses } from "@/lib/mock-responses";
import {
  createOpenAIService,
  createUserOpenAIService,
  isOpenAIConfigured,
  isValidApiKeyFormat,
  OpenAIModel,
  SYSTEM_PROMPTS,
  INSIGHTS_PROMPT,
} from "@/lib/openai";
import {
  checkUserQuotaAdmin,
  incrementUserQuotaAdmin,
} from "@/lib/firestore-admin";
import { isAdminInitialized } from "@/lib/firebase-admin";
import { getPlanFeatures } from "@/lib/plan-features";
import { SubscriptionPlan, PostInsights } from "@/types";

// Streaming configuration for mock responses
const MOCK_CHUNK_SIZE = 3;
const MOCK_CHUNK_DELAY = 20;

/**
 * POST /api/generate
 * Generates LinkedIn post content with streaming support
 *
 * Request body:
 * - userId: string - The authenticated user's ID (REQUIRED for quota)
 * - prompt: string - The user's prompt
 * - language?: "fr" | "en" - Language for generation (default: "fr")
 * - userApiKey?: string - Optional user-provided OpenAI API key
 * - model?: string - OpenAI model to use
 * - userProfile?: object - User context for personalization
 * - selectedStyle?: "storytelling" | "business" - Style choice for PRO users
 *
 * Response: Server-Sent Events stream
 * Event types:
 * - start: { type: "storytelling" | "business" } - Signals start of a response
 * - chunk: { content: string, type: "storytelling" | "business" } - Text chunk
 * - done: { type: "storytelling" | "business" } - Signals end of a response
 * - insights: { insights: PostInsights } - AI-generated insights about the post
 * - complete: {} - All responses finished
 * - quota_exceeded: { message: string, limit: number, used: number } - User exceeded quota
 * - error: { message: string } - Error occurred
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,
      prompt,
      language = "fr",
      userApiKey,
      model = "gpt-4",
      userProfile,
      selectedStyle = "business", // PRO users can choose style
      // NEW: Conversation context for multi-turn support
      conversationId,
      conversationHistory,
    } = body;

    // Validate required fields
    if (!prompt || typeof prompt !== "string") {
      return new Response(JSON.stringify({ error: "Prompt is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!userId || typeof userId !== "string") {
      return new Response(JSON.stringify({ error: "userId is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // ========== QUOTA CHECK (SERVER-SIDE) ==========
    // This prevents users from bypassing quota by directly calling the API
    let quotaCheck = null;
    let userPlan = "free";
    if (isAdminInitialized()) {
      try {
        quotaCheck = await checkUserQuotaAdmin(userId);
        userPlan = quotaCheck.plan;

        if (!quotaCheck.canGenerate) {
          return new Response(
            JSON.stringify({
              error: "quota_exceeded",
              message: language === "fr"
                ? "Vous avez atteint votre limite quotidienne de messages."
                : "You have reached your daily message limit.",
              limit: quotaCheck.dailyLimit,
              used: quotaCheck.usedToday,
              plan: quotaCheck.plan,
            }),
            {
              status: 429, // Too Many Requests
              headers: { "Content-Type": "application/json" },
            }
          );
        }
      } catch (quotaError) {
        console.error("Quota check error:", quotaError);
        // Continue without quota check if Firebase Admin is not configured
        // This allows development without Firebase Admin setup
      }
    }

    // ========== PLAN-BASED FEATURE ENFORCEMENT ==========
    // FREE: business-only (always business, no choice)
    // PRO: single-choice (user can choose storytelling OR business)
    // MAX: dual (generates both storytelling & business)
    const planFeatures = getPlanFeatures(userPlan as SubscriptionPlan);
    const responseMode = planFeatures.responseMode;

    // Determine what type(s) of posts to generate based on plan
    let typesToGenerate: Array<"storytelling" | "business">;
    if (responseMode === "dual") {
      // MAX plan: generate both
      typesToGenerate = ["storytelling", "business"];
    } else if (responseMode === "single-choice") {
      // PRO plan: user chooses
      typesToGenerate = [selectedStyle as "storytelling" | "business"];
    } else {
      // FREE plan: business only
      typesToGenerate = ["business"];
    }

    // Determine if we should use OpenAI or mock responses
    const hasUserKey = userApiKey && isValidApiKeyFormat(userApiKey);
    const hasGlobalKey = isOpenAIConfigured();
    const useOpenAI = hasUserKey || hasGlobalKey;

    // Create the appropriate OpenAI service
    const openaiService = useOpenAI
      ? hasUserKey
        ? createUserOpenAIService(userApiKey, { model: model as OpenAIModel })
        : createOpenAIService({ model: model as OpenAIModel })
      : null;

    // Track if generation was successful (for quota increment)
    let generationSuccessful = false;

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
          let generatedContent = "";

          if (openaiService) {
            // Use real OpenAI with streaming
            // Pass conversation history for contextual follow-up responses
            generatedContent = await generateWithOpenAI(
              openaiService,
              prompt,
              language,
              userProfile,
              sendEvent,
              typesToGenerate,
              conversationHistory as Array<{ role: "user" | "assistant"; content: string }> | undefined
            );
          } else {
            // Fallback to mock responses
            generatedContent = await generateWithMock(prompt, sendEvent, typesToGenerate);
          }

          generationSuccessful = true;

          // ========== GENERATE INSIGHTS (ALL PLANS) ==========
          // Generate AI insights after the post is created
          if (openaiService && generatedContent) {
            try {
              const insights = await generateInsights(
                openaiService,
                generatedContent,
                language
              );
              if (insights) {
                sendEvent("insights", { insights });
              }
            } catch (insightsError) {
              console.error("Insights generation error:", insightsError);
              // Continue without insights - not critical
            }
          }

          // ========== INCREMENT QUOTA (SERVER-SIDE) ==========
          // Only increment if generation was successful
          if (isAdminInitialized()) {
            try {
              await incrementUserQuotaAdmin(userId);

              // Send updated quota info in the complete event
              const updatedQuota = await checkUserQuotaAdmin(userId);
              sendEvent("complete", {
                usedOpenAI: !!openaiService,
                quota: {
                  used: updatedQuota.usedToday,
                  limit: updatedQuota.dailyLimit,
                  remaining: updatedQuota.remaining,
                }
              });
            } catch (incrementError) {
              console.error("Quota increment error:", incrementError);
              // Still send complete event even if quota increment fails
              sendEvent("complete", { usedOpenAI: !!openaiService });
            }
          } else {
            sendEvent("complete", { usedOpenAI: !!openaiService });
          }
        } catch (error) {
          console.error("Generation error:", error);
          const message =
            error instanceof Error ? error.message : "Generation failed";
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
    console.error("Generate API error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

/**
 * Generate posts using OpenAI with streaming
 * @param typesToGenerate - Array of post types to generate based on user's plan
 * @param conversationHistory - Previous messages for context (multi-turn support)
 * @returns The generated content (first post for insights)
 */
async function generateWithOpenAI(
  service: NonNullable<ReturnType<typeof createOpenAIService>>,
  prompt: string,
  language: "fr" | "en",
  userProfile: Record<string, string> | undefined,
  sendEvent: (event: string, data: object) => void,
  typesToGenerate: Array<"storytelling" | "business">,
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>
): Promise<string> {
  let firstPostContent = "";

  // Check if this is a follow-up message (continuing a conversation)
  const isFollowUp = conversationHistory && conversationHistory.length > 0;

  for (const type of typesToGenerate) {
    const title =
      type === "storytelling"
        ? language === "fr"
          ? "Version Storytelling"
          : "Storytelling Version"
        : language === "fr"
          ? "Version Business"
          : "Business Version";

    sendEvent("start", { type, title });

    // Build system prompt - include conversation context mode if follow-up
    let systemPrompt = buildSystemPrompt(type, language, userProfile);

    if (isFollowUp) {
      // Add context for follow-up conversations
      const followUpContext = language === "fr"
        ? `\n\nIMPORTANT: Tu continues une conversation existante. L'utilisateur affine ou précise sa demande. Adapte ta réponse en tenant compte du contexte précédent. Ne repars pas de zéro - construis sur ce qui a déjà été dit. Réponds de manière naturelle comme dans une vraie discussion.`
        : `\n\nIMPORTANT: You are continuing an existing conversation. The user is refining or clarifying their request. Adapt your response considering the previous context. Don't start from scratch - build on what was already discussed. Respond naturally as in a real discussion.`;
      systemPrompt += followUpContext;
    }

    // Build messages array
    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: systemPrompt },
    ];

    // Add conversation history for context (if following up)
    if (isFollowUp && conversationHistory) {
      // Include previous messages for context (limit to last 6 for token efficiency)
      const recentHistory = conversationHistory.slice(-6);
      for (const msg of recentHistory) {
        messages.push({
          role: msg.role === "user" ? "user" : "assistant",
          content: msg.content,
        });
      }
    }

    // Add current prompt
    const userContent = isFollowUp
      ? prompt // For follow-ups, just send the refinement
      : language === "fr"
        ? `Crée un post LinkedIn sur le sujet suivant: ${prompt}`
        : `Create a LinkedIn post about the following topic: ${prompt}`;

    messages.push({ role: "user", content: userContent });

    const stream = await service["client"].chat.completions.create({
      model: service["model"],
      messages,
      temperature: type === "storytelling" ? 0.8 : 0.7,
      max_tokens: 1000,
      stream: true,
    });

    let fullContent = "";
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || "";
      if (content) {
        fullContent += content;
        sendEvent("chunk", { content, type });
      }
    }

    // Capture first post for insights generation
    if (!firstPostContent) {
      firstPostContent = fullContent;
    }

    sendEvent("done", { type });

    // Small pause between responses
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  return firstPostContent;
}

/**
 * Generate posts using mock responses (fallback)
 * @param typesToGenerate - Array of post types to generate based on user's plan
 * @returns The generated content (first post for insights)
 */
async function generateWithMock(
  prompt: string,
  sendEvent: (event: string, data: object) => void,
  typesToGenerate: Array<"storytelling" | "business">
): Promise<string> {
  const allResponses = getMockResponses(prompt);
  let firstPostContent = "";

  // Filter responses based on types to generate
  const responses = allResponses.filter((r) => typesToGenerate.includes(r.type as "storytelling" | "business"));

  for (const response of responses) {
    sendEvent("start", { type: response.type, title: response.title });

    const content = response.content;
    for (let i = 0; i < content.length; i += MOCK_CHUNK_SIZE) {
      const chunk = content.slice(i, i + MOCK_CHUNK_SIZE);
      sendEvent("chunk", { content: chunk, type: response.type });
      await new Promise((resolve) => setTimeout(resolve, MOCK_CHUNK_DELAY));
    }

    // Capture first post for insights
    if (!firstPostContent) {
      firstPostContent = response.content;
    }

    sendEvent("done", { type: response.type });
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  return firstPostContent;
}

/**
 * Sanitize user input to prevent prompt injection attacks
 * Removes dangerous patterns that could hijack the LLM prompt
 */
function sanitizeUserInput(input: string | undefined): string {
  if (!input) return "";

  // Remove potential prompt injection patterns
  let sanitized = input
    // Remove instruction-like patterns
    .replace(/ignore\s+(all\s+)?(previous|above|prior)\s+(instructions?|prompts?)/gi, "")
    .replace(/disregard\s+(all\s+)?(previous|above|prior)\s+(instructions?|prompts?)/gi, "")
    .replace(/forget\s+(all\s+)?(previous|above|prior)\s+(instructions?|prompts?)/gi, "")
    // Remove system prompt requests
    .replace(/show\s+me\s+(your\s+)?system\s+prompt/gi, "")
    .replace(/print\s+(your\s+)?system\s+prompt/gi, "")
    .replace(/reveal\s+(your\s+)?instructions/gi, "")
    // Remove role-playing attacks
    .replace(/you\s+are\s+(now\s+)?a/gi, "")
    .replace(/act\s+as\s+(if\s+you\s+(are|were)\s+)?/gi, "")
    .replace(/pretend\s+(to\s+be|you('re)?\s+(are|were))/gi, "")
    // Remove excessive newlines that could break formatting
    .replace(/\n{3,}/g, "\n\n")
    // Limit length to prevent context overflow
    .substring(0, 200)
    .trim();

  return sanitized;
}

/**
 * Build system prompt with user context
 * Enhanced with targetAudience and communicationTone for Pro/Max users
 * SECURITY: All user input is sanitized to prevent prompt injection
 */
function buildSystemPrompt(
  type: "storytelling" | "business",
  language: "fr" | "en",
  userProfile?: Record<string, string>
): string {
  let prompt = SYSTEM_PROMPTS[type][language];

  if (userProfile) {
    const contextLabels = {
      fr: {
        context: "Contexte de l'utilisateur",
        sector: "Secteur",
        role: "Rôle",
        style: "Style préféré",
        objective: "Objectif",
        targetAudience: "Audience ciblée",
        communicationTone: "Ton de communication",
        notSpecified: "Non spécifié",
        important: "IMPORTANT: Adapte le contenu spécifiquement pour cette audience et utilise ce ton de communication.",
      },
      en: {
        context: "User context",
        sector: "Sector",
        role: "Role",
        style: "Preferred style",
        objective: "Objective",
        targetAudience: "Target audience",
        communicationTone: "Communication tone",
        notSpecified: "Not specified",
        important: "IMPORTANT: Adapt the content specifically for this audience and use this communication tone.",
      },
    };

    const labels = contextLabels[language];

    // SECURITY: Sanitize all user input before injection into prompt
    const sector = sanitizeUserInput(userProfile.sector) || labels.notSpecified;
    const role = sanitizeUserInput(userProfile.role) || labels.notSpecified;
    const linkedinStyle = sanitizeUserInput(userProfile.linkedinStyle) || labels.notSpecified;
    const objective = sanitizeUserInput(userProfile.objective) || labels.notSpecified;
    const targetAudience = sanitizeUserInput(userProfile.targetAudience) || labels.notSpecified;
    const communicationTone = sanitizeUserInput(userProfile.communicationTone) || labels.notSpecified;

    // Build base context with sanitized values
    prompt += `\n\n${labels.context}:
- ${labels.sector}: ${sector}
- ${labels.role}: ${role}
- ${labels.style}: ${linkedinStyle}
- ${labels.objective}: ${objective}`;

    // Add enhanced context for Pro/Max users (if targetAudience or communicationTone is set)
    const hasEnhancedProfile = userProfile.targetAudience || userProfile.communicationTone;
    if (hasEnhancedProfile) {
      prompt += `\n- ${labels.targetAudience}: ${targetAudience}`;
      prompt += `\n- ${labels.communicationTone}: ${communicationTone}`;
      prompt += `\n\n${labels.important}`;
    }
  }

  return prompt;
}

/**
 * Generate AI insights for a post
 * Uses GPT-3.5-turbo for cost efficiency (insights are secondary content)
 */
async function generateInsights(
  service: NonNullable<ReturnType<typeof createOpenAIService>>,
  postContent: string,
  language: "fr" | "en"
): Promise<PostInsights | null> {
  try {
    const response = await service["client"].chat.completions.create({
      model: "gpt-3.5-turbo", // Use faster/cheaper model for insights
      messages: [
        { role: "system", content: INSIGHTS_PROMPT[language] },
        { role: "user", content: postContent },
      ],
      temperature: 0.5,
      max_tokens: 500,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return null;

    // Parse JSON response
    try {
      const insights = JSON.parse(content) as PostInsights;

      // Validate required fields
      if (
        insights.whyEffective &&
        insights.bestTimeToPost &&
        insights.expectedEngagement &&
        insights.keyTakeaway
      ) {
        return insights;
      }
    } catch {
      console.error("Failed to parse insights JSON:", content);
    }

    return null;
  } catch (error) {
    console.error("Insights generation failed:", error);
    return null;
  }
}
