"use client";

/**
 * AIModeSwitch — premium 3-mode selector for the main chat input.
 *
 *   - "posts"      Generate LinkedIn posts (default)
 *   - "support"    General Q&A / advice / how-tos
 *   - "strategist" Marketing Strategist (Max-only) — opens the side drawer
 *                  rather than routing through the main input, since the
 *                  agent has its own conversation surface and system prompt.
 *
 * Visually: a single pill control (matches <MaxModeSelector />). Posts/Support
 * are state-toggle segments; Strategist is always shown with an amber sparkle
 * accent and a "MAX" badge for Free/Pro users (clicking still opens the drawer
 * — that drawer renders the teaser overlay for non-Max plans).
 */

import { motion } from "framer-motion";
import { PenLine, HelpCircle, Sparkles } from "lucide-react";

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

      {/* Support — general Q&A */}
      <button
        type="button"
        onClick={() => mode !== "support" && onModeChange("support")}
        aria-pressed={mode === "support"}
        className={`
          relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg
          text-xs font-medium transition-colors duration-200 cursor-pointer
          ${
            mode === "support"
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-text-muted hover:text-text-secondary"
          }
        `}
      >
        {mode === "support" && (
          <motion.div
            layoutId="aiModeIndicator"
            className="absolute inset-0 rounded-lg bg-emerald-500/15 border border-emerald-500/30"
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          />
        )}
        <span className="relative z-10 flex items-center gap-1.5">
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Support</span>
        </span>
      </button>

      {/* Strategist — opens the drawer (Max-only experience) */}
      <button
        type="button"
        onClick={onOpenStrategist}
        aria-label="Ouvrir le Stratège marketing"
        className="
          relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg
          text-xs font-medium cursor-pointer
          text-amber-700 dark:text-amber-400
          bg-gradient-to-r from-amber-500/10 to-yellow-500/10
          hover:from-amber-500/20 hover:to-yellow-500/20
          transition-colors duration-200
        "
      >
        <span className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Stratège</span>
          {!hasStrategistAccess && (
            <span
              className="
                ml-0.5 px-1 py-[1px] rounded
                text-[8.5px] font-bold uppercase tracking-wider
                bg-amber-500/20 text-amber-700 dark:text-amber-400
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
