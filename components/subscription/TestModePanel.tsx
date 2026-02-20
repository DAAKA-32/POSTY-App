"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { PlanType, getPlanConfig, PLAN_CONFIGS, isTestModeAllowed, PRODUCTION_MODE } from "@/lib/plans";
import Button from "@/components/ui/Button";
import toast from "@/components/ui/Toast";

/**
 * TestModePanel - Development/QA tool for testing subscription plans
 *
 * Features:
 * - Enable test mode with any plan (Free, Pro, Max)
 * - Visual indicator when test mode is active
 * - Easy toggle to return to real Stripe subscription
 * - Only visible in development or to admin users
 */

interface TestModePanelProps {
  className?: string;
  showInProduction?: boolean; // Set to true for admin users
  selectedPlan?: PlanType; // Plan selected from pricing cards
  onPlanActivated?: (plan: PlanType) => void; // Callback when plan is activated
}

export default function TestModePanel({
  className = "",
  showInProduction = false,
  selectedPlan,
  onPlanActivated,
}: TestModePanelProps) {
  const {
    isTestMode,
    testPlan,
    currentPlan,
    subscription,
    enableTestMode,
    disableTestMode,
    loading,
  } = useSubscription();

  const [isExpanded, setIsExpanded] = useState(false);
  const [isActivating, setIsActivating] = useState<PlanType | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const lastSelectedPlanRef = useRef<PlanType | null>(null);

  // ============================================
  // PRODUCTION MODE: Test mode is completely disabled
  // To re-enable: set NEXT_PUBLIC_ENABLE_TEST_MODE=true in .env.local
  // ============================================
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    // Use centralized isTestModeAllowed() check from lib/plans.ts
    // This respects PRODUCTION_MODE flag as single source of truth
    const allowed = isTestModeAllowed() || showInProduction;
    setShouldShow(allowed);
  }, [showInProduction]);

  const handleEnableTestMode = async (plan: PlanType) => {
    if (!shouldShow) return;
    setIsActivating(plan);
    try {
      await enableTestMode(plan);
      toast.success(`Mode test activé : Plan ${getPlanConfig(plan).name}`);
      onPlanActivated?.(plan);
    } catch (error) {
      toast.error("Erreur lors de l'activation du mode test");
      console.error(error);
    } finally {
      setIsActivating(null);
    }
  };

  const handleDisableTestMode = async () => {
    setIsDeactivating(true);
    try {
      await disableTestMode();
      toast.success("Mode test désactivé - Retour à l'abonnement Stripe");
    } catch (error) {
      toast.error("Erreur lors de la désactivation du mode test");
      console.error(error);
    } finally {
      setIsDeactivating(false);
    }
  };

  // Auto-activate selected plan when it changes (from pricing cards)
  useEffect(() => {
    if (!shouldShow) return;
    if (selectedPlan && selectedPlan !== lastSelectedPlanRef.current && selectedPlan !== testPlan) {
      lastSelectedPlanRef.current = selectedPlan;
      handleEnableTestMode(selectedPlan);
      setIsExpanded(true);
    }
  }, [selectedPlan, testPlan, shouldShow]);

  const plans: PlanType[] = ["pro", "max"];

  // Don't render if not in dev/admin mode
  if (!shouldShow) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border overflow-hidden ${className} ${
        isTestMode
          ? "bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/30"
          : "bg-dark-card border-dark-border"
      }`}
    >
      {/* Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            isTestMode
              ? "bg-gradient-to-br from-purple-500 to-pink-500"
              : "bg-dark-hover"
          }`}>
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          </div>
          <div className="text-left">
            <h3 className="text-white font-semibold flex items-center gap-2">
              Mode Test
              {isTestMode && (
                <span className="px-2 py-0.5 text-xs font-bold bg-purple-500/20 text-purple-400 rounded-full">
                  ACTIF
                </span>
              )}
            </h3>
            <p className="text-sm text-text-muted">
              {isTestMode
                ? `Test du plan ${getPlanConfig(testPlan!).name}`
                : "Testez les plans sans paiement"
              }
            </p>
          </div>
        </div>

        <motion.svg
          className="w-5 h-5 text-text-muted"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </motion.svg>
      </button>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4">
              {/* Warning Banner */}
              <div className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <svg className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="text-sm text-amber-400 font-medium">Mode développement uniquement</p>
                  <p className="text-xs text-amber-400/70 mt-0.5">
                    Ce mode permet de tester les fonctionnalités sans paiement réel.
                    Les données Stripe ne sont pas affectées.
                  </p>
                </div>
              </div>

              {/* Current Status */}
              <div className="p-3 bg-dark-hover/50 rounded-xl">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-muted">Abonnement Stripe réel :</span>
                  <span className="text-white font-medium capitalize">
                    {subscription.planSource === "stripe" && !isTestMode && currentPlan
                      ? getPlanConfig(currentPlan).name
                      : "—"
                    }
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm mt-2">
                  <span className="text-text-muted">Plan actif (effectif) :</span>
                  <span className={`font-medium ${isTestMode ? "text-purple-400" : "text-green-400"}`}>
                    {currentPlan ? getPlanConfig(currentPlan).name : "Aucun"}
                    {isTestMode && " (test)"}
                  </span>
                </div>
              </div>

              {/* Plan Buttons */}
              <div className="space-y-2">
                <p className="text-xs text-text-muted font-medium uppercase tracking-wide">
                  Activer le mode test
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {plans.map((plan) => {
                    const config = getPlanConfig(plan);
                    const isActive = isTestMode && testPlan === plan;
                    const isCurrentReal = !isTestMode && currentPlan === plan;

                    return (
                      <button
                        key={plan}
                        onClick={() => handleEnableTestMode(plan)}
                        disabled={loading || isActivating !== null || isActive}
                        className={`
                          relative p-3 rounded-xl text-center transition-all duration-200
                          ${isActive
                            ? "bg-purple-500/20 border-2 border-purple-500 text-purple-400"
                            : isCurrentReal
                              ? "bg-green-500/10 border border-green-500/30 text-green-400"
                              : "bg-dark-hover border border-dark-border text-white hover:border-primary/50 hover:bg-primary/5"
                          }
                          disabled:opacity-50 disabled:cursor-not-allowed
                        `}
                      >
                        {isActivating === plan && (
                          <div className="absolute inset-0 flex items-center justify-center bg-dark-card/80 rounded-xl">
                            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                          </div>
                        )}
                        <span className="text-xs font-medium uppercase tracking-wide block mb-1 opacity-70">
                          {plan === "pro" ? "Pro" : "Max"}
                        </span>
                        <span className="text-sm font-bold">{config.name}</span>
                        {isActive && (
                          <span className="block text-xs mt-1 text-purple-300">Actif</span>
                        )}
                        {isCurrentReal && (
                          <span className="block text-xs mt-1 text-green-300">Stripe</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Disable Test Mode Button */}
              {isTestMode && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Button
                    variant="secondary"
                    fullWidth
                    onClick={handleDisableTestMode}
                    disabled={isDeactivating}
                    isLoading={isDeactivating}
                    className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 6L18 18M6 18L18 6" />
                    </svg>
                    Désactiver le mode test
                  </Button>
                </motion.div>
              )}

              {/* Features Preview based on current plan */}
              {isTestMode && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-3 bg-purple-500/5 border border-purple-500/20 rounded-xl"
                >
                  <p className="text-xs text-purple-400 font-medium mb-2">
                    Fonctionnalités actives ({getPlanConfig(testPlan!).name})
                  </p>
                  <ul className="text-xs text-text-muted space-y-1">
                    {testPlan && (
                      <>
                        <li className="flex items-center gap-2">
                          <svg className="w-3.5 h-3.5 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          {getPlanConfig(testPlan).limits.maxCharactersPerPrompt} caractères max
                        </li>
                        <li className="flex items-center gap-2">
                          <svg className="w-3.5 h-3.5 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          {getPlanConfig(testPlan).limits.maxRelations === -1
                            ? "Relations illimitées"
                            : `${getPlanConfig(testPlan).limits.maxRelations} relation(s)`
                          }
                        </li>
                        <li className="flex items-center gap-2">
                          <svg className="w-3.5 h-3.5 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          Plateformes : {getPlanConfig(testPlan).limits.allowedPlatforms.join(", ")}
                        </li>
                        <li className="flex items-center gap-2">
                          {getPlanConfig(testPlan).limits.canSchedulePosts ? (
                            <svg className="w-3.5 h-3.5 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            <svg className="w-3.5 h-3.5 text-text-muted" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          )}
                          Programmation des posts
                        </li>
                      </>
                    )}
                  </ul>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
