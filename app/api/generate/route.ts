import { NextRequest } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { getMockResponses } from "@/lib/mock-responses";
import {
  createOpenAIService,
  createUserOpenAIService,
  isOpenAIConfigured,
  isValidApiKeyFormat,
  OpenAIModel,
  INSIGHTS_PROMPT,
  CONVERSATIONAL_PROMPT,
  INTENT_CLASSIFICATION_PROMPT,
} from "@/lib/openai";
import { buildOptimizedPrompt, getGenerationTemperature, synthesizeProfile, estimateTokens, ProfileFields, PlanTier } from "@/lib/prompt-builder";
import {
  checkHourlyQuotaAdmin,
  checkUserQuotaAdmin,
  incrementUserQuotaAdmin,
  getUserProfileAdmin,
  getDualModeUsageThisWeek,
  incrementDualModeUsageAdmin,
} from "@/lib/firestore-admin";
import { isAdminInitialized } from "@/lib/firebase-admin";
import { getPlanFeatures } from "@/lib/plan-features";
import { planHasFeature, PlanType, getPlanLimits, getMaxTokensForPlan } from "@/lib/plans";
import { SubscriptionPlan, PostInsights } from "@/types";
import { detectUrl, removeUrlFromPrompt, extractUrlContent, ExtractedUrlContent } from "@/lib/url-extract";

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
    // Verify Firebase auth token
    const auth = await verifyAuth(request);
    if (auth.error) return auth.error;

    const body = await request.json();
    const {
      userId: bodyUserId,
      prompt,
      language = "fr",
      userApiKey,
      model = "gpt-4",
      userProfile,
      selectedStyle = "business", // PRO users can choose style
      requestDualMode = false, // Client requests dual mode (Pro: limited, Max: unlimited)
      // NEW: Conversation context for multi-turn support
      conversationId,
      conversationHistory,
      // File attachment (Max plan only)
      fileAttachment,
    } = body;

    // Use authenticated uid (fallback to body userId in dev bypass mode)
    const userId = auth.uid === "__dev_bypass__" ? bodyUserId : auth.uid;

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

    // ========== QUOTA CHECK (SERVER-SIDE — HOURLY ROLLING WINDOW) ==========
    // This prevents users from bypassing quota by directly calling the API
    let quotaCheck = null;
    let userPlan: PlanType | null = null;
    if (isAdminInitialized()) {
      try {
        quotaCheck = await checkHourlyQuotaAdmin(userId, auth.email);
        userPlan = quotaCheck.plan;

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
            {
              status: 429, // Too Many Requests
              headers: { "Content-Type": "application/json" },
            }
          );
        }

        // ========== DAILY QUOTA CHECK ==========
        const dailyQuota = await checkUserQuotaAdmin(userId, auth.email);
        if (!dailyQuota.canGenerate) {
          const isMaxPlan = dailyQuota.plan === "max";
          return new Response(
            JSON.stringify({
              error: "daily_quota_exceeded",
              message: language === "fr"
                ? isMaxPlan
                  ? "Limite temporaire atteinte. Veuillez réessayer dans quelques instants."
                  : "Quota quotidien atteint. Revenez demain ou passez au plan Max pour une création illimitée."
                : isMaxPlan
                  ? "Temporary limit reached. Please try again shortly."
                  : `You've reached your daily limit of ${dailyQuota.dailyLimit} messages. Come back tomorrow or upgrade to Max.`,
              dailyLimit: dailyQuota.dailyLimit,
              usedToday: dailyQuota.usedToday,
              remaining: 0,
              plan: dailyQuota.plan,
            }),
            { status: 429, headers: { "Content-Type": "application/json" } }
          );
        }
      } catch (quotaError) {
        console.error("Quota check error:", quotaError);
        // In production, fail if quota cannot be verified (prevents unlimited access)
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
      // In production, Firebase Admin must be initialized to enforce quotas
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
    // Users without a valid plan cannot use the API
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
    if (prompt.length > planLimits.maxCharactersPerPrompt) {
      return new Response(
        JSON.stringify({
          error: "prompt_too_long",
          message: language === "fr"
            ? `Votre message dépasse la limite de ${planLimits.maxCharactersPerPrompt} caractères pour votre plan.`
            : `Your message exceeds the ${planLimits.maxCharactersPerPrompt} character limit for your plan.`,
          limit: planLimits.maxCharactersPerPrompt,
          current: prompt.length,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // ========== FILE ATTACHMENT VALIDATION (MAX PLAN ONLY) ==========
    let processedFileContent: {
      type: "image";
      mimeType: string;
      base64: string;
    } | {
      type: "pdf";
      extractedText: string;
    } | null = null;

    if (fileAttachment) {
      // Plan check: Only Max plan can use file attachments
      if (userPlan !== "max") {
        return new Response(
          JSON.stringify({
            error: "plan_required",
            message: language === "fr"
              ? "Les fichiers joints sont réservés au plan Max."
              : "File attachments require the Max plan.",
            requiredPlan: "max",
          }),
          { status: 403, headers: { "Content-Type": "application/json" } }
        );
      }

      // Validate file type
      const ALLOWED_TYPES = [
        "image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf",
      ];
      if (!fileAttachment.type || !ALLOWED_TYPES.includes(fileAttachment.type)) {
        return new Response(
          JSON.stringify({ error: "invalid_file_type", message: "Type de fichier non supporté." }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // Validate file size (5MB)
      if (!fileAttachment.size || fileAttachment.size > 5 * 1024 * 1024) {
        return new Response(
          JSON.stringify({ error: "file_too_large", message: "Fichier trop volumineux (max 5 Mo)." }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // Validate base64 content
      if (!fileAttachment.base64 || typeof fileAttachment.base64 !== "string") {
        return new Response(
          JSON.stringify({ error: "invalid_file", message: "Contenu du fichier invalide." }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // Process based on type
      if (fileAttachment.type === "application/pdf") {
        try {
          const { PDFParse } = await import("pdf-parse");
          const pdfBuffer = Buffer.from(fileAttachment.base64, "base64");
          const parser = new PDFParse({ data: pdfBuffer, verbosity: 0 });
          const result = await parser.getText();
          const extractedText = result.pages.map((p: { text: string }) => p.text).join("\n").trim().substring(0, 8000);

          if (!extractedText) {
            return new Response(
              JSON.stringify({ error: "empty_pdf", message: "Le PDF ne contient pas de texte extractible." }),
              { status: 400, headers: { "Content-Type": "application/json" } }
            );
          }

          processedFileContent = { type: "pdf", extractedText };
        } catch (pdfError) {
          console.error("PDF parsing error:", pdfError);
          return new Response(
            JSON.stringify({ error: "pdf_parse_error", message: "Impossible de lire le contenu du PDF." }),
            { status: 400, headers: { "Content-Type": "application/json" } }
          );
        }
      } else {
        // Image — pass for GPT-4o Vision
        processedFileContent = {
          type: "image",
          mimeType: fileAttachment.type,
          base64: fileAttachment.base64,
        };
      }
    }

    // ========== URL CONTENT EXTRACTION (PRO & MAX PLANS) ==========
    let extractedUrlContent: ExtractedUrlContent | null = null;
    let cleanedPrompt = prompt;

    const detectedUrl = detectUrl(prompt);
    if (detectedUrl) {
      // Plan check: Only Pro and Max plans can use URL analysis
      if (!planHasFeature(userPlan, "hasUrlAnalysis")) {
        return new Response(
          JSON.stringify({
            error: "plan_required",
            message: language === "fr"
              ? "L'analyse de contenu d'URL est réservée aux plans Pro et Max."
              : "URL content analysis requires a Pro or Max plan.",
            requiredPlan: "pro",
          }),
          { status: 403, headers: { "Content-Type": "application/json" } }
        );
      }

      try {
        const result = await extractUrlContent(detectedUrl);

        if (result.success) {
          extractedUrlContent = result.data;
          cleanedPrompt = removeUrlFromPrompt(prompt, detectedUrl);

          // If prompt is empty after removing URL, use generic topic
          if (!cleanedPrompt.trim()) {
            cleanedPrompt = language === "fr"
              ? "le contenu de cette page"
              : "the content of this page";
          }
        } else {
          // URL extraction failed — log and continue without URL content
          console.warn("URL extraction failed:", result.error.message, detectedUrl);
        }
      } catch (urlError) {
        console.error("URL extraction error:", urlError);
        // Continue without URL content — non-blocking
      }
    }

    // Plan-based max tokens for response length
    const maxTokens = getMaxTokensForPlan(userPlan);

    // ========== SERVER-SIDE PROFILE LOADING + PLAN GATING ==========
    // Load profile from Firestore (server-side, ignores client-sent userProfile)
    // Filter fields based on user's plan permissions
    let serverUserProfile: ProfileFields | undefined;
    if (isAdminInitialized()) {
      try {
        const userProfileData = await getUserProfileAdmin(userId);
        if (userProfileData?.profile) {
          const profile = userProfileData.profile;
          const plan = userProfileData.plan as PlanType;

          if (planHasFeature(plan, "hasPersonalizedResponses")) {
            // Pro+ : base personalization fields
            serverUserProfile = {
              ...(profile.profileType && { profileType: profile.profileType }),
              ...(profile.sector && { sector: profile.sector }),
              ...(profile.role && { role: profile.role }),
              ...(profile.objective && { objective: profile.objective }),
              ...(profile.linkedinStyle && { linkedinStyle: profile.linkedinStyle }),
            };

            if (planHasFeature(plan, "hasAudienceTargeting")) {
              // Max : enhanced personalization fields
              serverUserProfile = {
                ...serverUserProfile,
                ...(profile.targetAudience && { targetAudience: profile.targetAudience }),
                ...(profile.communicationTone && { communicationTone: profile.communicationTone }),
                ...(profile.publishingFrequency && { publishingFrequency: profile.publishingFrequency }),
              };
            }
          }
          // No personalization if plan doesn't support it
        }
      } catch (profileError) {
        console.error("Profile loading error:", profileError);
        // Continue without profile - generation still works
      }
    }

    // ========== PLAN-BASED FEATURE ENFORCEMENT ==========
    // PRO: single-choice by default, limited dual mode (3/week) when requested
    // MAX: dual (generates both storytelling & business, unlimited)
    const planFeatures = getPlanFeatures(userPlan as SubscriptionPlan);
    const responseMode = planFeatures.responseMode;

    // Determine what type(s) of posts to generate based on plan
    let typesToGenerate: Array<"storytelling" | "business">;
    let isDualGeneration = false;

    if (responseMode === "dual") {
      // MAX plan: default to both, but respect user's explicit single-style choice
      if (requestDualMode === false) {
        // User explicitly chose single mode via MaxModeSelector
        typesToGenerate = [selectedStyle as "storytelling" | "business"];
        isDualGeneration = false;
      } else {
        // Default: generate both (unlimited)
        typesToGenerate = ["storytelling", "business"];
        isDualGeneration = true;
      }
    } else if (responseMode === "single-choice" && requestDualMode && planLimits.dualResponsesPerWeek !== 0) {
      // PRO plan: user explicitly requested dual mode — check weekly limit
      const dualLimit = planLimits.dualResponsesPerWeek;
      if (dualLimit === -1) {
        // Unlimited dual mode
        typesToGenerate = ["storytelling", "business"];
        isDualGeneration = true;
      } else {
        // Check weekly usage
        let dualUsedThisWeek = 0;
        try {
          dualUsedThisWeek = await getDualModeUsageThisWeek(userId);
        } catch (e) {
          console.error("Error checking dual mode usage:", e);
        }

        if (dualUsedThisWeek < dualLimit) {
          typesToGenerate = ["storytelling", "business"];
          isDualGeneration = true;
        } else {
          // Limit reached, fall back to single-choice
          typesToGenerate = [selectedStyle as "storytelling" | "business"];
        }
      }
    } else {
      // PRO plan (or default): user chooses
      typesToGenerate = [selectedStyle as "storytelling" | "business"];
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
          let isConversational = false;

          if (openaiService) {
            // ========== INTENT CLASSIFICATION ==========
            // Force PRODUCTION intent when URL content was extracted (user clearly wants a post from a link)
            const intent = extractedUrlContent
              ? ("PRODUCTION" as const)
              : await classifyIntent(
                  openaiService,
                  cleanedPrompt,
                  language as "fr" | "en"
                );

            if (intent === "SOCIAL" || intent === "EXPLORATORY") {
              // Conversational response - no post generation
              isConversational = true;
              generatedContent = await generateConversational(
                openaiService,
                cleanedPrompt,
                language as "fr" | "en",
                sendEvent,
                conversationHistory as Array<{ role: "user" | "assistant"; content: string }> | undefined
              );
            } else {
              // Production intent - generate LinkedIn post
              generatedContent = await generateWithOpenAI(
                openaiService,
                cleanedPrompt,
                language,
                serverUserProfile,
                sendEvent,
                typesToGenerate,
                maxTokens,
                (userPlan as PlanTier) ?? null,
                conversationHistory as Array<{ role: "user" | "assistant"; content: string }> | undefined,
                processedFileContent,
                extractedUrlContent
              );
            }
          } else {
            // Fallback to mock responses (always production mode)
            generatedContent = await generateWithMock(prompt, sendEvent, typesToGenerate);
          }

          generationSuccessful = true;

          // ========== GENERATE INSIGHTS (PRODUCTION ONLY) ==========
          // Only generate insights for actual LinkedIn posts
          if (openaiService && generatedContent && !isConversational) {
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

              // Track dual mode usage for plans with weekly limits
              if (isDualGeneration && planLimits.dualResponsesPerWeek > 0) {
                await incrementDualModeUsageAdmin(userId);
              }

              // Send updated quota info in the complete event
              const updatedQuota = await checkHourlyQuotaAdmin(userId, auth.email);
              sendEvent("complete", {
                usedOpenAI: !!openaiService,
                quota: {
                  usedThisHour: updatedQuota.usedThisHour,
                  hourlyLimit: updatedQuota.hourlyLimit,
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
  userProfile: ProfileFields | undefined,
  sendEvent: (event: string, data: object) => void,
  typesToGenerate: Array<"storytelling" | "business">,
  maxTokens: number,
  plan: PlanTier,
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>,
  fileContent?: { type: "image"; mimeType: string; base64: string } | { type: "pdf"; extractedText: string } | null,
  urlContent?: ExtractedUrlContent | null
): Promise<string> {
  let firstPostContent = "";

  // Check if this is a follow-up message (continuing a conversation)
  const isFollowUp = conversationHistory && conversationHistory.length > 0;

  // Determine if we need GPT-4o for image vision
  const needsVision = fileContent?.type === "image";

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

    // Build optimized system prompt with synthesized profile (plan-tier aware)
    let systemPrompt = buildOptimizedPrompt(type, language, userProfile, plan);

    if (isFollowUp) {
      // Add context for follow-up conversations
      const followUpContext = language === "fr"
        ? `\n\nIMPORTANT: Tu continues une conversation existante. L'utilisateur affine ou précise sa demande. Adapte ta réponse en tenant compte du contexte précédent. Ne repars pas de zéro - construis sur ce qui a déjà été dit. Réponds de manière naturelle comme dans une vraie discussion.`
        : `\n\nIMPORTANT: You are continuing an existing conversation. The user is refining or clarifying their request. Adapt your response considering the previous context. Don't start from scratch - build on what was already discussed. Respond naturally as in a real discussion.`;
      systemPrompt += followUpContext;
    }

    // If file is attached, add context to system prompt
    if (fileContent) {
      const fileContext = fileContent.type === "image"
        ? (language === "fr"
          ? "\n\nL'utilisateur a joint une image. Analyse-la et utilise son contenu comme contexte pour générer le post LinkedIn. Décris ce que tu vois si pertinent."
          : "\n\nThe user attached an image. Analyze it and use its content as context to generate the LinkedIn post.")
        : (language === "fr"
          ? "\n\nL'utilisateur a joint un document PDF. Utilise le contenu extrait ci-dessous comme contexte pour générer le post LinkedIn."
          : "\n\nThe user attached a PDF document. Use the extracted content below as context to generate the LinkedIn post.");
      systemPrompt += fileContext;
    }

    // If URL content was extracted, add context to system prompt
    if (urlContent) {
      const urlContext = language === "fr"
        ? "\n\nL'utilisateur a partagé un lien. Utilise le contenu extrait de cette page comme contexte principal pour générer le post LinkedIn. Fais référence aux idées clés de l'article sans copier le texte mot pour mot."
        : "\n\nThe user shared a link. Use the extracted page content as the main context to generate the LinkedIn post. Reference key ideas from the article without copying text verbatim.";
      systemPrompt += urlContext;
    }

    // Build messages array (use any[] to support multimodal content parts)
    const messages: any[] = [
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

    // Add current prompt with file content
    const userContent = isFollowUp
      ? prompt // For follow-ups, just send the refinement
      : language === "fr"
        ? `Crée un post LinkedIn sur le sujet suivant: ${prompt}`
        : `Create a LinkedIn post about the following topic: ${prompt}`;

    if (fileContent?.type === "image") {
      // Multimodal message with image for GPT-4o Vision
      messages.push({
        role: "user",
        content: [
          { type: "text", text: userContent },
          {
            type: "image_url",
            image_url: {
              url: `data:${fileContent.mimeType};base64,${fileContent.base64}`,
              detail: "auto",
            },
          },
        ],
      });
    } else if (fileContent?.type === "pdf") {
      // PDF: inject extracted text into the prompt
      const pdfContext = language === "fr"
        ? `\n\n--- Contenu du document joint ---\n${fileContent.extractedText}\n--- Fin du document ---`
        : `\n\n--- Attached document content ---\n${fileContent.extractedText}\n--- End of document ---`;
      messages.push({ role: "user", content: userContent + pdfContext });
    } else if (urlContent) {
      // URL: inject extracted page content into the prompt
      const urlTitle = urlContent.title ? `\nTitre: ${urlContent.title}` : "";
      const urlDesc = urlContent.description ? `\nDescription: ${urlContent.description}` : "";
      const urlInjection = language === "fr"
        ? `\n\n--- Contenu extrait de ${urlContent.url} ---${urlTitle}${urlDesc}\n\n${urlContent.textContent}\n--- Fin du contenu extrait ---`
        : `\n\n--- Extracted content from ${urlContent.url} ---${urlTitle}${urlDesc}\n\n${urlContent.textContent}\n--- End of extracted content ---`;
      messages.push({ role: "user", content: userContent + urlInjection });
    } else {
      messages.push({ role: "user", content: userContent });
    }

    // Log estimated token count for monitoring
    const totalPromptText = messages.map((m: any) => typeof m.content === "string" ? m.content : "").join("");
    if (process.env.NODE_ENV !== "production") {
      console.log(`[POSTY] Prompt tokens (est.): ~${estimateTokens(totalPromptText)} | Type: ${type} | Profile: ${userProfile ? "yes" : "no"}`);
    }

    // Use GPT-4o for image vision, otherwise default model
    const modelToUse = needsVision ? "gpt-4o" : service["model"];

    const stream = await service["client"].chat.completions.create({
      model: modelToUse,
      messages,
      temperature: getGenerationTemperature(type, plan),
      max_tokens: maxTokens,
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

// buildSystemPrompt and sanitizeUserInput moved to lib/prompt-builder.ts
// Now using buildOptimizedPrompt() with synthesizeProfile() for token-efficient injection

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

// ============== INTENT CLASSIFICATION ==============

type IntentType = "SOCIAL" | "EXPLORATORY" | "PRODUCTION";

/**
 * Fast pattern-based intent detection for common cases
 * Falls back to AI classification for ambiguous prompts
 */
function detectIntentFast(prompt: string): IntentType | null {
  const trimmed = prompt.trim().toLowerCase();

  // Social patterns (greetings, very short messages)
  const socialPatterns = [
    /^(coucou|salut|hello|hey|hi|yo|bonjour|bonsoir)[\s!.,?]*$/i,
    /^(ça va|ca va|comment ça va|comment ca va|comment vas-tu|how are you|what's up|quoi de neuf)[\s!?,]*$/i,
    /^(merci|thanks|thank you|thx)[\s!.,]*$/i,
  ];

  for (const pattern of socialPatterns) {
    if (pattern.test(trimmed)) {
      return "SOCIAL";
    }
  }

  // Very short messages without production keywords = likely social
  if (trimmed.length < 15 && !trimmed.includes("post") && !trimmed.includes("écris") && !trimmed.includes("génère") && !trimmed.includes("crée")) {
    return "SOCIAL";
  }

  // Production patterns (explicit content requests)
  const productionPatterns = [
    /\b(fais|fait|crée|créé|écris|écrit|génère|génère|rédige|compose)\s*(moi|me|nous)?\s*(un|une|des|le|la)?\s*(post|article|texte|contenu|publication)/i,
    /\b(write|create|generate|make)\s*(me|us)?\s*(a|an|the)?\s*(post|article|content|text)/i,
    /\b(post\s+(sur|about|on))\b/i,
    /\b(linkedin\s+post)\b/i,
  ];

  for (const pattern of productionPatterns) {
    if (pattern.test(trimmed)) {
      return "PRODUCTION";
    }
  }

  // Cannot determine fast - need AI classification
  return null;
}

/**
 * Classify user intent using AI (GPT-3.5-turbo for speed)
 * Only called when fast detection is inconclusive
 */
async function classifyIntent(
  service: NonNullable<ReturnType<typeof createOpenAIService>>,
  prompt: string,
  language: "fr" | "en"
): Promise<IntentType> {
  // Try fast detection first
  const fastIntent = detectIntentFast(prompt);
  if (fastIntent) {
    return fastIntent;
  }

  // Fall back to AI classification
  try {
    const response = await service["client"].chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: INTENT_CLASSIFICATION_PROMPT[language] },
        { role: "user", content: prompt },
      ],
      temperature: 0,
      max_tokens: 20,
    });

    const result = response.choices[0]?.message?.content?.trim().toUpperCase();

    if (result === "SOCIAL" || result === "EXPLORATOIRE" || result === "EXPLORATORY") {
      return result === "EXPLORATOIRE" ? "EXPLORATORY" : result as IntentType;
    }
    if (result === "PRODUCTION") {
      return "PRODUCTION";
    }

    // Default to production if unclear (maintain backwards compatibility)
    return "PRODUCTION";
  } catch (error) {
    console.error("Intent classification failed:", error);
    // Default to production on error
    return "PRODUCTION";
  }
}

/**
 * Generate conversational response (for social/exploratory intents)
 * No post generation, just natural conversation
 */
async function generateConversational(
  service: NonNullable<ReturnType<typeof createOpenAIService>>,
  prompt: string,
  language: "fr" | "en",
  sendEvent: (event: string, data: object) => void,
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>
): Promise<string> {
  // Use a simple "chat" type for the response
  const title = language === "fr" ? "POSTY" : "POSTY";

  sendEvent("start", { type: "conversational", title });

  // Build messages
  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: CONVERSATIONAL_PROMPT[language] },
  ];

  // Add conversation history if available
  if (conversationHistory && conversationHistory.length > 0) {
    const recentHistory = conversationHistory.slice(-6);
    for (const msg of recentHistory) {
      messages.push({
        role: msg.role === "user" ? "user" : "assistant",
        content: msg.content,
      });
    }
  }

  messages.push({ role: "user", content: prompt });

  const stream = await service["client"].chat.completions.create({
    model: "gpt-3.5-turbo", // Use faster model for conversation
    messages,
    temperature: 0.7,
    max_tokens: 300, // Keep responses short for conversation
    stream: true,
  });

  let fullContent = "";
  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content || "";
    if (content) {
      fullContent += content;
      sendEvent("chunk", { content, type: "conversational" });
    }
  }

  sendEvent("done", { type: "conversational" });

  return fullContent;
}
