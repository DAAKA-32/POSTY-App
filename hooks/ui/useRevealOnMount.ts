"use client";

import { useEffect, useRef } from "react";

/**
 * Scroll the element into view once, when it mounts — only if part of it is
 * hidden (block: "nearest" is a no-op for something already fully visible).
 *
 * Used by the visual loaders: they appear under a post that is usually taller
 * than the viewport, so the progress label and bar landed below the fold /
 * behind the fixed composer and the user saw only an empty grey block.
 * Give the element a `scrollMarginBottom` (the composer's height) so "nearest"
 * stops above the composer instead of under it.
 *
 * Respects prefers-reduced-motion (instant jump instead of a smooth scroll).
 */
export function useRevealOnMount<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof el.scrollIntoView !== "function") return;
    const reduced =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // One frame later so the layout (and the framer entrance transform) settled.
    const id = requestAnimationFrame(() => {
      el.scrollIntoView({ block: "nearest", behavior: reduced ? "auto" : "smooth" });
    });
    return () => cancelAnimationFrame(id);
  }, []);

  return ref;
}

/** Height of the fixed composer + breathing room, in px (scroll-margin for the loaders). */
export const COMPOSER_CLEARANCE_PX = 180;
