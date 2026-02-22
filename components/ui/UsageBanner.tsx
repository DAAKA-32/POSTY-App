"use client";

import { useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useQuota } from "@/contexts/QuotaContext";

interface UsageBannerProps {
  className?: string;
}

export default function UsageBanner({ className = "" }: UsageBannerProps) {
  const {
    currentPlan,
    isPremium,
    isProPlan,
    isMaxPlan,
    hasDailyLimit,
    usagePercent,
    messagesUsedToday,
    messagesRemaining,
    dailyLimit,
    isLoading,
    canSendMessage,
  } = useQuota();

  // Determine banner state and content
  const bannerState = useMemo(() => {
    // Max users: never show banner (unlimited experience)
    if (isMaxPlan) {
      return { type: "hidden" as const, show: false };
    }

    // Pro users: show daily quota gauge
    if (isProPlan && hasDailyLimit) {
      if (!canSendMessage || messagesRemaining <= 0) {
        return {
          type: "pro-limit-reached" as const,
          show: true,
          icon: "warning",
          title: "Quota quotidien atteint",
          message: "Revenez demain ou passez au plan Max pour une création illimitée.",
          cta: "Passer à Max",
          ctaHref: "/subscription?plan=max",
          ctaHighlight: true,
        };
      }

      if (usagePercent >= 80) {
        return {
          type: "pro-warning" as const,
          show: true,
          icon: "info",
          title: `${messagesUsedToday} / ${dailyLimit} créations aujourd'hui`,
          message: "Votre quota quotidien arrive à sa fin.",
          cta: "Passer à Max",
          ctaHref: "/subscription?plan=max",
          ctaHighlight: true,
        };
      }

      return {
        type: "pro-normal" as const,
        show: true,
        icon: "sparkle",
        title: `${messagesUsedToday} / ${dailyLimit} créations aujourd'hui`,
        message: "Plan Pro • Quota quotidien",
        cta: "Passer à Max",
        ctaHref: "/subscription?plan=max",
        ctaHighlight: false,
      };
    }

    // Premium without daily limit (shouldn't happen but safe fallback)
    if (isPremium) {
      return { type: "hidden" as const, show: false };
    }

    // No subscription: hidden (user can't access the app)
    return { type: "hidden" as const, show: false };
  }, [isMaxPlan, isProPlan, hasDailyLimit, isPremium, canSendMessage, messagesRemaining, usagePercent, messagesUsedToday, dailyLimit]);

  // Don't render while loading or if banner is hidden
  if (isLoading || !bannerState.show) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
        className={`w-full ${className}`}
        role="region"
        aria-label="Quota d'utilisation"
        data-quota="true"
      >
        <div
          className={`
            relative overflow-hidden
            rounded-xl border backdrop-blur-sm
            transition-all duration-200
            ${bannerState.type === "pro-limit-reached"
              ? "bg-error/5 border-error/20"
              : bannerState.type === "pro-warning"
                ? "bg-warning/5 border-warning/20"
                : "bg-dark-elevated/80 border-dark-border"
            }
          `}
          aria-live="polite"
          aria-atomic="true"
        >
          {/* Subtle gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary/3 via-transparent to-accent/3 pointer-events-none" />

          <div className="relative px-3 sm:px-4 py-2.5 sm:py-3">
            <div className="flex items-center justify-between gap-2 sm:gap-3">
              {/* Left: Icon + Message */}
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                {/* Icon */}
                <div
                  className={`
                    shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center
                    ${bannerState.type === "pro-limit-reached"
                      ? "bg-error/10 text-error"
                      : bannerState.type === "pro-warning"
                        ? "bg-warning/10 text-warning"
                        : "bg-primary/10 text-primary"
                    }
                  `}
                >
                  {bannerState.icon === "warning" ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  ) : bannerState.icon === "info" ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
                    </svg>
                  )}
                </div>

                {/* Text content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                    <span
                      className={`
                        text-xs sm:text-sm font-semibold
                        ${bannerState.type === "pro-limit-reached"
                          ? "text-error"
                          : bannerState.type === "pro-warning"
                            ? "text-warning"
                            : "text-white"
                        }
                      `}
                    >
                      {bannerState.title}
                    </span>
                    <span className="text-xs text-text-muted hidden lg:inline">•</span>
                    <span className="text-xs text-text-muted hidden lg:inline truncate">
                      {bannerState.message}
                    </span>
                  </div>
                  {/* Mobile/Tablet: message on second line */}
                  <p className="text-2xs sm:text-xs text-text-muted mt-0.5 lg:hidden truncate">
                    {bannerState.message}
                  </p>
                </div>
              </div>

              {/* Right: CTA Button */}
              {'ctaHref' in bannerState && bannerState.ctaHref && (
                <Link
                  href={bannerState.ctaHref}
                  className={`
                    shrink-0 px-2.5 sm:px-3 py-1.5 text-2xs sm:text-xs font-semibold rounded-lg whitespace-nowrap
                    transition-all duration-200 haptic-feedback
                    ${bannerState.ctaHighlight
                      ? "bg-gradient-to-r from-primary to-primary-hover text-white shadow-glow hover:shadow-lg"
                      : "bg-dark-hover text-white hover:bg-dark-border"
                    }
                  `}
                >
                  {bannerState.cta}
                </Link>
              )}
            </div>

            {/* Progress bar for Pro daily quota */}
            {bannerState.type !== "pro-limit-reached" && (
              <div
                className="mt-2 sm:mt-3 h-1 bg-dark-border/50 rounded-full overflow-hidden"
                role="progressbar"
                aria-valuenow={messagesUsedToday}
                aria-valuemin={0}
                aria-valuemax={dailyLimit}
                aria-label={`${messagesUsedToday} créations utilisées sur ${dailyLimit}`}
              >
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${usagePercent}%` }}
                  transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                  className={`
                    h-full rounded-full
                    ${usagePercent >= 80
                      ? "bg-warning"
                      : "bg-gradient-to-r from-primary to-accent"
                    }
                  `}
                />
              </div>
            )}
          </div>

          {/* Limit reached overlay effect */}
          {bannerState.type === "pro-limit-reached" && (
            <div className="absolute inset-0 bg-gradient-to-r from-error/5 to-transparent pointer-events-none animate-pulse" />
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// Compact version for sidebar
export function UsageBadge() {
  const { isProPlan, isMaxPlan, isPremium, messagesUsedToday, dailyLimit, messagesRemaining, isLoading, usagePercent } = useQuota();

  // Max users: show premium badge instead
  if (isLoading || isMaxPlan) return null;

  // Pro users: show compact daily quota
  if (isProPlan) {
    const isEmpty = messagesRemaining <= 0;
    const isLow = usagePercent >= 80;

    return (
      <Link href="/subscription?plan=max" className="group">
        <div
          className={`
            flex items-center gap-2 px-3 py-2 rounded-xl
            transition-all duration-200
            ${isEmpty
              ? "bg-error/10 border border-error/20"
              : isLow
                ? "bg-warning/10 border border-warning/20"
                : "bg-dark-elevated border border-dark-border"
            }
            group-hover:border-primary/30
          `}
        >
          <div
            className={`
              w-2 h-2 rounded-full
              ${isEmpty ? "bg-error" : isLow ? "bg-warning" : "bg-primary"}
            `}
          />
          <span className="text-xs text-text-secondary">
            {isEmpty
              ? "Quota atteint"
              : `${messagesUsedToday}/${dailyLimit}`
            }
          </span>
          <svg
            className="w-3 h-3 text-text-muted group-hover:text-primary transition-colors"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </Link>
    );
  }

  // Non-premium users: hidden
  if (!isPremium) return null;

  return null;
}

// Premium badge for paid users (Max plan)
export function PremiumBadge() {
  const { isPremium, isMaxPlan, planName, isLoading } = useQuota();

  if (isLoading || !isPremium) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20">
      <svg className="w-4 h-4 text-accent" fill="currentColor" viewBox="0 0 24 24">
        <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
      </svg>
      <span className="text-xs font-semibold text-white">{planName}</span>
      {isMaxPlan && <span className="text-2xs text-accent">Illimité</span>}
    </div>
  );
}
