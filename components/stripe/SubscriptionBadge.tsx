"use client";

import { SubscriptionPlan } from "@/types";
import { getPlanConfig } from "@/lib/config/plans";

interface SubscriptionBadgeProps {
  plan: SubscriptionPlan | null;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export default function SubscriptionBadge({
  plan,
  size = "md",
  showLabel = true,
}: SubscriptionBadgeProps) {
  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
    lg: "px-4 py-1.5 text-base",
  };

  const colorClasses: Record<string, string> = {
    none: "bg-gray-100 dark:bg-dark-border text-text-secondary border border-gray-200 dark:border-dark-hover",
    free: "bg-gray-100 dark:bg-dark-border text-text-secondary border border-gray-200 dark:border-dark-hover",
    pro: "bg-gradient-to-r from-pink-500/15 to-rose-500/15 text-rose-500 dark:text-pink-400 border border-pink-500/30 shadow-[0_0_12px_rgba(244,63,94,0.2)]",
    max: "bg-gradient-to-r from-orange-500/15 via-amber-500/15 to-yellow-500/15 text-primary border border-primary/30 shadow-[0_0_16px_rgba(248,147,93,0.25)]",
  };

  const config = plan ? getPlanConfig(plan) : null;
  const displayName = config ? (config.displayName || config.name) : "Aucun abonnement";

  return (
    <span
      className={`
        inline-flex items-center gap-1.5
        rounded-full font-semibold
        ${sizeClasses[size]}
        ${colorClasses[plan ?? "none"]}
      `}
    >
      {(plan === "pro" || plan === "max") && (
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      )}
      {showLabel && displayName}
    </span>
  );
}
