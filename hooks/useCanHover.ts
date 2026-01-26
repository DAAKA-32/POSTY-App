"use client";

import { useEffect, useState } from "react";

/**
 * Hook to detect if device supports hover (has a mouse/fine pointer)
 * Returns true for desktop with mouse, false for touch-only devices
 *
 * Use this to conditionally enable hover effects only on capable devices
 */
export function useCanHover(): boolean {
  const [canHover, setCanHover] = useState(false);

  useEffect(() => {
    // Check if window is available (client-side only)
    if (typeof window === "undefined") return;

    // Check media query for hover capability
    // (hover: hover) = device has hover capability
    // (pointer: fine) = device has precise pointer (mouse, not touch)
    const hoverQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
    setCanHover(hoverQuery.matches);

    // Listen for changes (e.g., connecting/disconnecting mouse)
    const handleChange = (e: MediaQueryListEvent) => {
      setCanHover(e.matches);
    };

    hoverQuery.addEventListener("change", handleChange);

    return () => {
      hoverQuery.removeEventListener("change", handleChange);
    };
  }, []);

  return canHover;
}

/**
 * Hook to detect if device is touch-only (no mouse)
 * Returns true for mobile/tablet, false for desktop with mouse
 */
export function useIsTouchDevice(): boolean {
  const [isTouch, setIsTouch] = useState(true); // Default to touch for SSR/mobile-first

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check for coarse pointer (finger) and no hover capability
    const touchQuery = window.matchMedia("(hover: none) and (pointer: coarse)");
    setIsTouch(touchQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setIsTouch(e.matches);
    };

    touchQuery.addEventListener("change", handleChange);

    return () => {
      touchQuery.removeEventListener("change", handleChange);
    };
  }, []);

  return isTouch;
}
