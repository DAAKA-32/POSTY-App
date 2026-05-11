"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { TRIAL_PERIOD_DAYS, GUARANTEE_PERIOD_DAYS, isFreeTrialGateEnabled } from "@/lib/config/plans";

/**
 * TrialBanner - Shows contextual banners for trial/guarantee status
 *
 * Displays (in priority order):
 * - Free-plan 30-day trial countdown (highest priority — drives upgrade)
 * - Paid trial countdown (Stripe `trialing` status)
 * - Money-back guarantee window
 *
 * Hidden for unsubscribed users with no active trial, and for paid users
 * past the guarantee period.
 */
export default function TrialBanner() {
  const {
    isTrialing,
    trialDaysRemaining,
    trialPlan,
    guaranteeEligible,
    guaranteeDaysRemaining,
    currentPlan,
    freeTrialEndsAt,
    freeTrialDaysRemaining,
    freeTrialExpired,
  } = useSubscription();
  const { t } = useLanguage();
  const pathname = usePathname();

  // ===== Free-plan 30-day trial banner =====
  // Shown to Free users while the trial clock is still running. Once
  // expired, MainLayout's FreeTrialPaywall takes over (no redirect — the
  // paywall blurs /app and forces a plan choice in-context).
  // Gated by the same env flag as the expiration check — otherwise we'd
  // show a misleading countdown in environments where the trial gate is
  // disabled and Free is effectively unlimited.
  if (isFreeTrialGateEnabled() && currentPlan === "free" && !freeTrialExpired && freeTrialEndsAt) {
    const isUrgent = freeTrialDaysRemaining <= 1;
    const message = freeTrialDaysRemaining === 1
      ? t.subscriptionPage.freeTrialOneDayLeft
      : t.subscriptionPage.freeTrialDaysLeft.replace("{n}", String(freeTrialDaysRemaining));

    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className={`
            w-full px-4 py-2.5 flex items-center justify-center gap-3 text-sm
            ${isUrgent
              ? "bg-gradient-to-r from-red-500/10 via-orange-500/10 to-red-500/10 border-b border-red-500/20"
              : "bg-[#FFF3EE] border-b border-[#F8935D]/20 dark:bg-[#1E1610] dark:border-[#F8935D]/15"
            }
          `}
        >
          <svg className={`w-4 h-4 shrink-0 ${isUrgent ? "text-red-400" : "text-primary"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>

          <span className={`${isUrgent ? "text-red-400 font-semibold" : "text-gray-800 dark:text-gray-100 font-medium"}`}>
            {message}
          </span>

          <Link
            href={`/subscription?from=${encodeURIComponent(pathname)}`}
            className={`
              ml-auto px-3 py-1 rounded-lg text-xs font-semibold transition-colors
              ${isUrgent
                ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                : "bg-primary text-gray-950 hover:bg-primary-hover"
              }
            `}
          >
            {t.subscriptionPage.freeTrialUpgradeCta}
          </Link>
        </motion.div>
      </AnimatePresence>
    );
  }

  // Don't show anything if not relevant
  if (!isTrialing && !guaranteeEligible) return null;

  // Don't show for unsubscribed users (they need to subscribe first)
  if (!currentPlan && !isTrialing) return null;

  // Trial banner
  if (isTrialing && trialDaysRemaining > 0) {
    const isUrgent = trialDaysRemaining === 1;
    const planName = trialPlan === "max" ? "Max" : "Pro";

    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className={`
            w-full px-4 py-2.5 flex items-center justify-center gap-3 text-sm
            ${isUrgent
              ? "bg-gradient-to-r from-red-500/10 via-orange-500/10 to-red-500/10 border-b border-red-500/20"
              : "bg-[#FFF3EE] border-b border-[#F8935D]/20 dark:bg-[#1E1610] dark:border-[#F8935D]/15"
            }
          `}
        >
          {/* Icon */}
          <svg className={`w-4 h-4 shrink-0 ${isUrgent ? "text-red-400" : "text-primary"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>

          {/* Message */}
          <span className={`${isUrgent ? "text-red-400 font-semibold" : "text-gray-800 dark:text-gray-100 font-medium"}`}>
            {isUrgent
              ? t.subscriptionPage.paidTrialLastDay.replace("{plan}", planName)
              : t.subscriptionPage.paidTrialDaysLeft.replace("{n}", String(trialDaysRemaining)).replace("{plan}", planName)
            }
          </span>

          {/* Separator */}
          <span className="text-text-muted hidden sm:inline">·</span>

          {/* CTA */}
          <span className="text-text-muted text-xs hidden sm:inline">
            {t.subscriptionPage.paidTrialNoCharge}
          </span>

          {/* Link to manage */}
          <Link
            href={`/settings?from=${encodeURIComponent(pathname)}`}
            className={`
              ml-auto px-3 py-1 rounded-lg text-xs font-semibold transition-colors
              ${isUrgent
                ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                : "bg-primary text-gray-950 hover:bg-primary-hover"
              }
            `}
          >
            {t.subscriptionPage.paidTrialManage}
          </Link>
        </motion.div>
      </AnimatePresence>
    );
  }

  // Guarantee banner (shown briefly after first payment)
  if (guaranteeEligible && guaranteeDaysRemaining > 0) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="w-full px-4 py-2 flex items-center justify-center gap-3 text-sm bg-accent/5 border-b border-accent/15"
        >
          <svg className="w-4 h-4 shrink-0 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>

          <span className="text-gray-700 dark:text-gray-200">
            {t.subscriptionPage.guaranteeBadge}{" "}
            <span className="text-gray-900 dark:text-white font-semibold">
              {t.subscriptionPage.guaranteeDaysLeft.replace("{n}", String(guaranteeDaysRemaining))}
            </span>
          </span>
        </motion.div>
      </AnimatePresence>
    );
  }

  return null;
}
