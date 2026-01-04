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
    messagesRemaining,
    dailyLimit,
    isLoading,
    canSendMessage,
  } = useQuota();

  // Determine banner state and content
  const bannerState = useMemo(() => {
    if (isPremium) {
      return {
        type: "premium" as const,
        show: false, // Don't show banner for premium users
      };
    }

    // Free user states
    if (messagesRemaining === 0) {
      return {
        type: "limit-reached" as const,
        show: true,
        icon: "warning",
        title: "Limite atteinte",
        message: "Vous avez utilise vos 3 messages du jour.",
        cta: "Passer au plan Pro",
        ctaHighlight: true,
      };
    }

    if (messagesRemaining === 1) {
      return {
        type: "low" as const,
        show: true,
        icon: "info",
        title: `${messagesRemaining} message restant`,
        message: "Votre creativite merite plus ! Historique limite a 7 jours.",
        cta: "Debloquer l'illimite",
        ctaHighlight: true,
      };
    }

    if (messagesRemaining <= 2) {
      return {
        type: "moderate" as const,
        show: true,
        icon: "info",
        title: `${messagesRemaining} messages restants`,
        message: "Historique limite. Passez a Pro pour un acces complet.",
        cta: "Voir les plans",
        ctaHighlight: false,
      };
    }

    // Full quota - subtle reminder
    return {
      type: "full" as const,
      show: true,
      icon: "sparkle",
      title: `${messagesRemaining}/${dailyLimit} messages`,
      message: "Plan gratuit • Historique 7 jours",
      cta: "Passer a Pro",
      ctaHighlight: false,
    };
  }, [isPremium, messagesRemaining, dailyLimit]);

  // Don't render for premium users or while loading
  if (isLoading || !bannerState.show) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        className={`w-full ${className}`}
      >
        <div
          className={`
            relative overflow-hidden
            rounded-xl border backdrop-blur-sm
            transition-all duration-300
            ${bannerState.type === "limit-reached"
              ? "bg-error/5 border-error/20"
              : bannerState.type === "low"
                ? "bg-warning/5 border-warning/20"
                : "bg-dark-elevated/80 border-dark-border"
            }
          `}
        >
          {/* Subtle gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary/3 via-transparent to-accent/3 pointer-events-none" />

          <div className="relative px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              {/* Left: Icon + Message */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {/* Icon */}
                <div
                  className={`
                    shrink-0 w-8 h-8 rounded-lg flex items-center justify-center
                    ${bannerState.type === "limit-reached"
                      ? "bg-error/10 text-error"
                      : bannerState.type === "low"
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
                      <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                    </svg>
                  )}
                </div>

                {/* Text content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`
                        text-sm font-semibold
                        ${bannerState.type === "limit-reached"
                          ? "text-error"
                          : bannerState.type === "low"
                            ? "text-warning"
                            : "text-white"
                        }
                      `}
                    >
                      {bannerState.title}
                    </span>
                    <span className="text-xs text-text-muted hidden sm:inline">•</span>
                    <span className="text-xs text-text-muted hidden sm:inline truncate">
                      {bannerState.message}
                    </span>
                  </div>
                  {/* Mobile: message on second line */}
                  <p className="text-xs text-text-muted mt-0.5 sm:hidden truncate">
                    {bannerState.message}
                  </p>
                </div>
              </div>

              {/* Right: CTA Button */}
              <Link
                href="/pricing"
                className={`
                  shrink-0 px-3 py-1.5 text-xs font-semibold rounded-lg
                  transition-all duration-200 haptic-feedback
                  ${bannerState.ctaHighlight
                    ? "bg-gradient-to-r from-primary to-primary-hover text-white shadow-glow hover:shadow-lg"
                    : "bg-dark-hover text-white hover:bg-dark-border"
                  }
                `}
              >
                {bannerState.cta}
              </Link>
            </div>

            {/* Progress bar for remaining messages */}
            {!canSendMessage ? null : (
              <div className="mt-3 h-1 bg-dark-border/50 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(messagesRemaining / dailyLimit) * 100}%` }}
                  transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
                  className={`
                    h-full rounded-full
                    ${messagesRemaining === 0
                      ? "bg-error"
                      : messagesRemaining === 1
                        ? "bg-warning"
                        : "bg-gradient-to-r from-primary to-accent"
                    }
                  `}
                />
              </div>
            )}
          </div>

          {/* Limit reached overlay effect */}
          {bannerState.type === "limit-reached" && (
            <div className="absolute inset-0 bg-gradient-to-r from-error/5 to-transparent pointer-events-none animate-pulse" />
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// Compact version for sidebar
export function UsageBadge() {
  const { currentPlan, isPremium, messagesRemaining, dailyLimit, isLoading } = useQuota();

  if (isLoading || isPremium) return null;

  const isLow = messagesRemaining <= 1;
  const isEmpty = messagesRemaining === 0;

  return (
    <Link href="/pricing" className="group">
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
            ? "0 message"
            : `${messagesRemaining}/${dailyLimit}`
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

// Premium badge for paid users
export function PremiumBadge() {
  const { isPremium, planName, isLoading } = useQuota();

  if (isLoading || !isPremium) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20">
      <svg className="w-4 h-4 text-accent" fill="currentColor" viewBox="0 0 24 24">
        <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
      </svg>
      <span className="text-xs font-semibold text-white">{planName}</span>
      <span className="text-2xs text-accent">Illimite</span>
    </div>
  );
}
