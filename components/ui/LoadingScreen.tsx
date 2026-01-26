"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

interface LoadingScreenProps {
  message?: string;
  /** Show progress bar instead of static loader */
  showProgress?: boolean;
}

/**
 * Premium loading screen with logo and progress bar
 * Clean, professional design without dots animation
 */
export default function LoadingScreen({
  message = "Chargement...",
  showProgress = true,
}: LoadingScreenProps) {
  const [progress, setProgress] = useState(0);

  // Simulate realistic loading progress
  useEffect(() => {
    if (!showProgress) return;

    const intervals = [
      { delay: 100, value: 25 },
      { delay: 300, value: 50 },
      { delay: 600, value: 75 },
      { delay: 1000, value: 90 },
    ];

    const timeouts = intervals.map(({ delay, value }) =>
      setTimeout(() => setProgress(value), delay)
    );

    return () => timeouts.forEach(clearTimeout);
  }, [showProgress]);

  return (
    <div className="fixed inset-0 bg-background dark:bg-dark-bg z-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-8 px-6 w-full max-w-sm">
        {/* Logo without colored background */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            duration: 0.5,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="relative"
        >
          {/* Subtle glow effect */}
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

          {/* Logo image - clean, no background */}
          <div className="relative w-20 h-20 md:w-24 md:h-24 flex items-center justify-center">
            <img
              src="/logo.jpg"
              alt="Posty Logo"
              className="w-full h-full object-contain drop-shadow-2xl"
            />
          </div>
        </motion.div>

        {/* Brand name */}
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="text-2xl md:text-3xl font-bold text-text-primary tracking-tight"
        >
          POSTY
        </motion.h1>

        {/* Progress bar section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="w-full max-w-xs"
        >
          {/* Progress bar */}
          <div className="h-1.5 bg-dark-border dark:bg-dark-border rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-primary via-accent to-primary rounded-full relative overflow-hidden"
              initial={{ width: "0%" }}
              animate={{ width: showProgress ? `${progress}%` : "100%" }}
              transition={{
                duration: 0.4,
                ease: [0.25, 0.1, 0.25, 1],
              }}
            >
              {/* Shimmer effect */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                animate={{ x: ["-100%", "100%"] }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "linear",
                }}
              />
            </motion.div>
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
      </div>
    </div>
  );
}

/**
 * Inline loader for smaller contexts - minimal version
 */
export function InlineLoader({
  size = "md",
}: {
  size?: "sm" | "md" | "lg";
}) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  return (
    <div className="flex items-center justify-center">
      <motion.div
        className={`${sizeClasses[size]} border-2 border-primary border-t-transparent rounded-full`}
        animate={{ rotate: 360 }}
        transition={{
          duration: 0.8,
          repeat: Infinity,
          ease: "linear",
        }}
      />
    </div>
  );
}
