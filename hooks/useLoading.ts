"use client";

import { useState, useCallback } from "react";

/**
 * Hook to manage loading states in components
 * Provides utilities for async operations with loading indicators
 */
export function useLoading(initialState = false) {
  const [isLoading, setIsLoading] = useState(initialState);
  const [error, setError] = useState<string | null>(null);

  const startLoading = useCallback(() => {
    setIsLoading(true);
    setError(null);
  }, []);

  const stopLoading = useCallback(() => {
    setIsLoading(false);
  }, []);

  const setLoadingError = useCallback((errorMessage: string) => {
    setError(errorMessage);
    setIsLoading(false);
  }, []);

  /**
   * Wraps an async function with loading state management
   */
  const withLoading = useCallback(
    async <T,>(asyncFn: () => Promise<T>): Promise<T | null> => {
      startLoading();
      try {
        const result = await asyncFn();
        stopLoading();
        return result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Une erreur est survenue";
        setLoadingError(errorMessage);
        return null;
      }
    },
    [startLoading, stopLoading, setLoadingError]
  );

  return {
    isLoading,
    error,
    startLoading,
    stopLoading,
    setLoadingError,
    withLoading,
  };
}

/**
 * Hook to manage multiple loading states
 * Useful for components with multiple async operations
 */
export function useMultipleLoading() {
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});

  const setLoading = useCallback((key: string, value: boolean) => {
    setLoadingStates((prev) => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  const isAnyLoading = Object.values(loadingStates).some((state) => state);

  return {
    loadingStates,
    setLoading,
    isAnyLoading,
    isLoading: (key: string) => loadingStates[key] || false,
  };
}
