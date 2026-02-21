"use client";

import { useState, useCallback, useEffect } from "react";
import { getAuthHeaders } from "@/lib/api-client";

// ============== TYPES ==============

export interface OpenAIStatus {
  configured: boolean;
  models: Array<{ id: string; name: string; description: string }>;
  features: {
    postGeneration: boolean;
    chat: boolean;
    customApiKey: boolean;
  };
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

// ============== LOCAL STORAGE KEYS ==============

const STORAGE_KEYS = {
  API_KEY: "posty_openai_api_key",
  MODEL: "posty_openai_model",
} as const;

// ============== HOOK: useOpenAIConfig ==============

/**
 * Hook for managing OpenAI configuration (API key, model selection)
 */
export function useOpenAIConfig() {
  const [apiKey, setApiKeyState] = useState<string>("");
  const [model, setModelState] = useState<string>("gpt-4");
  const [isValidating, setIsValidating] = useState(false);
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [status, setStatus] = useState<OpenAIStatus | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedKey = localStorage.getItem(STORAGE_KEYS.API_KEY) || "";
      const storedModel = localStorage.getItem(STORAGE_KEYS.MODEL) || "gpt-4";
      setApiKeyState(storedKey);
      setModelState(storedModel);
      if (storedKey) {
        setIsValid(true); // Assume valid if stored
      }
    }
  }, []);

  // Fetch OpenAI status
  useEffect(() => {
    async function fetchStatus() {
      try {
        const response = await fetch("/api/openai/status");
        if (response.ok) {
          const data = await response.json();
          setStatus(data);
        }
      } catch (error) {
        console.error("Failed to fetch OpenAI status:", error);
      }
    }
    fetchStatus();
  }, []);

  // Save API key
  const setApiKey = useCallback(async (key: string) => {
    setApiKeyState(key);

    if (!key) {
      localStorage.removeItem(STORAGE_KEYS.API_KEY);
      setIsValid(null);
      return;
    }

    // Validate the key
    setIsValidating(true);
    try {
      const response = await fetch("/api/openai/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: key }),
      });
      const data = await response.json();

      if (data.valid) {
        localStorage.setItem(STORAGE_KEYS.API_KEY, key);
        setIsValid(true);
      } else {
        setIsValid(false);
      }
    } catch {
      setIsValid(false);
    } finally {
      setIsValidating(false);
    }
  }, []);

  // Save model preference
  const setModel = useCallback((newModel: string) => {
    setModelState(newModel);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.MODEL, newModel);
    }
  }, []);

  // Clear API key
  const clearApiKey = useCallback(() => {
    setApiKeyState("");
    setIsValid(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEYS.API_KEY);
    }
  }, []);

  return {
    apiKey,
    setApiKey,
    clearApiKey,
    model,
    setModel,
    isValidating,
    isValid,
    status,
    hasApiKey: !!apiKey || status?.configured,
  };
}

// ============== HOOK: useChat ==============

/**
 * Hook for conversational chat with OpenAI
 */
export function useChat(options?: { language?: "fr" | "en" }) {
  const { apiKey, model, hasApiKey } = useOpenAIConfig();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const language = options?.language || "fr";

  // Send a message and get streaming response
  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim()) return;

      setError(null);

      // Add user message
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: content.trim(),
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      // Prepare assistant message placeholder
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: "",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      try {
        const authHeaders = await getAuthHeaders();
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders },
          body: JSON.stringify({
            messages: [...messages, userMessage].map((m) => ({
              role: m.role,
              content: m.content,
            })),
            language,
            userApiKey: apiKey || undefined,
            model,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Chat failed");
        }

        // Handle SSE stream
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error("No response stream");
        }

        let fullContent = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = JSON.parse(line.slice(6));

              if (data.content) {
                fullContent += data.content;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMessage.id
                      ? { ...m, content: fullContent }
                      : m
                  )
                );
              }
            }
          }
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to send message";
        setError(errorMessage);

        // Remove the empty assistant message on error
        setMessages((prev) =>
          prev.filter((m) => m.id !== assistantMessage.id)
        );
      } finally {
        setIsLoading(false);
      }
    },
    [messages, apiKey, model, language]
  );

  // Clear chat history
  const clearChat = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return {
    messages,
    sendMessage,
    clearChat,
    isLoading,
    error,
    hasApiKey,
  };
}

// ============== HOOK: usePostGeneration ==============

/**
 * Hook for generating LinkedIn posts with streaming
 */
export function usePostGeneration(options?: { language?: "fr" | "en" }) {
  const { apiKey, model } = useOpenAIConfig();
  const [isGenerating, setIsGenerating] = useState(false);
  const [storytelling, setStorytelling] = useState("");
  const [business, setBusiness] = useState("");
  const [currentType, setCurrentType] = useState<
    "storytelling" | "business" | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const language = options?.language || "fr";

  // Generate posts
  const generate = useCallback(
    async (prompt: string, userProfile?: Record<string, string>) => {
      if (!prompt.trim()) return;

      setError(null);
      setStorytelling("");
      setBusiness("");
      setIsGenerating(true);

      try {
        const genAuthHeaders = await getAuthHeaders();
        const response = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...genAuthHeaders },
          body: JSON.stringify({
            prompt: prompt.trim(),
            language,
            userApiKey: apiKey || undefined,
            model,
            userProfile,
          }),
        });

        if (!response.ok) {
          throw new Error("Generation failed");
        }

        // Handle SSE stream
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error("No response stream");
        }

        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("event: ")) {
              const eventType = line.slice(7);
              continue;
            }

            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));

                if (data.type) {
                  setCurrentType(data.type);
                }

                if (data.content) {
                  if (data.type === "storytelling") {
                    setStorytelling((prev) => prev + data.content);
                  } else if (data.type === "business") {
                    setBusiness((prev) => prev + data.content);
                  }
                }

                if (data.message) {
                  setError(data.message);
                }
              } catch {
                // Ignore parse errors for partial data
              }
            }
          }
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to generate posts";
        setError(errorMessage);
      } finally {
        setIsGenerating(false);
        setCurrentType(null);
      }
    },
    [apiKey, model, language]
  );

  // Reset state
  const reset = useCallback(() => {
    setStorytelling("");
    setBusiness("");
    setError(null);
    setCurrentType(null);
  }, []);

  return {
    generate,
    reset,
    isGenerating,
    storytelling,
    business,
    currentType,
    error,
  };
}
