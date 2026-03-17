"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { TRIAL_PERIOD_DAYS, GUARANTEE_PERIOD_DAYS } from "@/lib/config/plans";

/**
 * TrialBanner - Shows contextual banners for trial/guarantee status
 *
 * Displays:
 * - During trial: "X jours restants sur votre essai"
 * - After trial (guarantee active): "Garantie remboursement X jours"
 * - Last day of trial: urgent message
 *
 * Does NOT show:
 * - For users without a subscription who haven't started trial
 * - For active paid users past guarantee period
 */
export default function TrialBanner() {
  const {
    isTrialing,
    trialDaysRemaining,
    trialPlan,
    guaranteeEligible,
    guaranteeDaysRemaining,
    currentPlan,
  } = useSubscription();
  const pathname = usePathname();

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
              : "bg-gradient-to-r from-primary/10 via-accent/5 to-primary/10 border-b border-primary/20"
            }
          `}
        >
          {/* Icon */}
          <svg className={`w-4 h-4 shrink-0 ${isUrgent ? "text-red-400" : "text-primary"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>

          {/* Message */}
          <span className={`${isUrgent ? "text-red-400 font-semibold" : "text-text-secondary"}`}>
            {isUrgent
              ? `Dernier jour de votre essai ${planName} !`
              : `${trialDaysRemaining} jour${trialDaysRemaining > 1 ? "s" : ""} restant${trialDaysRemaining > 1 ? "s" : ""} sur votre essai ${planName}`
            }
          </span>

          {/* Separator */}
          <span className="text-text-muted hidden sm:inline">·</span>

          {/* CTA */}
          <span className="text-text-muted text-xs hidden sm:inline">
            Aucun debit pendant l'essai
          </span>

          {/* Link to manage */}
          <Link
            href={`/settings?from=${encodeURIComponent(pathname)}`}
            className={`
              ml-auto px-3 py-1 rounded-lg text-xs font-medium transition-colors
              ${isUrgent
                ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                : "bg-primary/20 text-primary hover:bg-primary/30"
              }
            `}
          >
            Gérer
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

          <span className="text-text-secondary">
            Garantie satisfait ou remboursé — <span className="text-white font-medium">{guaranteeDaysRemaining}j restants</span>
          </span>
        </motion.div>
      </AnimatePresence>
    );
  }

  return null;
}
