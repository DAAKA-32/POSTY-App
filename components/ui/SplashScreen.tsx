"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useReducedMotion } from "@/hooks/ui/useReducedMotion";

interface SplashScreenProps {
  isLoading: boolean;
  onComplete?: () => void;
}

/**
 * Simple splash screen - Logo + POSTY + discrete loader
 * Minimal, fast, professional
 * Adapts to light/dark mode
 * Note: Reads theme directly from DOM/localStorage to avoid race condition with ThemeContext
 */
export default function SplashScreen({ isLoading, onComplete }: SplashScreenProps) {
  const [show, setShow] = useState(true);
  const prefersReducedMotion = useReducedMotion();

  // Always start dark to match SSR (prevents hydration mismatch).
  // useEffect corrects the theme after hydration — no flicker since the
  // splash screen is already showing (loading state).
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const storedTheme = localStorage.getItem("posty-theme");
    if (storedTheme) {
      setIsDark(storedTheme === "dark");
    } else {
      setIsDark(!document.documentElement.classList.contains("light"));
    }
  }, []);

  useEffect(() => {
    if (!isLoading) {
      const timeout = setTimeout(() => {
        setShow(false);
        onComplete?.();
      }, prefersReducedMotion ? 50 : 300);

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
            transition: {
              duration: prefersReducedMotion ? 0.05 : 0.25,
              ease: "easeOut",
            },
          }}
          className={`fixed inset-0 z-[9999] flex items-center justify-center ${
            isDark ? "bg-[#0B0E11]" : "bg-gradient-to-br from-orange-50 via-white to-amber-50"
          } ${!isLoading ? "pointer-events-none" : ""}`}
        >
          <div className="flex flex-col items-center gap-6">
            {/* Logo */}
            <motion.div
              initial={{ scale: prefersReducedMotion ? 1 : 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                duration: prefersReducedMotion ? 0 : 0.3,
                ease: "easeOut",
              }}
              className="w-20 h-20 lg:w-24 lg:h-24 flex items-center justify-center rounded-2xl overflow-hidden shadow-xl"
            >
              <img
                src="/logo.png"
                alt="Posty Logo"
                className="w-full h-full object-cover"
              />
            </motion.div>

            {/* Brand Name */}
            <motion.h1
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{
                duration: prefersReducedMotion ? 0 : 0.3,
                delay: prefersReducedMotion ? 0 : 0.1,
              }}
              className={`text-3xl lg:text-4xl font-bold tracking-tight ${
                isDark ? "text-white" : "text-gray-800"
              }`}
            >
              POSTY
            </motion.h1>

            {/* Premium gradient loader dots */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{
                duration: prefersReducedMotion ? 0 : 0.3,
                delay: prefersReducedMotion ? 0 : 0.2,
              }}
              className="flex gap-1.5 mt-2"
            >
              {[0, 1, 2].map((index) => (
                <motion.div
                  key={index}
                  className="w-2 h-2 rounded-full"
                  style={{
                    background: "linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)",
                    boxShadow: "0 0 8px rgba(232, 147, 77, 0.4)",
                  }}
                  animate={{
                    scale: prefersReducedMotion ? 1 : [1, 1.3, 1],
                    opacity: prefersReducedMotion ? 1 : [0.5, 1, 0.5],
                  }}
                  transition={{
                    duration: prefersReducedMotion ? 0 : 0.8,
                    repeat: prefersReducedMotion ? 0 : Infinity,
                    delay: prefersReducedMotion ? 0 : index * 0.12,
                    ease: "easeInOut",
                  }}
                />
              ))}
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
