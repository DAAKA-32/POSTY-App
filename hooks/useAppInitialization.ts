"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Hook to manage app initialization state
 * - Landing page (/) : NO splash screen, instant display
 * - App pages : Minimal splash for smooth transition (100ms)
 */
export function useAppInitialization() {
  const pathname = usePathname();
  // Start as initialized for SSR, then verify on client
  const [isInitialized, setIsInitialized] = useState(false);
  const [minLoadTimeElapsed, setMinLoadTimeElapsed] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Landing page gets instant display - no splash
  const isLandingPage = pathname === "/" || pathname === "/login" || pathname === "/signup";

  useEffect(() => {
    setIsMounted(true);

    // For landing/auth pages: instant (no delay)
    // For app pages: minimal delay (100ms) for smooth DOM transition
    const minLoadDelay = isLandingPage ? 0 : 100;

    const minLoadTime = setTimeout(() => {
      setMinLoadTimeElapsed(true);
    }, minLoadDelay);

    // Check if document is fully loaded
    const checkReady = () => {
      if (typeof document !== "undefined" &&
          (document.readyState === "complete" || document.readyState === "interactive")) {
        setIsInitialized(true);
      }
    };

    // Initial check
    checkReady();

    // Listen for load events
    if (typeof window !== "undefined") {
      window.addEventListener("load", checkReady);
      document.addEventListener("readystatechange", checkReady);
    }

    return () => {
      clearTimeout(minLoadTime);
      if (typeof window !== "undefined") {
        window.removeEventListener("load", checkReady);
        document.removeEventListener("readystatechange", checkReady);
      }
    };
  }, [isLandingPage]);

  // Server-side or before mount: show content for landing pages
  if (!isMounted) {
    return {
      isLoading: !isLandingPage,
      isReady: isLandingPage,
      isLandingPage,
    };
  }

  // Landing page: ready immediately if DOM is interactive
  // App pages: ready when both conditions met
  const isReady = isLandingPage
    ? (isInitialized || (typeof document !== "undefined" && document.readyState !== "loading"))
    : (isInitialized && minLoadTimeElapsed);

  return {
    isLoading: !isReady,
    isReady,
    isLandingPage,
  };
}
