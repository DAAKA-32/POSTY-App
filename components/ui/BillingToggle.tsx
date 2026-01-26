"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useId } from "react";

interface BillingToggleProps {
  isYearly: boolean;
  onChange: (isYearly: boolean) => void;
  monthlyLabel?: string;
  yearlyLabel?: string;
  savingsLabel?: string;
  savingsPercentage?: number;
  showSavings?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * BillingToggle - Monthly/Yearly billing period selector
 *
 * UNIFORMIZED with Toggle.tsx component from consent preferences:
 * - Same pill-shaped track style
 * - Same thumb style (white circle with shadow)
 * - Same color scheme (bg-dark-border → bg-primary)
 * - Same CSS transitions
 * - Dual labels (Mensuel/Annuel) for billing selection
 * - Animated savings badge
 *
 * Touch-friendly (44px minimum tap target)
 * Accessible (ARIA compliant)
 */
export default function BillingToggle({
  isYearly,
  onChange,
  monthlyLabel = "Mensuel",
  yearlyLabel = "Annuel",
  savingsLabel = "-17%",
  savingsPercentage = 17,
  showSavings = true,
  size = "md",
  className = "",
}: BillingToggleProps) {
  const id = useId();
  const [displayPercentage, setDisplayPercentage] = useState(0);

  // Animate the percentage when switching to yearly
  useEffect(() => {
    if (isYearly) {
      const duration = 600; // ms
      const steps = 20;
      const increment = savingsPercentage / steps;
      let current = 0;

      const timer = setInterval(() => {
        current += increment;
        if (current >= savingsPercentage) {
          setDisplayPercentage(savingsPercentage);
          clearInterval(timer);
        } else {
          setDisplayPercentage(Math.round(current));
        }
      }, duration / steps);

      return () => clearInterval(timer);
    } else {
      setDisplayPercentage(0);
    }
  }, [isYearly, savingsPercentage]);

  // Size configurations - MATCHING Toggle.tsx sizes
  const sizeConfig = {
    sm: {
      track: "w-10 h-6",
      thumbSize: 18,
      thumbTravel: 18,
      text: "text-xs",
    },
    md: {
      track: "w-[46px] h-[26px]",
      thumbSize: 20,
      thumbTravel: 20,
      text: "text-xs sm:text-sm",
    },
    lg: {
      track: "w-14 h-8",
      thumbSize: 24,
      thumbTravel: 24,
      text: "text-sm sm:text-base",
    },
  };

  const config = sizeConfig[size];

  return (
    <div className={`inline-flex items-center justify-center ${className}`}>
      {/* Invisible spacer on the left to balance the savings badge */}
      {showSavings && (
        <div
          className="mr-2 sm:mr-3 flex items-center opacity-0 pointer-events-none select-none"
          aria-hidden="true"
          style={{ width: '70px' }}
        >
          <div className="px-2.5 py-1 bg-transparent rounded-full flex items-center gap-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className={`${config.text} font-bold tabular-nums`}>
              -{savingsPercentage}%
            </span>
          </div>
        </div>
      )}

      {/* Centered container for Mensuel + Toggle + Annuel */}
      <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
        {/* Monthly label */}
        <button
          type="button"
          onClick={() => onChange(false)}
          className={`
            ${config.text} font-medium cursor-pointer select-none whitespace-nowrap
            transition-colors duration-200
            ${!isYearly ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-text-secondary hover:text-gray-700 dark:hover:text-text-primary"}
          `}
        >
          {monthlyLabel}
        </button>

        {/* Toggle switch - MATCHING Toggle.tsx visual style exactly */}
        <label
          htmlFor={id}
          className={`
            relative inline-block cursor-pointer shrink-0
            ${config.track}
          `}
        >
          {/* Hidden checkbox - handles all click/change events */}
          <input
            type="checkbox"
            id={id}
            checked={isYearly}
            onChange={(e) => onChange(e.target.checked)}
            className="sr-only peer"
            aria-label={isYearly ? "Facturation annuelle sélectionnée" : "Facturation mensuelle sélectionnée"}
          />

          {/* Slider track - EXACT same style as Toggle.tsx */}
          <span
            className={`
              absolute inset-0 cursor-pointer
              rounded-full
              transition-colors duration-200 ease-out
              bg-gray-300 dark:bg-dark-border
              peer-checked:bg-primary
              peer-focus-visible:ring-2 peer-focus-visible:ring-primary/50 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-white dark:peer-focus-visible:ring-offset-dark-bg
              hover:bg-gray-400 dark:hover:bg-dark-hover peer-checked:hover:bg-primary-hover
            `}
          />

          {/* Slider thumb - EXACT same style as Toggle.tsx */}
          <span
            className="absolute top-1/2 bg-white rounded-full shadow-md pointer-events-none transition-transform duration-200 ease-out"
            style={{
              width: `${config.thumbSize}px`,
              height: `${config.thumbSize}px`,
              left: "3px",
              transform: `translateY(-50%) translateX(${isYearly ? config.thumbTravel : 0}px)`,
            }}
          />
        </label>

        {/* Yearly label */}
        <button
          type="button"
          onClick={() => onChange(true)}
          className={`
            ${config.text} font-medium cursor-pointer select-none whitespace-nowrap
            transition-colors duration-200
            ${isYearly ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-text-secondary hover:text-gray-700 dark:hover:text-text-primary"}
          `}
        >
          {yearlyLabel}
        </button>
      </div>

      {/* Animated Savings badge - Fixed width container to prevent layout shift */}
      {showSavings && (
        <div
          className="ml-2 sm:ml-3 flex items-center flex-shrink-0"
          style={{ width: '70px' }}
        >
          <AnimatePresence mode="wait">
            {isYearly && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{
                  type: "spring",
                  stiffness: 500,
                  damping: 30,
                  duration: 0.3,
                }}
                className="relative w-full"
              >
                {/* Subtle glow effect */}
                <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-sm" />

                {/* Badge */}
                <div className="relative px-2.5 py-1 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-full shadow-lg shadow-emerald-500/25 flex items-center gap-1">
                  <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className={`${config.text} font-bold tabular-nums whitespace-nowrap`}>
                    -{displayPercentage}%
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
