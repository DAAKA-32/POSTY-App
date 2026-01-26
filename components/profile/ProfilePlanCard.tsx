"use client";

import { motion } from "framer-motion";
import { SubscriptionPlan, getPlanById } from "@/types";
import { useLanguage } from "@/contexts/LanguageContext";

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
  const { t } = useLanguage();
  const plan = getPlanById(currentPlan);
  const isUnlimited = dailyLimit === -1;
  const usagePercentage = isUnlimited ? 0 : Math.min((dailyMessagesUsed / dailyLimit) * 100, 100);

  // Plan styles - Premium design with light mode support
  const planStyles = {
    free: {
      gradient: "from-gray-100 dark:from-text-muted/15 to-gray-50 dark:to-text-muted/5",
      badge: "bg-gray-100 dark:bg-dark-hover text-gray-600 dark:text-text-secondary border border-gray-200 dark:border-dark-border",
      icon: "text-gray-500 dark:text-text-muted",
      glow: "",
      border: "border-gray-200 dark:border-dark-border hover:border-gray-300 dark:hover:border-text-muted/30",
      cardBg: "bg-white dark:bg-transparent",
    },
    pro: {
      gradient: "from-orange-50 dark:from-orange-500/15 via-orange-50/50 dark:via-orange-400/10 to-transparent",
      badge: "bg-orange-100 dark:bg-gradient-to-r dark:from-orange-500/20 dark:to-orange-400/10 text-orange-500 dark:text-orange-400 border border-orange-200 dark:border-orange-500/20",
      icon: "text-orange-500 dark:text-orange-400",
      glow: "hover:shadow-md dark:hover:shadow-[0_0_20px_rgba(232,147,77,0.15)]",
      border: "border-orange-200 dark:border-orange-500/20 hover:border-orange-300 dark:hover:border-orange-500/40",
      cardBg: "bg-white dark:bg-transparent",
    },
    max: {
      gradient: "from-orange-50 dark:from-primary/15 via-pink-50/50 dark:via-accent/10 to-transparent",
      badge: "bg-gradient-to-r from-orange-100 dark:from-primary/20 to-pink-100 dark:to-accent/10 text-orange-500 dark:text-primary border border-orange-200 dark:border-primary/20",
      icon: "text-orange-500 dark:text-primary",
      glow: "hover:shadow-md dark:hover:shadow-glow",
      border: "border-orange-200 dark:border-primary/20 hover:border-orange-300 dark:hover:border-primary/40",
      cardBg: "bg-white dark:bg-transparent",
    },
  };

  const style = planStyles[currentPlan];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4, scale: 1.005 }}
      className={`
        group relative overflow-hidden
        bg-gradient-to-br ${style.gradient}
        border ${style.border}
        rounded-2xl p-5 lg:p-6
        transition-all duration-300
        ${style.glow}
      `}
    >
      {/* AUTOSCROLL-style shimmer effect for pro/max plans */}
      {currentPlan !== "free" && (
        <motion.div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          animate={{
            backgroundPosition: ["0% 0%", "200% 200%"],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "linear",
          }}
          style={{
            background: currentPlan === "max"
              ? "linear-gradient(135deg, transparent 0%, rgba(248,147,93,0.08) 25%, transparent 50%, rgba(251,146,60,0.08) 75%, transparent 100%)"
              : "linear-gradient(135deg, transparent 0%, rgba(251,146,60,0.08) 25%, transparent 50%, rgba(251,146,60,0.08) 75%, transparent 100%)",
            backgroundSize: "200% 200%",
          }}
        />
      )}

      {/* Decorative glow for pro plan - Enhanced with animation */}
      {currentPlan === "pro" && (
        <motion.div
          className="absolute -top-12 -right-12 w-32 h-32 bg-orange-500/10 rounded-full blur-2xl"
          animate={{
            opacity: [0, 0.6, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      )}

      {/* Decorative glow for max plan - ORANGE DOMINANT with accent */}
      {currentPlan === "max" && (
        <>
          <motion.div
            className="absolute -top-12 -right-12 w-32 h-32 bg-primary/12 rounded-full blur-2xl"
            animate={{
              opacity: [0, 0.7, 0],
              scale: [1, 1.15, 1],
            }}
            transition={{
              duration: 3.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          <motion.div
            className="absolute -bottom-8 -left-8 w-24 h-24 bg-accent/10 rounded-full blur-xl"
            animate={{
              opacity: [0, 0.5, 0],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 4.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1,
            }}
          />
        </>
      )}
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {/* Plan icon */}
          <div className={`w-10 h-10 rounded-xl bg-white dark:bg-dark-card flex items-center justify-center ${style.icon}`}>
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
            <h3 className="font-semibold text-gray-900 dark:text-text-primary text-lg">{plan.name}</h3>
            <p className="text-sm text-gray-500 dark:text-text-muted">{plan.tagline}</p>
          </div>
        </div>

        {/* Plan badge */}
        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${style.badge}`}>
          {currentPlan === "free" ? t.common.free : plan.price.toFixed(2) + " EUR/mois"}
        </span>
      </div>

      {/* Usage meter (only for free plan) */}
      {currentPlan === "free" && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-500 dark:text-text-muted">{t.sidebar.messagesToday}</span>
            <span className="text-gray-900 dark:text-text-primary font-medium">
              {dailyMessagesUsed} / {dailyLimit}
            </span>
          </div>
          <div className="h-2 bg-gray-100 dark:bg-dark-card rounded-full overflow-hidden">
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

      {/* Upgrade CTA - Premium design with shimmer (only for free plan) */}
      {currentPlan === "free" && onUpgrade && (
        <motion.button
          onClick={onUpgrade}
          whileHover={{ scale: 1.02, y: -1 }}
          whileTap={{ scale: 0.98 }}
          className="
            group/btn relative overflow-hidden
            w-full flex items-center justify-center gap-2
            py-3 bg-orange-50 dark:bg-gradient-to-r dark:from-primary/10 dark:to-accent/10
            border border-orange-200 dark:border-primary/20 hover:border-orange-300 dark:hover:border-primary/40
            rounded-xl text-sm font-semibold text-orange-500 dark:text-primary hover:text-white
            hover:bg-gradient-to-r hover:from-primary hover:to-accent
            shadow-sm hover:shadow-glow
            transition-all duration-300
          "
        >
          {/* Shimmer effect on hover - ORANGE DOMINANT */}
          <span
            className="absolute inset-0 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300 pointer-events-none"
            style={{
              background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)",
              backgroundSize: "200% 100%",
              animation: "shimmer 2s infinite linear",
            }}
          />

          <svg className="w-4 h-4 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          <span className="relative z-10">{t.quota.upgradeNow}</span>
        </motion.button>
      )}

      {/* Pro/Max benefits - Premium design */}
      {currentPlan !== "free" && (
        <div className="flex items-center gap-2 px-3 py-2 bg-success/5 border border-success/20 rounded-lg text-sm">
          <svg className="w-4 h-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-success font-medium">{t.sidebar.unlimitedMessages}</span>
        </div>
      )}
    </motion.div>
  );
}
