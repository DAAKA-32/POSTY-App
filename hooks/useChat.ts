"use client";

import { useState, useCallback, useRef } from "react";
import { savePost } from "@/lib/firestore";
import { MockResponse } from "@/types";

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
}

interface UseChatOptions {
  userId?: string;
  isGuest?: boolean;
  conversationId?: string;
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
  generate: (prompt: string) => Promise<void>;
  reset: () => void;
  loadConversation: (post: { prompt: string; responseA: string; responseB: string; id: string }) => void;
  lastPrompt: string;
  postId: string | null;
}

export function useChat({ userId, isGuest = false }: UseChatOptions): UseChatReturn {
  const [responses, setResponses] = useState<MockResponse[]>([]);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState<StreamingContent>({
    storytelling: "",
    business: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [lastPrompt, setLastPrompt] = useState("");
  const [postId, setPostId] = useState<string | null>(null);

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

  // Generate responses with streaming
  const generate = useCallback(
    async (prompt: string) => {
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
      setPostId(null);
      setStreamingContent({ storytelling: "", business: "" });

      // Add user message to conversation
      const userMessage: ConversationMessage = {
        id: `user-${Date.now()}`,
        type: "user",
        content: prompt,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);

      // Track accumulated content for saving
      const accumulatedContent = { storytelling: "", business: "" };
      const messageIds = {
        storytelling: `ai-${Date.now()}-storytelling`,
        business: `ai-${Date.now()}-business`,
      };

      try {
        const response = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          throw new Error("Generation failed");
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
          buffer = lines.pop() || ""; // Keep incomplete line in buffer

          for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            if (line.startsWith("event:")) {
              const eventType = line.slice(6).trim();
              const dataLine = lines[i + 1];

              if (dataLine && dataLine.startsWith("data:")) {
                const data = JSON.parse(dataLine.slice(5).trim());

                switch (eventType) {
                  case "start": {
                    // Add empty streaming message
                    const newMessage: ConversationMessage = {
                      id: messageIds[data.type as keyof typeof messageIds],
                      type: "ai",
                      content: "",
                      timestamp: new Date(),
                      variant: data.type,
                      isStreaming: true,
                    };
                    setMessages((prev) => [...prev, newMessage]);
                    break;
                  }

                  case "chunk": {
                    const type = data.type as "storytelling" | "business";
                    accumulatedContent[type] += data.content;

                    // Update streaming content state
                    setStreamingContent((prev) => ({
                      ...prev,
                      [type]: accumulatedContent[type],
                    }));

                    // Update message content
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
                    // Mark message as no longer streaming
                    setMessages((prev) =>
                      prev.map((msg) =>
                        msg.id === messageIds[type]
                          ? { ...msg, isStreaming: false }
                          : msg
                      )
                    );
                    break;
                  }

                  case "complete": {
                    // All responses done - finalize
                    setIsStreaming(false);

                    // Set final responses
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

                    // Increment guest count if applicable
                    if (isGuest) {
                      incrementGuestCount();
                    }

                    // Save to Firestore if user is logged in
                    if (userId && !isGuest) {
                      try {
                        const newPostId = await savePost(
                          userId,
                          prompt,
                          accumulatedContent.storytelling,
                          accumulatedContent.business
                        );
                        setPostId(newPostId);
                      } catch (saveError) {
                        console.error("Failed to save post:", saveError);
                      }
                    }
                    break;
                  }

                  case "error": {
                    throw new Error(data.message || "Generation failed");
                  }
                }

                i++; // Skip the data line we just processed
              }
            }
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          // Request was cancelled, ignore
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
    [userId, isGuest, canGenerate, incrementGuestCount]
  );

  // Reset chat state
  const reset = useCallback(() => {
    // Cancel any ongoing stream
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setResponses([]);
    setMessages([]);
    setError(null);
    setLastPrompt("");
    setPostId(null);
    setIsStreaming(false);
    setStreamingContent({ storytelling: "", business: "" });
  }, []);

  // Load an existing conversation from a Post
  const loadConversation = useCallback(
    (post: { prompt: string; responseA: string; responseB: string; id: string }) => {
      // Reset any current state
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      setIsStreaming(false);
      setIsLoading(false);
      setError(null);

      // Set the post ID
      setPostId(post.id);
      setLastPrompt(post.prompt);

      // Create messages from the post
      const timestamp = new Date();
      const newMessages: ConversationMessage[] = [
        {
          id: `user-${post.id}`,
          type: "user",
          content: post.prompt,
          timestamp,
        },
        {
          id: `ai-${post.id}-storytelling`,
          type: "ai",
          content: post.responseA,
          timestamp,
          variant: "storytelling",
          isStreaming: false,
        },
        {
          id: `ai-${post.id}-business`,
          type: "ai",
          content: post.responseB,
          timestamp,
          variant: "business",
          isStreaming: false,
        },
      ];

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
