"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface ConnectionLoaderProps {
  message?: string;
  compact?: boolean;
}

/**
 * Premium loader for connection/redirect states
 * Shows clean logo with progress bar
 */
export default function ConnectionLoader({
  message = "Connexion en cours...",
  compact = false,
}: ConnectionLoaderProps) {
  const prefersReducedMotion = useReducedMotion();
  const [progress, setProgress] = useState(0);

  // Simulate progress
  useEffect(() => {
    const intervals = [
      { delay: 100, value: 30 },
      { delay: 400, value: 60 },
      { delay: 800, value: 85 },
    ];

    const timeouts = intervals.map(({ delay, value }) =>
      setTimeout(() => setProgress(value), delay)
    );

    return () => timeouts.forEach(clearTimeout);
  }, []);

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        {/* Simple spinner for compact mode */}
        <motion.div
          className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full"
          animate={{ rotate: prefersReducedMotion ? 0 : 360 }}
          transition={{
            duration: prefersReducedMotion ? 0 : 0.8,
            repeat: prefersReducedMotion ? 0 : Infinity,
            ease: "linear",
          }}
        />
        <span className="text-text-secondary text-sm">{message}</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: prefersReducedMotion ? 1 : 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{
          duration: prefersReducedMotion ? 0 : 0.4,
          ease: [0.22, 1, 0.36, 1],
        }}
        className="flex flex-col items-center gap-8 px-6 w-full max-w-sm"
      >
        {/* Logo without colored background */}
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
              alt="POSTY"
              className="w-full h-full object-contain drop-shadow-2xl"
              onError={(e) => {
                e.currentTarget.style.display = "none";
                const sibling = e.currentTarget
                  .nextElementSibling as HTMLElement | null;
                if (sibling) sibling.style.display = "flex";
              }}
            />
            {/* Fallback */}
            <div className="hidden w-full h-full bg-gradient-to-br from-primary to-accent rounded-2xl items-center justify-center shadow-2xl">
              <span className="text-white font-bold text-4xl">P</span>
            </div>
          </div>
        </div>

        {/* Brand name */}
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: prefersReducedMotion ? 0 : 0.4,
            delay: 0.1,
          }}
          className="text-2xl lg:text-3xl font-bold text-white tracking-tight"
        >
          POSTY
        </motion.h1>

        {/* Progress bar section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{
            duration: prefersReducedMotion ? 0 : 0.4,
            delay: 0.2,
          }}
          className="w-full max-w-xs"
        >
          {/* Progress bar */}
          <div className="h-1 bg-dark-border rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-primary via-accent to-primary rounded-full"
              initial={{ width: "0%" }}
              animate={{ width: `${progress}%` }}
              transition={{
                duration: 0.4,
                ease: [0.25, 0.1, 0.25, 1],
              }}
            />
          </div>

          {/* Message */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-text-muted text-sm text-center mt-4 font-medium"
          >
            {message}
          </motion.p>
        </motion.div>
      </motion.div>
    </div>
  );
}
