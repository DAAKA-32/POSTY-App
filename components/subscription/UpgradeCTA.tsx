"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { getPlanConfig } from "@/lib/plans";
import { useUpgradeCTA } from "@/hooks/useUpgradeCTA";

interface UpgradeCTAProps {
  className?: string;
  variant?: "inline" | "banner" | "minimal";
  messageCount?: number; // Number of messages in current session
  sessionDuration?: number; // Session duration in seconds
}

export default function UpgradeCTA({
  className = "",
  variant = "inline",
  messageCount = 0,
  sessionDuration = 0,
}: UpgradeCTAProps) {
  const {
    currentPlan,
    isFreePlan,
    isProPlan,
    isMaxPlan,
    isTestMode,
    planLimits,
    loading,
  } = useSubscription();

  // Intelligent CTA management with persistence
  const { shouldShow, dismiss, dismissTemporarily } = useUpgradeCTA(
    variant,
    currentPlan,
    messageCount,
    sessionDuration
  );

  // Don't show for Max users (they have everything)
  if (loading || isMaxPlan || !shouldShow) {
    return null;
  }

  // Determine upgrade message based on current plan
  const getUpgradeMessage = () => {
    if (isFreePlan) {
      return {
        title: "Passez au plan Pro",
        description: "Débloquez les programmations, plus de créations et un historique illimité",
        cta: "Voir le plan Pro",
        highlight: "100 créations/mois",
        icon: "bolt",
      };
    }
    if (isProPlan) {
      return {
        title: "Passez au plan Max",
        description: "4 plateformes, fichiers joints, prompts 3000 car. et posts IA ultra",
        cta: "Découvrir Max",
        highlight: "4 plateformes",
        icon: "star",
      };
    }
    return null;
  };

  const message = getUpgradeMessage();
  if (!message) return null;

  // Minimal variant - just a subtle link
  if (variant === "minimal") {
    return (
      <Link
        href="/subscription"
        className={`inline-flex items-center gap-1.5 text-xs text-primary hover:text-accent transition-colors ${className}`}
      >
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
        </svg>
        <span className="font-medium">{message.cta}</span>
      </Link>
    );
  }

  // Inline variant - compact card
  if (variant === "inline") {
    return (
      <AnimatePresence>
        {shouldShow && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
            transition={{
              duration: 0.5,
              ease: [0.22, 1, 0.36, 1],
            }}
            className={`relative ${className}`}
          >
            <div className="relative overflow-hidden rounded-xl border-2 border-dark-border hover:border-primary/30 bg-dark-elevated/80 backdrop-blur-sm transition-all duration-200 group glow-tips">
              {/* Premium gradient shimmer */}
              <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-primary-hover/5 to-secondary/5 pointer-events-none" />

              {/* Close button - top right, perfectly centered */}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  dismiss();
                }}
                className="absolute top-1/2 -translate-y-1/2 right-2 z-10 w-8 h-8 flex items-center justify-center rounded-full text-text-muted hover:text-white bg-dark-elevated/60 hover:bg-dark-hover/80 backdrop-blur-sm transition-all duration-200"
                aria-label="Fermer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <Link href="/subscription" className="block">
                <div className="relative px-3 py-2.5 pr-10 flex items-center gap-3">
                  {/* Left: Icon + Message */}
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center ${
                      isFreePlan
                        ? "bg-primary/10 text-primary"
                        : "bg-primary/10 text-primary"
                    }`}>
                      {message.icon === "star" ? (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-semibold text-white group-hover:text-primary transition-colors">
                          {message.title}
                        </span>
                        <span className={`hidden sm:inline px-1.5 py-0.5 text-2xs font-bold rounded-full ${
                          isFreePlan
                            ? "bg-primary/20 text-primary"
                            : "bg-primary/20 text-primary"
                        }`}>
                          {message.highlight}
                        </span>
                      </div>
                      <p className="text-2xs text-text-muted truncate hidden sm:block">
                        {message.description}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  // Banner variant - more prominent
  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.98, transition: { duration: 0.2 } }}
          transition={{
            duration: 0.6,
            ease: [0.22, 1, 0.36, 1],
          }}
          className={`relative ${className}`}
        >
          <div className={`relative overflow-hidden rounded-xl border-2 ${
            isFreePlan
              ? "bg-gradient-to-r from-primary/10 via-secondary/10 to-primary-hover/10 border-primary/20 glow-storytelling"
              : "bg-gradient-to-r from-primary/10 to-primary-hover/10 border-primary/20 glow-tips"
          }`}>
            {/* Dismiss button - perfectly centered with matching background */}
            <button
              onClick={(e) => {
                e.preventDefault();
                dismiss();
              }}
              className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full text-text-muted hover:text-white bg-dark-card/60 hover:bg-dark-hover/80 backdrop-blur-sm transition-all duration-200 z-10"
              aria-label="Fermer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

          <div className="p-4 pr-10">
            <div className="flex items-start gap-3">
              {/* Icon */}
              <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
                isFreePlan
                  ? "bg-primary/20 text-primary"
                  : "bg-primary/20 text-primary"
              }`}>
                {message.icon === "star" ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                  </svg>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-white text-sm sm:text-base mb-1">
                  {message.title}
                </h3>
                <p className="text-xs sm:text-sm text-text-secondary mb-3">
                  {message.description}
                </p>
                <Link
                  href="/subscription"
                  className={`inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold text-white rounded-lg transition-opacity hover:opacity-90 ${
                    isFreePlan
                      ? "bg-gradient-to-r from-primary to-accent"
                      : "bg-gradient-to-r from-primary to-primary-hover"
                  }`}
                >
                  {message.cta}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>

          {/* Test mode indicator */}
          {isTestMode && (
            <div className="absolute top-2 left-2 px-2 py-0.5 text-2xs font-bold bg-purple-500/20 text-purple-400 rounded-full border border-purple-500/30">
              MODE TEST
            </div>
          )}
        </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Simple text-based upgrade prompt
export function UpgradePrompt({ className = "" }: { className?: string }) {
  const { isFreePlan, isProPlan, isMaxPlan, loading } = useSubscription();

  if (loading || isMaxPlan) return null;

  return (
    <Link
      href="/subscription"
      className={`inline-flex items-center gap-1 text-xs text-text-muted hover:text-primary transition-colors ${className}`}
    >
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
      </svg>
      <span>
        {isFreePlan ? "Passer au Pro" : "Passer au Max"}
      </span>
    </Link>
  );
}
