"use client";

import { useState } from "react";
import { motion } from "framer-motion";

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
  const [showTooltip, setShowTooltip] = useState(false);

  // Clean color palette - solid colors, no glow
  const colorClasses = {
    primary: {
      bg: "bg-primary/10",
      border: "border-primary/20",
      borderHover: "hover:border-primary/30",
      icon: "text-primary",
    },
    accent: {
      bg: "bg-violet-500/10",
      border: "border-violet-500/20",
      borderHover: "hover:border-violet-500/30",
      icon: "text-violet-600 dark:text-violet-400",
    },
    warning: {
      bg: "bg-amber-500/10",
      border: "border-amber-500/20",
      borderHover: "hover:border-amber-500/30",
      icon: "text-amber-600 dark:text-amber-400",
    },
    success: {
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
      borderHover: "hover:border-emerald-500/30",
      icon: "text-emerald-600 dark:text-emerald-400",
    },
  };

  const colors = colorClasses[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{
        y: -4,
        boxShadow: "0 8px 25px -5px rgba(0, 0, 0, 0.08), 0 4px 10px -6px rgba(0, 0, 0, 0.04)",
        transition: { duration: 0.25, ease: [0.25, 0.1, 0.25, 1] },
      }}
      transition={{ duration: 0.3 }}
      className={`
        group relative bg-white dark:bg-dark-card border ${colors.border} ${colors.borderHover} rounded-2xl p-3 sm:p-5
        transition-colors duration-200 cursor-default
      `}
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
        {/* Icon */}
        <div
          className={`
            w-10 h-10 sm:w-12 sm:h-12 rounded-xl ${colors.bg} border ${colors.border}
            flex items-center justify-center
            transition-colors duration-200
          `}
        >
          <span className={colors.icon}>{icon}</span>
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
        {value.toLocaleString("fr-FR")}
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
