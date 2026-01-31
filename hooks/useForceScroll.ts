"use client";

import { useLayoutEffect, useCallback } from "react";
import { usePathname } from "next/navigation";

/**
 * Hook to force enable scrolling on specific pages
 *
 * PROBLEM SOLVED:
 * - useEffect runs AFTER the first paint, causing a brief scroll-blocked state
 * - Client-side navigation doesn't trigger a reflow, so scroll stays blocked
 * - Pages need to override PWA mobile scroll restrictions
 *
 * SOLUTION:
 * - Uses useLayoutEffect to run BEFORE the browser paints
 * - Forces a DOM reflow to ensure styles are recalculated
 * - Removes conflicting scroll-blocking classes
 * - Works on both initial load AND client-side navigation
 *
 * @example
 * // In a page component that needs scrolling:
 * useForceScroll();
 */
export function useForceScroll(): void {
  const pathname = usePathname();

  // Force a DOM reflow to ensure style recalculation
  const forceReflow = useCallback(() => {
    if (typeof window === "undefined") return;

    // Reading offsetHeight forces the browser to recalculate layout
    // This is a standard technique to force reflow
    void document.body.offsetHeight;

    // Also trigger a style recalculation via requestAnimationFrame
    requestAnimationFrame(() => {
      void document.body.offsetHeight;
    });
  }, []);

  // Apply scroll-enabling classes
  const enableScroll = useCallback(() => {
    if (typeof document === "undefined") return;

    // 1. Remove any scroll-blocking classes first
    document.body.classList.remove(
      "pwa-mobile",
      "no-scroll",
      "scroll-locked",
      "sidebar-open"
    );
    document.documentElement.classList.remove(
      "scroll-locked",
      "no-scroll"
    );

    // 2. Add force-scroll-enabled to both html and body
    document.documentElement.classList.add("force-scroll-enabled");
    document.body.classList.add("force-scroll-enabled");

    // 3. Force a reflow to ensure styles are applied
    forceReflow();

    // 4. Double-check after a short delay (handles race conditions with other effects)
    setTimeout(() => {
      if (!document.body.classList.contains("force-scroll-enabled")) {
        document.body.classList.add("force-scroll-enabled");
      }
      if (!document.documentElement.classList.contains("force-scroll-enabled")) {
        document.documentElement.classList.add("force-scroll-enabled");
      }
      // Remove pwa-mobile again in case it was re-added
      document.body.classList.remove("pwa-mobile");
      forceReflow();
    }, 50);
  }, [forceReflow]);

  // Cleanup function
  const disableScroll = useCallback(() => {
    if (typeof document === "undefined") return;

    document.documentElement.classList.remove("force-scroll-enabled");
    document.body.classList.remove("force-scroll-enabled");
  }, []);

  // Use useLayoutEffect to run BEFORE the browser paints
  // This is critical - useEffect would run AFTER paint, causing visual glitch
  useLayoutEffect(() => {
    enableScroll();

    // Cleanup on unmount or route change
    return () => {
      disableScroll();
    };
  }, [pathname, enableScroll, disableScroll]);

  // Also run on route changes via a separate effect
  // This ensures scroll is re-enabled after client-side navigation
  useLayoutEffect(() => {
    // Small delay to ensure the route change is complete
    const timer = setTimeout(() => {
      enableScroll();
    }, 0);

    return () => clearTimeout(timer);
  }, [pathname, enableScroll]);
}

/**
 * Alternative hook for pages that want more control
 * Returns functions to manually enable/disable scroll
 */
export function useForceScrollControls() {
  const forceReflow = useCallback(() => {
    if (typeof window === "undefined") return;
    void document.body.offsetHeight;
    requestAnimationFrame(() => {
      void document.body.offsetHeight;
    });
  }, []);

  const enableScroll = useCallback(() => {
    if (typeof document === "undefined") return;

    document.body.classList.remove("pwa-mobile", "no-scroll", "scroll-locked");
    document.documentElement.classList.remove("scroll-locked", "no-scroll");
    document.documentElement.classList.add("force-scroll-enabled");
    document.body.classList.add("force-scroll-enabled");
    forceReflow();
  }, [forceReflow]);

  const disableScroll = useCallback(() => {
    if (typeof document === "undefined") return;

    document.documentElement.classList.remove("force-scroll-enabled");
    document.body.classList.remove("force-scroll-enabled");
  }, [forceReflow]);

  return { enableScroll, disableScroll, forceReflow };
}

export default useForceScroll;
