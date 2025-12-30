"use client";

import { useState, useCallback } from "react";
import { getMockResponses } from "@/lib/mock-responses";
import { savePost } from "@/lib/firestore";
import { MockResponse } from "@/types";

const GUEST_GENERATION_LIMIT = 2;
const GUEST_STORAGE_KEY = "posty_guest_generations";

interface UseChatOptions {
  userId?: string;
  isGuest?: boolean;
}

interface UseChatReturn {
  responses: MockResponse[];
  isLoading: boolean;
  error: string | null;
  generationCount: number;
  canGenerate: boolean;
  generate: (prompt: string) => Promise<void>;
  reset: () => void;
  lastPrompt: string;
  postId: string | null;
}

export function useChat({ userId, isGuest = false }: UseChatOptions): UseChatReturn {
  const [responses, setResponses] = useState<MockResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastPrompt, setLastPrompt] = useState("");
  const [postId, setPostId] = useState<string | null>(null);

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

  // Generate responses
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

      setIsLoading(true);
      setError(null);
      setLastPrompt(prompt);
      setPostId(null);

      try {
        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 1500));

        // Get mock responses
        const mockResponses = getMockResponses(prompt);
        setResponses(mockResponses);

        // Increment guest count if applicable
        if (isGuest) {
          incrementGuestCount();
        }

        // Save to Firestore if user is logged in
        if (userId && !isGuest) {
          const newPostId = await savePost(
            userId,
            prompt,
            mockResponses[0].content,
            mockResponses[1].content
          );
          setPostId(newPostId);
        }
      } catch (err) {
        console.error("Generation error:", err);
        setError("Une erreur est survenue. Veuillez réessayer.");
      } finally {
        setIsLoading(false);
      }
    },
    [userId, isGuest, canGenerate, incrementGuestCount]
  );

  // Reset chat state
  const reset = useCallback(() => {
    setResponses([]);
    setError(null);
    setLastPrompt("");
    setPostId(null);
  }, []);

  return {
    responses,
    isLoading,
    error,
    generationCount,
    canGenerate,
    generate,
    reset,
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
