import { NextRequest } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { getMockResponses } from "@/lib/services/mock-responses";
import {
  createOpenAIService,
  createUserOpenAIService,
  isOpenAIConfigured,
  isValidApiKeyFormat,
  OpenAIModel,
  INSIGHTS_PROMPT,
  CONVERSATIONAL_PROMPT,
  ASSISTANT_PROMPT,
  INTENT_CLASSIFICATION_PROMPT,
  FILLER_PATTERNS,
} from "@/lib/openai";
import { buildOptimizedPrompt, getGenerationTemperature, synthesizeProfile, estimateTokens, ProfileFields, PlanTier, buildAssistantPrompt, cleanFillerFromResponse } from "@/lib/services/prompt-builder";
import {
  checkHourlyQuotaAdmin,
  checkUserQuotaAdmin,
  incrementUserQuotaAdmin,
  getUserProfileAdmin,
  getDualModeUsageThisWeek,
  incrementDualModeUsageAdmin,
  getUserMemoryAdmin,
  saveUserMemoryAdmin,
} from "@/lib/db/firestore-admin";
import { buildMemoryContext, buildExtractionMessages, parseExtractionResponse, mergeMemoryItems } from "@/lib/services/memory";
import { isAdminInitialized } from "@/lib/db/firebase-admin";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { getPlanFeatures } from "@/lib/config/plan-features";
import { planHasFeature, PlanType, getPlanLimits, getMaxTokensForPlan } from "@/lib/config/plans";
import { SubscriptionPlan, PostInsights } from "@/types";
import { detectUrl, removeUrlFromPrompt, extractUrlContent, ExtractedUrlContent } from "@/lib/utils/url-extract";
import { detectPromptLanguage } from "@/lib/utils/detect-language";
import { normalizeHashtagsInText } from "@/lib/hashtags/normalize";

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
      language: clientLanguage = "fr",
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
      // AI mode: "linkedin" (post generation) or "general" (conversational Q&A)
      aiMode = "linkedin",
      // Pre-classified intent from /api/intent — when set, the internal
      // classifier below is skipped and we trust this value. Must match
      // one of the existing IntentType literals (SOCIAL/ASSISTANCE/HYBRID/
      // PRODUCTION); anything else is ignored as if absent.
      intentHint,
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

    // ========== PROMPT LANGUAGE DETECTION ==========
    // Detect the language of the user's actual prompt and use it for AI generation.
    // This ensures the AI responds in the same language as the user's message.
    // Falls back to English if the language is ambiguous or undetectable.
    const language = detectPromptLanguage(prompt);

    if (!userId || typeof userId !== "string") {
      return new Response(JSON.stringify({ error: "userId is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // ========== QUOTA CHECK (SERVER-SIDE — HOURLY ROLLING WINDOW) ==========
    // This prevents users from bypassing quota by directly calling the API
    // Note: Error messages use clientLanguage (UI language), not detected prompt language
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
              message: clientLanguage === "fr"
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
              message: clientLanguage === "fr"
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
              message: clientLanguage === "fr"
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
          message: clientLanguage === "fr"
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
          message: clientLanguage === "fr"
            ? "Vous devez souscrire à un abonnement pour utiliser cette fonctionnalité."
            : "You need an active subscription to use this feature.",
        }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    // ========== FREE PLAN RESTRICTIONS ==========
    if (userPlan === "free") {
      // Block dual mode for free plan
      if (requestDualMode) {
        return new Response(
          JSON.stringify({
            error: "plan_required",
            message: clientLanguage === "fr"
              ? "Le mode double réponse nécessite le plan Pro ou Max."
              : "Dual response mode requires the Pro or Max plan.",
            requiredPlan: "pro",
          }),
          { status: 403, headers: { "Content-Type": "application/json" } }
        );
      }
      // Block file attachments for free plan
      if (fileAttachment) {
        return new Response(
          JSON.stringify({
            error: "plan_required",
            message: clientLanguage === "fr"
              ? "Les fichiers joints nécessitent le plan Max."
              : "File attachments require the Max plan.",
            requiredPlan: "max",
          }),
          { status: 403, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    // ========== PROMPT LENGTH ENFORCEMENT ==========
    const planLimits = getPlanLimits(userPlan);
    if (prompt.length > planLimits.maxCharactersPerPrompt) {
      return new Response(
        JSON.stringify({
          error: "prompt_too_long",
          message: clientLanguage === "fr"
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
            message: clientLanguage === "fr"
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
            message: clientLanguage === "fr"
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
            // Pro+ : all onboarding fields for personalization
            // communicationTone & targetAudience are essential for quality —
            // they define HOW the author writes and WHO they write for.
            serverUserProfile = {
              ...(userProfileData.displayName && { displayName: userProfileData.displayName }),
              ...(profile.profileType && { profileType: profile.profileType }),
              ...(profile.sector && { sector: profile.sector }),
              ...(profile.role && { role: profile.role }),
              ...(profile.objective && { objective: profile.objective }),
              ...(profile.linkedinStyle && { linkedinStyle: profile.linkedinStyle }),
              ...(profile.targetAudience && { targetAudience: profile.targetAudience }),
              ...(profile.communicationTone && { communicationTone: profile.communicationTone }),
              ...(profile.publishingFrequency && { publishingFrequency: profile.publishingFrequency }),
            };
          }
          // No personalization if plan doesn't support it
        }
      } catch (profileError) {
        console.error("Profile loading error:", profileError);
        // Continue without profile - generation still works
      }
    }

    // ========== LOAD CONTEXTUAL MEMORY (Pro+) ==========
    let memoryContext: string | null = null;
    let memoryItems: import("@/types").MemoryItem[] = [];
    if (isAdminInitialized() && serverUserProfile) {
      try {
        const memoryData = await getUserMemoryAdmin(userId);
        if (memoryData?.enabled && memoryData.items.length > 0) {
          memoryItems = memoryData.items;
          memoryContext = buildMemoryContext(memoryData.items, prompt, language);
        }
      } catch (memError) {
        console.error("Memory loading error:", memError);
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
        // Track whether the client has disconnected. When the browser
        // navigates away (e.g. our `router.replace('/app/c/{id}')` after
        // the redirect-on-completion effect), the controller transitions
        // to a closed state and any subsequent `enqueue` throws
        // `ERR_INVALID_STATE`. Catching it once and flipping this flag
        // means the rest of the request — quota increment, memory
        // extraction, the trailing "complete" event — finishes silently
        // instead of polluting the server logs.
        let streamClosed = false;

        const sendEvent = (event: string, data: object) => {
          if (streamClosed) return;
          try {
            controller.enqueue(
              encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
            );
          } catch (err) {
            const code = (err as { code?: string })?.code;
            if (code === "ERR_INVALID_STATE") {
              streamClosed = true;
              return;
            }
            throw err;
          }
        };

        try {
          let generatedContent = "";
          let isConversational = false;

          if (openaiService) {
            // ========== PHASE: SEARCHING ==========
            // Signal the client that we're analyzing the request
            if (extractedUrlContent) {
              sendEvent("phase", { phase: "searching", message: language === "fr" ? "Recherche sur Internet…" : "Searching the web…" });
            } else {
              sendEvent("phase", { phase: "analyzing", message: language === "fr" ? "Analyse de la demande…" : "Analyzing request…" });
            }

            // ========== INTENT CLASSIFICATION ==========
            // Force PRODUCTION intent when URL content was extracted (user
            // clearly wants a post from a link). Otherwise, prefer the
            // client-supplied `intentHint` (set by /api/intent at the page
            // layer) and only fall back to the internal classifier when no
            // hint was provided — keeps backward compat for legacy callers.
            // In `general` mode (Support), we still narrow HYBRID/PRODUCTION
            // down to ASSISTANCE because Support never produces real posts.
            const validHints: ReadonlyArray<IntentType> = [
              "SOCIAL",
              "ASSISTANCE",
              "HYBRID",
              "PRODUCTION",
            ] as const;
            const hintedIntent: IntentType | undefined =
              validHints.includes(intentHint as IntentType)
                ? (intentHint as IntentType)
                : undefined;

            let intent: IntentType;
            if (extractedUrlContent) {
              intent = "PRODUCTION";
            } else if (hintedIntent) {
              // Trust the page-layer classification — no second OpenAI call.
              intent = aiMode === "general" && hintedIntent !== "SOCIAL"
                ? "ASSISTANCE"
                : hintedIntent;
            } else if (aiMode === "general") {
              const classified = await classifyIntent(
                openaiService,
                cleanedPrompt,
                language as "fr" | "en"
              );
              intent = classified === "SOCIAL" ? "SOCIAL" : "ASSISTANCE";
            } else {
              const classified = await classifyIntent(
                openaiService,
                cleanedPrompt,
                language as "fr" | "en"
              );
              intent = classified;
            }

            if (intent === "SOCIAL") {
              // Social response — short, warm greeting
              isConversational = true;
              generatedContent = await generateConversational(
                openaiService,
                cleanedPrompt,
                language as "fr" | "en",
                sendEvent,
                conversationHistory as Array<{ role: "user" | "assistant"; content: string }> | undefined
              );
            } else if (intent === "ASSISTANCE") {
              // Assistance response — ideas, advice, analysis WITH profile
              isConversational = true;
              generatedContent = await generateAssistance(
                openaiService,
                cleanedPrompt,
                language as "fr" | "en",
                sendEvent,
                serverUserProfile,
                conversationHistory as Array<{ role: "user" | "assistant"; content: string }> | undefined
              );
            } else if (intent === "HYBRID") {
              // Hybrid: stream a conversational explanation FIRST, then stream the
              // LinkedIn post as a second message. The client (useChat) handles two
              // sequential "start" events by creating two separate bubbles.
              const explainPrompt = language === "fr"
                ? `${cleanedPrompt}\n\n(Réponds en 3-5 phrases conversationnelles avant qu'on passe à la rédaction du post. Pas de liste à puces, pas de structure de post.)`
                : `${cleanedPrompt}\n\n(Answer in 3-5 conversational sentences before we move on to drafting the post. No bullet lists, no post structure.)`;

              const explanation = await generateAssistance(
                openaiService,
                explainPrompt,
                language as "fr" | "en",
                sendEvent,
                serverUserProfile,
                conversationHistory as Array<{ role: "user" | "assistant"; content: string }> | undefined
              );

              sendEvent("phase", { phase: "preparing", message: language === "fr" ? "Préparation du post…" : "Preparing your post…" });

              const post = await generateWithOpenAI(
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
                extractedUrlContent,
                memoryContext
              );

              // generatedContent is used downstream for insights/memory/title extraction —
              // those should run on the post, not the explanation.
              generatedContent = post;
              // isConversational stays false so insights/title still fire for the post.
              void explanation;
            } else {
              // ========== PHASE: PREPARING → WRITING ==========
              sendEvent("phase", { phase: "preparing", message: language === "fr" ? "Préparation du post…" : "Preparing your post…" });

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
                extractedUrlContent,
                memoryContext
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

          // ========== GENERATE SMART TITLE ==========
          // Extract a short 2-4 word topic from the prompt for the sidebar
          if (generatedContent && !isConversational) {
            try {
              const titleService = createOpenAIService({ model: "gpt-3.5-turbo" as OpenAIModel, temperature: 0.3, maxTokens: 30 });
              if (titleService) {
                const titleResponse = await titleService.chat({
                  systemPrompt: language === "fr"
                    ? "Extrais le sujet principal en 2 à 4 mots maximum. Pas de verbe, pas de phrase. Juste le thème. Exemples: 'Sauce curry', 'Management remote', 'IA recrutement'. Réponds UNIQUEMENT avec le titre court."
                    : "Extract the main topic in 2 to 4 words maximum. No verb, no sentence. Just the theme. Examples: 'Curry sauce', 'Remote management', 'AI recruitment'. Respond ONLY with the short title.",
                  messages: [{ role: "user", content: prompt.slice(0, 200) }],
                });
                const smartTitle = titleResponse.trim().replace(/^["']|["']$/g, "").slice(0, 50);
                if (smartTitle && smartTitle.length > 0) {
                  sendEvent("title", { title: smartTitle });
                }
              }
            } catch (titleError) {
              console.error("Title generation error (non-blocking):", titleError);
            }
          }

          // ========== EXTRACT MEMORY (async, non-blocking) ==========
          // Extract key facts from this conversation for future personalization
          if (generatedContent && !isConversational && isAdminInitialized()) {
            // Fire-and-forget: don't block the response stream
            (async () => {
              try {
                const memData = await getUserMemoryAdmin(userId);
                if (!memData?.enabled) return;

                // Use gpt-3.5-turbo for extraction (cheap & fast)
                const memService = createOpenAIService({ model: "gpt-3.5-turbo" as OpenAIModel, temperature: 0.3, maxTokens: 300 });
                if (!memService) return;

                const extractionMsgs = buildExtractionMessages(prompt, generatedContent, language);
                const extractionResponse = await memService.chat({
                  systemPrompt: extractionMsgs[0].content,
                  messages: [{ role: "user", content: extractionMsgs[1].content }],
                });

                const extracted = parseExtractionResponse(extractionResponse);
                if (extracted.length > 0) {
                  const updatedItems = mergeMemoryItems(memData.items, extracted);
                  await saveUserMemoryAdmin(userId, updatedItems);
                }
              } catch (memExtractError) {
                console.error("Memory extraction error (non-blocking):", memExtractError);
              }
            })();
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
          // Ignore "client navigated away" — it's not a generation failure,
          // it's the user's browser cleanly closing the SSE socket while we
          // were still sending. The server-side post is already persisted.
          const code = (error as { code?: string })?.code;
          if (code === "ERR_INVALID_STATE") {
            streamClosed = true;
          } else {
            console.error("Generation error:", error);
            const message =
              error instanceof Error ? error.message : "Generation failed";
            sendEvent("error", { message });
          }
        } finally {
          if (!streamClosed) {
            try { controller.close(); } catch { /* already closed */ }
          }
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
  urlContent?: ExtractedUrlContent | null,
  memoryContext?: string | null
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

    sendEvent("phase", { phase: "writing", message: language === "fr" ? "Écriture en cours…" : "Writing your post…" });
    sendEvent("start", { type, title });

    // Build optimized system prompt with synthesized profile (plan-tier aware)
    let systemPrompt = buildOptimizedPrompt(type, language, userProfile, plan);

    // Enforce response language based on prompt detection
    const langEnforcement = language === "fr"
      ? "\n\nLANGUE: Réponds STRICTEMENT en français. Tout le contenu généré doit être en français."
      : "\n\nLANGUAGE: Respond STRICTLY in English. All generated content must be in English.";
    systemPrompt += langEnforcement;

    // Inject contextual memory (retained facts from previous conversations)
    if (memoryContext) {
      systemPrompt += memoryContext;
    }

    if (isFollowUp) {
      // Add context for follow-up conversations with strict preservation instructions
      const followUpContext = language === "fr"
        ? `\n\nIMPORTANT — MODIFICATION DE POST EXISTANT:
Tu continues une conversation existante. L'utilisateur demande une modification ou un ajustement du post précédent.

RÈGLES STRICTES:
1. REPRENDS le post précédent tel quel comme base
2. Applique UNIQUEMENT les modifications demandées par l'utilisateur
3. CONSERVE intégralement: le style, le ton, la structure, le format, les emojis, les sauts de ligne, le rythme du post original
4. NE RÉÉCRIS PAS le post entier — fais une édition chirurgicale
5. Si l'utilisateur demande de changer un nom, un mot, une info → change SEULEMENT cet élément
6. Le résultat doit être identique au post précédent SAUF pour les modifications explicitement demandées
7. Réponds UNIQUEMENT avec le post modifié, sans explication ni commentaire`
        : `\n\nIMPORTANT — EXISTING POST MODIFICATION:
You are continuing an existing conversation. The user is requesting a modification or adjustment to the previous post.

STRICT RULES:
1. USE the previous post as-is as your base
2. Apply ONLY the changes requested by the user
3. PRESERVE entirely: the style, tone, structure, format, emojis, line breaks, rhythm of the original post
4. DO NOT rewrite the entire post — make surgical edits only
5. If the user asks to change a name, word, or info → change ONLY that element
6. The result must be identical to the previous post EXCEPT for the explicitly requested modifications
7. Respond ONLY with the modified post, no explanation or commentary`;
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

    // Build messages array
    const messages: ChatCompletionMessageParam[] = [
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
    const totalPromptText = messages.map((m) => typeof m.content === "string" ? m.content : "").join("");
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

    // Normalize hashtag casing on the final aggregated text. The streamed
    // chunks may contain raw LLM output (#POSTY, #PersonalBranding); the
    // client overwrites its accumulator with `content` from the done event.
    const normalized = normalizeHashtagsInText(fullContent);

    // Capture first post for insights generation
    if (!firstPostContent) {
      firstPostContent = normalized;
    }

    sendEvent("done", { type, content: normalized });

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

type IntentType = "SOCIAL" | "EXPLORATORY" | "ASSISTANCE" | "PRODUCTION" | "HYBRID";

const PRODUCTION_TRIGGERS = /\b(fais|fait|crée|créé|écris|écrit|génère|rédige|compose|prépare|propose-moi un|write|create|generate|make|draft|compose)\s*(moi|me|nous)?\s*(un|une|des|le|la|a|an|the)?\s*(post|article|texte|contenu|publication|story|carrousel)/i;

const EXPLAIN_TRIGGERS = /\b(explique|explique-moi|parle-moi|raconte-moi|dis-moi|détaille|résume|c'?est quoi|qu'?est[- ]ce que|peux-tu (m')?expliquer|explain|tell me (about|what)|describe|walk me through|summarize)/i;

/**
 * Hybrid request: the user wants BOTH a conversational answer (explanation,
 * discussion, opinion) AND a generated post. Typical phrasing: "explique X
 * puis fais un post", "parle-moi de Y et écris un post LinkedIn".
 *
 * Detection: at least one explanation trigger AND at least one production
 * trigger (or a connector like "puis/et/then" before a production trigger).
 */
function detectHybrid(prompt: string): boolean {
  const t = prompt.trim().toLowerCase();
  if (!EXPLAIN_TRIGGERS.test(t)) return false;
  if (PRODUCTION_TRIGGERS.test(t)) return true;
  return /\b(puis|ensuite|et\s+(fais|fait|crée|écris|rédige)|then\s+(write|create|make|draft)|and\s+(write|create|make|draft))/i.test(t);
}

/**
 * Fast pattern-based intent detection for common cases.
 * Falls back to AI classification (returns null) whenever a message is ambiguous.
 *
 * Design rule: only return PRODUCTION on an EXPLICIT post request, or on a
 * clear post draft (multiline structured content). When in doubt, return null
 * so the AI classifier — which defaults to ASSISTANCE — decides.
 */
function detectIntentFast(prompt: string): IntentType | null {
  const raw = prompt.trim();
  const trimmed = raw.toLowerCase();

  // -- 0. HYBRID: explanation + post in one ask (must be checked BEFORE PRODUCTION)
  if (detectHybrid(prompt)) {
    return "HYBRID";
  }

  // -- 1. Explicit PRODUCTION request always wins (even mixed with other text)
  if (PRODUCTION_TRIGGERS.test(trimmed) || /\b(post\s+(sur|about|on)\s+\w)/i.test(trimmed) || /\blinkedin\s+post\b/i.test(trimmed)) {
    return "PRODUCTION";
  }

  // -- 2. SOCIAL: greetings / small talk (short standalone messages)
  const socialPatterns = [
    /^(coucou|salut|hello|hey|hi|yo|bonjour|bonsoir|hola|wesh)[\s!.,?]*$/i,
    /^(ça va|ca va|comment ça va|comment ca va|comment vas-tu|how are you|what's up|quoi de neuf|sup)[\s!?,]*$/i,
    /^(merci|thanks|thank you|thx|cool|nickel|parfait|super|génial|great|ok|d'accord|ouais|yes|no|non)[\s!.,]*$/i,
  ];
  for (const pattern of socialPatterns) {
    if (pattern.test(trimmed)) return "SOCIAL";
  }

  // -- 3. ASSISTANCE: questions, explanations, advice, ideas, analysis
  // These all want a conversational answer, never a LinkedIn preview card.
  const assistancePatterns = [
    // Conversational questions about people, products, concepts
    /\b(tu connais|connais-tu|tu sais|sais-tu|as-tu (déjà )?entendu|do you know|have you heard|are you familiar)/i,
    // Explanation requests
    /\b(explique|explique-moi|peux-tu (m')?expliquer|peux-tu me dire|dis-moi|raconte-moi|parle-moi|tell me|explain|describe|walk me through)/i,
    /\b(c'?est quoi|qu'?est[- ]ce que|qu'?est[- ]ce qu[ei]|what is|what are|what does|what's)\b/i,
    // Opinion / discussion
    /\b(que penses-tu|qu'?en penses-tu|ton avis|what do you think|what's your (take|opinion)|your thoughts)/i,
    // Ideas / brainstorm
    /\b(donne|propose|suggère|trouve|génère|donne-moi|propose-moi)\s*(moi|nous)?\s*(des|quelques|les)?\s*(idées?|sujets?|thèmes?|topics?|angles?|pistes?)/i,
    /\b(give|suggest|propose|find|brainstorm)\s*(me|us)?\s*(some|a few)?\s*(ideas?|topics?|themes?|angles?|subjects?)/i,
    /\b(idées?\s+(de|pour)\s+(posts?|contenu|publications?))/i,
    /\b(ideas?\s+(for|about)\s+(posts?|content|publications?))/i,
    // Advice / strategy
    /\b(conseils?|astuces?|tips?|stratégie|strategy|recommandations?|recommendations?)\b/i,
    /\b(comment\s+(faire|améliorer|optimiser|augmenter|booster|développer|gagner))/i,
    /\b(how\s+to\s+(improve|optimize|increase|boost|grow|get\s+more|do|start))/i,
    // Analysis / review
    /\b(analyse|analyze|critique|évalue|review|feedback|améliore|améliore-moi|improve|fix|reformule|reformulate|rephrase)\s*(ce|cet?|mon|ma|this|my)?\b/i,
    // Template requests
    /\b(template|modèle|structure|framework|format)\s*(de|pour|for|of)?\s*(post|contenu|content)?/i,
    // Help requests
    /\b(aide|help)\s*(moi|me)?\s*(à|to|avec|with)?\b/i,
    // Generic question openers
    /^(pourquoi|why|comment|how|quand|when|où|where|qui|who|lequel|laquelle|which|combien|how (many|much))\b/i,
    // "Est-ce que" / "is it" yes-no questions
    /^(est[- ]ce que|est[- ]ce qu'|is\s+(it|there)|are\s+(there|you)|do\s+you|does\s+it|can\s+(you|i))\b/i,
  ];
  for (const pattern of assistancePatterns) {
    if (pattern.test(trimmed)) return "ASSISTANCE";
  }

  // -- 4. Any question (ends with "?") → ASSISTANCE, not a post draft
  if (raw.endsWith("?")) return "ASSISTANCE";

  // -- 5. Structured multiline content (3+ lines OR bullets/numbered lists with content)
  // This is a strong signal it's a draft of a post, not a chat message.
  const lineCount = raw.split("\n").filter(l => l.trim().length > 0).length;
  const hasBullets = /(^|\n)\s*[•\-\*]\s+\S/.test(raw) || /(^|\n)\s*\d+[\.\)]\s+\S/.test(raw);
  if (lineCount >= 3 && hasBullets) return "PRODUCTION";

  // -- 6. Short messages we couldn't classify = treat as SOCIAL (chitchat)
  if (trimmed.length < 20) return "SOCIAL";

  // -- 7. Everything else: hand off to AI classifier (defaults to ASSISTANCE on doubt)
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

    if (result === "SOCIAL") return "SOCIAL";
    if (result === "ASSISTANCE") return "ASSISTANCE";
    if (result === "EXPLORATOIRE" || result === "EXPLORATORY") return "ASSISTANCE";
    if (result === "PRODUCTION") return "PRODUCTION";

    // Default to ASSISTANCE if unclear (better to help than generate unwanted post)
    return "ASSISTANCE";
  } catch (error) {
    console.error("Intent classification failed:", error);
    // On classifier failure, default to ASSISTANCE so we don't surprise the
    // user with an unwanted post preview. PRODUCTION must always be an opt-in.
    return "ASSISTANCE";
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

  // Build messages with language enforcement
  const langEnforcement = language === "fr"
    ? "\n\nLANGUE: Réponds STRICTEMENT en français."
    : "\n\nLANGUAGE: Respond STRICTLY in English.";
  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: CONVERSATIONAL_PROMPT[language] + langEnforcement },
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

  const normalized = normalizeHashtagsInText(fullContent);
  sendEvent("done", { type: "conversational", content: normalized });

  return normalized;
}

/**
 * Generate assistance response (for ideas, advice, analysis intents)
 * Uses GPT-4 with user profile injection for high-quality, personalized responses.
 * Response is cleaned of filler phrases before streaming completes.
 */
async function generateAssistance(
  service: NonNullable<ReturnType<typeof createOpenAIService>>,
  prompt: string,
  language: "fr" | "en",
  sendEvent: (event: string, data: object) => void,
  userProfile?: ProfileFields,
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>
): Promise<string> {
  const title = "POSTY";

  sendEvent("start", { type: "conversational", title });

  // Build assistant prompt with profile injection
  const basePrompt = ASSISTANT_PROMPT[language];
  const systemPrompt = buildAssistantPrompt(basePrompt, userProfile, language);

  // Language enforcement
  const langEnforcement = language === "fr"
    ? "\n\nLANGUE: Réponds STRICTEMENT en français."
    : "\n\nLANGUAGE: Respond STRICTLY in English.";

  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: systemPrompt + langEnforcement },
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

  // Use GPT-4 for high-quality assistance (not 3.5-turbo)
  const stream = await service["client"].chat.completions.create({
    model: service["model"] || "gpt-4",
    messages,
    temperature: 0.7,
    max_tokens: 1500, // Enough for structured ideas/advice
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

  const normalized = normalizeHashtagsInText(fullContent);
  sendEvent("done", { type: "conversational", content: normalized });

  return normalized;
}
