"use client";

/**
 * AIModeSwitch — premium mode selector for the main chat input.
 *
 *   - "posts"      Generate LinkedIn posts (default state-toggle)
 *   - "support"    General Q&A / help — DEV-ONLY in the UI. The button is
 *                  rendered only when NODE_ENV === "development" so we can
 *                  iterate on the Q&A flow locally without exposing it to
 *                  production users (the conversion narrative is "AI LinkedIn
 *                  posts", not a help chat). The mode literal is kept in the
 *                  AIMode union so persisted state and the back-end routes
 *                  still typecheck.
 *   - "strategist" Marketing Strategist (Max-only) — opens the side drawer
 *                  rather than routing through the main input, since the
 *                  agent has its own conversation surface and system prompt.
 *
 * Visually: a single pill control. Posts is the state-toggle segment;
 * Strategist is always shown with an amber gradient and a "MAX" badge for
 * Free/Pro users (clicking still opens the drawer — that drawer renders the
 * teaser overlay for non-Max plans).
 */

import { motion } from "framer-motion";
import { PenLine, HelpCircle, Sparkles } from "lucide-react";

/**
 * NODE_ENV is statically replaced at build time by Next.js / Turbopack, so
 * this constant tree-shakes the dev-only Support branch out of the production
 * bundle entirely — no runtime cost, no client-side env leak.
 */
const SHOW_DEV_SUPPORT = process.env.NODE_ENV === "development";

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

      {/* Support — DEV-ONLY (NODE_ENV === "development"). Tree-shaken out of
          the prod bundle by the static const guard above. */}
      {SHOW_DEV_SUPPORT && (
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
      )}

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
