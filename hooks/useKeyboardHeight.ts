"use client";

import { useState, useEffect } from "react";

/**
 * Hook to detect virtual keyboard height on mobile devices
 * Returns keyboard height and whether keyboard is visible
 *
 * Works by comparing window.innerHeight with visualViewport.height
 * When keyboard opens, visualViewport.height decreases
 */
export function useKeyboardHeight() {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    // Only run on client-side
    if (typeof window === "undefined") return;

    // Check if Visual Viewport API is supported
    if (!window.visualViewport) {
      return;
    }

    const handleViewportChange = () => {
      // Get the current viewport height and window height
      const viewport = window.visualViewport;
      const windowHeight = window.innerHeight;
      const viewportHeight = viewport?.height || windowHeight;

      // Calculate keyboard height
      // When keyboard is open, viewportHeight < windowHeight
      const currentKeyboardHeight = Math.max(0, windowHeight - viewportHeight);

      // Update state
      setKeyboardHeight(currentKeyboardHeight);
      setIsKeyboardVisible(currentKeyboardHeight > 0);

      // Set CSS custom property for use in styles
      if (typeof document !== "undefined") {
        document.documentElement.style.setProperty(
          "--keyboard-height",
          `${currentKeyboardHeight}px`
        );
      }
    };

    // Listen to viewport resize events
    window.visualViewport?.addEventListener("resize", handleViewportChange);
    window.visualViewport?.addEventListener("scroll", handleViewportChange);

    // Initial check
    handleViewportChange();

    // Cleanup
    return () => {
      window.visualViewport?.removeEventListener("resize", handleViewportChange);
      window.visualViewport?.removeEventListener("scroll", handleViewportChange);
    };
  }, []);

  return { keyboardHeight, isKeyboardVisible };
}
