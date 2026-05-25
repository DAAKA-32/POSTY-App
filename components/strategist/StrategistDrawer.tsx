"use client";

/**
 * StrategistDrawer — sober slide-in drawer hosting the Strategist assistant.
 *
 * Visual restraint: white surface, 1px borders, no glow, no halo, no
 * decorative effects. The header is a simple flex row with the agent name,
 * a tiny "Max" badge (single amber accent), and a close button.
 *
 *   - Desktop (lg+): right-anchored panel, 560px wide, full height
 *   - Mobile: bottom-sheet 92vh with a small drag handle (decorative)
 */

import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useStrategistDrawer } from "@/contexts/StrategistDrawerContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useStrategistEligibility } from "@/hooks/strategist/useStrategistEligibility";
import { useLinkedIn } from "@/contexts/LinkedInContext";
import StrategistChatPanel from "./StrategistChatPanel";
import StrategistMark from "./StrategistMark";
import StrategistActivePill from "./StrategistActivePill";

const PREMIUM_EASE = [0.22, 1, 0.36, 1] as const;

export default function StrategistDrawer() {
  const { isOpen, close } = useStrategistDrawer();
  const eligibility = useStrategistEligibility();
  const { t } = useLanguage();
  const reduced = useReducedMotion();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop — quiet dim, no blur */}
          <motion.div
            key="strategist-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={close}
            className="fixed inset-0 z-[100] bg-gray-900/30 dark:bg-black/55"
          />

          {/* Drawer panel */}
          <motion.aside
            key="strategist-drawer"
            role="dialog"
            aria-modal="true"
            aria-label={t.strategist.pageTitle}
            initial={
              reduced ? { opacity: 0 } : { y: "100%", opacity: 0.6 }
            }
            animate={reduced ? { opacity: 1 } : { y: 0, opacity: 1 }}
            exit={reduced ? { opacity: 0 } : { y: "100%", opacity: 0.4 }}
            transition={{ duration: 0.4, ease: PREMIUM_EASE }}
            className="
              fixed z-[101]
              bg-white dark:bg-dark-card
              flex flex-col
              shadow-[0_0_0_1px_rgba(15,23,42,0.04),_-12px_0_40px_-20px_rgba(15,23,42,0.18)]
              dark:shadow-[0_0_0_1px_rgba(255,255,255,0.04),_-12px_0_40px_-20px_rgba(0,0,0,0.5)]

              /* Mobile: bottom sheet */
              inset-x-0 bottom-0 top-auto
              h-[92vh]
              rounded-t-[16px]
              border-t border-gray-200 dark:border-dark-border

              /* Desktop: right-anchored drawer */
              lg:inset-y-0 lg:right-0 lg:left-auto lg:bottom-auto
              lg:h-full lg:w-[min(560px,92vw)]
              lg:rounded-t-none
              lg:border-t-0 lg:border-l lg:border-gray-200 lg:dark:border-dark-border
              overflow-hidden
            "
          >
            <DrawerHeader onClose={close} />

            <div className="flex-1 flex flex-col min-h-0">
              {eligibility.reason === "loading" ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-gray-200 border-t-gray-600 dark:border-gray-700 dark:border-t-gray-300 rounded-full animate-spin" />
                </div>
              ) : eligibility.reason === "no-access" ? (
                <StrategistTeaser />
              ) : eligibility.reason === "no-linkedin" ? (
                <StrategistLinkedInRequired />
              ) : (
                <StrategistChatPanel />
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Header ────────────────────────────────────────────────────────────────

function DrawerHeader({ onClose }: { onClose: () => void }) {
  const { t } = useLanguage();

  return (
    <header
      className="
        relative flex items-center justify-between
        px-5 py-3.5
        border-b border-gray-200 dark:border-dark-border
      "
    >
      {/* Mobile drag handle (decorative — not draggable) */}
      <span
        aria-hidden
        className="lg:hidden absolute top-2 left-1/2 -translate-x-1/2 w-9 h-[3px] rounded-full bg-gray-200 dark:bg-gray-700"
      />

      <div className="flex items-center gap-2 mt-1.5 lg:mt-0">
        {/* Canonical Strategist mark — single source of truth, same glyph
            as the FAB, the dropdown row, the batch cards, the banner. */}
        <StrategistMark className="w-4 h-4 text-amber-500 dark:text-amber-400 flex-shrink-0" />
        <h2 className="text-[14px] font-medium text-gray-900 dark:text-white tracking-tight">
          {t.strategist.pageTitle}
        </h2>
        {/* Conditional "Actif" status pill — visible only when the user has
            turned on the autonomous weekly mode. Tells them at a glance
            that the agent is on duty without opening the config. */}
        <StrategistActivePill />
      </div>

      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="
          mt-1.5 lg:mt-0
          flex items-center justify-center w-7 h-7 rounded-md
          text-gray-400 hover:text-gray-700 dark:hover:text-gray-200
          hover:bg-gray-100 dark:hover:bg-dark-hover
          transition-colors
        "
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.6}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </header>
  );
}

// ── Teaser (Free/Pro) ─────────────────────────────────────────────────────
// Renders the real chat panel underneath, blurred and non-interactive, so
// Free/Pro users get a real preview of the Max-only experience. A centered
// glass card explains the gate and links to /subscription.

function StrategistTeaser() {
  const { t } = useLanguage();
  const l = t.strategist.locked;

  return (
    <div className="relative flex-1 flex flex-col min-h-0">
      {/* Real panel — visible but blurred and inert */}
      <div
        aria-hidden
        className="flex-1 flex flex-col min-h-0 pointer-events-none select-none blur-[3px]"
      >
        <StrategistChatPanel />
      </div>

      {/* Lock overlay — transparent so the blurred panel reads through */}
      <div className="absolute inset-0 z-10 flex items-center justify-center px-5">
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="
            w-full max-w-sm text-center
            bg-white/75 dark:bg-dark-card/75
            backdrop-blur-xl
            border border-white/60 dark:border-white/10
            rounded-xl p-6
            shadow-[0_20px_60px_-15px_rgba(15,23,42,0.35)]
          "
        >
          <span
            className="
              inline-flex items-center
              px-1.5 py-[2px] rounded
              bg-amber-50 dark:bg-amber-400/10
              text-amber-700 dark:text-amber-400
              text-[9.5px] font-semibold uppercase tracking-wider
              border border-amber-200/60 dark:border-amber-400/15
            "
          >
            {l.eyebrow}
          </span>

          <h3 className="mt-3 text-[15px] font-medium text-gray-900 dark:text-white leading-snug">
            {l.title}
          </h3>

          <p className="mt-1.5 text-[13px] text-gray-500 dark:text-gray-400 leading-relaxed">
            {l.description}
          </p>

          <Link
            href="/subscription"
            className="
              mt-5 inline-flex items-center justify-center w-full
              px-4 py-2.5 rounded-lg
              bg-amber-500 hover:bg-amber-600
              text-white font-medium text-[13.5px]
              transition-colors
            "
          >
            {l.cta}
          </Link>
        </motion.div>
      </div>
    </div>
  );
}

// ── LinkedIn-required state ──────────────────────────────────────────────
// User passed the allowlist but has no LinkedIn account connected. Distinct
// from the access teaser: this is RECOVERABLE — one click → /settings →
// connect → come back. Use the same blurred-panel pattern so the affordance
// reads as a soft block, not a hard error.

function StrategistLinkedInRequired() {
  const { close } = useStrategistDrawer();
  const { connectLinkedIn } = useLinkedIn();

  return (
    <div className="relative flex-1 flex flex-col min-h-0">
      {/* Real panel — visible but blurred and inert, same as the access teaser */}
      <div
        aria-hidden
        className="flex-1 flex flex-col min-h-0 pointer-events-none select-none blur-[3px]"
      >
        <StrategistChatPanel />
      </div>

      {/* Connect overlay */}
      <div className="absolute inset-0 z-10 flex items-center justify-center px-5">
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="
            w-full max-w-sm text-center
            bg-white/85 dark:bg-dark-card/85
            backdrop-blur-xl
            border border-white/60 dark:border-white/10
            rounded-xl p-6
            shadow-[0_20px_60px_-15px_rgba(15,23,42,0.35)]
          "
        >
          <span
            className="
              inline-flex items-center
              px-1.5 py-[2px] rounded
              bg-blue-50 dark:bg-blue-400/10
              text-blue-700 dark:text-blue-400
              text-[9.5px] font-semibold uppercase tracking-wider
              border border-blue-200/60 dark:border-blue-400/15
            "
          >
            LinkedIn requis
          </span>

          <h3 className="mt-3 text-[15px] font-medium text-gray-900 dark:text-white leading-snug">
            Connecte ton compte LinkedIn
          </h3>

          <p className="mt-1.5 text-[13px] text-gray-500 dark:text-gray-400 leading-relaxed">
            Le Stratège planifie, génère et programme des posts directement
            sur LinkedIn. Sans compte connecté, il ne sert à rien.
          </p>

          <div className="mt-5 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => {
                close();
                connectLinkedIn();
              }}
              className="
                inline-flex items-center justify-center gap-2
                px-4 py-2 rounded-lg
                bg-[#0A66C2] hover:bg-[#004182]
                text-white font-medium text-[13.5px]
                transition-colors shadow-sm
              "
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path d="M19 0H5a5 5 0 00-5 5v14a5 5 0 005 5h14a5 5 0 005-5V5a5 5 0 00-5-5zM8 19H5V8h3v11zM6.5 6.7a1.8 1.8 0 110-3.6 1.8 1.8 0 010 3.6zM20 19h-3v-5.6c0-1.4-.5-2.4-1.8-2.4-1 0-1.6.7-1.9 1.4-.1.2-.1.6-.1.9V19h-3V8h3v1.3c.4-.6 1.1-1.5 2.7-1.5 2 0 3.5 1.3 3.5 4.1V19z" />
              </svg>
              Connecter LinkedIn
            </button>
            <Link
              href="/settings"
              onClick={close}
              className="
                text-[12px] text-text-muted hover:text-gray-900 dark:hover:text-white
                transition-colors
              "
            >
              Gérer mes connexions dans les paramètres
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
