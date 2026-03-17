"use client";

import { useEffect, useCallback } from "react";

/**
 * Hook to prevent pull-to-refresh and elastic bounce on touch devices.
 * Use this on pages where:
 * - All content fits in the viewport (no scrolling needed)
 * - Pull-to-refresh would disrupt the user experience
 * - The page should feel like a native app screen
 *
 * Examples: Login, Signup, Onboarding, Splash screens
 */
export function usePreventPullToRefresh(enabled: boolean = true) {
  // Prevent touchmove that would trigger pull-to-refresh
  const preventTouchMove = useCallback((e: TouchEvent) => {
    // Only prevent if the touch is at the top of the page and moving down
    // or at the bottom and moving up (overscroll areas)
    const target = e.target as HTMLElement;

    // Allow touch on interactive elements (inputs, buttons, links)
    if (
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.tagName === "BUTTON" ||
      target.tagName === "A" ||
      target.closest("input") ||
      target.closest("textarea") ||
      target.closest("button") ||
      target.closest("a")
    ) {
      return;
    }

    // Check if we're at the boundaries
    const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight || document.body.scrollHeight;
    const clientHeight = document.documentElement.clientHeight || window.innerHeight;

    // If at top and trying to scroll up, or at bottom and trying to scroll down
    const isAtTop = scrollTop <= 0;
    const isAtBottom = scrollTop + clientHeight >= scrollHeight;

    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const startY = (e as TouchEvent & { startY?: number }).startY || touch.clientY;
      const currentY = touch.clientY;
      const deltaY = currentY - startY;

      // Pulling down at top (pull-to-refresh) or pulling up at bottom
      if ((isAtTop && deltaY > 0) || (isAtBottom && deltaY < 0)) {
        e.preventDefault();
      }
    }
  }, []);

  // Store touch start position
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (e.touches.length === 1) {
      (e as TouchEvent & { startY?: number }).startY = e.touches[0].clientY;
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    // Add no-scroll class to body
    document.body.classList.add("no-scroll");

    // Set CSS properties
    document.body.style.position = "fixed";
    document.body.style.width = "100%";
    document.body.style.height = "100%";
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";

    // Add touch event listeners
    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchmove", preventTouchMove, { passive: false });

    return () => {
      // Remove no-scroll class from body
      document.body.classList.remove("no-scroll");

      // Reset CSS properties
      document.body.style.position = "";
      document.body.style.width = "";
      document.body.style.height = "";
      document.body.style.overflow = "";
      document.body.style.overscrollBehavior = "";

      // Remove touch event listeners
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", preventTouchMove);
    };
  }, [enabled, handleTouchStart, preventTouchMove]);
}

/**
 * Simpler version that just adds CSS classes without touch event handling.
 * Use when you only need to prevent overscroll via CSS.
 */
export function useNoScroll(enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return;

    const originalStyle = {
      overflow: document.body.style.overflow,
      position: document.body.style.position,
      width: document.body.style.width,
      height: document.body.style.height,
    };

    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.width = "100%";
    document.body.style.height = "100%";
    document.body.classList.add("no-scroll");

    return () => {
      document.body.style.overflow = originalStyle.overflow;
      document.body.style.position = originalStyle.position;
      document.body.style.width = originalStyle.width;
      document.body.style.height = originalStyle.height;
      document.body.classList.remove("no-scroll");
    };
  }, [enabled]);
}

export default usePreventPullToRefresh;
