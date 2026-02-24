"use client";

import { useRef, useState, useEffect } from "react";

/**
 * useVisibilityObserver — IntersectionObserver hook for mobile scroll-based visibility.
 *
 * Used to show/hide message actions based on scroll position on mobile.
 * When a message enters the viewport (threshold %), actions appear with animation.
 * When it leaves, actions disappear.
 *
 * @param threshold - Percentage of element visible to trigger (0.0-1.0). Default 0.4
 * @param enabled - Only observe when true. Disabled on desktop (hover is used instead).
 */
export function useVisibilityObserver({
  threshold = 0.4,
  enabled = true,
}: {
  threshold?: number;
  enabled?: boolean;
} = {}) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setIsVisible(false);
      return;
    }

    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, enabled]);

  return { ref, isVisible };
}
