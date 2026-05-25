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
  isLoading?: boolean;
}

// Clean color classes
const colorClasses = {
  primary: "text-primary",
  accent: "text-primary dark:text-primary",
  warning: "text-amber-500 dark:text-amber-400",
};

export default function ProfileStatsRow({ stats, isLoading }: ProfileStatsRowProps) {
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
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.2 + index * 0.05 }}
          className="posty-card-glass rounded-xl p-4 lg:p-5 text-center"
        >
          {/* Value */}
          <div className={`text-2xl lg:text-3xl font-bold mb-1 ${stat.color ? colorClasses[stat.color] : "text-gray-900 dark:text-white"}`}>
            {isLoading && typeof stat.value === "number" ? (
              <div className="h-8 lg:h-9 w-10 mx-auto rounded-md bg-gray-200 dark:bg-dark-hover animate-pulse" />
            ) : typeof stat.value === "number" ? (
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
