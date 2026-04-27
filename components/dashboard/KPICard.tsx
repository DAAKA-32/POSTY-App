"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";

interface KPICardProps {
  title: string;
  value: number;
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  icon: React.ReactNode;
  color: "primary" | "accent" | "warning" | "success";
  tooltip?: string;
}

export default function KPICard({
  title,
  value,
  subtitle,
  trend,
  icon,
  color,
  tooltip,
}: KPICardProps) {
  const { language } = useLanguage();
  const [showTooltip, setShowTooltip] = useState(false);

  /**
   * Unified tonal palette — all icons share a subtle gray surface with a
   * primary-tinted glyph for visual cohesion (Linear/Stripe vibe). The legacy
   * `color` prop is preserved for the trend pill differentiation only.
   */
  const trendPillClasses = {
    primary: "text-primary bg-primary/8 border-primary/15",
    accent: "text-violet-600 dark:text-violet-400 bg-violet-500/8 border-violet-500/15",
    warning: "text-amber-600 dark:text-amber-400 bg-amber-500/8 border-amber-500/15",
    success: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/8 border-emerald-500/15",
  };
  // Suppress unused warning while preserving the API
  void trendPillClasses[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{
        y: -2,
        boxShadow: "0 4px 14px -4px rgba(15, 23, 42, 0.06), 0 2px 6px -3px rgba(15, 23, 42, 0.04)",
        transition: { duration: 0.18, ease: [0.22, 1, 0.36, 1] },
      }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="
        group relative bg-white dark:bg-dark-card border border-gray-200/70 dark:border-dark-border/60
        hover:border-gray-300/80 dark:hover:border-dark-border-hover
        rounded-2xl p-3 sm:p-5 transition-colors duration-200 cursor-default
      "
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Tooltip */}
      {tooltip && showTooltip && (
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 z-20 px-3 py-2 bg-white dark:bg-dark-elevated border border-gray-200 dark:border-dark-border rounded-lg shadow-md max-w-[200px] sm:max-w-none sm:whitespace-nowrap">
          <p className="text-xs text-gray-600 dark:text-text-secondary">{tooltip}</p>
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white dark:bg-dark-elevated border-r border-b border-gray-200 dark:border-dark-border rotate-45" />
        </div>
      )}

      <div className="flex items-start justify-between mb-3 sm:mb-4">
        {/* Icon — unified subtle surface across all KPIs */}
        <div className="
          w-10 h-10 sm:w-11 sm:h-11 rounded-xl
          bg-gradient-to-br from-gray-50 to-gray-100/70
          dark:from-dark-elevated dark:to-dark-elevated/60
          ring-1 ring-gray-200/50 dark:ring-dark-border/40
          flex items-center justify-center
          transition-all duration-200
          group-hover:ring-primary/20 group-hover:from-primary/[0.04] group-hover:to-primary/[0.08]
        ">
          <span className="text-gray-600 dark:text-gray-300 group-hover:text-primary transition-colors duration-200">{icon}</span>
        </div>

        {/* Trend badge */}
        {trend && (
          <div
            className={`
              flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium
              ${trend.isPositive
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                : "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
              }
            `}
          >
            <svg
              className={`w-3 h-3 ${trend.isPositive ? "" : "rotate-180"}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 10l7-7m0 0l7 7m-7-7v18"
              />
            </svg>
            <span>{trend.value}%</span>
          </div>
        )}
      </div>

      {/* Value */}
      <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1">
        {value.toLocaleString(language === "en" ? "en-US" : "fr-FR")}
      </p>

      {/* Title */}
      <p className="text-sm font-medium text-gray-600 dark:text-text-secondary">{title}</p>

      {/* Subtitle */}
      {subtitle && (
        <p className="text-xs text-gray-500 dark:text-text-muted mt-1">{subtitle}</p>
      )}
    </motion.div>
  );
}
