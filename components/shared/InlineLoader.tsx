"use client";

import { motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import Loader from "./Loader";

interface InlineLoaderProps {
  message?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * Inline/Contextual loader for specific components
 * Does not block the entire UI, only the container
 * Uses spinner instead of dots for professional look
 */
export default function InlineLoader({
  message,
  size = "md",
  className = "",
}: InlineLoaderProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{
        duration: prefersReducedMotion ? 0 : 0.25,
        ease: "easeOut",
      }}
      className={`flex flex-col items-center justify-center gap-3 py-8 ${className}`}
    >
      <Loader size={size} color="primary" />

      {message && (
        <p className="text-text-secondary text-sm font-medium text-center">
          {message}
        </p>
      )}
    </motion.div>
  );
}

/**
 * Compact inline loader for smaller contexts
 */
export function CompactInlineLoader({
  message,
  size = "sm",
  className = "",
}: InlineLoaderProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Loader size={size} color="primary" />
      {message && (
        <span className="text-text-secondary text-xs font-medium">
          {message}
        </span>
      )}
    </div>
  );
}

/**
 * Skeleton loader for content placeholders
 */
export function SkeletonLoader({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse ${className}`}>
      <div className="space-y-3">
        <div className="h-4 bg-dark-hover rounded-lg w-3/4" />
        <div className="h-4 bg-dark-hover rounded-lg w-full" />
        <div className="h-4 bg-dark-hover rounded-lg w-5/6" />
      </div>
    </div>
  );
}
