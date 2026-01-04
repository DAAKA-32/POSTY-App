"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useHapticFeedback } from "./useHapticFeedback";

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number; // Distance to pull before triggering refresh
  maxPull?: number; // Maximum pull distance
  disabled?: boolean;
}

interface PullToRefreshState {
  isPulling: boolean;
  isRefreshing: boolean;
  pullDistance: number;
  pullProgress: number; // 0-1 progress towards threshold
}

export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  maxPull = 120,
  disabled = false,
}: UsePullToRefreshOptions) {
  const [state, setState] = useState<PullToRefreshState>({
    isPulling: false,
    isRefreshing: false,
    pullDistance: 0,
    pullProgress: 0,
  });

  const { trigger: triggerHaptic } = useHapticFeedback();

  const startYRef = useRef(0);
  const currentYRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const canPullRef = useRef(false);
  const hasTriggeredHapticRef = useRef(false);

  // Check if we're at the top of the scroll container
  const isAtTop = useCallback(() => {
    if (!containerRef.current) return false;
    return containerRef.current.scrollTop <= 0;
  }, []);

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (disabled || state.isRefreshing) return;

      // Only allow pull to refresh when at the top
      if (!isAtTop()) {
        canPullRef.current = false;
        return;
      }

      canPullRef.current = true;
      startYRef.current = e.touches[0].clientY;
      currentYRef.current = startYRef.current;
      hasTriggeredHapticRef.current = false;

      setState((prev) => ({ ...prev, isPulling: true }));
    },
    [disabled, state.isRefreshing, isAtTop]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (disabled || state.isRefreshing || !canPullRef.current) return;

      currentYRef.current = e.touches[0].clientY;
      const diff = currentYRef.current - startYRef.current;

      // Only pull down (positive diff)
      if (diff <= 0) {
        setState((prev) => ({
          ...prev,
          pullDistance: 0,
          pullProgress: 0,
        }));
        return;
      }

      // Apply resistance to make it feel natural
      const resistance = 0.5;
      const resistedDiff = diff * resistance;
      const pullDistance = Math.min(resistedDiff, maxPull);
      const pullProgress = Math.min(pullDistance / threshold, 1);

      // Haptic feedback when reaching threshold
      if (pullProgress >= 1 && !hasTriggeredHapticRef.current) {
        triggerHaptic("medium");
        hasTriggeredHapticRef.current = true;
      }

      // Prevent scrolling while pulling
      if (diff > 10) {
        e.preventDefault();
      }

      setState((prev) => ({
        ...prev,
        pullDistance,
        pullProgress,
      }));
    },
    [disabled, state.isRefreshing, maxPull, threshold, triggerHaptic]
  );

  const handleTouchEnd = useCallback(async () => {
    if (disabled || state.isRefreshing || !canPullRef.current) return;

    canPullRef.current = false;

    // Check if threshold was reached
    if (state.pullProgress >= 1) {
      setState((prev) => ({
        ...prev,
        isRefreshing: true,
        pullDistance: threshold, // Keep at threshold during refresh
      }));

      try {
        await onRefresh();
        triggerHaptic("success");
      } catch (error) {
        triggerHaptic("error");
        console.error("Pull to refresh error:", error);
      }
    }

    // Reset state
    setState({
      isPulling: false,
      isRefreshing: false,
      pullDistance: 0,
      pullProgress: 0,
    });
  }, [disabled, state.isRefreshing, state.pullProgress, threshold, onRefresh, triggerHaptic]);

  // Attach event listeners
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const touchStartHandler = (e: TouchEvent) => handleTouchStart(e);
    const touchMoveHandler = (e: TouchEvent) => handleTouchMove(e);
    const touchEndHandler = () => handleTouchEnd();

    container.addEventListener("touchstart", touchStartHandler, { passive: true });
    container.addEventListener("touchmove", touchMoveHandler, { passive: false });
    container.addEventListener("touchend", touchEndHandler, { passive: true });

    return () => {
      container.removeEventListener("touchstart", touchStartHandler);
      container.removeEventListener("touchmove", touchMoveHandler);
      container.removeEventListener("touchend", touchEndHandler);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return {
    containerRef,
    ...state,
  };
}

export default usePullToRefresh;
