"use client";

import { useEffect, useState, useRef } from "react";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";

interface ShimmeringNameProps {
  name: string;
  className?: string;
  /** Delay before starting the shimmer animation (ms) */
  delay?: number;
  /** Show sparkle particles around the name */
  showSparkles?: boolean;
}

/**
 * ShimmeringName - Premium animated name display
 *
 * Features:
 * - Elegant gradient text with animated shimmer
 * - Subtle sparkle particles for premium feel
 * - Respects reduced motion preferences
 * - Accessible contrast and readability
 */
export default function ShimmeringName({
  name,
  className = "",
  delay = 200,
  showSparkles = true,
}: ShimmeringNameProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [sparkles, setSparkles] = useState<Array<{ id: number; x: number; y: number; scale: number; delay: number }>>([]);
  const containerRef = useRef<HTMLSpanElement>(null);
  const prefersReducedMotion = useReducedMotion();

  // Trigger visibility after delay for staggered entrance
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  // Generate sparkle particles
  useEffect(() => {
    if (!showSparkles || prefersReducedMotion) return;

    const generateSparkles = () => {
      const newSparkles = Array.from({ length: 5 }, (_, i) => ({
        id: Date.now() + i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        scale: 0.3 + Math.random() * 0.7,
        delay: Math.random() * 2,
      }));
      setSparkles(newSparkles);
    };

    generateSparkles();
    const interval = setInterval(generateSparkles, 4000);
    return () => clearInterval(interval);
  }, [showSparkles, prefersReducedMotion]);

  // Split name into characters for staggered animation
  const characters = name.split("");

  return (
    <span
      ref={containerRef}
      className={`relative inline-flex items-center ${className}`}
    >
      {/* Sparkle particles */}
      {showSparkles && !prefersReducedMotion && (
        <span className="absolute inset-0 pointer-events-none overflow-visible">
          <AnimatePresence>
            {sparkles.map((sparkle) => (
              <motion.span
                key={sparkle.id}
                initial={{ opacity: 0, scale: 0 }}
                animate={{
                  opacity: [0, 1, 0],
                  scale: [0, sparkle.scale, 0],
                }}
                exit={{ opacity: 0, scale: 0 }}
                transition={{
                  duration: 2,
                  delay: sparkle.delay,
                  ease: "easeInOut",
                }}
                className="absolute"
                style={{
                  left: `${sparkle.x}%`,
                  top: `${sparkle.y}%`,
                }}
              >
                <svg
                  className="w-3 h-3 text-primary/60"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 0L14.59 8.41L23 11L14.59 13.59L12 22L9.41 13.59L1 11L9.41 8.41L12 0Z" />
                </svg>
              </motion.span>
            ))}
          </AnimatePresence>
        </span>
      )}

      {/* Animated name with gradient shimmer */}
      <span className="relative inline-flex overflow-hidden">
        {/* Base gradient text */}
        <span className="shimmer-text-gradient font-bold">
          {prefersReducedMotion ? (
            // Static version for reduced motion
            <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              {name}
            </span>
          ) : (
            // Animated character-by-character entrance
            characters.map((char, index) => (
              <motion.span
                key={index}
                initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
                animate={
                  isVisible
                    ? {
                        opacity: 1,
                        y: 0,
                        filter: "blur(0px)",
                      }
                    : {}
                }
                transition={{
                  duration: 0.4,
                  delay: index * 0.03,
                  ease: [0.25, 0.1, 0.25, 1],
                }}
                className="inline-block shimmer-char"
                style={{
                  // Preserve whitespace
                  whiteSpace: char === " " ? "pre" : "normal",
                }}
              >
                {char}
              </motion.span>
            ))
          )}
        </span>

        {/* Shimmer overlay effect */}
        {!prefersReducedMotion && (
          <motion.span
            className="absolute inset-0 pointer-events-none"
            initial={{ x: "-100%" }}
            animate={{ x: "200%" }}
            transition={{
              repeat: Infinity,
              repeatDelay: 3,
              duration: 1.5,
              ease: "easeInOut",
              delay: 1,
            }}
          >
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12" />
          </motion.span>
        )}
      </span>

      {/* Subtle glow effect behind name */}
      {!prefersReducedMotion && (
        <motion.span
          className="absolute inset-0 -z-10 blur-xl opacity-40"
          animate={{
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <span className="absolute inset-0 bg-gradient-to-r from-primary/50 via-accent/50 to-primary/50 rounded-full" />
        </motion.span>
      )}
    </span>
  );
}

/**
 * Lightweight inline shimmer text - for simpler use cases
 */
export function ShimmerText({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <span
      className={`
        relative inline-block shimmer-text-gradient
        ${className}
      `}
    >
      {children}
      {!prefersReducedMotion && (
        <motion.span
          className="absolute inset-0 pointer-events-none"
          initial={{ x: "-100%" }}
          animate={{ x: "200%" }}
          transition={{
            repeat: Infinity,
            repeatDelay: 4,
            duration: 1.2,
            ease: "easeInOut",
          }}
        >
          <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent skew-x-12" />
        </motion.span>
      )}
    </span>
  );
}
