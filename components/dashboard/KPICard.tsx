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
   * Per-color icon styling. Each KPI now wears its semantic color (primary =
   * brand, accent = violet, warning = amber, success = emerald) on both the
   * tinted surface and the glyph, so the row reads at a glance instead of
   * looking like 6 identical grey cards. Hover keeps the same color (no
   * disorienting flip to primary), just dials the saturation up a notch.
   */
  const iconStyles: Record<typeof color, { surface: string; ring: string; glyph: string; hoverSurface: string; hoverRing: string }> = {
    primary: {
      surface: "bg-gradient-to-br from-[#FFE9DC] to-[#FFD2B8] dark:from-[#F8935D]/15 dark:to-[#F76B54]/15",
      ring: "ring-[#F8935D]/30 dark:ring-[#F8935D]/20",
      glyph: "text-[#C0421F] dark:text-[#F8935D]",
      hoverSurface: "group-hover:from-[#FFD2B8] group-hover:to-[#FFB89A] dark:group-hover:from-[#F8935D]/25 dark:group-hover:to-[#F76B54]/25",
      hoverRing: "group-hover:ring-[#F76B54]/45 dark:group-hover:ring-[#F8935D]/35",
    },
    accent: {
      surface: "bg-gradient-to-br from-violet-100 to-violet-200/70 dark:from-violet-500/15 dark:to-violet-600/15",
      ring: "ring-violet-300/50 dark:ring-violet-400/20",
      glyph: "text-violet-600 dark:text-violet-400",
      hoverSurface: "group-hover:from-violet-200 group-hover:to-violet-300/80 dark:group-hover:from-violet-500/25 dark:group-hover:to-violet-600/25",
      hoverRing: "group-hover:ring-violet-400/60 dark:group-hover:ring-violet-400/35",
    },
    warning: {
      surface: "bg-gradient-to-br from-amber-100 to-amber-200/70 dark:from-amber-500/15 dark:to-amber-600/15",
      ring: "ring-amber-300/50 dark:ring-amber-400/20",
      glyph: "text-amber-700 dark:text-amber-400",
      hoverSurface: "group-hover:from-amber-200 group-hover:to-amber-300/80 dark:group-hover:from-amber-500/25 dark:group-hover:to-amber-600/25",
      hoverRing: "group-hover:ring-amber-400/60 dark:group-hover:ring-amber-400/35",
    },
    success: {
      surface: "bg-gradient-to-br from-emerald-100 to-emerald-200/70 dark:from-emerald-500/15 dark:to-emerald-600/15",
      ring: "ring-emerald-300/50 dark:ring-emerald-400/20",
      glyph: "text-emerald-700 dark:text-emerald-400",
      hoverSurface: "group-hover:from-emerald-200 group-hover:to-emerald-300/80 dark:group-hover:from-emerald-500/25 dark:group-hover:to-emerald-600/25",
      hoverRing: "group-hover:ring-emerald-400/60 dark:group-hover:ring-emerald-400/35",
    },
  };
  const styles = iconStyles[color];

  // Semantic hover glow — same colour family as the icon, layered on top of
  // the existing neutral depth shadow so each KPI signals its identity even
  // through hover feedback. Keeps the dashboard semantically readable: orange
  // = brand activity, violet = accent insight, amber = caution, emerald = win.
  const hoverShadow: Record<typeof color, string> = {
    primary: "0 8px 22px -8px rgba(248,147,93,0.32), 0 2px 6px -3px rgba(15,23,42,0.06)",
    accent:  "0 8px 22px -8px rgba(139,92,246,0.32), 0 2px 6px -3px rgba(15,23,42,0.06)",
    warning: "0 8px 22px -8px rgba(245,158,11,0.30), 0 2px 6px -3px rgba(15,23,42,0.06)",
    success: "0 8px 22px -8px rgba(16,185,129,0.30), 0 2px 6px -3px rgba(15,23,42,0.06)",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{
        y: -2,
        boxShadow: hoverShadow[color],
        transition: { duration: 0.18, ease: [0.22, 1, 0.36, 1] },
      }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="
        group relative posty-card-glass posty-card-glass-hover
        rounded-2xl p-3 sm:p-5 cursor-default
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
        {/* Icon — color-tinted surface + matching glyph. The color comes from
            the parent's `color` prop, so each KPI in the row carries its own
            semantic identity instead of all six fading into the same grey. */}
        <div
          className={`
            w-10 h-10 sm:w-11 sm:h-11 rounded-xl
            ${styles.surface} ${styles.hoverSurface}
            ring-1 ${styles.ring} ${styles.hoverRing}
            flex items-center justify-center
            transition-all duration-200
          `}
        >
          <span className={`${styles.glyph} transition-colors duration-200`}>{icon}</span>
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
