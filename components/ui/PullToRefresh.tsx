"use client";

import { ReactNode, useRef, useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";

interface PullToRefreshProps {
  children: ReactNode;
  onRefresh: () => Promise<void>;
  threshold?: number;
  maxPull?: number;
  disabled?: boolean;
  className?: string;
}

export default function PullToRefresh({
  children,
  onRefresh,
  threshold = 80,
  maxPull = 120,
  disabled = false,
  className = "",
}: PullToRefreshProps) {
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);

  const { trigger: triggerHaptic } = useHapticFeedback();

  const containerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const canPullRef = useRef(false);
  const hasTriggeredHapticRef = useRef(false);

  const pullProgress = Math.min(pullDistance / threshold, 1);

  // Check if we're at the top of the scroll container
  const isAtTop = useCallback(() => {
    if (!containerRef.current) return false;
    return containerRef.current.scrollTop <= 0;
  }, []);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (disabled || isRefreshing) return;

      if (!isAtTop()) {
        canPullRef.current = false;
        return;
      }

      canPullRef.current = true;
      startYRef.current = e.touches[0].clientY;
      hasTriggeredHapticRef.current = false;
      setIsPulling(true);
    },
    [disabled, isRefreshing, isAtTop]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (disabled || isRefreshing || !canPullRef.current) return;

      const currentY = e.touches[0].clientY;
      const diff = currentY - startYRef.current;

      if (diff <= 0) {
        setPullDistance(0);
        return;
      }

      // Apply resistance
      const resistance = 0.5;
      const resistedDiff = diff * resistance;
      const newPullDistance = Math.min(resistedDiff, maxPull);
      const progress = newPullDistance / threshold;

      // Haptic feedback when reaching threshold
      if (progress >= 1 && !hasTriggeredHapticRef.current) {
        triggerHaptic("medium");
        hasTriggeredHapticRef.current = true;
      }

      setPullDistance(newPullDistance);
    },
    [disabled, isRefreshing, maxPull, threshold, triggerHaptic]
  );

  const handleTouchEnd = useCallback(async () => {
    if (disabled || isRefreshing || !canPullRef.current) return;

    canPullRef.current = false;

    if (pullProgress >= 1) {
      setIsRefreshing(true);
      setPullDistance(threshold);

      try {
        await onRefresh();
        triggerHaptic("success");
      } catch (error) {
        triggerHaptic("error");
        console.error("Pull to refresh error:", error);
      }

      setIsRefreshing(false);
    }

    setIsPulling(false);
    setPullDistance(0);
  }, [disabled, isRefreshing, pullProgress, threshold, onRefresh, triggerHaptic]);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-y-auto ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <AnimatePresence>
        {(isPulling || isRefreshing) && pullDistance > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute top-0 left-0 right-0 flex justify-center z-50 pointer-events-none"
            style={{
              height: pullDistance,
              transform: `translateY(${-threshold + pullDistance}px)`,
            }}
          >
            <div className="flex items-center justify-center h-full">
              <motion.div
                animate={{
                  rotate: isRefreshing ? 360 : pullProgress * 180,
                }}
                transition={{
                  duration: isRefreshing ? 0.8 : 0,
                  repeat: isRefreshing ? Infinity : 0,
                  ease: "linear",
                }}
                className={`
                  w-8 h-8 rounded-full
                  flex items-center justify-center
                  ${pullProgress >= 1 || isRefreshing
                    ? "bg-primary text-white"
                    : "bg-dark-card border border-dark-border text-text-muted"
                  }
                  transition-colors duration-200
                  shadow-lg
                `}
              >
                {isRefreshing ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    style={{
                      transform: `rotate(${pullProgress * 180}deg)`,
                      transition: "transform 0.1s ease-out",
                    }}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 14l-7 7m0 0l-7-7m7 7V3"
                    />
                  </svg>
                )}
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content with transform when pulling */}
      <motion.div
        animate={{
          y: isPulling || isRefreshing ? pullDistance : 0,
        }}
        transition={{
          type: isPulling ? "tween" : "spring",
          duration: isPulling ? 0 : 0.3,
          bounce: 0.2,
        }}
      >
        {children}
      </motion.div>
    </div>
  );
}
