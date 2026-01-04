"use client";

import { useRef, useCallback, useState } from "react";
import { triggerHaptic } from "./useHapticFeedback";

interface UseLongPressOptions {
  /** Callback when long press is triggered */
  onLongPress: () => void;
  /** Callback for regular tap/click */
  onClick?: () => void;
  /** Duration in ms before long press triggers (default: 500ms) */
  duration?: number;
  /** Whether long press is disabled */
  disabled?: boolean;
  /** Enable haptic feedback on long press */
  haptic?: boolean;
  /** Haptic type when long press triggers */
  hapticType?: "light" | "medium" | "heavy" | "impact";
}

interface LongPressState {
  isLongPressing: boolean;
  progress: number; // 0-1 progress of long press
}

/**
 * Hook for long press gesture detection
 *
 * Usage:
 * ```tsx
 * const longPress = useLongPress({
 *   onLongPress: () => showContextMenu(),
 *   onClick: () => handleTap(),
 *   duration: 500,
 *   haptic: true,
 * });
 *
 * <div {...longPress.handlers}>
 *   Hold me
 * </div>
 * ```
 */
export function useLongPress({
  onLongPress,
  onClick,
  duration = 500,
  disabled = false,
  haptic = true,
  hapticType = "medium",
}: UseLongPressOptions) {
  const [state, setState] = useState<LongPressState>({
    isLongPressing: false,
    progress: 0,
  });

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressTriggeredRef = useRef(false);
  const startTimeRef = useRef(0);
  const startPositionRef = useRef({ x: 0, y: 0 });

  // Cancel long press
  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    setState({ isLongPressing: false, progress: 0 });
  }, []);

  // Start long press detection
  const start = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      if (disabled) return;

      // Get start position to detect movement
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
      startPositionRef.current = { x: clientX, y: clientY };

      isLongPressTriggeredRef.current = false;
      startTimeRef.current = Date.now();

      setState({ isLongPressing: true, progress: 0 });

      // Update progress for visual feedback
      const updateInterval = 16; // ~60fps
      progressIntervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current;
        const progress = Math.min(elapsed / duration, 1);
        setState((prev) => ({ ...prev, progress }));
      }, updateInterval);

      // Set timer for long press
      timerRef.current = setTimeout(() => {
        isLongPressTriggeredRef.current = true;

        // Trigger haptic feedback
        if (haptic) {
          triggerHaptic(hapticType);
        }

        onLongPress();
        cancel();
      }, duration);
    },
    [disabled, duration, haptic, hapticType, onLongPress, cancel]
  );

  // Handle movement - cancel if moved too much
  const move = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      if (!state.isLongPressing) return;

      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

      const deltaX = Math.abs(clientX - startPositionRef.current.x);
      const deltaY = Math.abs(clientY - startPositionRef.current.y);

      // Cancel if moved more than 10px
      if (deltaX > 10 || deltaY > 10) {
        cancel();
      }
    },
    [state.isLongPressing, cancel]
  );

  // End long press
  const end = useCallback(() => {
    const wasLongPress = isLongPressTriggeredRef.current;
    cancel();

    // If it wasn't a long press, treat as a click
    if (!wasLongPress && onClick) {
      onClick();
    }
  }, [cancel, onClick]);

  // Event handlers to spread on element
  const handlers = {
    onTouchStart: start,
    onTouchMove: move,
    onTouchEnd: end,
    onTouchCancel: cancel,
    onMouseDown: start,
    onMouseMove: move,
    onMouseUp: end,
    onMouseLeave: cancel,
  };

  return {
    handlers,
    isLongPressing: state.isLongPressing,
    progress: state.progress,
    cancel,
  };
}

/**
 * Higher-order component to add long press to any element
 */
export function withLongPress<T extends HTMLElement>(
  onLongPress: () => void,
  options?: Omit<UseLongPressOptions, "onLongPress">
) {
  const {
    onClick,
    duration = 500,
    disabled = false,
    haptic = true,
    hapticType = "medium",
  } = options || {};

  let timer: NodeJS.Timeout | null = null;
  let isTriggered = false;
  let startPos = { x: 0, y: 0 };

  const handleStart = (e: TouchEvent | MouseEvent) => {
    if (disabled) return;

    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    startPos = { x: clientX, y: clientY };
    isTriggered = false;

    timer = setTimeout(() => {
      isTriggered = true;
      if (haptic) triggerHaptic(hapticType);
      onLongPress();
    }, duration);
  };

  const handleMove = (e: TouchEvent | MouseEvent) => {
    if (!timer) return;

    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    if (Math.abs(clientX - startPos.x) > 10 || Math.abs(clientY - startPos.y) > 10) {
      if (timer) clearTimeout(timer);
      timer = null;
    }
  };

  const handleEnd = () => {
    if (timer) clearTimeout(timer);
    timer = null;
    if (!isTriggered && onClick) onClick();
  };

  return {
    onTouchStart: handleStart,
    onTouchMove: handleMove,
    onTouchEnd: handleEnd,
    onTouchCancel: handleEnd,
    onMouseDown: handleStart,
    onMouseMove: handleMove,
    onMouseUp: handleEnd,
    onMouseLeave: handleEnd,
  };
}

export default useLongPress;
