"use client";

/**
 * AIModeSwitch — compact dropdown for the chat persona (Posts / Support).
 *
 * Two top-level personas only:
 *   - Posts:   default. Goes through Posty's content pipeline — but the
 *              underlying intent (post text, visual, or both) is detected
 *              automatically from the prompt itself by /api/intent. The
 *              user never has to pick a sub-mode.
 *   - Support: Q&A / conversational mode. Forces the API into ASSISTANCE
 *              intent so we render replies as plain prose instead of a
 *              LinkedIn preview card.
 *
 * Why we dropped the explicit "Visuel" row: the LLM classifier handles
 * "fais une image…" prompts in <300ms with ~$0.0001 cost. Making the user
 * pick a mode was a UX leak — every modern AI assistant routes by intent,
 * not by sub-menu.
 */

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PenLine, HelpCircle, ChevronDown, Check } from "lucide-react";
import StrategistMark from "@/components/strategist/StrategistMark";
import { useStrategistDrawer } from "@/contexts/StrategistDrawerContext";
import { isStrategistEnabled } from "@/lib/config/feature-flags";
import { useStrategistEligibility } from "@/hooks/strategist/useStrategistEligibility";
import toast from "@/components/ui/Toast";
import {
  menuContainerVariants,
  menuRowVariants,
  iconSwapVariants,
  settleVariants,
  transition,
  interactiveRow,
} from "@/lib/motion";

export type AIMode = "posts" | "support";

interface ModeMeta {
  Icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  accent: string;
  activeBg: string;
  /** Tailwind class for the soft halo behind the trigger when this mode is active. */
  halo: string;
}

const MODE_META: Record<AIMode, ModeMeta> = {
  posts: {
    Icon: PenLine,
    label: "Posts",
    description: "Posts, visuels — l'IA détecte l'intention",
    accent: "text-primary",
    activeBg: "bg-primary/15",
    halo: "bg-primary/20",
  },
  support: {
    Icon: HelpCircle,
    label: "Support",
    description: "Conseils, idées, questions",
    accent: "text-emerald-600 dark:text-emerald-400",
    activeBg: "bg-emerald-500/15",
    halo: "bg-emerald-500/20",
  },
};

export default function AIModeSwitch({
  mode,
  onModeChange,
  className = "",
}: Props) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  // Strategist drawer is launched from this dropdown as a third row. It's NOT
  // a chat mode — selecting it opens the slide-in drawer without changing
  // `aiMode`, then closes the menu.
  //
  // Visibility vs clickability are decoupled now: the row is VISIBLE as soon
  // as the feature flag is on, but clicking it is GATED by eligibility:
  //   - ok           → open the drawer
  //   - no-access    → toast "invitation only" (don't open — user can't use it)
  //   - no-linkedin  → open the drawer anyway (the drawer surfaces a Connect
  //                    LinkedIn screen — recoverable in one click)
  //   - loading      → silent no-op (transient state)
  // Always-visible row gives the user a discoverable affordance they can ask
  // us about instead of "where do I find the Strategist?".
  const strategist = useStrategistDrawer();
  const strategistEligibility = useStrategistEligibility();
  const strategistEnabled = isStrategistEnabled();

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
      {/* Soft halo — reveals on hover/open, color follows the active mode.
          Pure decoration, sits behind the chip and never intercepts pointer
          events. */}
      <motion.span
        aria-hidden
        className={`pointer-events-none absolute inset-0 -m-1 rounded-2xl blur-md ${current.halo}`}
        initial={false}
        animate={{ opacity: open ? 0.55 : 0 }}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      />

      {/* Trigger chip */}
      <motion.button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        whileHover={{ y: -1 }}
        whileTap={{ scale: 0.97, y: 0 }}
        transition={transition.springSettle}
        className={`
          relative inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg
          text-xs font-medium cursor-pointer
          bg-white/55 dark:bg-white/[0.08]
          backdrop-blur-md backdrop-saturate-150 dark:backdrop-saturate-120
          border border-white/60 dark:border-white/20
          shadow-sm dark:shadow-black/20
          text-text-secondary hover:text-text-primary
          hover:bg-white/70 dark:hover:bg-white/[0.12]
          transition-colors duration-150
          ${open ? "ring-1 ring-primary/25 border-primary/30" : ""}
        `}
      >
        {/* Icon crossfade on mode change — outgoing icon fades down, incoming
            fades up. mode="wait" prevents the two from overlapping. */}
        <span className="relative inline-flex w-3.5 h-3.5">
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={mode}
              variants={iconSwapVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="absolute inset-0 inline-flex items-center justify-center"
            >
              <CurrentIcon className={`w-3.5 h-3.5 ${current.accent}`} />
            </motion.span>
          </AnimatePresence>
        </span>

        {/* Label "settles" each time the mode changes — keyed so AnimatePresence
            unmounts the old label and re-mounts the new one. */}
        <span className="relative inline-block overflow-hidden">
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={mode}
              variants={settleVariants}
              initial="initial"
              animate="animate"
              className="inline-block"
            >
              {current.label}
            </motion.span>
          </AnimatePresence>
        </span>

        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={transition.springSnappy}
          className="inline-flex"
        >
          <ChevronDown className="w-3 h-3 text-text-muted" />
        </motion.span>
      </motion.button>

      {/* Menu — opens upward (input area sits at the bottom of the viewport).
          max-w guards against viewport overflow on small phones. Stagger comes
          from menuContainerVariants → menuRowVariants. */}
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            variants={menuContainerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            style={{ transformOrigin: "bottom center", willChange: "transform, opacity" }}
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
            {strategistEnabled && (
              <MenuRow
                meta={{
                  Icon: StrategistMark,
                  label: "Strategist",
                  description: "Agent marketing autonome",
                  accent: "text-amber-600 dark:text-amber-400",
                  activeBg: "bg-amber-500/15",
                  halo: "bg-amber-500/20",
                }}
                active={false}
                onClick={() => {
                  setOpen(false);
                  if (strategistEligibility.reason === "no-access") {
                    toast.info(
                      "Le Stratège est réservé aux entreprises. Contacte-nous pour activer ton compte.",
                      { duration: 5000 }
                    );
                    return;
                  }
                  if (strategistEligibility.reason === "loading") {
                    // Transient — silently bail rather than opening a drawer
                    // that would just show a spinner.
                    return;
                  }
                  // ok OR no-linkedin → open the drawer; in the no-linkedin
                  // case the drawer renders the Connect-LinkedIn screen
                  // (recoverable in one click).
                  strategist.open();
                }}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface Props {
  mode: AIMode;
  onModeChange: (mode: AIMode) => void;
  className?: string;
}

// ─── Rows ───────────────────────────────────────────────────────────────────

function MenuRow({
  meta,
  active,
  onClick,
}: {
  meta: ModeMeta;
  active: boolean;
  onClick: () => void;
}) {
  const { Icon, label, description, accent, activeBg } = meta;
  return (
    <motion.button
      type="button"
      onClick={onClick}
      role="menuitemradio"
      aria-checked={active}
      variants={menuRowVariants}
      {...interactiveRow}
      className="
        w-full text-left px-2.5 py-2 rounded-lg
        flex items-start gap-3
        transition-colors duration-150
        hover:bg-gray-50 dark:hover:bg-dark-hover cursor-pointer
      "
    >
      <motion.div
        animate={{
          scale: active ? 1.04 : 1,
        }}
        transition={transition.springSettle}
        className={`
          mt-0.5 flex items-center justify-center w-7 h-7 rounded-md flex-shrink-0
          ${active ? `${activeBg} ${accent}` : "bg-gray-100 dark:bg-dark-elevated text-text-muted"}
        `}
      >
        <Icon className="w-3.5 h-3.5" />
      </motion.div>
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
          <AnimatePresence>
            {active && (
              <motion.span
                initial={{ opacity: 0, scale: 0.6, rotate: -20 }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  rotate: 0,
                  transition: { duration: 0.28, ease: [0.34, 1.56, 0.64, 1] },
                }}
                exit={{
                  opacity: 0,
                  scale: 0.6,
                  transition: { duration: 0.12, ease: [0.4, 0, 0.2, 1] },
                }}
                className="inline-flex"
              >
                <Check className={`w-3.5 h-3.5 ${accent}`} />
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        <p className="text-[11px] text-text-muted mt-0.5 leading-snug">
          {description}
        </p>
      </div>
    </motion.button>
  );
}
