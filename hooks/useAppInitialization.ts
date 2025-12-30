"use client";

import { useState, useEffect } from "react";

/**
 * Hook to manage app initialization state
 * Ensures app is fully loaded before hiding splash screen
 * Minimal display time: 800ms for smooth UX
 */
export function useAppInitialization() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [minLoadTimeElapsed, setMinLoadTimeElapsed] = useState(false);

  useEffect(() => {
    // Minimum splash screen display time (800ms for fast, smooth UX)
    const minLoadTime = setTimeout(() => {
      setMinLoadTimeElapsed(true);
    }, 800);

    // Check if document is fully loaded
    const checkReady = () => {
      if (document.readyState === "complete") {
        setIsInitialized(true);
      }
    };

    // Initial check
    checkReady();

    // Listen for load events
    window.addEventListener("load", checkReady);
    document.addEventListener("readystatechange", checkReady);

    return () => {
      clearTimeout(minLoadTime);
      window.removeEventListener("load", checkReady);
      document.removeEventListener("readystatechange", checkReady);
    };
  }, []);

  // App is ready when both conditions are met
  const isReady = isInitialized && minLoadTimeElapsed;

  return {
    isLoading: !isReady,
    isReady,
  };
}
