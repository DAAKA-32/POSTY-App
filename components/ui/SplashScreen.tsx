"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface SplashScreenProps {
  isLoading: boolean;
  onComplete?: () => void;
}

/**
 * Simple splash screen - Logo + POSTY + discrete loader
 * Minimal, fast, professional
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
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#0B0E11]"
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
              className="w-20 h-20 lg:w-24 lg:h-24 bg-gradient-to-br from-primary to-accent rounded-2xl overflow-hidden flex items-center justify-center shadow-xl"
            >
              <img
                src="/logo.png"
                alt="POSTY"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const sibling = e.currentTarget.nextElementSibling as HTMLElement | null;
                  if (sibling) sibling.style.display = 'flex';
                }}
              />
              <span className="text-white font-bold text-3xl lg:text-4xl hidden">P</span>
            </motion.div>

            {/* Brand Name */}
            <motion.h1
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{
                duration: prefersReducedMotion ? 0 : 0.3,
                delay: prefersReducedMotion ? 0 : 0.1,
              }}
              className="text-3xl lg:text-4xl font-bold text-white tracking-tight"
            >
              POSTY
            </motion.h1>

            {/* Simple loader dots */}
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
                  className="w-2 h-2 bg-primary rounded-full"
                  animate={{
                    scale: prefersReducedMotion ? 1 : [1, 1.3, 1],
                    opacity: prefersReducedMotion ? 1 : [0.4, 1, 0.4],
                  }}
                  transition={{
                    duration: prefersReducedMotion ? 0 : 1,
                    repeat: prefersReducedMotion ? 0 : Infinity,
                    delay: prefersReducedMotion ? 0 : index * 0.15,
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
