"use client";

import { motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface ConnectionLoaderProps {
  message?: string;
  compact?: boolean;
}

/**
 * Simple loader for connection/redirect states
 * Shows clear message with minimal spinner
 */
export default function ConnectionLoader({
  message = "Connexion en cours...",
  compact = false
}: ConnectionLoaderProps) {
  const prefersReducedMotion = useReducedMotion();

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        {/* Simple spinner */}
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
    <div className="min-h-screen bg-[#0B0E11] flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: prefersReducedMotion ? 1 : 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{
          duration: prefersReducedMotion ? 0 : 0.2,
          ease: "easeOut",
        }}
        className="flex flex-col items-center gap-6"
      >
        {/* Logo */}
        <div className="w-16 h-16 lg:w-20 lg:h-20 bg-gradient-to-br from-primary to-accent rounded-xl overflow-hidden flex items-center justify-center shadow-lg">
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
          <span className="text-white font-bold text-2xl lg:text-3xl hidden">P</span>
        </div>

        {/* Message */}
        <p className="text-white font-medium text-base lg:text-lg">{message}</p>

        {/* Simple spinner */}
        <motion.div
          className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full"
          animate={{ rotate: prefersReducedMotion ? 0 : 360 }}
          transition={{
            duration: prefersReducedMotion ? 0 : 0.8,
            repeat: prefersReducedMotion ? 0 : Infinity,
            ease: "linear",
          }}
        />
      </motion.div>
    </div>
  );
}
