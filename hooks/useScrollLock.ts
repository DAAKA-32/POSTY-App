"use client";

import { useEffect, useCallback, useRef } from "react";

/**
 * Centralized scroll lock management
 *
 * USE THIS HOOK instead of directly manipulating document.body.style.overflow
 *
 * Features:
 * - Uses CSS class instead of inline styles (more reliable)
 * - Tracks scroll position to restore after unlock
 * - Handles multiple locks (counter-based)
 * - Desktop-aware (doesn't break mouse wheel scroll)
 */

// Global counter to handle nested scroll locks
let lockCount = 0;
let scrollPosition = 0;

/**
 * Lock the scroll (for modals, sheets, menus)
 */
export function lockScroll(): void {
  if (typeof window === "undefined") return;

  // Only lock once, even if called multiple times
  if (lockCount === 0) {
    // Save current scroll position
    scrollPosition = window.scrollY;

    // Add lock class to html (CSS handles the rest)
    document.documentElement.classList.add("scroll-locked");
    document.body.classList.add("scroll-locked");

    // Set top to maintain visual position
    document.body.style.top = `-${scrollPosition}px`;
  }

  lockCount++;
}

/**
 * Unlock the scroll
 */
export function unlockScroll(): void {
  if (typeof window === "undefined") return;

  lockCount = Math.max(0, lockCount - 1);

  // Only unlock when all locks are released
  if (lockCount === 0) {
    // Remove lock class
    document.documentElement.classList.remove("scroll-locked");
    document.body.classList.remove("scroll-locked");

    // Reset top style
    document.body.style.top = "";

    // Restore scroll position
    window.scrollTo(0, scrollPosition);
  }
}

/**
 * Force unlock all scroll locks (use with caution)
 */
export function forceUnlockScroll(): void {
  if (typeof window === "undefined") return;

  lockCount = 0;
  document.documentElement.classList.remove("scroll-locked");
  document.body.classList.remove("scroll-locked");
  document.body.style.top = "";
}

/**
 * Hook to manage scroll lock for a component
 *
 * @param isLocked - Whether scroll should be locked
 *
 * @example
 * // In a modal component:
 * useScrollLock(isOpen);
 */
export function useScrollLock(isLocked: boolean): void {
  const wasLockedRef = useRef(false);

  useEffect(() => {
    if (isLocked && !wasLockedRef.current) {
      lockScroll();
      wasLockedRef.current = true;
    } else if (!isLocked && wasLockedRef.current) {
      unlockScroll();
      wasLockedRef.current = false;
    }

    // Cleanup on unmount
    return () => {
      if (wasLockedRef.current) {
        unlockScroll();
        wasLockedRef.current = false;
      }
    };
  }, [isLocked]);
}

/**
 * Hook that returns lock/unlock functions
 * Use when you need manual control
 *
 * @example
 * const { lock, unlock } = useScrollLockControls();
 * // Later:
 * lock();
 * // ...
 * unlock();
 */
export function useScrollLockControls() {
  const isLockedRef = useRef(false);

  const lock = useCallback(() => {
    if (!isLockedRef.current) {
      lockScroll();
      isLockedRef.current = true;
    }
  }, []);

  const unlock = useCallback(() => {
    if (isLockedRef.current) {
      unlockScroll();
      isLockedRef.current = false;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isLockedRef.current) {
        unlockScroll();
      }
    };
  }, []);

  return { lock, unlock, isLocked: isLockedRef.current };
}

export default useScrollLock;
