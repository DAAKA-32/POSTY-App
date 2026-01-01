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

const colorClasses = {
  primary: "text-primary",
  accent: "text-accent",
  warning: "text-warning",
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
          className="
            bg-dark-card border border-dark-border
            rounded-xl p-4 lg:p-5
            text-center
            hover:border-dark-hover transition-colors duration-200
          "
        >
          {/* Value */}
          <div className={`text-2xl lg:text-3xl font-bold mb-1 ${stat.color ? colorClasses[stat.color] : "text-white"}`}>
            {typeof stat.value === "number" ? (
              <CountUp end={stat.value} duration={1000} />
            ) : (
              stat.value
            )}
          </div>

          {/* Label */}
          <div className="text-xs lg:text-sm text-text-muted font-medium">
            {stat.label}
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}
