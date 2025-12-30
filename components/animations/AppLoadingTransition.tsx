"use client";

import { useState, useEffect, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AnimatedLogo } from "@/components/ui/Logo";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface AppLoadingTransitionProps {
  isLoading: boolean;
  children: ReactNode;
  loadingMessage?: string;
}

/**
 * Manages smooth transition from loading screen to app interface
 * Provides premium fade-out animation with logo dissolution
 */
export function AppLoadingTransition({
  isLoading,
  children,
  loadingMessage = "Chargement...",
}: AppLoadingTransitionProps) {
  const [showLoader, setShowLoader] = useState(isLoading);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (!isLoading) {
      // Add small delay before hiding loader for smooth transition
      const timeout = setTimeout(() => {
        setShowLoader(false);
      }, prefersReducedMotion ? 0 : 200);
      return () => clearTimeout(timeout);
    } else {
      setShowLoader(true);
    }
  }, [isLoading, prefersReducedMotion]);

  return (
    <>
      <AnimatePresence mode="wait">
        {showLoader && (
          <motion.div
            key="loading"
            initial={{ opacity: 1 }}
            exit={{
              opacity: 0,
              scale: prefersReducedMotion ? 1 : 0.98,
              transition: {
                duration: prefersReducedMotion ? 0 : 0.42,
                ease: [0.25, 0.1, 0.25, 1],
              },
            }}
            className="fixed inset-0 bg-dark-bg/98 backdrop-blur-md z-[100] flex items-center justify-center"
          >
            <div className="flex flex-col items-center gap-6">
              {/* Animated Logo with glow */}
              <motion.div
                initial={{ scale: 1, opacity: 1 }}
                exit={{
                  scale: prefersReducedMotion ? 1 : 0.9,
                  opacity: 0,
                  transition: {
                    duration: prefersReducedMotion ? 0 : 0.38,
                    ease: [0.22, 1, 0.36, 1],
                  },
                }}
                className="relative"
              >
                {/* Glow effect */}
                <div className="absolute -inset-6 bg-gradient-to-br from-primary/40 to-accent/40 rounded-full blur-3xl animate-pulse" />

                {/* Logo */}
                <div className="relative">
                  <AnimatedLogo size="xl" />
                </div>
              </motion.div>

              {/* Loading text with dots animation */}
              {loadingMessage && (
                <motion.div
                  initial={{ opacity: 1 }}
                  exit={{
                    opacity: 0,
                    y: prefersReducedMotion ? 0 : -10,
                    transition: {
                      duration: prefersReducedMotion ? 0 : 0.3,
                      ease: "easeOut",
                    },
                  }}
                  className="flex flex-col items-center gap-3"
                >
                  <p className="text-white font-medium text-lg tracking-wide">
                    {loadingMessage}
                  </p>
                  <div className="flex gap-1.5">
                    {[0, 1, 2].map((index) => (
                      <motion.div
                        key={index}
                        className="w-2 h-2 bg-primary rounded-full"
                        animate={{
                          scale: [1, 1.3, 1],
                          opacity: [0.5, 1, 0.5],
                        }}
                        transition={{
                          duration: 1.2,
                          repeat: Infinity,
                          delay: index * 0.2,
                          ease: "easeInOut",
                        }}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
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
              scale: prefersReducedMotion ? 1 : 0.98,
            }}
            animate={{
              opacity: 1,
              scale: 1,
              transition: {
                duration: prefersReducedMotion ? 0 : 0.45,
                delay: prefersReducedMotion ? 0 : 0.1,
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
