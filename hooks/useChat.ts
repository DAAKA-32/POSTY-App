"use client";

import { useState, useCallback, useRef } from "react";
import { savePost, addMessagesToConversation, getConversationHistory } from "@/lib/firestore";
import { MockResponse, PostInsights, ConversationTurn, FileAttachment } from "@/types";
import { getAuthHeaders } from "@/lib/api-client";

const GUEST_GENERATION_LIMIT = 2;
const GUEST_STORAGE_KEY = "posty_guest_generations";

// Message types for conversational display
export interface ConversationMessage {
  id: string;
  type: "user" | "ai";
  content: string;
  timestamp: Date;
  variant?: "storytelling" | "business";
  isStreaming?: boolean;
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
}

interface UseChatReturn {
  responses: MockResponse[];
  messages: ConversationMessage[];
  isLoading: boolean;
  isStreaming: boolean;
  streamingContent: StreamingContent;
  error: string | null;
  generationCount: number;
  canGenerate: boolean;
  generate: (prompt: string, file?: FileAttachment | null) => Promise<void>;
  reset: () => void;
  loadConversation: (post: { prompt: string; responseA: string; responseB: string; id: string; messages?: ConversationTurn[] }) => void;
  lastPrompt: string;
  postId: string | null;
  /** AI-generated insights about the post (all plans) */
  insights: PostInsights | null;
  /** True when continuing an existing conversation */
  isFollowUp: boolean;
}

export function useChat({
  userId,
  isGuest = false,
  conversationId: initialConversationId,
  dualMode = false,
  responseType = "business",
  selectedStyle = "business",
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
  const [lastPrompt, setLastPrompt] = useState("");
  const [postId, setPostId] = useState<string | null>(initialConversationId || null);
  const [insights, setInsights] = useState<PostInsights | null>(null);

  // Use selectedStyle, fallback to responseType for backwards compatibility
  const effectiveStyle = selectedStyle || responseType;

  // Abort controller for canceling streams
  const abortControllerRef = useRef<AbortController | null>(null);

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
    async (prompt: string, file?: FileAttachment | null) => {
      if (!prompt.trim()) {
        setError("Veuillez entrer une description");
        return;
      }

      if (isGuest && !canGenerate) {
        setError("Limite atteinte. Connectez-vous pour continuer.");
        return;
      }

      // Cancel any ongoing stream
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      setIsLoading(true);
      setIsStreaming(false);
      setError(null);
      setLastPrompt(prompt);
      setStreamingContent({ storytelling: "", business: "", conversational: "" });

      // Determine if this is a follow-up message in existing conversation
      const currentPostId = postId;
      const isExistingConversation = currentPostId !== null && messages.length > 0;

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
            dualMode,
            requestDualMode: dualMode, // Server-side dual mode enforcement
            responseType: effectiveStyle,
            selectedStyle: effectiveStyle,
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
          signal: abortControllerRef.current.signal,
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
            return; // Exit gracefully without error
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
                    } else if (dualMode && variantType === "storytelling") {
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
                    } else if (dualMode && variantType === "business") {
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
                    setMessages((prev) =>
                      prev.map((msg) =>
                        msg.id === messageIds[type]
                          ? { ...msg, isStreaming: false }
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

                  case "complete": {
                    setIsStreaming(false);

                    if (data.quota) {
                      console.log("Quota updated:", data.quota);
                    }

                    // Determine if this was a conversational response (SOCIAL/EXPLORATORY)
                    const isConversational = !!accumulatedContent.conversational;

                    // Set final responses based on mode
                    if (isConversational) {
                      // Conversational responses are not "posts" — store for display only
                      setResponses([{
                        title: "POSTY",
                        content: accumulatedContent.conversational,
                        type: "business", // fallback type for compatibility
                      }]);
                    } else if (dualMode) {
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
                      setResponses([
                        {
                          title: responseType === "storytelling"
                            ? "Version Storytelling"
                            : "Version Business",
                          content: accumulatedContent[responseType] || "",
                          type: responseType,
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
                        : dualMode
                          ? accumulatedContent.storytelling
                          : accumulatedContent[responseType] || "";

                      try {
                        if (isExistingConversation && currentPostId) {
                          // FOLLOW-UP: Add messages to existing conversation
                          const newMessages: ConversationTurn[] = [
                            {
                              id: userMessage.id,
                              role: "user",
                              content: prompt,
                              timestamp: userMessage.timestamp,
                            },
                            {
                              id: isConversational ? messageIds.conversational : messageIds.business,
                              role: "assistant",
                              content: primaryContent,
                              variant: isConversational ? undefined : (dualMode ? "storytelling" : responseType),
                              timestamp: new Date(),
                            },
                          ];

                          // Add business response if dual mode (not conversational)
                          if (!isConversational && dualMode && accumulatedContent.business) {
                            newMessages.push({
                              id: messageIds.storytelling,
                              role: "assistant",
                              content: accumulatedContent.business,
                              variant: "business",
                              timestamp: new Date(),
                            });
                          }

                          await addMessagesToConversation(currentPostId, newMessages);
                          // Keep the same postId - no new conversation created
                        } else {
                          // NEW CONVERSATION: Create new post
                          const newPostId = await savePost(
                            userId,
                            prompt,
                            primaryContent,
                            (!isConversational && dualMode) ? accumulatedContent.business : "",
                            {
                              responseMode: isConversational ? "conversational" : (dualMode ? "dual" : "single-choice"),
                              selectedStyle: (isConversational || dualMode) ? undefined : effectiveStyle,
                            }
                          );
                          setPostId(newPostId);
                        }
                      } catch (saveError) {
                        console.error("Failed to save:", saveError);
                        setError("Post généré mais non sauvegardé. Vérifiez votre connexion.");
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
          return;
        }
        console.error("Generation error:", err);
        setError("Une erreur est survenue. Veuillez réessayer.");
        setIsStreaming(false);
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    },
    [userId, isGuest, canGenerate, incrementGuestCount, dualMode, responseType, effectiveStyle, postId, messages.length]
  );

  // Reset chat state - starts a NEW conversation
  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setResponses([]);
    setMessages([]);
    setError(null);
    setLastPrompt("");
    setPostId(null); // Clear postId to start fresh
    setIsStreaming(false);
    setStreamingContent({ storytelling: "", business: "", conversational: "" });
    setInsights(null);
  }, []);

  // Load an existing conversation from a Post
  const loadConversation = useCallback(
    (post: { prompt: string; responseA: string; responseB: string; id: string; messages?: ConversationTurn[] }) => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      setIsStreaming(false);
      setIsLoading(false);
      setError(null);

      // CRITICAL: Set the post ID to enable conversation continuation
      setPostId(post.id);
      setLastPrompt(post.prompt);

      // Create messages from the original post
      const timestamp = new Date();
      const newMessages: ConversationMessage[] = [
        {
          id: `user-${post.id}`,
          type: "user",
          content: post.prompt,
          timestamp,
        },
      ];

      // Add original AI responses
      if (post.responseA) {
        newMessages.push({
          id: `ai-${post.id}-storytelling`,
          type: "ai",
          content: post.responseA,
          timestamp,
          variant: "storytelling",
          isStreaming: false,
        });
      }
      if (post.responseB) {
        newMessages.push({
          id: `ai-${post.id}-business`,
          type: "ai",
          content: post.responseB,
          timestamp,
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

      setMessages(newMessages);

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
    streamingContent,
    error,
    generationCount,
    canGenerate,
    generate,
    reset,
    loadConversation,
    lastPrompt,
    postId,
    insights,
    isFollowUp,
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
