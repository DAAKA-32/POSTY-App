"use client";

import { useEffect, useRef, RefObject, useCallback, useState } from "react";

interface UseSmartCenteringOptions {
  /** Whether the element is currently expanded */
  isExpanded: boolean;
  /** Delay before centering (to wait for expand animation) */
  delay?: number;
  /** Threshold to determine if centering is needed (px from viewport edges) */
  threshold?: number;
  /** Whether to enable centering */
  enabled?: boolean;
  /** Scroll behavior */
  behavior?: ScrollBehavior;
  /** Position target: 'center' or 'start' */
  position?: "center" | "start" | "nearest";
  /** Enable on mobile with adapted behavior */
  mobileEnabled?: boolean;
  /** Callback when centering completes */
  onCenterComplete?: () => void;
}

interface UseSmartCenteringReturn<T extends HTMLElement> {
  /** Ref to attach to the element that should be centered */
  elementRef: RefObject<T | null>;
  /** Manually trigger centering */
  centerElement: () => void;
  /** Whether the element is currently being centered */
  isCentering: boolean;
}

/**
 * Smart centering hook that automatically scrolls an expanded element
 * into a comfortable viewing position.
 *
 * Features:
 * - Only centers if element is not already well-positioned
 * - Smooth scroll animation
 * - Waits for expand animation to complete
 * - Respects user scroll intent
 * - Mobile-friendly with adapted positioning
 * - Callback when centering completes
 */
export function useSmartCentering<T extends HTMLElement = HTMLDivElement>({
  isExpanded,
  delay = 300,
  threshold = 80,
  enabled = true,
  behavior = "smooth",
  position = "center",
  mobileEnabled = true,
  onCenterComplete,
}: UseSmartCenteringOptions): UseSmartCenteringReturn<T> {
  const elementRef = useRef<T>(null);
  const previousExpandedRef = useRef(false);
  const userScrolledRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isCentering, setIsCentering] = useState(false);

  // Detect if mobile
  const isMobileRef = useRef(false);
  useEffect(() => {
    const checkMobile = () => {
      isMobileRef.current = window.innerWidth < 768;
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Track if user manually scrolled recently
  useEffect(() => {
    if (!enabled && !mobileEnabled) return;

    const handleUserScroll = () => {
      userScrolledRef.current = true;
      // Reset after a short delay
      setTimeout(() => {
        userScrolledRef.current = false;
      }, 400);
    };

    window.addEventListener("wheel", handleUserScroll, { passive: true });
    window.addEventListener("touchmove", handleUserScroll, { passive: true });

    return () => {
      window.removeEventListener("wheel", handleUserScroll);
      window.removeEventListener("touchmove", handleUserScroll);
    };
  }, [enabled, mobileEnabled]);

  // Calculate if element needs centering
  const needsCentering = useCallback((): boolean => {
    const element = elementRef.current;
    if (!element) return false;

    const rect = element.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const isMobile = isMobileRef.current;

    // Use smaller threshold on mobile
    const effectiveThreshold = isMobile ? threshold * 0.5 : threshold;

    // Check if element is too tall to fit in viewport
    const elementHeight = rect.height;
    const fitsInViewport = elementHeight < viewportHeight - effectiveThreshold * 2;

    if (fitsInViewport) {
      // Element fits - check if it's well positioned
      const isTopVisible = rect.top >= effectiveThreshold;
      const isBottomVisible = rect.bottom <= viewportHeight - effectiveThreshold;

      // If both top and bottom are visible with comfortable margins, no need to center
      if (isTopVisible && isBottomVisible) {
        return false;
      }
    } else {
      // Element is taller than viewport
      // Check if at least the top is visible with some margin
      const isTopInView = rect.top >= 0 && rect.top <= effectiveThreshold * 2;
      if (isTopInView) {
        return false;
      }
    }

    return true;
  }, [threshold]);

  // Center the element
  const centerElement = useCallback(() => {
    const element = elementRef.current;
    const isMobile = isMobileRef.current;
    const isEffectivelyEnabled = isMobile ? mobileEnabled : enabled;

    if (!element || !isEffectivelyEnabled) return;

    // Don't center if user just scrolled
    if (userScrolledRef.current) return;

    // Check if centering is actually needed
    if (!needsCentering()) {
      onCenterComplete?.();
      return;
    }

    setIsCentering(true);

    const rect = element.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const elementHeight = rect.height;
    const effectiveThreshold = isMobile ? threshold * 0.5 : threshold;

    // Calculate target scroll position
    let targetScrollY: number;

    if (elementHeight >= viewportHeight - effectiveThreshold * 2) {
      // Element is taller than viewport - scroll to show top with margin
      // On mobile, use smaller top margin for more content visibility
      const topMargin = isMobile ? 20 : effectiveThreshold;
      targetScrollY = window.scrollY + rect.top - topMargin;
    } else {
      // Element fits in viewport - center it
      // On mobile, position slightly higher (30% from top instead of 50%)
      const viewportPosition = isMobile ? viewportHeight * 0.3 : viewportHeight / 2;
      const elementCenter = rect.top + elementHeight / 2;
      const offset = elementCenter - viewportPosition;
      targetScrollY = window.scrollY + offset;
    }

    // Ensure we don't scroll past document bounds
    const maxScroll = document.documentElement.scrollHeight - viewportHeight;
    targetScrollY = Math.max(0, Math.min(targetScrollY, maxScroll));

    // Perform the scroll
    window.scrollTo({
      top: targetScrollY,
      behavior,
    });

    // Reset centering state after animation
    setTimeout(() => {
      setIsCentering(false);
      onCenterComplete?.();
    }, behavior === "smooth" ? 500 : 50);
  }, [enabled, mobileEnabled, behavior, threshold, needsCentering, onCenterComplete]);

  // Auto-center when element expands
  useEffect(() => {
    // Clear any pending timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    const isMobile = isMobileRef.current;
    const isEffectivelyEnabled = isMobile ? mobileEnabled : enabled;

    // Only trigger when transitioning from collapsed to expanded
    if (isExpanded && !previousExpandedRef.current && isEffectivelyEnabled) {
      // Wait for expand animation to complete
      // Use shorter delay on mobile for snappier feel
      const effectiveDelay = isMobile ? delay * 0.8 : delay;
      timeoutRef.current = setTimeout(() => {
        centerElement();
      }, effectiveDelay);
    }

    previousExpandedRef.current = isExpanded;

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isExpanded, enabled, mobileEnabled, delay, centerElement]);

  return {
    elementRef,
    centerElement,
    isCentering,
  };
}

/**
 * Hook to check if we're on a large screen (desktop/tablet)
 */
export function useIsLargeScreen(): boolean {
  const [isLargeScreen, setIsLargeScreen] = useState(true);

  useEffect(() => {
    const checkScreen = () => {
      // Consider 768px and above as "large screen"
      setIsLargeScreen(window.innerWidth >= 768);
    };

    checkScreen();
    window.addEventListener("resize", checkScreen);

    return () => {
      window.removeEventListener("resize", checkScreen);
    };
  }, []);

  return isLargeScreen;
}
