"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface SplashScreenProps {
  isLoading: boolean;
  onComplete?: () => void;
}

/**
 * Premium splash screen with smooth animations
 * Displays POSTY logo and loading animation
 */
export default function SplashScreen({ isLoading, onComplete }: SplashScreenProps) {
  const [show, setShow] = useState(true);
  const prefersReducedMotion = useReducedMotion();
  const [progress, setProgress] = useState(0);

  // Simulate loading progress for smooth animation
  useEffect(() => {
    if (isLoading) {
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 10;
        });
      }, 150);

      return () => clearInterval(interval);
    } else {
      // Complete progress when loading is done
      setProgress(100);

      // Wait for animation to complete before hiding
      const timeout = setTimeout(() => {
        setShow(false);
        onComplete?.();
      }, prefersReducedMotion ? 100 : 600);

      return () => clearTimeout(timeout);
    }
  }, [isLoading, onComplete, prefersReducedMotion]);

  return (
    <AnimatePresence mode="wait">
      {show && (
        <motion.div
          key="splash"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{
            opacity: 0,
            y: prefersReducedMotion ? 0 : -20,
            transition: {
              duration: prefersReducedMotion ? 0.1 : 0.5,
              ease: [0.22, 1, 0.36, 1],
            },
          }}
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg, #0B0E11 0%, #151923 100%)",
          }}
        >
          <div className="flex flex-col items-center gap-8 px-4">
            {/* Logo Container */}
            <motion.div
              initial={{ scale: prefersReducedMotion ? 1 : 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                duration: prefersReducedMotion ? 0 : 0.6,
                delay: prefersReducedMotion ? 0 : 0.1,
                ease: [0.25, 0.1, 0.25, 1],
              }}
              className="relative"
            >
              {/* Glow effect */}
              <div className="absolute -inset-8 bg-gradient-to-br from-primary/30 to-accent/30 rounded-full blur-3xl animate-pulse" />

              {/* Logo */}
              <div className="relative w-24 h-24 lg:w-32 lg:h-32 bg-gradient-to-br from-primary to-accent rounded-2xl overflow-hidden flex items-center justify-center shadow-2xl">
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
                <span className="text-white font-bold text-4xl lg:text-5xl hidden">P</span>
              </div>
            </motion.div>

            {/* Brand Name */}
            <motion.div
              initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: prefersReducedMotion ? 0 : 0.5,
                delay: prefersReducedMotion ? 0 : 0.3,
                ease: "easeOut",
              }}
              className="flex flex-col items-center gap-3"
            >
              <h1 className="text-4xl lg:text-5xl font-bold text-white tracking-tight">
                POSTY
              </h1>
              <p className="text-text-secondary text-sm lg:text-base">
                Générateur de Posts LinkedIn
              </p>
            </motion.div>

            {/* Loading Progress Bar */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{
                duration: prefersReducedMotion ? 0 : 0.4,
                delay: prefersReducedMotion ? 0 : 0.5,
              }}
              className="w-64 lg:w-80"
            >
              {/* Progress bar container */}
              <div className="relative h-1 bg-dark-border/30 rounded-full overflow-hidden">
                <motion.div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-accent rounded-full"
                  initial={{ width: "0%" }}
                  animate={{ width: `${progress}%` }}
                  transition={{
                    duration: 0.3,
                    ease: "easeOut",
                  }}
                />

                {/* Shimmer effect */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                  animate={{
                    x: ["-100%", "200%"],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                />
              </div>

              {/* Loading dots */}
              <div className="flex justify-center gap-1.5 mt-6">
                {[0, 1, 2].map((index) => (
                  <motion.div
                    key={index}
                    className="w-2 h-2 bg-primary rounded-full"
                    animate={{
                      scale: [1, 1.4, 1],
                      opacity: [0.4, 1, 0.4],
                    }}
                    transition={{
                      duration: 1.2,
                      repeat: Infinity,
                      delay: index * 0.15,
                      ease: "easeInOut",
                    }}
                  />
                ))}
              </div>
            </motion.div>

            {/* Subtle hint text */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{
                duration: prefersReducedMotion ? 0 : 0.5,
                delay: prefersReducedMotion ? 0 : 0.8,
              }}
              className="text-text-muted text-xs lg:text-sm mt-4"
            >
              Préparation de votre expérience...
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
