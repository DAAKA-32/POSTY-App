"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface FullScreenLoaderProps {
  isLoading: boolean;
  message?: string;
  showLogo?: boolean;
}

/**
 * Premium full screen loader with logo and progress bar
 * Covers entire screen with backdrop and centered content
 */
export default function FullScreenLoader({
  isLoading,
  message = "Chargement...",
  showLogo = true,
}: FullScreenLoaderProps) {
  const prefersReducedMotion = useReducedMotion();
  const [progress, setProgress] = useState(0);

  // Simulate realistic loading progress
  useEffect(() => {
    if (isLoading) {
      setProgress(0);

      const intervals = [
        { delay: 100, value: 30 },
        { delay: 400, value: 60 },
        { delay: 700, value: 85 },
      ];

      const timeouts = intervals.map(({ delay, value }) =>
        setTimeout(() => setProgress(value), delay)
      );

      return () => timeouts.forEach(clearTimeout);
    } else {
      setProgress(100);
    }
  }, [isLoading]);

  return (
    <AnimatePresence mode="wait">
      {isLoading && (
        <motion.div
          key="fullscreen-loader"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{
            duration: prefersReducedMotion ? 0.1 : 0.3,
            ease: "easeInOut",
          }}
          className="fixed inset-0 z-[9998] flex items-center justify-center loader-bg backdrop-blur-md"
        >
          <motion.div
            initial={{ scale: prefersReducedMotion ? 1 : 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: prefersReducedMotion ? 1 : 0.95, opacity: 0 }}
            transition={{
              duration: prefersReducedMotion ? 0 : 0.4,
              delay: prefersReducedMotion ? 0 : 0.1,
              ease: [0.25, 0.1, 0.25, 1],
            }}
            className="flex flex-col items-center gap-8 px-6 w-full max-w-sm"
          >
            {/* Logo without colored background */}
            {showLogo && (
              <div className="relative">
                {/* Subtle glow effect */}
                <motion.div
                  className="absolute -inset-8 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full blur-3xl"
                  animate={
                    prefersReducedMotion
                      ? {}
                      : {
                          opacity: [0.3, 0.6, 0.3],
                          scale: [0.95, 1.05, 0.95],
                        }
                  }
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />

                {/* Logo image - clean, no background */}
                <div className="relative w-20 h-20 lg:w-24 lg:h-24 flex items-center justify-center">
                  <img
                    src="/logo.png"
                    alt="Posty Logo"
                    className="w-full h-full object-contain drop-shadow-2xl"
                  />
                </div>
              </div>
            )}

            {/* Brand name */}
            <motion.h1
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{
                duration: prefersReducedMotion ? 0 : 0.4,
                delay: prefersReducedMotion ? 0 : 0.15,
              }}
              className="text-2xl lg:text-3xl font-bold text-text-primary tracking-tight"
            >
              POSTY
            </motion.h1>

            {/* Progress bar section */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{
                duration: prefersReducedMotion ? 0 : 0.4,
                delay: prefersReducedMotion ? 0 : 0.2,
              }}
              className="w-full max-w-xs"
            >
              {/* Progress bar */}
              <div className="h-1.5 loader-track rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-primary via-accent to-primary rounded-full relative overflow-hidden"
                  initial={{ width: "0%" }}
                  animate={{ width: `${progress}%` }}
                  transition={{
                    duration: 0.4,
                    ease: [0.25, 0.1, 0.25, 1],
                  }}
                >
                  {/* Shimmer effect */}
                  {!prefersReducedMotion && (
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                      animate={{ x: ["-100%", "100%"] }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                    />
                  )}
                </motion.div>
              </div>

              {/* Message */}
              {message && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{
                    duration: prefersReducedMotion ? 0 : 0.4,
                    delay: prefersReducedMotion ? 0 : 0.25,
                  }}
                  className="text-text-muted text-sm text-center mt-4 font-medium"
                >
                  {message}
                </motion.p>
              )}
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
