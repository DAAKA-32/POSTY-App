"use client";

import { motion } from "framer-motion";
import { SubscriptionPlan, getPlanById } from "@/types";

interface ProfilePlanCardProps {
  currentPlan: SubscriptionPlan;
  dailyMessagesUsed?: number;
  dailyLimit?: number;
  onUpgrade?: () => void;
}

export default function ProfilePlanCard({
  currentPlan = "free",
  dailyMessagesUsed = 0,
  dailyLimit = 3,
  onUpgrade,
}: ProfilePlanCardProps) {
  const plan = getPlanById(currentPlan);
  const isUnlimited = dailyLimit === -1;
  const usagePercentage = isUnlimited ? 0 : Math.min((dailyMessagesUsed / dailyLimit) * 100, 100);

  // Plan styles
  const planStyles = {
    free: {
      gradient: "from-text-muted/20 to-text-muted/10",
      badge: "bg-dark-hover text-text-secondary",
      icon: "text-text-muted",
    },
    pro: {
      gradient: "from-primary/20 to-primary/10",
      badge: "bg-primary/20 text-primary",
      icon: "text-primary",
    },
    max: {
      gradient: "from-accent/20 to-accent/10",
      badge: "bg-accent/20 text-accent",
      icon: "text-accent",
    },
  };

  const style = planStyles[currentPlan];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
      className={`
        relative overflow-hidden
        bg-gradient-to-br ${style.gradient}
        border border-dark-border
        rounded-2xl p-5 lg:p-6
      `}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {/* Plan icon */}
          <div className={`w-10 h-10 rounded-xl bg-dark-card flex items-center justify-center ${style.icon}`}>
            {currentPlan === "free" ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : currentPlan === "pro" ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            )}
          </div>

          <div>
            <h3 className="font-semibold text-white text-lg">Plan {plan.name}</h3>
            <p className="text-sm text-text-muted">{plan.tagline}</p>
          </div>
        </div>

        {/* Plan badge */}
        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${style.badge}`}>
          {currentPlan === "free" ? "Gratuit" : plan.price.toFixed(2) + " EUR/mois"}
        </span>
      </div>

      {/* Usage meter (only for free plan) */}
      {currentPlan === "free" && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-text-muted">Messages aujourd&apos;hui</span>
            <span className="text-white font-medium">
              {dailyMessagesUsed} / {dailyLimit}
            </span>
          </div>
          <div className="h-2 bg-dark-card rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${usagePercentage}%` }}
              transition={{ duration: 0.6, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className={`h-full rounded-full ${
                usagePercentage >= 100
                  ? "bg-error"
                  : usagePercentage >= 66
                  ? "bg-warning"
                  : "bg-primary"
              }`}
            />
          </div>
        </div>
      )}

      {/* Upgrade CTA (subtle, only for free plan) */}
      {currentPlan === "free" && onUpgrade && (
        <button
          onClick={onUpgrade}
          className="
            w-full flex items-center justify-center gap-2
            py-2.5 bg-dark-card hover:bg-dark-hover
            border border-dark-border hover:border-primary/30
            rounded-xl text-sm font-medium text-text-secondary hover:text-primary
            transition-all duration-200
          "
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          Debloquer plus avec Pro
        </button>
      )}

      {/* Pro/Max benefits */}
      {currentPlan !== "free" && (
        <div className="flex items-center gap-2 text-sm text-text-muted">
          <svg className="w-4 h-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Messages illimites actifs
        </div>
      )}
    </motion.div>
  );
}
