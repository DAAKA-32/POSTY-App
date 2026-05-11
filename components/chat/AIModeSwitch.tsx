"use client";

/**
 * AIModeSwitch — compact dropdown for the chat persona (Posts / Support /
 * Stratège).
 *
 * Why a dropdown rather than a pill row: when stacked above the post-style
 * toggles (MaxModeSelector / DualModeToggle), a full pill ate too much
 * vertical space on mobile and visually competed with the post mode. The
 * dropdown collapses all options into a single chip that sits on the SAME
 * row as the post-style selector — one line, clear hierarchy.
 *
 *   - Posts:    default state-toggle (chip label = "Posts")
 *   - Support:  DEV-ONLY (NODE_ENV === "development"). Q&A flow; API forces
 *               ASSISTANCE intent. The button is tree-shaken out of prod by
 *               the static SHOW_DEV_SUPPORT guard below, so the prod menu has
 *               just Posts + Stratège.
 *   - Stratège: opens the Strategist drawer (it owns its own surface). Not a
 *               state — selecting it never updates the chip's label.
 *
 * Free/Pro see Stratège with a "MAX" badge; clicking still opens the drawer
 * (the drawer renders the teaser overlay built for non-Max plans).
 */

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PenLine, HelpCircle, Sparkles, ChevronDown, Check } from "lucide-react";

/**
 * NODE_ENV is statically replaced at build time by Next.js / Turbopack, so this
 * constant tree-shakes the dev-only Support branch out of the production bundle
 * entirely — no runtime cost, no client-side env leak.
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

const MODE_META: Record<
  AIMode,
  { Icon: typeof PenLine; label: string; description: string; accent: string; activeBg: string }
> = {
  posts: {
    Icon: PenLine,
    label: "Posts",
    description: "Génère des posts LinkedIn",
    accent: "text-primary",
    activeBg: "bg-primary/15",
  },
  support: {
    Icon: HelpCircle,
    label: "Support",
    description: "Conseils, idées, questions",
    accent: "text-emerald-600 dark:text-emerald-400",
    activeBg: "bg-emerald-500/15",
  },
};

export default function AIModeSwitch({
  mode,
  onModeChange,
  onOpenStrategist,
  hasStrategistAccess,
  className = "",
}: Props) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close on outside click + Escape
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // If a non-dev build somehow lands on "support", surface as Posts in the chip
  // (prevents a stale persisted value from breaking the trigger).
  const safeMode: AIMode = !SHOW_DEV_SUPPORT && mode === "support" ? "posts" : mode;
  const current = MODE_META[safeMode];
  const CurrentIcon = current.Icon;

  const handleModeSelect = (next: AIMode) => {
    if (next !== mode) onModeChange(next);
    setOpen(false);
  };

  const handleStrategist = () => {
    onOpenStrategist();
    setOpen(false);
  };

  return (
    <div ref={wrapperRef} className={`relative inline-block ${className}`}>
      {/* Trigger chip */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`
          inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg
          text-xs font-medium cursor-pointer
          bg-gray-100 dark:bg-dark-elevated
          border border-border-primary
          text-text-secondary hover:text-text-primary
          hover:bg-gray-50 dark:hover:bg-dark-hover
          transition-colors duration-150
          ${open ? "ring-1 ring-primary/25 border-primary/30" : ""}
        `}
      >
        <CurrentIcon className={`w-3.5 h-3.5 ${current.accent}`} />
        <span>{current.label}</span>
        <ChevronDown
          className={`w-3 h-3 text-text-muted transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Menu — opens upward (input area sits at the bottom of the viewport).
          max-w guards against viewport overflow on small phones; the centered
          translate keeps it visually anchored to the trigger chip. */}
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: 4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.97 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className="
              absolute bottom-full left-1/2 -translate-x-1/2 mb-2
              w-[min(260px,calc(100vw-2rem))]
              bg-white dark:bg-dark-card
              border border-gray-200 dark:border-dark-border
              rounded-xl
              shadow-[0_18px_50px_-12px_rgba(15,23,42,0.22)]
              dark:shadow-[0_18px_50px_-12px_rgba(0,0,0,0.6)]
              overflow-hidden
              z-50
              p-1
            "
          >
            <MenuRow
              meta={MODE_META.posts}
              active={safeMode === "posts"}
              onClick={() => handleModeSelect("posts")}
            />

            {SHOW_DEV_SUPPORT && (
              <MenuRow
                meta={MODE_META.support}
                active={safeMode === "support"}
                onClick={() => handleModeSelect("support")}
              />
            )}

            {/* Divider */}
            <div className="my-1 h-px bg-gray-100 dark:bg-dark-border" />

            <StrategistRow hasAccess={hasStrategistAccess} onClick={handleStrategist} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Rows ───────────────────────────────────────────────────────────────────

function MenuRow({
  meta,
  active,
  onClick,
}: {
  meta: { Icon: typeof PenLine; label: string; description: string; accent: string; activeBg: string };
  active: boolean;
  onClick: () => void;
}) {
  const { Icon, label, description, accent, activeBg } = meta;
  return (
    <button
      type="button"
      onClick={onClick}
      role="menuitemradio"
      aria-checked={active}
      className="
        w-full text-left px-2.5 py-2 rounded-lg
        flex items-start gap-3
        hover:bg-gray-50 dark:hover:bg-dark-hover
        transition-colors duration-150
        cursor-pointer
      "
    >
      <div
        className={`
          mt-0.5 flex items-center justify-center w-7 h-7 rounded-md flex-shrink-0
          ${active ? `${activeBg} ${accent}` : "bg-gray-100 dark:bg-dark-elevated text-text-muted"}
        `}
      >
        <Icon className="w-3.5 h-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={`
              text-[13px] font-medium
              ${active ? "text-gray-900 dark:text-white" : "text-text-secondary"}
            `}
          >
            {label}
          </span>
          {active && <Check className={`w-3.5 h-3.5 ${accent}`} />}
        </div>
        <p className="text-[11px] text-text-muted mt-0.5 leading-snug">{description}</p>
      </div>
    </button>
  );
}

function StrategistRow({ hasAccess, onClick }: { hasAccess: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      role="menuitem"
      className="
        w-full text-left px-2.5 py-2 rounded-lg
        flex items-start gap-3
        hover:bg-gray-50 dark:hover:bg-dark-hover
        transition-colors duration-150
        cursor-pointer
      "
    >
      {/* Amber sparkle is the only color accent — keeps the row consistent with
          Posts/Support, while signaling the premium nature of the entry. */}
      <div
        className="
          mt-0.5 flex items-center justify-center w-7 h-7 rounded-md flex-shrink-0
          bg-amber-50 dark:bg-amber-400/10
          text-amber-600 dark:text-amber-400
        "
      >
        <Sparkles className="w-3.5 h-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium text-gray-900 dark:text-white">
            Stratège
          </span>
          {!hasAccess && (
            <span
              className="
                px-1 py-[1px] rounded
                text-[9px] font-semibold uppercase tracking-wider
                bg-amber-50 dark:bg-amber-400/10
                text-amber-700 dark:text-amber-400
                border border-amber-200/60 dark:border-amber-400/15
              "
            >
              Max
            </span>
          )}
        </div>
        <p className="text-[11px] text-text-muted mt-0.5 leading-snug">
          Audits, plans 30 jours, positionnement
        </p>
      </div>
    </button>
  );
}
