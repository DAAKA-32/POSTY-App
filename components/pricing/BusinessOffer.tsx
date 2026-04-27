"use client";

/**
 * BusinessOffer — editorial B2B funnel card under the Free / Pro / Max grid.
 *
 * Design language: editorial pricing card (Linear / Stripe enterprise).
 *  - Serial eyebrow ("B—01 ── BUSINESS") instead of a colored icon
 *  - Real headline as the visual focal point
 *  - Neutral typographic bullets (en-dashes, not filled colored checks)
 *  - Single CTA in neutral text + animated arrow as the only brand accent
 *  - Idle nudge loop on the arrow + ping halo around the disc to draw the
 *    eye toward the "Learn more" target without noise. On hover the loop
 *    settles into a stronger translate via Framer variants.
 *
 * Routes to /business for the full pitch and booking flow.
 */

import Link from "next/link";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";

const EASE = [0.22, 1, 0.36, 1] as const;
const ACCENT = "#F8935D";

// ─────────────────────────────────────────────────────────────────────
// Motion variants — coordinated rest-loop + hover state
//
// Idle "click me" pattern: a double-tap nudge — arrow shoots out, retreats
// halfway, shoots out further, settles. This catches the eye twice per
// cycle (way more attention-grabbing than a single push) and makes the
// button feel like it's *signalling* the user. Cadence: ~2s on, ~1.4s off
// so the loop reads as deliberate rhythm rather than restless flicker.
// ─────────────────────────────────────────────────────────────────────
const arrowVariants: Variants = {
  rest: {
    // 0 → 6px → 3px → 9px → 0 = a double-bounce that points "go go go"
    x: [0, 6, 3, 9, 0],
    transition: {
      duration: 1.5,
      times: [0, 0.25, 0.45, 0.65, 1],
      repeat: Infinity,
      repeatDelay: 1.4,
      // overshoot/spring-y curve so each push has a tiny "elastic" feel
      ease: [0.34, 1.4, 0.64, 1],
    },
  },
  hover: {
    x: 8,
    transition: { type: "spring", stiffness: 460, damping: 22 },
  },
};

const discVariants: Variants = {
  rest: {
    // Two synchronized pulses matching the arrow's two pushes — the disc
    // "breathes" in time with each nudge so the whole CTA feels alive.
    scale: [1, 1.08, 1.03, 1.10, 1],
    transition: {
      duration: 1.5,
      times: [0, 0.25, 0.45, 0.65, 1],
      repeat: Infinity,
      repeatDelay: 1.4,
      ease: [0.34, 1.4, 0.64, 1],
    },
  },
  hover: {
    scale: 1.12,
    transition: { type: "spring", stiffness: 420, damping: 22 },
  },
};

// Concentric ping — fires on every nudge cycle for stronger attention.
// Shorter cadence than before so the ring keeps rippling out alongside the
// arrow's bounces.
const pingVariants: Variants = {
  rest: {
    scale: [1, 2.2],
    opacity: [0.7, 0],
    transition: {
      duration: 1.2,
      repeat: Infinity,
      repeatDelay: 1.0,
      ease: "easeOut",
    },
  },
  hover: {
    scale: 1,
    opacity: 0,
    transition: { duration: 0.2 },
  },
};

export default function BusinessOffer() {
  const { t } = useLanguage();
  const reduced = useReducedMotion();

  const bullets: string[] = [
    t.landing.businessBullet1 ?? "Multi-account",
    t.landing.businessBullet2 ?? "Automation",
    t.landing.businessBullet3 ?? "Integrations",
    t.landing.businessBullet4 ?? "Dedicated support",
  ];

  // Disable the attention loop entirely for users who prefer reduced motion
  const motionProps = reduced
    ? { initial: false, animate: undefined, whileHover: undefined }
    : { initial: "rest" as const, animate: "rest" as const, whileHover: "hover" as const };

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={reduced ? { duration: 0 } : { duration: 0.5, ease: EASE }}
      className="relative mt-6 sm:mt-8 md:mt-10 max-w-3xl mx-auto"
    >
      <Link
        href="/business"
        className="
          group block
          rounded-2xl
          focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/30 dark:focus-visible:ring-white/30
        "
      >
        {/* motion wrapper coordinates the hover state across all children with variants */}
        <motion.div
          {...motionProps}
          className="
            relative overflow-hidden rounded-2xl
            bg-white dark:bg-dark-card
            ring-1 ring-gray-200 dark:ring-gray-800
            shadow-[0_1px_3px_-1px_rgba(15,23,42,0.04)]
            dark:shadow-[0_1px_3px_-1px_rgba(0,0,0,0.4)]
            hover:ring-gray-900/15 dark:hover:ring-white/15
            hover:shadow-[0_12px_30px_-16px_rgba(15,23,42,0.18)]
            dark:hover:shadow-[0_12px_30px_-16px_rgba(0,0,0,0.6)]
            transition-[box-shadow,ring-color] duration-300
          "
        >
          {/* Top hairline accent — the single brand touchpoint */}
          <div
            aria-hidden
            className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#F8935D] to-transparent opacity-70"
          />

          <div className="relative px-6 sm:px-8 md:px-10 py-7 sm:py-8 md:py-9">
            {/* ── Top row: eyebrow + inline CTA ────────────────────────── */}
            <div className="flex items-center justify-between gap-4 mb-5 sm:mb-6">
              {/* Editorial eyebrow */}
              <div className="inline-flex items-center min-w-0">
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-900 dark:text-white">
                  {t.landing.businessTitle ?? "Business"}
                </span>
              </div>

              {/* Inline CTA — neutral text, animated disc + arrow */}
              <span
                className="
                  hidden sm:inline-flex items-center gap-2.5
                  text-[13px] font-semibold tracking-tight
                  text-gray-900 dark:text-white
                  shrink-0
                "
              >
                <span>{t.landing.businessLearnMore ?? "Learn more"}</span>

                {/* Animated disc — pulses + inverts on hover */}
                <motion.span
                  variants={discVariants}
                  className="
                    relative inline-flex items-center justify-center w-7 h-7 rounded-full
                    bg-gray-50 dark:bg-gray-900
                    ring-1 ring-gray-200 dark:ring-gray-800
                    transition-colors duration-300
                    group-hover:bg-gray-900 group-hover:ring-gray-900
                    dark:group-hover:bg-white dark:group-hover:ring-white
                  "
                  aria-hidden
                >
                  {/* Ping halo — orange ring expands and fades to invite the click */}
                  <motion.span
                    variants={pingVariants}
                    className="absolute inset-0 rounded-full ring-1"
                    style={{ borderColor: ACCENT, boxShadow: `0 0 0 1px ${ACCENT}55` }}
                  />

                  {/* Arrow — idle nudge loop, snaps further on hover */}
                  <motion.svg
                    variants={arrowVariants}
                    className="
                      relative w-3.5 h-3.5
                      text-gray-700 dark:text-gray-300
                      transition-colors duration-300
                      group-hover:text-white dark:group-hover:text-gray-900
                    "
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={2.4}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </motion.svg>
                </motion.span>
              </span>
            </div>

            {/* ── Editorial headline ──────────────────────────────────── */}
            <h3
              className="
                text-xl sm:text-2xl md:text-[26px]
                font-bold tracking-tight leading-[1.15]
                text-gray-900 dark:text-white
                max-w-md
              "
            >
              {t.landing.businessForTeams ?? "For teams, agencies and companies."}
            </h3>

            {/* ── Capability bullets — typographic, neutral ───────────── */}
            <ul className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-x-5 gap-y-2.5">
              {bullets.map((bullet, i) => (
                <li
                  key={i}
                  className="flex items-center gap-2.5 min-w-0"
                >
                  <span
                    aria-hidden
                    className="flex-shrink-0 w-3 h-px"
                    style={{ backgroundColor: ACCENT, opacity: 0.7 }}
                  />
                  <span className="text-[13px] text-gray-600 dark:text-gray-400 leading-snug truncate">
                    {bullet}
                  </span>
                </li>
              ))}
            </ul>

            {/* ── Mobile CTA — full-width with animated arrow ─────────── */}
            <div className="sm:hidden mt-7 pt-5 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <span className="text-[13px] font-semibold text-gray-900 dark:text-white tracking-tight">
                {t.landing.businessLearnMore ?? "Learn more"}
              </span>
              <motion.span
                variants={discVariants}
                className="
                  relative inline-flex items-center justify-center w-9 h-9 rounded-full
                  bg-gray-900 dark:bg-white
                "
                aria-hidden
              >
                <motion.span
                  variants={pingVariants}
                  className="absolute inset-0 rounded-full ring-1"
                  style={{ borderColor: ACCENT, boxShadow: `0 0 0 1px ${ACCENT}55` }}
                />
                <motion.svg
                  variants={arrowVariants}
                  className="relative w-4 h-4 text-white dark:text-gray-900"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2.4}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </motion.svg>
              </motion.span>
            </div>
          </div>
        </motion.div>
      </Link>
    </motion.div>
  );
}
