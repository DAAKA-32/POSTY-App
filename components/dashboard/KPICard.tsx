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

  // Color palette harmonized with landing page Features section
  // Brand: #F8935D → #F76B54 | Emerald | Amber | Violet
  const colorClasses = {
    primary: {
      bg: "bg-[#F8935D]/[0.12]", // Brand orange - Primary actions
      border: "border-[#F8935D]/25",
      borderHover: "hover:border-[#F8935D]/40",
      icon: "text-[#F8935D]",
      glow: "group-hover:shadow-[0_8px_30px_rgba(248,147,93,0.15)]", // Brand glow
      ring: "ring-[#F8935D]/20",
      shimmer: "rgba(248,147,93,0.1)", // Brand shimmer
    },
    accent: {
      bg: "bg-violet-500/[0.12]", // Violet - Scheduling/timing (matches Features)
      border: "border-violet-500/25",
      borderHover: "hover:border-violet-500/40",
      icon: "text-violet-500 dark:text-violet-400",
      glow: "group-hover:shadow-[0_8px_30px_rgba(139,92,246,0.15)]", // Violet glow
      ring: "ring-violet-500/20",
      shimmer: "rgba(139,92,246,0.1)", // Violet shimmer
    },
    warning: {
      bg: "bg-amber-500/[0.12]", // Amber - Activity metrics (matches Features)
      border: "border-amber-500/25",
      borderHover: "hover:border-amber-500/40",
      icon: "text-amber-500 dark:text-amber-400",
      glow: "group-hover:shadow-[0_8px_30px_rgba(245,158,11,0.15)]", // Amber glow
      ring: "ring-amber-500/20",
      shimmer: "rgba(245,158,11,0.1)", // Amber shimmer
    },
    success: {
      bg: "bg-emerald-500/[0.12]", // Emerald - Success metrics (matches Features)
      border: "border-emerald-500/25",
      borderHover: "hover:border-emerald-500/40",
      icon: "text-emerald-500 dark:text-emerald-400",
      glow: "group-hover:shadow-[0_8px_30px_rgba(16,185,129,0.15)]", // Emerald glow
      ring: "ring-emerald-500/20",
      shimmer: "rgba(16,185,129,0.1)", // Emerald shimmer
    },
  };

  const colors = colorClasses[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className={`
        group relative overflow-hidden bg-dashboard-card border ${colors.border} ${colors.borderHover} rounded-2xl p-5
        transition-all duration-300
        ${colors.glow}
      `}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* AUTOSCROLL-style shimmer effect on hover */}
      <motion.div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        animate={{
          backgroundPosition: ["0% 0%", "200% 200%"],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "linear",
        }}
        style={{
          background: `linear-gradient(135deg, transparent 0%, ${colors.shimmer} 25%, transparent 50%, ${colors.shimmer} 75%, transparent 100%)`,
          backgroundSize: "200% 200%",
        }}
      />

      {/* Tooltip */}
      {tooltip && showTooltip && (
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 z-20 px-3 py-2 bg-dashboard-elevated border border-dashboard-card-border rounded-lg shadow-elevated whitespace-nowrap animate-fade-in">
          <p className="text-xs text-text-secondary">{tooltip}</p>
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-dashboard-elevated border-r border-b border-dashboard-card-border rotate-45" />
        </div>
      )}

      <div className="flex items-start justify-between mb-4 relative z-10">
        {/* Icon - avec bordure subtile pour plus de définition */}
        <motion.div
          whileHover={{ scale: 1.1, rotate: 5 }}
          transition={{ duration: 0.2 }}
          className={`
            w-12 h-12 rounded-xl ${colors.bg} border ${colors.border}
            flex items-center justify-center
            transition-all duration-300 group-hover:ring-2 ${colors.ring}
          `}
        >
          <span className={colors.icon}>{icon}</span>
        </motion.div>

        {/* Trend badge */}
        {trend && (
          <div
            className={`
              flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium
              ${trend.isPositive
                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                : "bg-error/15 text-error-light border border-error/20"
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

      {/* Value - text-primary au lieu de text-white pur */}
      <p className="text-3xl font-bold text-text-primary mb-1 relative z-10">
        {value.toLocaleString("fr-FR")}
      </p>

      {/* Title */}
      <p className="text-sm font-medium text-text-secondary relative z-10">{title}</p>

      {/* Subtitle */}
      {subtitle && (
        <p className="text-xs text-text-muted mt-1 relative z-10">{subtitle}</p>
      )}
    </motion.div>
  );
}
