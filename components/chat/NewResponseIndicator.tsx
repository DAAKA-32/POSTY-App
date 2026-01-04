"use client";

import { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";

interface NewResponseIndicatorProps {
  isVisible: boolean;
  onClick: () => void;
  newCount?: number;
}

/**
 * Floating indicator that appears when a new AI response is ready
 * and the user has scrolled away from the bottom of the chat.
 *
 * Features:
 * - Subtle slide-in animation from bottom
 * - Click to scroll to new response
 * - Optional count for multiple new responses
 * - Haptic feedback on mobile
 */
const NewResponseIndicator = memo(function NewResponseIndicator({
  isVisible,
  onClick,
  newCount = 1,
}: NewResponseIndicatorProps) {
  const { trigger: triggerHaptic } = useHapticFeedback();

  const handleClick = () => {
    triggerHaptic("light");
    onClick();
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
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
          aria-label={`${newCount} nouvelle${newCount > 1 ? "s" : ""} reponse${newCount > 1 ? "s" : ""} disponible${newCount > 1 ? "s" : ""}`}
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

          {/* Text */}
          <span>
            {newCount > 1
              ? `${newCount} nouvelles reponses`
              : "Reponse prete"}
          </span>

          {/* Subtle pulse effect */}
          <motion.span
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-0 rounded-full bg-white/20 -z-10"
          />
        </motion.button>
      )}
    </AnimatePresence>
  );
});

export default NewResponseIndicator;
