"use client";

import { useRef, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface SwipeConfig {
  threshold?: number; // Minimum distance for swipe to trigger (default: 50px)
  allowedTime?: number; // Maximum time for swipe gesture (default: 300ms)
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  enableBackNavigation?: boolean; // Enable swipe right to go back
  disabled?: boolean;
}

interface SwipeState {
  startX: number;
  startY: number;
  startTime: number;
  isSwiping: boolean;
  direction: "left" | "right" | "up" | "down" | null;
  progress: number; // 0-1 for animation
}

export function useSwipeGesture(config: SwipeConfig = {}) {
  const {
    threshold = 50,
    allowedTime = 300,
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    enableBackNavigation = true,
    disabled = false,
  } = config;

  const router = useRouter();
  const stateRef = useRef<SwipeState>({
    startX: 0,
    startY: 0,
    startTime: 0,
    isSwiping: false,
    direction: null,
    progress: 0,
  });

  const [swipeProgress, setSwipeProgress] = useState(0);
  const [swipeDirection, setSwipeDirection] = useState<"left" | "right" | null>(null);

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (disabled) return;

      const touch = e.touches[0];
      stateRef.current = {
        startX: touch.clientX,
        startY: touch.clientY,
        startTime: Date.now(),
        isSwiping: true,
        direction: null,
        progress: 0,
      };
      setSwipeProgress(0);
      setSwipeDirection(null);
    },
    [disabled]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (disabled || !stateRef.current.isSwiping) return;

      const touch = e.touches[0];
      const state = stateRef.current;

      const deltaX = touch.clientX - state.startX;
      const deltaY = touch.clientY - state.startY;

      // Determine if horizontal or vertical swipe
      const isHorizontal = Math.abs(deltaX) > Math.abs(deltaY);

      if (isHorizontal) {
        // Calculate progress (0-1) based on threshold
        const progress = Math.min(Math.abs(deltaX) / (threshold * 2), 1);
        const direction = deltaX > 0 ? "right" : "left";

        stateRef.current.direction = direction;
        stateRef.current.progress = progress;

        setSwipeProgress(progress);
        setSwipeDirection(direction);

        // Prevent scrolling when swiping horizontally
        if (Math.abs(deltaX) > 10) {
          e.preventDefault();
        }
      }
    },
    [disabled, threshold]
  );

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      if (disabled || !stateRef.current.isSwiping) return;

      const state = stateRef.current;
      const touch = e.changedTouches[0];

      const deltaX = touch.clientX - state.startX;
      const deltaY = touch.clientY - state.startY;
      const elapsedTime = Date.now() - state.startTime;

      // Reset state
      stateRef.current.isSwiping = false;
      setSwipeProgress(0);
      setSwipeDirection(null);

      // Check if swipe is valid (within time and threshold)
      if (elapsedTime > allowedTime) return;

      const isHorizontal = Math.abs(deltaX) > Math.abs(deltaY);

      if (isHorizontal && Math.abs(deltaX) >= threshold) {
        if (deltaX > 0) {
          // Swipe right
          if (onSwipeRight) {
            onSwipeRight();
          } else if (enableBackNavigation) {
            router.back();
          }
        } else {
          // Swipe left
          if (onSwipeLeft) {
            onSwipeLeft();
          }
        }
      } else if (!isHorizontal && Math.abs(deltaY) >= threshold) {
        if (deltaY > 0) {
          // Swipe down
          onSwipeDown?.();
        } else {
          // Swipe up
          onSwipeUp?.();
        }
      }
    },
    [disabled, threshold, allowedTime, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, enableBackNavigation, router]
  );

  // Return handlers to attach to elements
  const bind = useCallback(() => {
    return {
      onTouchStart: (e: React.TouchEvent) => handleTouchStart(e.nativeEvent),
      onTouchMove: (e: React.TouchEvent) => handleTouchMove(e.nativeEvent),
      onTouchEnd: (e: React.TouchEvent) => handleTouchEnd(e.nativeEvent),
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return {
    bind,
    swipeProgress,
    swipeDirection,
    isSwiping: stateRef.current.isSwiping,
  };
}

// Hook for global swipe back navigation
export function useSwipeBack(enabled: boolean = true) {
  const router = useRouter();
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      // Only start swipe if starting from left edge (within 30px)
      if (touch.clientX <= 30) {
        touchStartRef.current = {
          x: touch.clientX,
          y: touch.clientY,
          time: Date.now(),
        };
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!touchStartRef.current) return;

      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaY = touch.clientY - touchStartRef.current.y;
      const elapsedTime = Date.now() - touchStartRef.current.time;

      touchStartRef.current = null;

      // Check for valid swipe right from edge
      if (
        deltaX > 80 && // Minimum distance
        Math.abs(deltaY) < 100 && // Not too vertical
        elapsedTime < 400 // Within time limit
      ) {
        router.back();
      }
    };

    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [enabled, router]);
}

// Hook for haptic feedback (vibration)
export function useHapticFeedback() {
  const trigger = useCallback((type: "light" | "medium" | "heavy" = "light") => {
    if (typeof navigator === "undefined" || !navigator.vibrate) return;

    const patterns = {
      light: 10,
      medium: 25,
      heavy: 50,
    };

    try {
      navigator.vibrate(patterns[type]);
    } catch {
      // Vibration not supported
    }
  }, []);

  return { trigger };
}
