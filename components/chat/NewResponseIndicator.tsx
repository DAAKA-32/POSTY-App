"use client";

import { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";

interface NewResponseIndicatorProps {
  isVisible: boolean;
  onClick: () => void;
  newCount?: number;
  /** "new-content" shows text + count, "scroll-down" shows minimal arrow only */
  mode?: "new-content" | "scroll-down";
}

/**
 * Floating indicator / scroll-to-bottom arrow for the chat.
 *
 * Two modes:
 * - "new-content": appears when new AI response arrives while user is scrolled up.
 *   Shows "Réponse prête" text with optional count badge.
 * - "scroll-down": appears whenever user is scrolled up (no new content).
 *   Compact circular arrow button, no text.
 *
 * Features:
 * - Smooth spring animation on enter/exit
 * - Haptic feedback on mobile
 * - Positioned above fixed input area (bottom-28)
 * - z-50 to float above messages but below modals
 */
const NewResponseIndicator = memo(function NewResponseIndicator({
  isVisible,
  onClick,
  newCount = 1,
  mode = "new-content",
}: NewResponseIndicatorProps) {
  const { trigger: triggerHaptic } = useHapticFeedback();

  const handleClick = () => {
    triggerHaptic("light");
    onClick();
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {mode === "new-content" ? (
            <motion.button
              key="new-content"
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{
                type: "spring",
                stiffness: 400,
                damping: 25,
              }}
              onClick={handleClick}
              className="
                fixed bottom-28 left-1/2 -translate-x-1/2 z-50
                flex items-center gap-2 px-4 py-2.5
                bg-primary/95 backdrop-blur-sm
                text-white text-sm font-medium
                rounded-full shadow-lg shadow-primary/30
                border border-primary-hover/50
                hover:bg-primary-hover hover:shadow-xl hover:shadow-primary/40
                active:scale-95
                transition-all duration-200
                cursor-pointer
                haptic-feedback
              "
              aria-label={`${newCount} nouvelle${newCount > 1 ? "s" : ""} réponse${newCount > 1 ? "s" : ""} disponible${newCount > 1 ? "s" : ""}`}
            >
              {/* Down arrow icon */}
              <motion.svg
                animate={{ y: [0, 3, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 14l-7 7m0 0l-7-7m7 7V3"
                />
              </motion.svg>

              <span>
                {newCount > 1
                  ? `${newCount} nouvelles réponses`
                  : "Réponse prête"}
              </span>

              {/* Subtle pulse effect */}
              <motion.span
                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-0 rounded-full bg-white/20 -z-10"
              />
            </motion.button>
          ) : (
            /* Compact scroll-down arrow — no text, just a circular button */
            <motion.button
              key="scroll-down"
              initial={{ opacity: 0, y: 16, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.9 }}
              transition={{
                type: "spring",
                stiffness: 500,
                damping: 30,
              }}
              onClick={handleClick}
              className="
                fixed bottom-28 left-1/2 -translate-x-1/2 z-50
                flex items-center justify-center
                w-10 h-10
                bg-white/90 dark:bg-dark-card/90 backdrop-blur-sm
                text-text-secondary dark:text-text-muted
                rounded-full shadow-md shadow-black/10 dark:shadow-black/30
                border border-gray-200 dark:border-dark-border
                hover:bg-gray-50 dark:hover:bg-dark-hover
                hover:border-primary/30 hover:text-primary
                hover:shadow-lg hover:shadow-primary/10
                active:scale-90
                transition-all duration-200
                cursor-pointer
                haptic-feedback
              "
              aria-label="Défiler vers le bas"
            >
              <motion.svg
                animate={{ y: [0, 2, 0] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 14l-7 7m0 0l-7-7m7 7V3"
                />
              </motion.svg>
            </motion.button>
          )}
        </>
      )}
    </AnimatePresence>
  );
});

export default NewResponseIndicator;
