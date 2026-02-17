"use client";

import { motion } from "framer-motion";
import { MessageSquare, Briefcase, Sparkles, Crown, Lock } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useRouter } from "next/navigation";

interface DualModeToggleProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  responseType: "storytelling" | "business";
  onResponseTypeChange: (type: "storytelling" | "business") => void;
  /** Weekly dual usage count (Pro plan only) */
  dualUsedThisWeek?: number;
  className?: string;
}

/**
 * Toggle component for dual response mode (Storytelling + Business)
 * - Pro plan: Limited to 3 dual generations per week
 * - Max plan: Unlimited dual generations
 * - Free plan: Locked (upgrade prompt)
 */
export default function DualModeToggle({
  enabled,
  onToggle,
  responseType,
  onResponseTypeChange,
  dualUsedThisWeek = 0,
  className = "",
}: DualModeToggleProps) {
  const { t } = useLanguage();
  const { isMaxPlan, isProPlan, planLimits } = useSubscription();
  const router = useRouter();

  const canUseDualMode = isMaxPlan || isProPlan;
  const dualLimit = planLimits?.dualResponsesPerWeek ?? 0;
  const isUnlimited = dualLimit === -1;
  const dualRemaining = isUnlimited ? Infinity : Math.max(0, dualLimit - dualUsedThisWeek);
  const isLimitReached = !isUnlimited && dualRemaining <= 0;

  // Handle toggle click
  const handleToggle = () => {
    if (!canUseDualMode) return;
    if (isLimitReached && !enabled) return; // Can't enable if limit reached
    onToggle(!enabled);
  };

  // Handle response type selection (for single mode)
  const handleTypeSelect = (type: "storytelling" | "business") => {
    if (!enabled) {
      onResponseTypeChange(type);
    }
  };

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {/* Main toggle row */}
      <div className="flex items-center gap-3">
        {/* Dual mode toggle button */}
        <button
          onClick={handleToggle}
          disabled={!canUseDualMode || (isLimitReached && !enabled)}
          className={`
            relative flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium
            transition-all duration-200
            ${canUseDualMode
              ? enabled
                ? "bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30"
                : isLimitReached
                  ? "bg-background-tertiary/50 text-text-muted border border-border-primary cursor-not-allowed opacity-60"
                  : "bg-background-tertiary hover:bg-background-secondary text-text-secondary border border-border-primary hover:border-border-secondary"
              : "bg-background-tertiary/50 text-text-muted border border-border-primary cursor-not-allowed opacity-60"
            }
          `}
        >
          {/* Icon */}
          <div className="flex items-center gap-1">
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="text-xs text-text-muted">/</span>
            <Briefcase className="w-3.5 h-3.5" />
          </div>

          {/* Label */}
          <span className="hidden sm:inline">{t.chat.dualMode.toggle}</span>

          {/* Pro badge with remaining count */}
          {isProPlan && !isLimitReached && (
            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-primary/15 text-primary border border-primary/25">
              {dualRemaining}/{dualLimit}
            </span>
          )}

          {/* Pro badge — limit reached */}
          {isProPlan && isLimitReached && (
            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-500/15 text-gray-400 border border-gray-500/25">
              0/{dualLimit}
            </span>
          )}

          {/* Upgrade badge for Free users */}
          {!canUseDualMode && (
            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gradient-to-r from-primary/20 to-primary-hover/20 text-primary border border-primary/30">
              <Crown className="w-2.5 h-2.5" />
              Pro
            </span>
          )}

          {/* Status indicator for users with access */}
          {canUseDualMode && !isLimitReached && (
            <motion.div
              initial={false}
              animate={{
                backgroundColor: enabled ? "rgb(16, 185, 129)" : "rgb(156, 163, 175)",
              }}
              className="w-2 h-2 rounded-full"
            />
          )}

          {/* Lock icon for Free users */}
          {!canUseDualMode && (
            <Lock className="w-3 h-3 text-text-muted" />
          )}
        </button>

        {/* Response type selector (only visible when dual mode is OFF and user has style choice) */}
        {!enabled && canUseDualMode && (
          <div className="flex items-center gap-1 p-0.5 rounded-lg bg-background-tertiary border border-border-primary">
            <button
              onClick={() => handleTypeSelect("storytelling")}
              className={`
                flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium
                transition-all duration-200
                ${responseType === "storytelling"
                  ? "bg-primary-hover/20 text-primary border border-primary-hover/30"
                  : "text-text-secondary hover:text-text-primary hover:bg-background-secondary"
                }
              `}
            >
              <MessageSquare className="w-3 h-3" />
              <span className="hidden sm:inline">{t.chat.storytelling}</span>
            </button>
            <button
              onClick={() => handleTypeSelect("business")}
              className={`
                flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium
                transition-all duration-200
                ${responseType === "business"
                  ? "bg-primary/20 text-primary border border-primary/30"
                  : "text-text-secondary hover:text-text-primary hover:bg-background-secondary"
                }
              `}
            >
              <Briefcase className="w-3 h-3" />
              <span className="hidden sm:inline">{t.chat.business}</span>
            </button>
          </div>
        )}

        {/* Dual mode active indicator */}
        {enabled && canUseDualMode && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-primary/10 border border-primary/20"
          >
            <Sparkles className="w-3 h-3 text-primary" />
            <span className="text-xs text-primary font-medium">
              2 versions
            </span>
          </motion.div>
        )}
      </div>

      {/* Upgrade prompt for Free users */}
      {!canUseDualMode && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-primary/10 to-primary-hover/10 border border-primary/20"
        >
          <Crown className="w-4 h-4 text-primary flex-shrink-0" />
          <p className="text-xs text-primary/90 flex-1">
            {t.chat.dualMode.singleResponseInfo}
          </p>
          <button
            onClick={() => router.push("/pricing")}
            className="flex-shrink-0 px-2.5 py-1 rounded-md text-xs font-semibold bg-gradient-to-r from-primary to-primary-hover text-white hover:from-primary-hover hover:to-primary-dark transition-colors"
          >
            {t.chat.dualMode.upgradeButton}
          </button>
        </motion.div>
      )}

      {/* Pro limit reached info */}
      {isProPlan && isLimitReached && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-primary/10 to-primary-hover/10 border border-primary/20"
        >
          <Crown className="w-4 h-4 text-primary flex-shrink-0" />
          <p className="text-xs text-primary/90 flex-1">
            Limite atteinte ({dualLimit}/sem.). Passez au Max pour un accès illimité.
          </p>
          <button
            onClick={() => router.push("/pricing")}
            className="flex-shrink-0 px-2.5 py-1 rounded-md text-xs font-semibold bg-gradient-to-r from-primary to-primary-hover text-white hover:from-primary-hover hover:to-primary-dark transition-colors"
          >
            {t.chat.dualMode.upgradeButton}
          </button>
        </motion.div>
      )}
    </div>
  );
}
