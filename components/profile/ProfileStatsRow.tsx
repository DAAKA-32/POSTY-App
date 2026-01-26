"use client";

import { motion } from "framer-motion";
import { CountUp } from "@/components/ui/Animated";

interface StatItem {
  id: string;
  value: number | string;
  label: string;
  icon?: React.ReactNode;
  color?: "primary" | "accent" | "warning";
}

interface ProfileStatsRowProps {
  stats: StatItem[];
}

// Premium autoscroll colors - Semantic mapping
const colorClasses = {
  primary: "text-purple-500 dark:text-purple-400", // Storytelling - Creative content
  accent: "text-violet-500 dark:text-violet-400", // Engagement - Interactive elements
  warning: "text-amber-500 dark:text-amber-400", // Tips - Productivity/usage
};

const glowClasses = {
  primary: "group-hover:shadow-[0_0_20px_rgba(168,85,247,0.25)]", // Purple glow
  accent: "group-hover:shadow-[0_0_20px_rgba(139,92,246,0.25)]", // Violet glow
  warning: "group-hover:shadow-[0_0_20px_rgba(245,158,11,0.25)]", // Amber glow
};

const borderClasses = {
  primary: "group-hover:border-purple-500/30",
  accent: "group-hover:border-violet-500/30",
  warning: "group-hover:border-amber-500/30",
};

export default function ProfileStatsRow({ stats }: ProfileStatsRowProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
      className="grid grid-cols-3 gap-3 lg:gap-4"
    >
      {stats.map((stat, index) => (
        <motion.div
          key={stat.id}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.2 + index * 0.05 }}
          whileHover={{ y: -2, scale: 1.02 }}
          className={`
            group relative
            bg-dark-card border border-dark-border
            rounded-xl p-4 lg:p-5
            text-center
            transition-all duration-300
            ${stat.color ? borderClasses[stat.color] : "hover:border-primary/20"}
            ${stat.color ? glowClasses[stat.color] : ""}
          `}
        >
          {/* Subtle gradient overlay on hover - Premium colors */}
          <div className={`
            absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300
            ${stat.color === "primary" ? "bg-gradient-to-br from-purple-500/5 to-transparent" : ""}
            ${stat.color === "accent" ? "bg-gradient-to-br from-violet-500/5 to-transparent" : ""}
            ${stat.color === "warning" ? "bg-gradient-to-br from-amber-500/5 to-transparent" : ""}
          `} />

          {/* Value */}
          <div className={`relative text-2xl lg:text-3xl font-bold mb-1 ${stat.color ? colorClasses[stat.color] : "text-text-primary"}`}>
            {typeof stat.value === "number" ? (
              <CountUp end={stat.value} duration={1000} />
            ) : (
              stat.value
            )}
          </div>

          {/* Label */}
          <div className="relative text-xs lg:text-sm text-text-muted font-medium">
            {stat.label}
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}
