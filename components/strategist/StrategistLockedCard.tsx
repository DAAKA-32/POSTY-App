"use client";

/**
 * StrategistLockedCard — minimal upgrade pitch for Free/Pro users.
 *
 * No background mockup, no halo, no XL avatar. Just a centered card with the
 * essentials: tiny "Max plan" eyebrow, title, description, 4 ✓ benefits,
 * and a single solid amber CTA + a quiet secondary text link.
 */

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";

export default function StrategistLockedCard() {
  const { t } = useLanguage();
  const reduced = useReducedMotion();
  const l = t.strategist.locked;

  const benefits = [l.benefit1, l.benefit2, l.benefit3, l.benefit4];

  return (
    <div className="flex-1 flex items-center justify-center px-5 py-10">
      <motion.div
        initial={reduced ? false : { opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md"
      >
        <div
          className="
            bg-white dark:bg-dark-card
            border border-gray-200 dark:border-dark-border
            rounded-xl p-7 sm:p-8
          "
        >
          {/* Eyebrow */}
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

          {/* Title */}
          <h2 className="mt-4 text-[20px] font-semibold tracking-tight text-gray-900 dark:text-white leading-[1.25]">
            {l.title}
          </h2>

          {/* Description */}
          <p className="mt-2 text-[13.5px] text-gray-500 dark:text-gray-400 leading-relaxed">
            {l.description}
          </p>

          {/* Benefits — amber checkmarks (this is the upsell, gold is on-brand) */}
          <ul className="mt-6 space-y-2.5">
            {benefits.map((b, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <svg
                  className="flex-shrink-0 w-3.5 h-3.5 mt-[3px] text-amber-500 dark:text-amber-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2.2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-[13px] text-gray-700 dark:text-gray-300 leading-snug">
                  {b}
                </span>
              </li>
            ))}
          </ul>

          {/* CTAs */}
          <div className="mt-7 space-y-1">
            <Link
              href="/subscription"
              className="
                block w-full text-center
                px-4 py-2.5 rounded-lg
                bg-amber-500 hover:bg-amber-600
                text-white font-medium text-[13.5px]
                transition-colors
              "
            >
              {l.cta}
            </Link>
            <Link
              href="/app"
              className="
                block w-full text-center
                py-2 rounded-lg
                text-gray-500 dark:text-gray-400
                hover:text-gray-700 dark:hover:text-gray-200
                font-medium text-[13px]
                transition-colors
              "
            >
              {l.backToChat}
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
