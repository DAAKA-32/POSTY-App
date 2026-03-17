"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { getPlanConfig, PlanType } from "@/lib/config/plans";

interface PlanInfoCardProps {
  className?: string;
  compact?: boolean;
  showFeatures?: boolean;
  onNavigate?: () => void;
}

// Features to display based on plan limits
const FEATURE_CHECKS = [
  {
    key: "conversations",
    getLabel: (limits: ReturnType<typeof getPlanConfig>["limits"]) => {
      if (limits.messagesPerDay === -1) {
        return "Créations illimitées";
      }
      return `${limits.messagesPerDay} créations/jour`;
    },
    isIncluded: () => true,
  },
  {
    key: "scheduling",
    label: "Programmation posts",
    getIncluded: (limits: ReturnType<typeof getPlanConfig>["limits"]) => limits.canSchedulePosts,
  },
  {
    key: "multiPlatform",
    label: "Multi-plateformes",
    getIncluded: (limits: ReturnType<typeof getPlanConfig>["limits"]) => limits.allowedPlatforms.length > 1,
  },
  {
    key: "priority",
    label: "Génération prioritaire",
    getIncluded: (limits: ReturnType<typeof getPlanConfig>["limits"]) => limits.hasPriorityProcessing,
  },
  {
    key: "personalized",
    label: "Ton personnalisé",
    getIncluded: (limits: ReturnType<typeof getPlanConfig>["limits"]) => limits.hasPersonalizedResponses,
  },
];

// Plan colors and styles
const PLAN_STYLES: Record<string, { gradient: string; badge: string; glow: string }> = {
  none: {
    gradient: "from-gray-500/20 to-gray-600/20",
    badge: "bg-gray-500/20 text-gray-400 border-gray-500/30",
    glow: "",
  },
  free: {
    gradient: "from-gray-500/20 to-gray-600/20",
    badge: "bg-gray-500/20 text-gray-400 border-gray-500/30",
    glow: "",
  },
  pro: {
    gradient: "from-primary/20 to-accent/20",
    badge: "bg-primary/20 text-primary border-primary/30",
    glow: "shadow-glow",
  },
  max: {
    gradient: "from-amber-500/20 to-orange-500/20",
    badge: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    glow: "shadow-[0_0_20px_rgba(245,158,11,0.2)]",
  },
};

export default function PlanInfoCard({
  className = "",
  compact = false,
  showFeatures = true,
  onNavigate,
}: PlanInfoCardProps) {
  const {
    currentPlan,
    planConfig,
    planLimits,
    isTestMode,
    isMaxPlan,
    isTrialing,
    trialDaysRemaining,
    loading,
  } = useSubscription();

  if (loading) {
    return (
      <div className={`animate-pulse rounded-xl bg-dark-elevated p-4 ${className}`}>
        <div className="h-4 bg-dark-border rounded w-1/2 mb-2" />
        <div className="h-3 bg-dark-border rounded w-3/4" />
      </div>
    );
  }

  const styles = PLAN_STYLES[currentPlan ?? "none"] ?? PLAN_STYLES.none;
  const hasNoPlan = !currentPlan;
  const nextPlan = hasNoPlan ? "pro" : isMaxPlan ? null : "max";
  const nextPlanConfig = nextPlan ? getPlanConfig(nextPlan) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border border-dark-border overflow-hidden ${styles.glow} ${className}`}
    >
      {/* Header with plan name */}
      <div className={`bg-gradient-to-r ${styles.gradient} p-3 sm:p-4`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Plan icon */}
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${styles.badge} border`}>
              {currentPlan === "max" ? (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ) : currentPlan === "pro" ? (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base">
                  Plan {planConfig.name}
                </span>
                {isTrialing && (
                  <span className="px-1.5 py-0.5 text-2xs font-semibold bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-full border border-blue-500/30">
                    Essai · {trialDaysRemaining}j
                  </span>
                )}
                {isTestMode && !isTrialing && (
                  <span className="px-1.5 py-0.5 text-2xs font-bold bg-purple-500/20 text-purple-700 dark:text-purple-400 rounded-full border border-purple-500/30">
                    TEST
                  </span>
                )}
              </div>
              {!compact && (
                <p className="text-2xs sm:text-xs text-gray-600 dark:text-text-muted">
                  {isTrialing
                    ? `${trialDaysRemaining} jour${trialDaysRemaining > 1 ? "s" : ""} restant${trialDaysRemaining > 1 ? "s" : ""} sur votre essai`
                    : planConfig.description
                  }
                </p>
              )}
            </div>
          </div>

          {/* Upgrade button for non-max plans */}
          {!isMaxPlan && (
            <Link
              href="/subscription"
              onClick={onNavigate}
              className="shrink-0 px-2.5 py-1.5 text-2xs font-semibold bg-primary hover:bg-primary-hover text-white rounded-lg transition-colors"
            >
              Upgrade
            </Link>
          )}
        </div>
      </div>

      {/* Features list */}
      {showFeatures && !compact && (
        <div className="p-3 sm:p-4 bg-dark-card space-y-2">
          {FEATURE_CHECKS.map((feature) => {
            const isIncluded = feature.getIncluded
              ? feature.getIncluded(planLimits)
              : feature.isIncluded?.() ?? true;
            const label = feature.getLabel
              ? feature.getLabel(planLimits)
              : feature.label;

            return (
              <div key={feature.key} className="flex items-center gap-2">
                {/* Checkmark or cross */}
                <div
                  className={`w-4 h-4 rounded-full flex items-center justify-center ${
                    isIncluded
                      ? "bg-green-500/20 text-green-400"
                      : "bg-red-500/15 text-red-400"
                  }`}
                >
                  {isIncluded ? (
                    <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <span
                  className={`text-xs ${
                    isIncluded ? "text-text-secondary" : "text-text-muted line-through"
                  }`}
                >
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Upgrade CTA for users without max plan */}
      {!isMaxPlan && nextPlanConfig && !compact && (
        <div className="px-3 sm:px-4 pb-3 sm:pb-4 bg-dark-card">
          <Link
            href="/subscription"
            onClick={onNavigate}
            className="block w-full text-center px-3 py-2.5 text-xs font-semibold bg-gradient-to-r from-primary to-accent text-white rounded-lg hover:opacity-90 transition-opacity"
          >
            {hasNoPlan ? "Choisir un plan" : "Passer au plan Max"}
          </Link>
        </div>
      )}
    </motion.div>
  );
}

// Compact badge version for inline use
export function PlanBadge({ className = "" }: { className?: string }) {
  const { currentPlan, planConfig, isTestMode, isTrialing, trialDaysRemaining, loading } = useSubscription();

  if (loading) {
    return (
      <div className={`animate-pulse h-6 w-16 bg-dark-border rounded-full ${className}`} />
    );
  }

  const styles = PLAN_STYLES[currentPlan ?? "none"] ?? PLAN_STYLES.none;

  return (
    <Link href="/subscription" className={`inline-flex items-center gap-1.5 ${className}`}>
      <span className={`px-2 py-0.5 text-2xs font-semibold rounded-full border ${styles.badge}`}>
        {planConfig.name}
      </span>
      {isTrialing && (
        <span className="px-1.5 py-0.5 text-2xs font-semibold bg-blue-500/20 text-blue-500 dark:text-blue-400 rounded-full border border-blue-500/30">
          Essai · {trialDaysRemaining}j
        </span>
      )}
      {isTestMode && !isTrialing && (
        <span className="px-1.5 py-0.5 text-2xs font-bold bg-purple-500/20 text-purple-400 rounded-full">
          TEST
        </span>
      )}
    </Link>
  );
}
