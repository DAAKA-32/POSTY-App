"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import Loader from "./Loader";

interface FullScreenLoaderProps {
  isLoading: boolean;
  message?: string;
  showLogo?: boolean;
}

/**
 * Full screen loader for critical operations
 * Covers entire screen with backdrop and centered loader
 */
export default function FullScreenLoader({
  isLoading,
  message = "Chargement...",
  showLogo = true,
}: FullScreenLoaderProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <AnimatePresence mode="wait">
      {isLoading && (
        <motion.div
          key="fullscreen-loader"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{
            duration: prefersReducedMotion ? 0.1 : 0.25,
            ease: "easeInOut",
          }}
          className="fixed inset-0 z-[9998] flex items-center justify-center"
          style={{
            backgroundColor: "rgba(11, 14, 17, 0.95)",
            backdropFilter: "blur(8px)",
          }}
        >
          <motion.div
            initial={{ scale: prefersReducedMotion ? 1 : 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: prefersReducedMotion ? 1 : 0.9, opacity: 0 }}
            transition={{
              duration: prefersReducedMotion ? 0 : 0.3,
              delay: prefersReducedMotion ? 0 : 0.1,
              ease: [0.25, 0.1, 0.25, 1],
            }}
            className="flex flex-col items-center gap-6 px-4"
          >
            {/* Logo with glow (optional) */}
            {showLogo && (
              <div className="relative">
                {/* Glow effect */}
                <div className="absolute -inset-4 bg-gradient-to-br from-primary/30 to-accent/30 rounded-full blur-2xl animate-pulse" />

                {/* Logo */}
                <div className="relative w-16 h-16 lg:w-20 lg:h-20 bg-gradient-to-br from-primary to-accent rounded-xl overflow-hidden flex items-center justify-center shadow-2xl">
                  <img
                    src="/logo.png"
                    alt="POSTY Logo"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      const sibling = e.currentTarget.nextElementSibling as HTMLElement | null;
                      if (sibling) sibling.style.display = 'flex';
                    }}
                  />
                  <span className="text-white font-bold text-3xl lg:text-4xl hidden">P</span>
                </div>
              </div>
            )}

            {/* Loader */}
            <Loader size="xl" color="primary" />

            {/* Message */}
            {message && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{
                  duration: prefersReducedMotion ? 0 : 0.4,
                  delay: prefersReducedMotion ? 0 : 0.2,
                }}
                className="text-white font-medium text-base lg:text-lg text-center max-w-md"
              >
                {message}
              </motion.p>
            )}

            {/* Secondary hint (optional) */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{
                duration: prefersReducedMotion ? 0 : 0.4,
                delay: prefersReducedMotion ? 0 : 0.3,
              }}
              className="text-text-muted text-xs lg:text-sm"
            >
              Veuillez patienter...
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
