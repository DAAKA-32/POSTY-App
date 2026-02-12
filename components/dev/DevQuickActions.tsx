"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { isTestModeAllowed } from "@/lib/plans";
import toast from "@/components/ui/Toast";

/**
 * DevQuickActions - Floating action button for quick dev access
 *
 * Features:
 * - Floating button in bottom-right corner
 * - Quick activate Max plan (1 click)
 * - Keyboard shortcut: Ctrl+Shift+M
 * - Only visible in dev mode
 */

export default function DevQuickActions() {
  const {
    isTestMode,
    testPlan,
    currentPlan,
    enableTestMode,
    disableTestMode,
  } = useSubscription();

  const [isOpen, setIsOpen] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [shouldShow, setShouldShow] = useState(false);

  // Check if dev mode is enabled
  useEffect(() => {
    setShouldShow(isTestModeAllowed());
  }, []);

  // Keyboard shortcut: Ctrl+Shift+M to activate Max plan
  useEffect(() => {
    if (!shouldShow) return;

    const handleKeyboard = async (e: KeyboardEvent) => {
      // Ctrl+Shift+M = Quick activate Max
      if (e.ctrlKey && e.shiftKey && e.key === "M") {
        e.preventDefault();
        await quickActivateMax();
      }
      // Ctrl+Shift+D = Disable test mode
      if (e.ctrlKey && e.shiftKey && e.key === "D") {
        e.preventDefault();
        await quickDisable();
      }
    };

    window.addEventListener("keydown", handleKeyboard);
    return () => window.removeEventListener("keydown", handleKeyboard);
  }, [shouldShow, isTestMode]);

  const quickActivateMax = async () => {
    if (isTestMode && testPlan === "max") {
      toast.info("Plan Max déjà actif en mode test");
      return;
    }

    setIsActivating(true);
    try {
      await enableTestMode("max");
      toast.success("🚀 Plan Max activé (test mode)", {
        duration: 2000,
      });
    } catch (error) {
      toast.error("Erreur activation Max");
      console.error(error);
    } finally {
      setIsActivating(false);
    }
  };

  const quickActivatePro = async () => {
    if (isTestMode && testPlan === "pro") {
      toast.info("Plan Pro déjà actif en mode test");
      return;
    }

    setIsActivating(true);
    try {
      await enableTestMode("pro");
      toast.success("🎯 Plan Pro activé (test mode)", {
        duration: 2000,
      });
    } catch (error) {
      toast.error("Erreur activation Pro");
      console.error(error);
    } finally {
      setIsActivating(false);
    }
  };

  const quickDisable = async () => {
    if (!isTestMode) {
      toast.info("Aucun test mode actif");
      return;
    }

    setIsActivating(true);
    try {
      await disableTestMode();
      toast.success("✅ Test mode désactivé", {
        duration: 2000,
      });
    } catch (error) {
      toast.error("Erreur désactivation");
      console.error(error);
    } finally {
      setIsActivating(false);
    }
  };

  if (!shouldShow) {
    return null;
  }

  return (
    <>
      {/* Floating Action Button */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.5, type: "spring", stiffness: 260, damping: 20 }}
        className="fixed bottom-6 right-6 z-[9999]"
      >
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={isActivating}
          className={`
            w-14 h-14 rounded-full shadow-2xl flex items-center justify-center
            transition-all duration-300 hover:scale-110 active:scale-95
            ${isTestMode
              ? "bg-gradient-to-br from-purple-500 to-pink-500 animate-pulse"
              : "bg-gradient-to-br from-orange-500 to-red-500"
            }
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
        >
          {isActivating ? (
            <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          )}
        </button>

        {/* Status Badge */}
        {isTestMode && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-2 -right-2 px-2 py-0.5 bg-purple-500 text-white text-[10px] font-bold rounded-full shadow-lg"
          >
            {testPlan?.toUpperCase()}
          </motion.div>
        )}
      </motion.div>

      {/* Quick Actions Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed bottom-24 right-6 z-[9998] w-72"
          >
            <div className="bg-dark-card border border-dark-border rounded-2xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="p-4 border-b border-dark-border bg-gradient-to-r from-purple-500/10 to-pink-500/10">
                <h3 className="text-white font-bold flex items-center gap-2">
                  <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Dev Quick Actions
                </h3>
                <p className="text-xs text-text-muted mt-1">
                  Raccourcis: <kbd className="px-1.5 py-0.5 bg-dark-hover rounded text-[10px]">Ctrl+Shift+M</kbd> (Max) • <kbd className="px-1.5 py-0.5 bg-dark-hover rounded text-[10px]">Ctrl+Shift+D</kbd> (Off)
                </p>
              </div>

              {/* Current Status */}
              <div className="p-4 bg-dark-hover/30">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-muted">Plan actif :</span>
                  <span className={`font-bold ${isTestMode ? "text-purple-400" : "text-green-400"}`}>
                    {currentPlan.toUpperCase()}
                    {isTestMode && " (TEST)"}
                  </span>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="p-3 space-y-2">
                {/* Activate Max */}
                <button
                  onClick={quickActivateMax}
                  disabled={isActivating || (isTestMode && testPlan === "max")}
                  className={`
                    w-full p-3 rounded-xl flex items-center justify-between
                    transition-all duration-200
                    ${isTestMode && testPlan === "max"
                      ? "bg-purple-500/20 border border-purple-500 cursor-default"
                      : "bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 hover:border-amber-500/50 hover:bg-amber-500/20"
                    }
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5 2a2 2 0 00-2 2v14l3.5-2 3.5 2 3.5-2 3.5 2V4a2 2 0 00-2-2H5zm2.5 3a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm6.207.293a1 1 0 00-1.414 0l-6 6a1 1 0 101.414 1.414l6-6a1 1 0 000-1.414zM12.5 10a1.5 1.5 0 100 3 1.5 1.5 0 000-3z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-white">Plan Max</p>
                      <p className="text-xs text-text-muted">Toutes les features</p>
                    </div>
                  </div>
                  {isTestMode && testPlan === "max" && (
                    <span className="px-2 py-1 bg-purple-500/30 text-purple-300 text-xs font-bold rounded-full">
                      ACTIF
                    </span>
                  )}
                </button>

                {/* Activate Pro */}
                <button
                  onClick={quickActivatePro}
                  disabled={isActivating || (isTestMode && testPlan === "pro")}
                  className={`
                    w-full p-3 rounded-xl flex items-center justify-between
                    transition-all duration-200
                    ${isTestMode && testPlan === "pro"
                      ? "bg-purple-500/20 border border-purple-500 cursor-default"
                      : "bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/30 hover:border-primary/50 hover:bg-primary/20"
                    }
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-white">Plan Pro</p>
                      <p className="text-xs text-text-muted">Features premium</p>
                    </div>
                  </div>
                  {isTestMode && testPlan === "pro" && (
                    <span className="px-2 py-1 bg-purple-500/30 text-purple-300 text-xs font-bold rounded-full">
                      ACTIF
                    </span>
                  )}
                </button>

                {/* Disable Test Mode */}
                {isTestMode && (
                  <motion.button
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    onClick={quickDisable}
                    disabled={isActivating}
                    className="w-full p-3 rounded-xl flex items-center justify-center gap-2 bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-red-400 font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Désactiver Test Mode
                  </motion.button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
