"use client";

import { useState, useEffect, ReactNode, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface AppLoadingTransitionProps {
  isLoading: boolean;
  children: ReactNode;
  loadingMessage?: string;
  /** Minimum time to show loader (ms) for smooth UX */
  minLoadTime?: number;
}

/**
 * Premium loading transition with logo and progress bar
 * Provides smooth fade-out animation with elegant progress indicator
 */
export function AppLoadingTransition({
  isLoading,
  children,
  loadingMessage = "Chargement...",
  minLoadTime = 800,
}: AppLoadingTransitionProps) {
  const [showLoader, setShowLoader] = useState(isLoading);
  const [progress, setProgress] = useState(0);
  const [loadStartTime] = useState(Date.now());
  const prefersReducedMotion = useReducedMotion();

  // Simulate progress based on loading state
  useEffect(() => {
    if (isLoading) {
      setProgress(0);

      // Quick initial progress (0-30%)
      const initialTimeout = setTimeout(() => setProgress(30), 100);

      // Steady progress (30-70%)
      const midTimeout = setTimeout(() => setProgress(70), 400);

      // Slow progress (70-85%)
      const slowTimeout = setTimeout(() => setProgress(85), 700);

      return () => {
        clearTimeout(initialTimeout);
        clearTimeout(midTimeout);
        clearTimeout(slowTimeout);
      };
    } else {
      // Complete progress when loaded
      setProgress(100);
    }
  }, [isLoading]);

  useEffect(() => {
    if (!isLoading) {
      // Ensure minimum load time for smooth UX
      const elapsed = Date.now() - loadStartTime;
      const remainingTime = Math.max(0, minLoadTime - elapsed);

      const timeout = setTimeout(() => {
        setShowLoader(false);
      }, prefersReducedMotion ? 0 : remainingTime + 300);

      return () => clearTimeout(timeout);
    } else {
      setShowLoader(true);
    }
  }, [isLoading, prefersReducedMotion, loadStartTime, minLoadTime]);

  return (
    <>
      <AnimatePresence mode="wait">
        {showLoader && (
          <motion.div
            key="loading"
            initial={{ opacity: 1 }}
            exit={{
              opacity: 0,
              transition: {
                duration: prefersReducedMotion ? 0 : 0.5,
                ease: [0.25, 0.1, 0.25, 1],
              },
            }}
            className="fixed inset-0 bg-[#FAFBFC] dark:bg-dark-bg z-[100] flex items-center justify-center"
          >
            <div className="flex flex-col items-center gap-8 px-6 w-full max-w-sm">
              {/* Logo without background - clean and professional */}
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{
                  scale: prefersReducedMotion ? 1 : 1.05,
                  opacity: 0,
                  transition: {
                    duration: prefersReducedMotion ? 0 : 0.4,
                    ease: [0.22, 1, 0.36, 1],
                  },
                }}
                transition={{
                  duration: prefersReducedMotion ? 0 : 0.5,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="relative"
              >
                {/* Subtle glow behind logo */}
                <motion.div
                  className="absolute -inset-8 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full blur-3xl"
                  animate={{
                    opacity: [0.3, 0.6, 0.3],
                    scale: [0.95, 1.05, 0.95],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />

                {/* Logo image - no colored background */}
                <div className="relative w-20 h-20 md:w-24 md:h-24 flex items-center justify-center rounded-2xl overflow-hidden">
                  <img
                    src="/logo.png"
                    alt="Posty Logo"
                    className="w-full h-full object-contain drop-shadow-2xl"
                  />
                </div>
              </motion.div>

              {/* Brand name */}
              <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{
                  duration: prefersReducedMotion ? 0 : 0.4,
                  delay: 0.1,
                }}
                className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white tracking-tight"
              >
                POSTY
              </motion.h1>

              {/* Progress bar container */}
              <motion.div
                initial={{ opacity: 0, width: "60%" }}
                animate={{ opacity: 1, width: "100%" }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: prefersReducedMotion ? 0 : 0.4,
                  delay: 0.2,
                }}
                className="w-full max-w-xs"
              >
                {/* Progress bar background */}
                <div className="h-1 bg-gray-200 dark:bg-dark-border rounded-full overflow-hidden">
                  {/* Progress bar fill */}
                  <motion.div
                    className="h-full bg-gradient-to-r from-primary via-accent to-primary rounded-full"
                    initial={{ width: "0%" }}
                    animate={{ width: `${progress}%` }}
                    transition={{
                      duration: 0.4,
                      ease: [0.25, 0.1, 0.25, 1],
                    }}
                    style={{
                      backgroundSize: "200% 100%",
                    }}
                  />
                </div>

                {/* Loading message */}
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-text-muted text-sm text-center mt-4 font-medium"
                >
                  {loadingMessage}
                </motion.p>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* App content - only show when not loading */}
      <AnimatePresence mode="wait">
        {!showLoader && (
          <motion.div
            key="content"
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: 1,
              transition: {
                duration: prefersReducedMotion ? 0 : 0.4,
                ease: [0.25, 0.1, 0.25, 1],
              },
            }}
            className="h-full w-full"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/**
 * Premium progress bar component for reuse
 */
export function PremiumProgressBar({
  progress = 0,
  className = "",
  showPercentage = false,
}: {
  progress: number;
  className?: string;
  showPercentage?: boolean;
}) {
  return (
    <div className={`w-full ${className}`}>
      <div className="h-1.5 bg-gray-200 dark:bg-dark-border rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-primary via-accent to-primary rounded-full relative"
          initial={{ width: "0%" }}
          animate={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          transition={{
            duration: 0.3,
            ease: [0.25, 0.1, 0.25, 1],
          }}
        >
          {/* Shimmer effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
        </motion.div>
      </div>
      {showPercentage && (
        <p className="text-text-muted text-xs text-right mt-1">
          {Math.round(progress)}%
        </p>
      )}
    </div>
  );
}
