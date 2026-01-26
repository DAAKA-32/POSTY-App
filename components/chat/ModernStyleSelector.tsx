"use client";

import { motion } from "framer-motion";

interface ModernStyleSelectorProps {
  selectedStyle: "storytelling" | "business";
  onStyleChange: (style: "storytelling" | "business") => void;
  disabled?: boolean;
}

/**
 * ModernStyleSelector - Minimal, elegant style selection for PRO plan
 *
 * Design:
 * - Compact, non-intrusive
 * - Clear visual feedback
 * - Professional appearance
 * - Mobile-optimized
 */
export default function ModernStyleSelector({
  selectedStyle,
  onStyleChange,
  disabled = false,
}: ModernStyleSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      {/* Label - subtle */}
      <span className="text-xs text-text-muted hidden sm:inline">Style:</span>

      {/* Toggle switch */}
      <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-gray-100 dark:bg-dark-elevated border border-border-primary">
        <button
          type="button"
          onClick={() => onStyleChange("storytelling")}
          disabled={disabled}
          className={`
            relative inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md
            text-xs font-medium transition-all duration-200
            ${selectedStyle === "storytelling"
              ? "bg-white dark:bg-dark-card text-accent shadow-sm"
              : "text-text-muted hover:text-text-secondary"
            }
            ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}
          `}
          aria-pressed={selectedStyle === "storytelling"}
        >
          <span className="text-sm">📖</span>
          <span className="hidden sm:inline">Storytelling</span>
        </button>

        <button
          type="button"
          onClick={() => onStyleChange("business")}
          disabled={disabled}
          className={`
            relative inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md
            text-xs font-medium transition-all duration-200
            ${selectedStyle === "business"
              ? "bg-white dark:bg-dark-card text-primary shadow-sm"
              : "text-text-muted hover:text-text-secondary"
            }
            ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}
          `}
          aria-pressed={selectedStyle === "business"}
        >
          <span className="text-sm">💼</span>
          <span className="hidden sm:inline">Business</span>
        </button>
      </div>
    </div>
  );
}
