"use client";

/**
 * Strategist Floating Action Button
 *
 * Persistent quick-access entry to the Marketing Strategist drawer.
 * Sits bottom-right on every authenticated app page (mounted in MainLayout).
 *
 * Behaviour:
 *   - Click → opens the inline <StrategistDrawer> (no navigation)
 *   - Hidden on the landing/auth/subscription/onboarding flows
 *   - Hover → tooltip "Strategist"
 *   - For Max users: shiny amber gradient
 *   - For Free/Pro: small "MAX" lock badge — drawer opens and shows the
 *     locked upgrade card inside
 *   - Mobile: lifted above the BottomNavbar to avoid collision
 */

import { useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useStrategistDrawer } from "@/contexts/StrategistDrawerContext";
import { isStrategistEnabled } from "@/lib/config/feature-flags";

// Routes where the FAB should NOT appear (wrong context).
const HIDDEN_PATHS = [
  "/subscription",
  "/onboarding",
  "/login",
  "/signup",
  "/forgot-password",
  "/legal",
  "/about",
  "/business",
  "/pricing",
];

export default function StrategistFloatingButton() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const { hasMarketingStrategist } = useSubscription();
  const { open, isOpen } = useStrategistDrawer();
  const [hovered, setHovered] = useState(false);

  // Feature is gated behind an env flag while we hold off the prod launch.
  if (!isStrategistEnabled()) return null;

  // Path-based scoping. Landing ("/") is also excluded.
  if (!pathname || pathname === "/") return null;
  if (HIDDEN_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return null;
  }
  // Hide while the drawer itself is open (drawer has its own close affordance).
  if (isOpen) return null;
  // Max-only entry point — Free/Pro don't see the FAB at all.
  // (The Strategist is a Max-exclusive feature; surfacing the FAB to other
  // tiers just to show a locked upgrade card creates noise. Upgrade pitch
  // happens on /subscription, not via a teasing button on every page.)
  if (!hasMarketingStrategist) return null;

  return (
    <button
      type="button"
      onClick={open}
      aria-label={t.strategist.pageTitle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      // Vertical alignment:
      //   - Desktop (lg+): aligned with the chat composer input bar (≈ bottom 5rem)
      //   - Mobile: lifted above the BottomNavbar + chat composer
      // z-50 sits below modals (z-60+) but above content.
      className="
        fixed z-50
        right-4 lg:right-6
        bottom-40 lg:bottom-20
        group
      "
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.6, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        className="
          relative w-[52px] h-[52px] rounded-full
          bg-gradient-to-br from-amber-400 to-yellow-500
          shadow-[0_8px_22px_-6px_rgba(245,158,11,0.55)]
          hover:shadow-[0_12px_30px_-8px_rgba(245,158,11,0.7)]
          ring-1 ring-amber-300/40
          flex items-center justify-center
          transition-shadow duration-300
        "
      >
        {/* Soft pulse halo — subtle attention nudge */}
        <span
          aria-hidden
          className="absolute inset-0 rounded-full bg-amber-400/30 animate-ping opacity-50"
          style={{ animationDuration: "2.4s" }}
        />

        {/* Sparkle mark — same shape as the drawer header + tooltip,
            in dark gray here for max contrast on the gold gradient. */}
        <svg
          className="relative w-6 h-6 text-gray-900 drop-shadow-sm"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden
        >
          <path d="M12 2.5l1.8 6.4L20.5 12l-6.7 3.1L12 21.5l-1.8-6.4L3.5 12l6.7-3.1L12 2.5z" />
        </svg>
      </motion.div>

      {/* Tooltip — desktop only (mobile users get the icon alone, no hover state) */}
      <AnimatePresence>
        {hovered && (
          <motion.span
            initial={{ opacity: 0, x: 6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 6 }}
            transition={{ duration: 0.18 }}
            className="
              hidden lg:flex
              absolute right-full mr-3 top-1/2 -translate-y-1/2
              items-center gap-1.5
              px-3 py-1.5 rounded-lg
              bg-gray-900 text-white text-[12px] font-semibold
              whitespace-nowrap shadow-xl
              pointer-events-none
            "
          >
            {/* Gold sparkle — brand-consistent AI signature, reads premium
                next to the agent name without competing with the FAB photo. */}
            <svg className="w-3.5 h-3.5 text-amber-400" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M12 2.5l1.8 6.4L20.5 12l-6.7 3.1L12 21.5l-1.8-6.4L3.5 12l6.7-3.1L12 2.5z" />
            </svg>
            {t.strategist.pageTitle}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}
