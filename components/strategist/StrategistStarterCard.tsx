"use client";

/**
 * StrategistStarterCard — flat consultation topic card.
 *
 * No lift, no glow, no corner accent. Just a clean rectangle with a hover
 * background tint. Icon stays neutral gray (the amber accent budget is
 * spent on the Max badge + Upgrade CTA elsewhere).
 */

import { motion, useReducedMotion } from "framer-motion";
import { ReactNode } from "react";

interface Props {
  icon: ReactNode;
  title: string;
  preview: string;
  onClick: () => void;
  delay?: number;
}

export default function StrategistStarterCard({
  icon,
  title,
  preview,
  onClick,
  delay = 0,
}: Props) {
  const reduced = useReducedMotion();

  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={reduced ? false : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay, ease: [0.22, 1, 0.36, 1] }}
      className="
        group text-left w-full
        bg-white dark:bg-dark-card
        border border-gray-200 dark:border-dark-border
        rounded-lg px-3.5 py-3
        transition-colors duration-150
        hover:bg-gray-50 dark:hover:bg-dark-hover
        hover:border-gray-300 dark:hover:border-gray-600
        focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 dark:focus-visible:ring-gray-600
      "
    >
      <div className="flex items-start gap-3">
        <span
          className="
            flex-shrink-0 mt-[1px]
            text-amber-500 dark:text-amber-400
            group-hover:text-amber-600 dark:group-hover:text-amber-300
            transition-colors
          "
        >
          {icon}
        </span>

        <div className="flex-1 min-w-0">
          <p className="text-[13.5px] font-medium text-gray-900 dark:text-white tracking-tight leading-snug">
            {title}
          </p>
          <p className="mt-0.5 text-[12px] text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-1">
            {preview}
          </p>
        </div>

        <svg
          className="flex-shrink-0 w-3 h-3 mt-1.5 text-gray-300 dark:text-gray-600 group-hover:text-gray-500 dark:group-hover:text-gray-400 transition-colors"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </motion.button>
  );
}
