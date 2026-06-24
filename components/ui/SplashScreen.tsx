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
 *
 * Theme: driven entirely by CSS (Tailwind `dark:` variants) keyed off the
 * `.light` / `.dark` class the inline boot script in app/layout.tsx puts on
 * <html> BEFORE the first paint. There is deliberately NO JS theme state here:
 * a useState default forces one theme on the first frame and flashes the wrong
 * one (a light-mode user briefly saw this splash in dark). CSS-class theming
 * paints the correct theme on the very first frame, server and client alike —
 * exactly like the other loaders (FullScreenLoader, ConnectionLoader, …).
 */
export default function SplashScreen({ isLoading, onComplete }: SplashScreenProps) {
  const [show, setShow] = useState(true);
  const prefersReducedMotion = useReducedMotion();

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
          className={`fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-amber-50 dark:bg-[#0B0E11] dark:bg-none ${
            !isLoading ? "pointer-events-none" : ""
          }`}
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
              className="text-3xl lg:text-4xl font-bold tracking-tight text-gray-800 dark:text-white"
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
