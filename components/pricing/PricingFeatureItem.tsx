"use client";

import { motion } from "framer-motion";

interface PricingFeatureItemProps {
  text: string;
  index: number;
  /** Whether this feature is included in the plan */
  included?: boolean;
  /** "light" = default, "dark" = dark bg, "gold" = Max card gold accent on light bg */
  variant?: "light" | "dark" | "gold";
}

export default function PricingFeatureItem({ text, index, included = true, variant = "light" }: PricingFeatureItemProps) {
  const isGold = variant === "gold";
  const isDarkBg = variant === "dark";

  return (
    <motion.li
      initial={{ opacity: 0, x: -8 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ delay: 0.3 + index * 0.04 }}
      className="flex items-start gap-2 sm:gap-2.5 md:gap-3"
    >
      {included ? (
        <div className={`
          flex-shrink-0 w-4 h-4 sm:w-[1.125rem] sm:h-[1.125rem] md:w-5 md:h-5
          rounded-full flex items-center justify-center mt-px
          ${isGold
            ? "bg-amber-100 text-amber-600 dark:bg-amber-400/20 dark:text-amber-400"
            : isDarkBg
              ? "bg-emerald-500/20 text-emerald-400"
              : "bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
          }
        `}>
          <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
      ) : (
        <div className={`
          flex-shrink-0 w-4 h-4 sm:w-[1.125rem] sm:h-[1.125rem] md:w-5 md:h-5
          rounded-full flex items-center justify-center mt-px
          ${isDarkBg
            ? "bg-gray-800 text-gray-600"
            : "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600"
          }
        `}>
          <svg className="w-2 h-2 sm:w-2.5 sm:h-2.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </div>
      )}
      <span className={`
        text-[11px] sm:text-xs md:text-[0.8125rem] leading-relaxed
        ${included
          ? isGold ? "text-gray-700 dark:text-gray-300" : isDarkBg ? "text-gray-300" : "text-gray-700 dark:text-gray-300"
          : "text-gray-400 dark:text-gray-600 line-through"
        }
      `}>
        {text}
      </span>
    </motion.li>
  );
}
