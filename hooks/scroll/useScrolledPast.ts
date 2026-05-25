import { useEffect, useRef, useState, type RefObject } from "react";

/**
 * Tracks whether the user has scrolled past a threshold.
 *
 * The hook needs to work for pages that scroll on `window` (because
 * `*-scroll-enabled` promotes `html` to the scroll container) AND for
 * pages that scroll on a wrapper `<div>` with `overflow-y: auto`. Rather
 * than asking callers which model they use, we attach a sentinel ref and
 * walk up the DOM from it to find the nearest scrollable ancestor, then
 * listen to both that ancestor and `window`.
 *
 * Returns `isScrolled: false` on the initial render so SSR / first paint
 * always start with the transparent header state.
 */
export function useScrolledPast(threshold = 8): {
  isScrolled: boolean;
  sentinelRef: RefObject<HTMLDivElement | null>;
} {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;

    let scrollParent: HTMLElement | null = node.parentElement;
    while (scrollParent && scrollParent !== document.body) {
      const overflowY = window.getComputedStyle(scrollParent).overflowY;
      if (overflowY === "auto" || overflowY === "scroll") break;
      scrollParent = scrollParent.parentElement;
    }
    if (scrollParent === document.body) scrollParent = null;

    const compute = () => {
      const wrapperTop = scrollParent?.scrollTop ?? 0;
      const windowTop = window.scrollY ?? 0;
      setIsScrolled(Math.max(wrapperTop, windowTop) > threshold);
    };

    compute();
    scrollParent?.addEventListener("scroll", compute, { passive: true });
    window.addEventListener("scroll", compute, { passive: true });

    return () => {
      scrollParent?.removeEventListener("scroll", compute);
      window.removeEventListener("scroll", compute);
    };
  }, [threshold]);

  return { isScrolled, sentinelRef };
}
