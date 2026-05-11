"use client";

/**
 * AIModeSwitch — premium 2-mode selector for the main chat input.
 *
 *   - "posts"      Generate LinkedIn posts (default and only state-toggle)
 *   - "strategist" Marketing Strategist (Max-only) — opens the side drawer
 *                  rather than routing through the main input, since the
 *                  agent has its own conversation surface and system prompt.
 *
 * The "support" Q&A mode was retired from the production UI: it was confusing
 * the conversion narrative (Posty = LinkedIn post generator, not a help chat).
 * The AIMode type still carries the literal for backward compatibility with
 * persisted state, but no UI element ever transitions to it now.
 *
 * Visually: a single pill control. Posts is the state-toggle segment;
 * Strategist is always shown with an amber gradient and a "MAX" badge for
 * Free/Pro users (clicking still opens the drawer — that drawer renders the
 * teaser overlay for non-Max plans).
 */

import { motion } from "framer-motion";
import { PenLine, Sparkles } from "lucide-react";

export type AIMode = "posts" | "support";

interface Props {
  mode: AIMode;
  onModeChange: (mode: AIMode) => void;
  onOpenStrategist: () => void;
  /** True when the current user's plan unlocks the Marketing Strategist. */
  hasStrategistAccess: boolean;
  className?: string;
}

export default function AIModeSwitch({
  mode,
  onModeChange,
  onOpenStrategist,
  hasStrategistAccess,
  className = "",
}: Props) {
  return (
    <div
      className={`
        inline-flex items-center gap-0.5 p-1 rounded-xl
        bg-gray-100 dark:bg-dark-elevated
        border border-border-primary
        shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] dark:shadow-none
        ${className}
      `}
    >
      {/* Posts — default mode */}
      <button
        type="button"
        onClick={() => mode !== "posts" && onModeChange("posts")}
        aria-pressed={mode === "posts"}
        className={`
          relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg
          text-xs font-medium transition-colors duration-200 cursor-pointer
          ${
            mode === "posts"
              ? "text-primary"
              : "text-text-muted hover:text-text-secondary"
          }
        `}
      >
        {mode === "posts" && (
          <motion.div
            layoutId="aiModeIndicator"
            className="absolute inset-0 rounded-lg bg-primary/15 border border-primary/30"
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          />
        )}
        <span className="relative z-10 flex items-center gap-1.5">
          <PenLine className="w-3.5 h-3.5" />
          <span>Posts</span>
        </span>
      </button>

      {/* Strategist — opens the drawer (Max-only experience). Solid gold
          gradient so it pops out of the light pill as a clear premium CTA. */}
      <button
        type="button"
        onClick={onOpenStrategist}
        aria-label="Ouvrir le Stratège marketing"
        className="
          relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg
          text-xs font-semibold cursor-pointer
          text-gray-900
          bg-gradient-to-r from-amber-400 to-yellow-500
          hover:from-amber-500 hover:to-yellow-600
          shadow-[0_2px_8px_-2px_rgba(245,158,11,0.5)]
          ring-1 ring-amber-300/40
          transition-all duration-200
        "
      >
        <span className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 drop-shadow-sm" />
          <span className="drop-shadow-sm">Stratège</span>
          {!hasStrategistAccess && (
            <span
              className="
                ml-0.5 px-1 py-[1px] rounded
                text-[8.5px] font-bold uppercase tracking-wider
                bg-gray-900/15 text-gray-900
              "
            >
              Max
            </span>
          )}
        </span>
      </button>
    </div>
  );
}
