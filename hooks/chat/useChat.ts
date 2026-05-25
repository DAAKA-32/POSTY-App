"use client";

import { useState, useCallback, useRef } from "react";
import { savePost, addMessagesToConversation, getConversationHistory, renamePost } from "@/lib/db/firestore";
import { MockResponse, PostInsights, ConversationTurn, FileAttachment, Post, DetectedAIAction } from "@/types";
import { getAuthHeaders } from "@/lib/api/client";
import { triggerHaptic } from "@/lib/ui/haptic";
import { getFriendlyMessage } from "@/lib/utils/error-messages";
import { setCachedConversation, updateCachedConversation, getCachedConversation } from "@/lib/storage/conversation-cache";
import { detectIntent } from "@/lib/ai/intent-detection";

const GUEST_GENERATION_LIMIT = 2;
const GUEST_STORAGE_KEY = "posty_guest_generations";

// Message types for conversational display
export interface ConversationMessage {
  id: string;
  type: "user" | "ai" | "action";
  content: string;
  timestamp: Date;
  variant?: "storytelling" | "business";
  isStreaming?: boolean;
  // Populated when type === "action"
  action?: DetectedAIAction;
}

// Streaming content for each response type
interface StreamingContent {
  storytelling: string;
  business: string;
  conversational: string;
}

interface UseChatOptions {
  userId?: string;
  isGuest?: boolean;
  /** Current conversation ID - when set, follow-ups continue in same conversation */
  conversationId?: string;
  /** @deprecated Use selectedStyle instead */
  dualMode?: boolean;
  /** @deprecated Use selectedStyle instead */
  responseType?: "storytelling" | "business";
  /** Style selection for PRO users (ignored for FREE/MAX) */
  selectedStyle?: "storytelling" | "business";
  /**
   * Chat persona for the next request.
   *   - "posts"   → LinkedIn post generation (default). The visual sub-intent
   *                 ("fais une image…", "fais un post avec un visuel…") is
   *                 detected by /api/intent at the page layer and the image
   *                 pipeline is invoked directly — this hook only sees the
   *                 cleaned post brief when text generation is needed.
   *   - "support" → conversational Q&A; the API forces EXPLORATORY/ASSISTANCE
   *                 intent so we never produce a post in this mode.
   */
  aiMode?: "posts" | "support";
}

/** Generation phase reported by the server via SSE "phase" events */
export type GenerationPhase = "idle" | "analyzing" | "searching" | "preparing" | "writing" | "complete";

interface UseChatReturn {
  responses: MockResponse[];
  messages: ConversationMessage[];
  isLoading: boolean;
  isStreaming: boolean;
  /** Current generation phase (searching, preparing, writing…) */
  generationPhase: GenerationPhase;
  /** Human-readable message for the current phase */
  generationPhaseMessage: string;
  streamingContent: StreamingContent;
  error: string | null;
  generationCount: number;
  canGenerate: boolean;
  generate: (
    prompt: string,
    file?: FileAttachment | null,
    /** Pre-classified routing hint from /api/intent — lets the post route
     *  skip its internal classifier when the caller has already figured it out. */
    intentHint?: "PRODUCTION" | "HYBRID" | "ASSISTANCE" | "SOCIAL",
    /** Per-call overrides. Today only carries `forceSingleStyle` for the
     *  intent=both path, where pairing a post with a visual is busy enough
     *  that dual-mode would overload the chat surface. The hook's own
     *  `dualMode` / `selectedStyle` config stays untouched for other calls. */
    options?: { forceSingleStyle?: "storytelling" | "business" }
  ) => Promise<{
    /** The Firestore `posts/{id}` document id this generation was saved to.
     *  Always set for authenticated users on successful generations, both
     *  new posts and follow-ups. Null when generation failed, was aborted,
     *  or the user is in guest mode. */
    postId: string | null;
    /** Final assistant content for the primary variant (storytelling first,
     *  otherwise the single selected style or the conversational reply). */
    content: string;
    /** True for SOCIAL/ASSISTANCE/HYBRID intents where the reply is plain
     *  prose, not a LinkedIn post draft. */
    isConversational: boolean;
  }>;
  /** Abort the in-flight generation without clearing messages (ChatGPT-style stop) */
  stopGeneration: () => void;
  reset: () => void;
  loadConversation: (post: { prompt: string; responseA: string; responseB: string; id: string; messages?: ConversationTurn[]; responseMode?: string; selectedStyle?: string }) => void;
  lastPrompt: string;
  postId: string | null;
  /** AI-generated insights about the post (all plans) */
  insights: PostInsights | null;
  /** True when continuing an existing conversation */
  isFollowUp: boolean;
  /** Regenerate the seed comment attached to a given response index */
  regenerateSeedComment: (index: number) => void;
}

export function useChat({
  userId,
  isGuest = false,
  conversationId: initialConversationId,
  dualMode = false,
  responseType = "business",
  selectedStyle = "business",
  aiMode = "posts",
}: UseChatOptions): UseChatReturn {
  const [responses, setResponses] = useState<MockResponse[]>([]);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState<StreamingContent>({
    storytelling: "",
    business: "",
    conversational: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [generationPhase, setGenerationPhase] = useState<GenerationPhase>("idle");
  const [generationPhaseMessage, setGenerationPhaseMessage] = useState("");
  const [lastPrompt, setLastPrompt] = useState("");
  const [postId, setPostId] = useState<string | null>(initialConversationId || null);
  const [insights, setInsights] = useState<PostInsights | null>(null);

  // Use selectedStyle, fallback to responseType for backwards compatibility
  const effectiveStyle = selectedStyle || responseType;

  // Refs to avoid stale closures in async streaming callbacks
  const postIdRef = useRef<string | null>(postId);
  const messagesLengthRef = useRef<number>(0);
  const responsesRef = useRef<MockResponse[]>(responses);
  // Generation counter — incremented on reset() to discard stale async saves
  const generationRef = useRef(0);

  // Keep refs in sync with state
  postIdRef.current = postId;
  messagesLengthRef.current = messages.length;
  responsesRef.current = responses;

  // Wrapper to update both state and ref atomically
  const setPostIdWithRef = useCallback((newId: string | null) => {
    postIdRef.current = newId;
    setPostId(newId);
  }, []);

  // Abort controller for canceling streams
  const abortControllerRef = useRef<AbortController | null>(null);
  const smartTitleRef = useRef<string | null>(null);

  /* ─────────────────────── Seed comment helper ──────────────────────────
   * Seed comments (LinkedIn-algo "boost" first comment) are generated ONLY
   * on explicit user action — never automatically after a post is streamed.
   * The "Ajouter un 1er commentaire (boost algo)" button in ModernResponseCard
   * fires the request via the public `regenerateSeedComment(index)` API
   * below, which internally calls `fetchSeedCommentFor`. While in-flight,
   * the response shows `seedComment.loading = true` so the UI can render
   * its shimmer; on success, `seedComment.text` is populated. */
  const fetchSeedCommentFor = useCallback(
    async (index: number, postContent: string) => {
      if (!postContent || postContent.trim().length < 20) return;
      const lang = (typeof window !== "undefined"
        ? (localStorage.getItem("posty-language") || "fr")
        : "fr") as "fr" | "en";

      setResponses((prev) =>
        prev.map((r, i) =>
          i === index
            ? { ...r, seedComment: { ...(r.seedComment ?? {}), loading: true, error: undefined } }
            : r,
        ),
      );

      try {
        const headers = await getAuthHeaders();
        const res = await fetch("/api/chat/seed-comment", {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ userId, postContent, language: lang }),
        });
        if (!res.ok) {
          let msg = `Seed comment failed (${res.status})`;
          try {
            const j = await res.json();
            msg = j.message || j.error || msg;
          } catch {}
          throw new Error(msg);
        }
        const data: { comment?: string } = await res.json();
        if (!data.comment) throw new Error("Empty seed comment");

        setResponses((prev) =>
          prev.map((r, i) =>
            i === index ? { ...r, seedComment: { text: data.comment, loading: false } } : r,
          ),
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed";
        setResponses((prev) =>
          prev.map((r, i) =>
            i === index ? { ...r, seedComment: { loading: false, error: msg } } : r,
          ),
        );
      }
    },
    [userId],
  );

  /** Public API — let the UI request a fresh seed comment on demand. */
  const regenerateSeedComment = useCallback(
    (index: number) => {
      // Read the latest content from state; we can't rely on closures here.
      setResponses((prev) => {
        const target = prev[index];
        if (target?.content) {
          // Fire async; don't await inside setResponses.
          void fetchSeedCommentFor(index, target.content);
        }
        return prev;
      });
    },
    [fetchSeedCommentFor],
  );

  // Get guest generation count from localStorage
  const getGuestCount = useCallback((): number => {
    if (typeof window === "undefined") return 0;
    const stored = localStorage.getItem(GUEST_STORAGE_KEY);
    return stored ? parseInt(stored, 10) : 0;
  }, []);

  // Increment guest generation count
  const incrementGuestCount = useCallback((): void => {
    if (typeof window === "undefined") return;
    const current = getGuestCount();
    localStorage.setItem(GUEST_STORAGE_KEY, String(current + 1));
  }, [getGuestCount]);

  // Check if user can generate (based on guest limit)
  const generationCount = getGuestCount();
  const canGenerate = !isGuest || generationCount < GUEST_GENERATION_LIMIT;

  // Check if this is a follow-up in existing conversation
  const isFollowUp = postId !== null && messages.length > 0;

  // Generate responses with streaming
  const generate = useCallback(
    async (
      prompt: string,
      file?: FileAttachment | null,
      /**
       * Optional pre-classified post sub-type. When provided, /api/generate
       * trusts this value and skips its own intent classifier, which saves
       * a regex pass (or rarely a gpt-3.5-turbo call) when the page-layer
       * /api/intent already figured out the routing.
       */
      intentHint?: "PRODUCTION" | "HYBRID" | "ASSISTANCE" | "SOCIAL",
      /**
       * Per-call overrides. `forceSingleStyle` collapses this generation to
       * a single post variant (ignoring the hook's `dualMode` flag) — used
       * by the intent=both path so we don't stack two posts AND multiple
       * image variants in the same chat turn.
       */
      options?: { forceSingleStyle?: "storytelling" | "business" }
    ) => {
      // Resolve dual-mode + style for THIS specific call. When the caller
      // asked for a single style, we honour it regardless of the hook's
      // ambient `dualMode` setting (so a Max user with "Dual Response" on
      // still gets one post + 3 visuals on an intent=both prompt).
      const callDualMode = options?.forceSingleStyle ? false : dualMode;
      const callStyle: "storytelling" | "business" =
        options?.forceSingleStyle ?? effectiveStyle;
      // Empty result used for the early-return branches (validation,
      // guest limit, action detection). Keeps the call-site contract simple:
      // generate() always resolves to a `{ postId, content, isConversational }`
      // shape — callers can ignore it when they don't need it.
      const emptyResult = { postId: null, content: "", isConversational: false };

      if (!prompt.trim()) {
        setError("Veuillez entrer une description");
        return emptyResult;
      }

      if (isGuest && !canGenerate) {
        setError("Limite atteinte. Connectez-vous pour continuer.");
        return emptyResult;
      }

      // ── Intent detection: intercept action commands before calling /api/generate ──
      const currentResponses = responsesRef.current;
      const latestPost = currentResponses[currentResponses.length - 1];
      const detectedAction = detectIntent(prompt, {
        hasCurrentPost: currentResponses.length > 0 && !!latestPost?.content,
        postContent: latestPost?.content,
        postId: postIdRef.current || undefined,
      });

      if (detectedAction) {
        const userMsg: ConversationMessage = {
          id: `user-${Date.now()}`,
          type: "user",
          content: prompt,
          timestamp: new Date(),
        };
        const actionMsg: ConversationMessage = {
          id: `action-${Date.now()}`,
          type: "action",
          content: "",
          timestamp: new Date(),
          action: detectedAction,
        };
        setMessages((prev) => [...prev, userMsg, actionMsg]);
        setLastPrompt(prompt);
        return emptyResult;
      }

      // Cancel any ongoing stream
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      // Hold the controller in a local — if a previous in-flight generate
      // call's `finally` lands between this assignment and the `fetch` below,
      // it can null the ref out from under us, which is what caused the
      // "Cannot read properties of null (reading 'signal')" crash on
      // follow-up prompts after a parallel intent=both run. Reading the
      // signal from `controller` (the local) is immune to that race.
      const controller = new AbortController();
      abortControllerRef.current = controller;
      smartTitleRef.current = null;

      // Capture generation ID to discard results if reset() is called mid-save
      const currentGeneration = generationRef.current;

      setIsLoading(true);
      setIsStreaming(false);
      setError(null);
      setGenerationPhase("analyzing");
      setGenerationPhaseMessage("");
      setLastPrompt(prompt);
      setStreamingContent({ storytelling: "", business: "", conversational: "" });

      // Determine if this is a follow-up message in existing conversation
      // Use refs to get current values (avoid stale closure from streaming delay)
      const currentPostId = postIdRef.current;
      const isExistingConversation = currentPostId !== null && messagesLengthRef.current > 0;

      // Add user message to conversation
      const userMessage: ConversationMessage = {
        id: `user-${Date.now()}`,
        type: "user",
        content: prompt,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);

      // Track accumulated content for saving (includes conversational for SOCIAL/EXPLORATORY intents)
      const accumulatedContent: Record<string, string> = { storytelling: "", business: "", conversational: "" };
      const messageIds: Record<string, string> = {
        storytelling: `ai-${Date.now()}-storytelling`,
        business: `ai-${Date.now()}-business`,
        conversational: `ai-${Date.now()}-conversational`,
      };

      // Captured during the SSE "complete" event so we can return them once
      // the function exits. Callers (page-level orchestrator on intent=both)
      // need the saved postId to attach freshly-generated visuals to the
      // SAME Firestore doc instead of creating a duplicate via createImagePost.
      let savedPostId: string | null = null;
      let savedContent = "";
      let savedIsConversational = false;

      try {
        // Get conversation history if continuing existing conversation
        let conversationHistory: Array<{ role: "user" | "assistant"; content: string }> | undefined;
        if (isExistingConversation && currentPostId) {
          const history = await getConversationHistory(currentPostId);
          if (history) {
            conversationHistory = history.messages;
          }
        }

        const authHeaders = await getAuthHeaders();
        const response = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders },
          body: JSON.stringify({
            userId: userId || "guest",
            prompt,
            dualMode: callDualMode,
            requestDualMode: callDualMode, // Server-side dual mode enforcement
            responseType: callStyle,
            selectedStyle: callStyle,
            // "posts" → "linkedin" (server's existing key), "support" → "general"
            aiMode: aiMode === "support" ? "general" : "linkedin",
            // Pre-classified routing hint from /api/intent — lets the post
            // route skip its internal classifier when the page already knows.
            ...(intentHint && { intentHint }),
            // Send conversation context for follow-ups
            conversationId: currentPostId,
            conversationHistory,
            // File attachment (Max plan only)
            ...(file && {
              fileAttachment: {
                name: file.name,
                type: file.type,
                size: file.size,
                base64: file.base64,
              },
            }),
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          if (errorData.error === "quota_exceeded") {
            // Professional limit handling: Create an AI system message instead of throwing
            const resetMinutes = errorData.resetInSeconds
              ? Math.ceil(errorData.resetInSeconds / 60)
              : 60;
            const plan = errorData.plan;
            const hourlyLimit = errorData.hourlyLimit;

            let content: string;
            if (plan === "pro") {
              content = `Vous avez utilisé vos ${hourlyLimit} messages cette heure. Réessayez dans ${resetMinutes} min, ou passez au plan Max pour un accès quasi illimité.`;
            } else {
              content = `Pause automatique — réessayez dans ${resetMinutes} min.`;
            }

            const limitMessage: ConversationMessage = {
              id: `ai-limit-${Date.now()}`,
              type: "ai",
              content,
              timestamp: new Date(),
              isStreaming: false,
            };
            setMessages((prev) => [...prev, limitMessage]);
            setIsLoading(false);
            setIsStreaming(false);
            return emptyResult; // Exit gracefully without error
          }
          throw new Error(errorData.error || "Generation failed");
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("No response body");
        }

        const decoder = new TextDecoder();
        let buffer = "";

        setIsStreaming(true);
        setIsLoading(false);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Parse SSE events from buffer
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            if (line.startsWith("event:")) {
              const eventType = line.slice(6).trim();
              const dataLine = lines[i + 1];

              if (dataLine && dataLine.startsWith("data:")) {
                let data;
                try {
                  data = JSON.parse(dataLine.slice(5).trim());
                } catch (parseError) {
                  console.error("Failed to parse SSE data:", parseError, dataLine);
                  continue;
                }

                switch (eventType) {
                  case "phase": {
                    const phase = data.phase as GenerationPhase;
                    const message = data.message as string;
                    setGenerationPhase(phase);
                    setGenerationPhaseMessage(message || "");
                    break;
                  }

                  case "start": {
                    const variantType = data.type as string;
                    const newMessage: ConversationMessage = {
                      id: messageIds[variantType],
                      type: "ai",
                      content: "",
                      timestamp: new Date(),
                      variant: variantType === "conversational" ? undefined : variantType as "storytelling" | "business",
                      isStreaming: true,
                    };

                    if (variantType === "conversational") {
                      // Conversational response (SOCIAL/EXPLORATORY) — single message, no dual layout
                      setMessages((prev) => [...prev, newMessage]);
                    } else if (callDualMode && variantType === "storytelling") {
                      // Pre-create business placeholder for stable dual layout
                      const businessPlaceholder: ConversationMessage = {
                        id: messageIds.business,
                        type: "ai",
                        content: "",
                        timestamp: new Date(),
                        variant: "business",
                        isStreaming: true,
                      };
                      setMessages((prev) => [...prev, newMessage, businessPlaceholder]);
                    } else if (callDualMode && variantType === "business") {
                      // Business placeholder already exists from storytelling start — skip
                    } else {
                      setMessages((prev) => [...prev, newMessage]);
                    }
                    break;
                  }

                  case "chunk": {
                    const type = data.type as "storytelling" | "business";
                    accumulatedContent[type] += data.content;

                    setStreamingContent((prev) => ({
                      ...prev,
                      [type]: accumulatedContent[type],
                    }));

                    setMessages((prev) =>
                      prev.map((msg) =>
                        msg.id === messageIds[type]
                          ? { ...msg, content: accumulatedContent[type] }
                          : msg
                      )
                    );
                    break;
                  }

                  case "done": {
                    const type = data.type as "storytelling" | "business";
                    // Server sends the normalized final text (hashtag casing
                    // fixed) in `content`. Overwrite the accumulator so the
                    // saved post and the rendered message both use it.
                    const normalized = typeof data.content === "string" ? data.content : null;
                    if (normalized !== null) {
                      accumulatedContent[type] = normalized;
                      setStreamingContent((prev) => ({ ...prev, [type]: normalized }));
                    }
                    setMessages((prev) =>
                      prev.map((msg) =>
                        msg.id === messageIds[type]
                          ? { ...msg, isStreaming: false, content: normalized ?? msg.content }
                          : msg
                      )
                    );
                    break;
                  }

                  case "insights": {
                    if (data.insights) {
                      setInsights(data.insights);
                    }
                    break;
                  }

                  case "title": {
                    // Smart title from GPT — update post when saved
                    if (data.title) {
                      smartTitleRef.current = data.title as string;
                    }
                    break;
                  }

                  case "complete": {
                    setIsStreaming(false);
                    setGenerationPhase("complete");
                    triggerHaptic();

                    if (data.quota) {
                      console.log("Quota updated:", data.quota);
                    }

                    // Determine if this was a conversational response (SOCIAL/EXPLORATORY)
                    const isConversational = !!accumulatedContent.conversational;
                    savedIsConversational = isConversational;

                    // Set final responses based on mode
                    if (isConversational) {
                      // Conversational responses are not "posts" — store for display only
                      setResponses([{
                        title: "POSTY",
                        content: accumulatedContent.conversational,
                        type: "business", // fallback type for compatibility
                      }]);
                    } else if (callDualMode) {
                      // Seed comment is NOT auto-generated — explicit user
                      // action only. The "Ajouter un 1er commentaire (boost
                      // algo)" button in ModernResponseCard fires it on
                      // click via `regenerateSeedComment(index)`. Reasons:
                      //   1. Saves an LLM call per post for users who never
                      //      use the seed comment.
                      //   2. Avoids a shimmer placeholder for a feature
                      //      that's a power-user nicety, not a default.
                      setResponses([
                        {
                          title: "Version Storytelling",
                          content: accumulatedContent.storytelling,
                          type: "storytelling",
                        },
                        {
                          title: "Version Business",
                          content: accumulatedContent.business,
                          type: "business",
                        },
                      ]);
                    } else {
                      const onlyContent = accumulatedContent[callStyle] || "";
                      setResponses([
                        {
                          title: callStyle === "storytelling"
                            ? "Version Storytelling"
                            : "Version Business",
                          content: onlyContent,
                          type: callStyle,
                        },
                      ]);
                    }

                    if (isGuest) {
                      incrementGuestCount();
                    }

                    // CRITICAL: Save to Firestore based on conversation state
                    if (userId && !isGuest) {
                      // Get the actual content to save (conversational or post content)
                      const primaryContent = isConversational
                        ? accumulatedContent.conversational
                        : callDualMode
                          ? accumulatedContent.storytelling
                          : accumulatedContent[callStyle] || "";
                      savedContent = primaryContent;

                      try {
                        if (isExistingConversation && currentPostId) {
                          // Follow-up: the post id is the existing conversation.
                          savedPostId = currentPostId;
                          // Resolve the id+variant of the PRIMARY assistant turn.
                          // In dual mode primaryContent is the storytelling
                          // content, so it must carry the storytelling id (not
                          // business). The previous swap corrupted Firestore
                          // pairings between messages and embedded images.
                          const primaryAssistantId = isConversational
                            ? messageIds.conversational
                            : callDualMode
                              ? messageIds.storytelling
                              : messageIds[callStyle];
                          const primaryVariant: "storytelling" | "business" | undefined =
                            isConversational
                              ? undefined
                              : callDualMode
                                ? "storytelling"
                                : callStyle;

                          // FOLLOW-UP: Add messages to existing conversation
                          const newMessages: ConversationTurn[] = [
                            {
                              id: userMessage.id,
                              role: "user",
                              content: prompt,
                              timestamp: userMessage.timestamp,
                            },
                            {
                              id: primaryAssistantId,
                              role: "assistant",
                              content: primaryContent,
                              variant: primaryVariant,
                              timestamp: new Date(),
                            },
                          ];

                          // Add business response if dual mode (not conversational).
                          // Its id MUST be messageIds.business so the persisted
                          // record stays consistent with what was rendered live.
                          if (!isConversational && callDualMode && accumulatedContent.business) {
                            newMessages.push({
                              id: messageIds.business,
                              role: "assistant",
                              content: accumulatedContent.business,
                              variant: "business",
                              timestamp: new Date(),
                            });
                          }

                          await addMessagesToConversation(currentPostId, newMessages);
                          // Update cache so background refreshes find fresh data
                          const existing = getCachedConversation(currentPostId);
                          if (existing) {
                            updateCachedConversation(currentPostId, {
                              messages: [...(existing.messages || []), ...newMessages],
                            });
                          }
                        } else {
                          // NEW CONVERSATION: Create new post
                          const newPostId = await savePost(
                            userId,
                            prompt,
                            primaryContent,
                            (!isConversational && callDualMode) ? accumulatedContent.business : "",
                            {
                              responseMode: isConversational ? "conversational" : (callDualMode ? "dual" : "single-choice"),
                              selectedStyle: (isConversational || callDualMode) ? undefined : callStyle,
                            }
                          );
                          // Update with smart title if available (GPT-generated topic)
                          if (smartTitleRef.current) {
                            renamePost(newPostId, smartTitleRef.current).catch(() => {});
                            smartTitleRef.current = null;
                          }
                          // Only set postId if this generation is still current
                          // (user may have clicked "New Post" during the save)
                          if (generationRef.current === currentGeneration) {
                            savedPostId = newPostId;
                            setPostIdWithRef(newPostId);
                            // Update cache so background refreshes find fresh data
                            setCachedConversation({
                              id: newPostId,
                              userId: userId!,
                              prompt,
                              responseA: primaryContent,
                              responseB: (!isConversational && callDualMode) ? accumulatedContent.business : "",
                              selectedVersion: null,
                              createdAt: { toDate: () => new Date() } as Post["createdAt"],
                              responseMode: isConversational ? "conversational" : (callDualMode ? "dual" : "single-choice"),
                              selectedStyle: (isConversational || callDualMode) ? undefined : callStyle,
                              title: smartTitleRef.current || prompt.slice(0, 40),
                            } as Post);
                          }
                        }
                      } catch (saveError) {
                        console.error("Failed to save:", saveError);
                        setError("Post genere mais non sauvegarde. Verifiez votre connexion internet.");
                      }
                    }
                    break;
                  }

                  case "error": {
                    throw new Error(data.message || "Generation failed");
                  }
                }

                i++;
              }
            }
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return { postId: savedPostId, content: savedContent, isConversational: savedIsConversational };
        }
        console.error("Generation error:", err);
        setError(getFriendlyMessage(err));
        setIsStreaming(false);
      } finally {
        setIsLoading(false);
        // Only clear the ref if it still points to OUR controller — guards
        // against a concurrent generate() call having already replaced it.
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
        }
      }
      return { postId: savedPostId, content: savedContent, isConversational: savedIsConversational };
    },
    [userId, isGuest, canGenerate, incrementGuestCount, dualMode, responseType, effectiveStyle, aiMode, setPostIdWithRef]
  );

  // Stop any in-flight generation without resetting messages (ChatGPT-style stop)
  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
    setIsLoading(false);
    setGenerationPhase("idle");
    setGenerationPhaseMessage("");
  }, []);

  // Reset chat state - starts a NEW conversation
  const reset = useCallback(() => {
    // Increment generation to discard any in-flight async saves
    generationRef.current++;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setResponses([]);
    setMessages([]);
    setError(null);
    setGenerationPhase("idle");
    setGenerationPhaseMessage("");
    setLastPrompt("");
    setPostIdWithRef(null); // Clear postId to start fresh
    setIsStreaming(false);
    setStreamingContent({ storytelling: "", business: "", conversational: "" });
    setInsights(null);
  }, []);

  // Load an existing conversation from a Post
  const loadConversation = useCallback(
    (post: { prompt: string; responseA: string; responseB: string; id: string; messages?: ConversationTurn[]; responseMode?: string; selectedStyle?: string }) => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      setIsStreaming(false);
      setIsLoading(false);
      setError(null);

      // CRITICAL: Set the post ID to enable conversation continuation
      setPostIdWithRef(post.id);
      setLastPrompt(post.prompt);

      // Determine response mode and correct variant for responseA
      const isConversational = post.responseMode === "conversational";
      const responseAVariant: "storytelling" | "business" | undefined =
        isConversational
          ? undefined // Conversational responses have no variant
          : post.responseMode === "dual"
            ? "storytelling" // Dual mode: responseA is always storytelling
            : (post.selectedStyle as "storytelling" | "business") || "storytelling";

      // Anchor the original turn at the post's creation time so the
      // chronological sort below keeps it strictly before any follow-up.
      // Using `new Date()` for the seed turn made it sort AFTER older
      // follow-ups whenever a Firestore clock skew put a follow-up's
      // timestamp slightly ahead — visible as "first answer jumps below
      // a follow-up after reload". Falling back to `now` only when no
      // createdAt is available preserves the previous behaviour for
      // legacy/in-memory posts without a Firestore timestamp.
      const postCreatedAt: Date | null = (() => {
        const raw = (post as { createdAt?: unknown }).createdAt;
        if (!raw) return null;
        if (raw instanceof Date) return raw;
        const maybeFs = raw as { toDate?: () => Date };
        if (typeof maybeFs.toDate === "function") {
          try { return maybeFs.toDate(); } catch { return null; }
        }
        return null;
      })();
      const seedTimestamp = postCreatedAt ?? new Date();

      const newMessages: ConversationMessage[] = [
        {
          id: `user-${post.id}`,
          type: "user",
          content: post.prompt,
          timestamp: seedTimestamp,
        },
      ];

      // Add original AI responses (offset by 1ms so a sort by timestamp keeps
      // user → assistant order even when timestamps collide on the seed turn).
      if (post.responseA) {
        newMessages.push({
          id: isConversational ? `ai-${post.id}-conversational` : `ai-${post.id}-${responseAVariant}`,
          type: "ai",
          content: post.responseA,
          timestamp: new Date(seedTimestamp.getTime() + 1),
          variant: responseAVariant,
          isStreaming: false,
        });
      }
      if (post.responseB) {
        newMessages.push({
          id: `ai-${post.id}-business`,
          type: "ai",
          content: post.responseB,
          timestamp: new Date(seedTimestamp.getTime() + 2),
          variant: "business",
          isStreaming: false,
        });
      }

      // Add any follow-up messages from conversation history
      if (post.messages && post.messages.length > 0) {
        post.messages.forEach((msg) => {
          const msgTimestamp = msg.timestamp instanceof Date
            ? msg.timestamp
            : typeof (msg.timestamp as { toDate?: () => Date }).toDate === "function"
              ? (msg.timestamp as { toDate: () => Date }).toDate()
              : new Date();

          newMessages.push({
            id: msg.id,
            type: msg.role === "user" ? "user" : "ai",
            content: msg.content,
            timestamp: msgTimestamp,
            variant: msg.variant,
            isStreaming: false,
          });
        });
      }

      // Stable chronological sort. Equal timestamps keep their insertion order
      // (storyteller before business on a same-turn dual reply, user before
      // assistant on a same-second exchange) — Array.prototype.sort is stable
      // since ES2019, but we use indices anyway for clarity and to guard
      // against any host that still reorders ties.
      const indexed = newMessages.map((m, idx) => ({ m, idx }));
      indexed.sort((a, b) => {
        const diff = a.m.timestamp.getTime() - b.m.timestamp.getTime();
        return diff !== 0 ? diff : a.idx - b.idx;
      });
      setMessages(indexed.map((x) => x.m));

      // Set responses for compatibility
      setResponses([
        {
          title: "Version Storytelling",
          content: post.responseA,
          type: "storytelling",
        },
        {
          title: "Version Business",
          content: post.responseB,
          type: "business",
        },
      ]);

      setStreamingContent({
        storytelling: post.responseA,
        business: post.responseB,
        conversational: "",
      });
    },
    []
  );

  return {
    responses,
    messages,
    isLoading,
    isStreaming,
    generationPhase,
    generationPhaseMessage,
    streamingContent,
    error,
    generationCount,
    canGenerate,
    generate,
    stopGeneration,
    reset,
    loadConversation,
    lastPrompt,
    postId,
    insights,
    isFollowUp,
    regenerateSeedComment,
  };
}

// Hook to reset guest generation count (for testing)
export function useResetGuestCount() {
  return useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(GUEST_STORAGE_KEY);
    }
  }, []);
}
