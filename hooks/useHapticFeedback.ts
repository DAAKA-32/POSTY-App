"use client";

import { useCallback } from "react";

export type HapticType = "light" | "medium" | "heavy" | "success" | "error" | "warning" | "selection" | "impact";

interface HapticPattern {
  pattern: number | number[];
  description: string;
}

const HAPTIC_PATTERNS: Record<HapticType, HapticPattern> = {
  light: {
    pattern: 10,
    description: "Light tap for subtle feedback",
  },
  medium: {
    pattern: 25,
    description: "Medium tap for standard interactions",
  },
  heavy: {
    pattern: 50,
    description: "Heavy tap for important actions",
  },
  success: {
    pattern: [10, 50, 10, 50, 10],
    description: "Success pattern - double pulse",
  },
  error: {
    pattern: [100, 50, 100],
    description: "Error pattern - strong double vibration",
  },
  warning: {
    pattern: [50, 30, 50],
    description: "Warning pattern - attention needed",
  },
  selection: {
    pattern: 5,
    description: "Very light tap for selection changes",
  },
  impact: {
    pattern: 35,
    description: "Single firm impact for confirmations",
  },
};

/**
 * Hook for haptic feedback (vibration) on mobile devices
 *
 * Usage:
 * ```tsx
 * const { trigger, isSupported } = useHapticFeedback();
 *
 * // In event handlers:
 * onClick={() => {
 *   trigger('medium');
 *   // ... rest of handler
 * }}
 *
 * // On success:
 * trigger('success');
 *
 * // On error:
 * trigger('error');
 * ```
 */
export function useHapticFeedback() {
  // Check if vibration is supported
  const isSupported = typeof navigator !== "undefined" && "vibrate" in navigator;

  const trigger = useCallback((type: HapticType = "light") => {
    if (!isSupported) return false;

    const { pattern } = HAPTIC_PATTERNS[type];

    try {
      navigator.vibrate(pattern);
      return true;
    } catch {
      // Vibration failed (e.g., user has disabled haptics)
      return false;
    }
  }, [isSupported]);

  // Stop any ongoing vibration
  const stop = useCallback(() => {
    if (!isSupported) return;
    try {
      navigator.vibrate(0);
    } catch {
      // Ignore errors
    }
  }, [isSupported]);

  // Trigger a custom pattern
  const triggerCustom = useCallback((pattern: number | number[]) => {
    if (!isSupported) return false;
    try {
      navigator.vibrate(pattern);
      return true;
    } catch {
      return false;
    }
  }, [isSupported]);

  return {
    trigger,
    stop,
    triggerCustom,
    isSupported,
  };
}

/**
 * Check if haptic feedback is supported (imperative)
 */
export function isHapticSupported(): boolean {
  return typeof navigator !== "undefined" && "vibrate" in navigator;
}

/**
 * Trigger haptic feedback imperatively (outside React context)
 * Useful for event handlers that don't have access to the hook
 */
export function triggerHaptic(type: HapticType = "light"): boolean {
  if (!isHapticSupported()) return false;

  const { pattern } = HAPTIC_PATTERNS[type];

  try {
    navigator.vibrate(pattern);
    return true;
  } catch {
    return false;
  }
}

/**
 * Higher-order function to wrap event handlers with haptic feedback
 *
 * Usage:
 * ```tsx
 * <button onClick={withHaptic(handleClick, 'medium')}>
 *   Click me
 * </button>
 * ```
 */
export function withHaptic<T extends (...args: unknown[]) => unknown>(
  handler: T,
  type: HapticType = "light"
): (...args: Parameters<T>) => ReturnType<T> {
  return (...args: Parameters<T>): ReturnType<T> => {
    triggerHaptic(type);
    return handler(...args) as ReturnType<T>;
  };
}

/**
 * Stop any ongoing vibration (imperative)
 */
export function stopHaptic(): void {
  if (!isHapticSupported()) return;
  try {
    navigator.vibrate(0);
  } catch {
    // Ignore errors
  }
}

export default useHapticFeedback;
