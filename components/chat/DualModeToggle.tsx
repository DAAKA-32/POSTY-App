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
  className?: string;
}

/**
 * Toggle component for dual response mode (Storytelling + Business)
 * Only available for Max plan users
 */
export default function DualModeToggle({
  enabled,
  onToggle,
  responseType,
  onResponseTypeChange,
  className = "",
}: DualModeToggleProps) {
  const { t } = useLanguage();
  const { isMaxPlan } = useSubscription();
  const router = useRouter();

  // Handle toggle click
  const handleToggle = () => {
    if (!isMaxPlan) {
      // Show upgrade prompt or navigate to pricing
      return;
    }
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
          disabled={!isMaxPlan}
          className={`
            relative flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium
            transition-all duration-200
            ${isMaxPlan
              ? enabled
                ? "bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30"
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

          {/* Max badge */}
          {!isMaxPlan && (
            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-500 border border-amber-500/30">
              <Crown className="w-2.5 h-2.5" />
              {t.chat.dualMode.maxOnly}
            </span>
          )}

          {/* Status indicator for Max users */}
          {isMaxPlan && (
            <motion.div
              initial={false}
              animate={{
                backgroundColor: enabled ? "rgb(16, 185, 129)" : "rgb(156, 163, 175)",
              }}
              className="w-2 h-2 rounded-full"
            />
          )}

          {/* Lock icon for non-Max */}
          {!isMaxPlan && (
            <Lock className="w-3 h-3 text-text-muted" />
          )}
        </button>

        {/* Response type selector (only visible when dual mode is OFF) */}
        {!enabled && isMaxPlan && (
          <div className="flex items-center gap-1 p-0.5 rounded-lg bg-background-tertiary border border-border-primary">
            <button
              onClick={() => handleTypeSelect("storytelling")}
              className={`
                flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium
                transition-all duration-200
                ${responseType === "storytelling"
                  ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
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
                  ? "bg-orange-500/20 text-orange-400 border border-orange-500/30"
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
        {enabled && isMaxPlan && (
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

      {/* Upgrade prompt for non-Max users */}
      {!isMaxPlan && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20"
        >
          <Crown className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <p className="text-xs text-amber-500/90 flex-1">
            {t.chat.dualMode.singleResponseInfo}
          </p>
          <button
            onClick={() => router.push("/pricing")}
            className="flex-shrink-0 px-2.5 py-1 rounded-md text-xs font-semibold bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 transition-colors"
          >
            {t.chat.dualMode.upgradeButton}
          </button>
        </motion.div>
      )}
    </div>
  );
}
