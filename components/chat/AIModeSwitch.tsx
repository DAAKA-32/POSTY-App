"use client";

/**
 * AIModeSwitch — compact dropdown for the chat persona (Posts / Support).
 *
 * Why a dropdown rather than a pill row: when stacked above the post-style
 * toggles (MaxModeSelector / DualModeToggle), a full pill ate too much
 * vertical space on mobile and visually competed with the post mode. The
 * dropdown collapses both options into a single chip that sits on the SAME
 * row as the post-style selector — one line, clear hierarchy.
 *
 *   - Posts:   default state-toggle (chip label = "Posts"). Generates
 *              LinkedIn-ready post variants via /api/generate.
 *   - Support: Q&A / advice. The API forces ASSISTANCE intent so we render
 *              the response as plain prose, not a LinkedIn preview card.
 *
 * (The Strategist persona has been pulled out of this menu pending its
 * launch; the drawer + route still exist behind the env-gated FAB and are
 * not referenced here. Re-adding a row here is the only change required
 * when we ship it.)
 */

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PenLine, HelpCircle, ChevronDown, Check } from "lucide-react";

export type AIMode = "posts" | "support";

interface Props {
  mode: AIMode;
  onModeChange: (mode: AIMode) => void;
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

  const current = MODE_META[mode];
  const CurrentIcon = current.Icon;

  const handleModeSelect = (next: AIMode) => {
    if (next !== mode) onModeChange(next);
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
          max-w guards against viewport overflow on small phones. */}
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
              active={mode === "posts"}
              onClick={() => handleModeSelect("posts")}
            />
            <MenuRow
              meta={MODE_META.support}
              active={mode === "support"}
              onClick={() => handleModeSelect("support")}
            />
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
