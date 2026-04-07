"use client";

import { useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useQuota } from "@/contexts/QuotaContext";


interface UsageBannerProps {
  className?: string;
}

type BannerState =
  | { type: "hidden"; show: false }
  | {
      type: "free-normal" | "free-warning" | "free-limit-reached" | "pro-normal" | "pro-warning" | "pro-limit-reached";
      show: true;
      planLabel: string;
      usageText: string;
      cta: string;
      ctaHref: string;
      urgent: boolean;
      usagePercent: number;
      used: number;
      total: number;
    };

export default function UsageBanner({ className = "" }: UsageBannerProps) {
  const {
    currentPlan,
    isPremium,
    isFreePlan,
    isProPlan,
    isMaxPlan,
    hasDailyLimit,
    hasMonthlyLimit,
    usagePercent,
    messagesUsedToday,
    messagesRemaining,
    dailyLimit,
    messagesUsedThisMonth,
    monthlyLimit,
    monthlyRemaining,
    quotaResetLabel,
    isLoading,
    canSendMessage,
  } = useQuota();

  const bannerState: BannerState = useMemo(() => {
    if (isMaxPlan) return { type: "hidden" as const, show: false };

    // ========== FREE PLAN: MONTHLY QUOTA ==========
    if (isFreePlan && hasMonthlyLimit) {
      const pct = monthlyLimit > 0
        ? Math.min(100, Math.round((messagesUsedThisMonth / monthlyLimit) * 100))
        : 0;

      if (monthlyRemaining <= 0) {
        return {
          type: "free-limit-reached" as const,
          show: true,
          planLabel: "Free",
          usageText: `${messagesUsedThisMonth}/${monthlyLimit} ce mois`,
          cta: "Upgrade",
          ctaHref: "/subscription?plan=pro",
          urgent: true,
          usagePercent: 100,
          used: messagesUsedThisMonth,
          total: monthlyLimit,
        };
      }

      return {
        type: monthlyRemaining <= 1 ? "free-warning" as const : "free-normal" as const,
        show: true,
        planLabel: "Free",
        usageText: `${messagesUsedThisMonth}/${monthlyLimit} ce mois`,
        cta: "Upgrade",
        ctaHref: "/subscription?plan=pro",
        urgent: monthlyRemaining <= 1,
        usagePercent: pct,
        used: messagesUsedThisMonth,
        total: monthlyLimit,
      };
    }

    // ========== PRO PLAN: DAILY QUOTA ==========
    if (isProPlan && hasDailyLimit) {
      if (!canSendMessage || messagesRemaining <= 0) {
        return {
          type: "pro-limit-reached" as const,
          show: true,
          planLabel: "Pro",
          usageText: `${messagesUsedToday}/${dailyLimit} aujourd'hui`,
          cta: "Upgrade",
          ctaHref: "/subscription?plan=max",
          urgent: true,
          usagePercent: 100,
          used: messagesUsedToday,
          total: dailyLimit,
        };
      }

      return {
        type: usagePercent >= 80 ? "pro-warning" as const : "pro-normal" as const,
        show: true,
        planLabel: "Pro",
        usageText: `${messagesUsedToday}/${dailyLimit} aujourd'hui`,
        cta: "Upgrade",
        ctaHref: "/subscription?plan=max",
        urgent: usagePercent >= 80,
        usagePercent,
        used: messagesUsedToday,
        total: dailyLimit,
      };
    }

    if (isPremium) return { type: "hidden" as const, show: false };
    return { type: "hidden" as const, show: false };
  }, [isMaxPlan, isFreePlan, isProPlan, hasDailyLimit, hasMonthlyLimit, isPremium, canSendMessage, messagesRemaining, usagePercent, messagesUsedToday, dailyLimit, messagesUsedThisMonth, monthlyLimit, monthlyRemaining, quotaResetLabel]);

  if (isLoading || !bannerState.show) return null;

  const isLimitReached = bannerState.type.endsWith("limit-reached");
  const isWarning = bannerState.type.endsWith("warning");

  // Progress bar color
  const barColor = isLimitReached
    ? "bg-error"
    : isWarning
      ? "bg-warning"
      : "bg-primary";

  // Track background
  const trackColor = isLimitReached
    ? "bg-error/10"
    : "bg-gray-200 dark:bg-dark-border/50";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
        className={`w-full ${className}`}
        role="region"
        aria-label="Quota d'utilisation"
        data-quota="true"
      >
        <div className="flex items-center gap-3 py-2">
          {/* Plan badge */}
          <span
            className={`
              shrink-0 text-2xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md
              ${isLimitReached
                ? "bg-error/10 text-error"
                : "bg-gray-100 text-text-muted dark:bg-dark-elevated dark:text-text-subtle"
              }
            `}
          >
            {bannerState.planLabel}
          </span>

          {/* Usage text */}
          <span
            className={`
              text-xs whitespace-nowrap
              ${isLimitReached ? "text-error font-medium" : "text-text-secondary"}
            `}
          >
            {bannerState.usageText}
          </span>

          {/* Progress bar - compact inline */}
          <div
            className={`flex-1 h-1 rounded-full overflow-hidden min-w-[40px] max-w-[120px] ${trackColor}`}
            role="progressbar"
            aria-valuenow={bannerState.used}
            aria-valuemin={0}
            aria-valuemax={bannerState.total}
          >
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${bannerState.usagePercent}%` }}
              transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
              className={`h-full rounded-full ${barColor}`}
            />
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Upgrade CTA - ghost style, subtle */}
          <Link
            href={bannerState.ctaHref}
            className={`
              shrink-0 text-2xs font-medium px-2.5 py-1 rounded-md
              transition-colors duration-150
              ${isLimitReached
                ? "bg-primary text-white hover:bg-primary-hover"
                : "text-text-muted hover:text-text-primary hover:bg-gray-100 dark:hover:bg-dark-hover"
              }
            `}
          >
            {bannerState.cta} →
          </Link>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// Compact version for sidebar
export function UsageBadge() {
  const {
    isFreePlan,
    isProPlan,
    isMaxPlan,
    isPremium,
    messagesUsedToday,
    dailyLimit,
    messagesRemaining,
    messagesUsedThisMonth,
    monthlyLimit,
    monthlyRemaining,
    isLoading,
    usagePercent,
    hasMonthlyLimit,
  } = useQuota();

  if (isLoading || isMaxPlan) return null;

  if (isFreePlan && hasMonthlyLimit) {
    const isEmpty = monthlyRemaining <= 0;
    const isLow = monthlyRemaining <= 1 && monthlyRemaining > 0;

    return (
      <Link href="/subscription?plan=pro" className="group">
        <div
          className={`
            flex items-center gap-2 px-3 py-1.5 rounded-lg
            transition-all duration-150
            ${isEmpty
              ? "bg-error/8 text-error"
              : isLow
                ? "bg-warning/8 text-warning"
                : "text-text-muted"
            }
            group-hover:bg-gray-100 dark:group-hover:bg-dark-hover
          `}
        >
          <div
            className={`
              w-1.5 h-1.5 rounded-full shrink-0
              ${isEmpty ? "bg-error" : isLow ? "bg-warning" : "bg-primary/60"}
            `}
          />
          <span className="text-2xs">
            {isEmpty ? "Quota atteint" : `${messagesUsedThisMonth}/${monthlyLimit}`}
          </span>
        </div>
      </Link>
    );
  }

  if (isProPlan) {
    const isEmpty = messagesRemaining <= 0;
    const isLow = usagePercent >= 80;

    return (
      <Link href="/subscription?plan=max" className="group">
        <div
          className={`
            flex items-center gap-2 px-3 py-1.5 rounded-lg
            transition-all duration-150
            ${isEmpty
              ? "bg-error/8 text-error"
              : isLow
                ? "bg-warning/8 text-warning"
                : "text-text-muted"
            }
            group-hover:bg-gray-100 dark:group-hover:bg-dark-hover
          `}
        >
          <div
            className={`
              w-1.5 h-1.5 rounded-full shrink-0
              ${isEmpty ? "bg-error" : isLow ? "bg-warning" : "bg-primary/60"}
            `}
          />
          <span className="text-2xs">
            {isEmpty ? "Quota atteint" : `${messagesUsedToday}/${dailyLimit}`}
          </span>
        </div>
      </Link>
    );
  }

  if (!isPremium) return null;
  return null;
}

// Premium badge for paid users (Max plan)
export function PremiumBadge() {
  const { isPremium, isMaxPlan, planName, isLoading } = useQuota();

  if (isLoading || !isPremium) return null;

  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/8">
      <svg className="w-3 h-3 text-primary" fill="currentColor" viewBox="0 0 24 24">
        <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
      </svg>
      <span className="text-2xs font-medium text-text-secondary">{planName}</span>
      {isMaxPlan && <span className="text-2xs text-primary">∞</span>}
    </div>
  );
}
