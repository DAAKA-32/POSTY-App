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

    // Coalesce scroll events into at most one computation per frame (rAF).
    // Without this, every scroll event runs a layout read (scrollTop/scrollY)
    // on the main thread, competing with the scroll itself and adding jank on
    // long lists / mobile. This header hook is mounted on many pages.
    let rafId = 0;
    const onScroll = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        compute();
      });
    };

    compute();
    scrollParent?.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      scrollParent?.removeEventListener("scroll", onScroll);
      window.removeEventListener("scroll", onScroll);
    };
  }, [threshold]);

  return { isScrolled, sentinelRef };
}
