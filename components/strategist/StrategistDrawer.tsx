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

import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useStrategistDrawer } from "@/contexts/StrategistDrawerContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useLanguage } from "@/contexts/LanguageContext";
import StrategistChatPanel from "./StrategistChatPanel";
import StrategistLockedCard from "./StrategistLockedCard";

const PREMIUM_EASE = [0.22, 1, 0.36, 1] as const;

export default function StrategistDrawer() {
  const { isOpen, close } = useStrategistDrawer();
  const { hasMarketingStrategist, loading } = useSubscription();
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
              {loading ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-gray-200 border-t-gray-600 dark:border-gray-700 dark:border-t-gray-300 rounded-full animate-spin" />
                </div>
              ) : hasMarketingStrategist ? (
                <StrategistChatPanel />
              ) : (
                <div className="flex-1 overflow-y-auto">
                  <StrategistLockedCard />
                </div>
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
        {/* Gold sparkle — same minimal mark used in the FAB tooltip,
            keeps the header visually quiet while signaling the AI agent. */}
        <svg
          className="w-4 h-4 text-amber-500 dark:text-amber-400 flex-shrink-0"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden
        >
          <path d="M12 2.5l1.8 6.4L20.5 12l-6.7 3.1L12 21.5l-1.8-6.4L3.5 12l6.7-3.1L12 2.5z" />
        </svg>
        <h2 className="text-[14px] font-medium text-gray-900 dark:text-white tracking-tight">
          {t.strategist.pageTitle}
        </h2>
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
          Max
        </span>
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
