"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { getPlanConfig, isTestModeAllowed } from "@/lib/plans";

/**
 * TestModeIndicator - Global floating indicator when test mode is active
 *
 * Features:
 * - Shows in bottom-left corner when test mode is active
 * - Displays current test plan
 * - Expandable for quick plan switching
 * - Can be minimized/collapsed
 * - Only visible in dev mode or for admin users
 */

interface TestModeIndicatorProps {
  showInProduction?: boolean;
}

export default function TestModeIndicator({ showInProduction = false }: TestModeIndicatorProps) {
  const {
    isTestMode,
    testPlan,
    currentPlan,
    enableTestMode,
    disableTestMode,
    loading,
  } = useSubscription();

  const [isExpanded, setIsExpanded] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // ============================================
  // PRODUCTION MODE: Test mode indicator is completely hidden
  // To re-enable: set NEXT_PUBLIC_ENABLE_TEST_MODE=true in .env.local
  // ============================================
  const [shouldShow, setShouldShow] = useState(false);
  const isDev = process.env.NODE_ENV === "development";
  const isAdmin = process.env.NEXT_PUBLIC_ADMIN_MODE === "true";

  useEffect(() => {
    // Use centralized isTestModeAllowed() check from lib/plans.ts
    // This respects PRODUCTION_MODE flag as single source of truth
    setShouldShow(isTestModeAllowed() || showInProduction);
  }, [showInProduction]);

  if (!shouldShow) {
    return null;
  }

  // Don't show if test mode is not active and not expanded
  if (!isTestMode && !isExpanded) {
    // Show a small trigger button in dev mode
    if (isDev || isAdmin) {
      return (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={() => setIsExpanded(true)}
          className="fixed bottom-4 left-4 z-[9999] w-10 h-10 bg-dark-card border border-dark-border rounded-full flex items-center justify-center hover:border-purple-500/50 hover:bg-purple-500/10 transition-all duration-200 shadow-lg"
          title="Ouvrir le panneau de test"
        >
          <svg className="w-5 h-5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
        </motion.button>
      );
    }
    return null;
  }

  // Minimized state - just show a small badge
  if (isMinimized && isTestMode) {
    return (
      <motion.button
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-4 left-4 z-[9999] flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full shadow-lg hover:shadow-purple-500/30 transition-all duration-200"
      >
        <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
        <span className="text-xs font-bold text-white uppercase tracking-wide">
          Test: {getPlanConfig(testPlan!).name}
        </span>
      </motion.button>
    );
  }

  const plans = ["free", "pro", "max"] as const;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        className={`
          fixed bottom-4 left-4 z-[9999]
          ${isTestMode
            ? "bg-gradient-to-br from-purple-900/95 to-pink-900/95 border-purple-500/50"
            : "bg-dark-card/95 border-dark-border"
          }
          border backdrop-blur-xl rounded-2xl shadow-2xl
          ${isTestMode ? "shadow-purple-500/20" : ""}
          min-w-[280px] max-w-[320px]
          overflow-hidden
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              isTestMode
                ? "bg-gradient-to-br from-purple-500 to-pink-500"
                : "bg-dark-hover"
            }`}>
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                Mode Test
                {isTestMode && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold bg-purple-500/30 text-purple-300 rounded uppercase">
                    Actif
                  </span>
                )}
              </h4>
              <p className="text-[10px] text-white/60">
                {isTestMode
                  ? `Plan ${getPlanConfig(testPlan!).name} simulé`
                  : "Dev / QA uniquement"
                }
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {isTestMode && (
              <button
                onClick={() => setIsMinimized(true)}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                title="Réduire"
              >
                <svg className="w-4 h-4 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </button>
            )}
            <button
              onClick={() => setIsExpanded(false)}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              title="Fermer"
            >
              <svg className="w-4 h-4 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-3 space-y-3">
          {/* Current Status */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-white/60">Plan effectif :</span>
            <span className={`font-semibold ${isTestMode ? "text-purple-300" : "text-accent"}`}>
              {getPlanConfig(currentPlan).name}
              {isTestMode && " (test)"}
            </span>
          </div>

          {/* Plan Buttons */}
          <div className="grid grid-cols-3 gap-2">
            {plans.map((plan) => {
              const config = getPlanConfig(plan);
              const isActive = isTestMode && testPlan === plan;
              const isCurrentReal = !isTestMode && currentPlan === plan;

              return (
                <button
                  key={plan}
                  onClick={() => enableTestMode(plan)}
                  disabled={loading || isActive}
                  className={`
                    relative p-2 rounded-xl text-center transition-all duration-200
                    ${isActive
                      ? "bg-purple-500/30 border-2 border-purple-400 text-purple-200"
                      : isCurrentReal
                        ? "bg-accent/20 border border-accent/30 text-accent"
                        : "bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 hover:border-purple-500/50"
                    }
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                >
                  <span className="text-[10px] font-medium uppercase tracking-wide block opacity-60">
                    {plan}
                  </span>
                  <span className="text-xs font-bold">{config.name}</span>
                  {isActive && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-purple-400 rounded-full border-2 border-purple-900" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Disable Button */}
          {isTestMode && (
            <button
              onClick={() => disableTestMode()}
              disabled={loading}
              className="w-full py-2 px-3 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-xl text-red-300 text-xs font-medium transition-colors duration-200 flex items-center justify-center gap-2"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 6L18 18M6 18L18 6" />
              </svg>
              Désactiver le mode test
            </button>
          )}

          {/* Warning */}
          <p className="text-[10px] text-white/40 text-center">
            {isDev ? "Mode développement" : "Admin mode"} - Invisible en production
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
