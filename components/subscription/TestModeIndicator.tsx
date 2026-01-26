"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { getPlanConfig } from "@/lib/plans";

/**
 * TestModeIndicator - Floating indicator when test mode is active
 *
 * Displays a persistent badge in the corner of the screen to remind
 * the user that they are in test mode and which plan is being simulated.
 */
export default function TestModeIndicator() {
  const { isTestMode, testPlan, disableTestMode, loading } = useSubscription();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDisabling, setIsDisabling] = useState(false);

  // Only show in dev/localhost
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const hostname = window.location.hostname;
      const isDev = process.env.NODE_ENV === "development";
      const isAdmin = process.env.NEXT_PUBLIC_ADMIN_MODE === "true";
      const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1";
      setShouldShow(isDev || isAdmin || isLocalhost);
    }
  }, []);

  const handleDisable = async () => {
    setIsDisabling(true);
    try {
      await disableTestMode();
      setIsExpanded(false);
    } catch (error) {
      console.error("Error disabling test mode:", error);
    } finally {
      setIsDisabling(false);
    }
  };

  // Don't render if not in test mode or not in dev environment
  if (!isTestMode || !shouldShow || loading) {
    return null;
  }

  const planConfig = testPlan ? getPlanConfig(testPlan) : null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.8, x: 20 }}
        animate={{ opacity: 1, scale: 1, x: 0 }}
        exit={{ opacity: 0, scale: 0.8, x: 20 }}
        className="fixed bottom-4 right-4 z-50"
      >
        <motion.button
          onClick={() => setIsExpanded(!isExpanded)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`
            flex items-center gap-2 px-3 py-2 rounded-full shadow-lg
            bg-gradient-to-r from-purple-600 to-pink-600
            text-white font-medium text-sm
            border-2 border-purple-400/50
            transition-all duration-200
            ${isExpanded ? "rounded-2xl" : ""}
          `}
        >
          {/* Flask icon */}
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
            />
          </svg>

          <span className="whitespace-nowrap">
            Test: {planConfig?.name || testPlan}
          </span>

          {/* Chevron indicator */}
          <motion.svg
            className="w-3 h-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            animate={{ rotate: isExpanded ? 180 : 0 }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 15l7-7 7 7"
            />
          </motion.svg>
        </motion.button>

        {/* Expanded panel */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute bottom-full right-0 mb-2 w-64"
            >
              <div className="bg-dark-card border border-purple-500/30 rounded-xl shadow-xl p-4 space-y-3">
                {/* Header */}
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-white font-semibold text-sm">
                      Mode Test Actif
                    </h4>
                    <p className="text-purple-300 text-xs">
                      Plan {planConfig?.name} simulé
                    </p>
                  </div>
                </div>

                {/* Info */}
                <div className="text-xs text-text-muted space-y-1 bg-dark-hover/50 rounded-lg p-2">
                  <p>
                    Vous testez actuellement toutes les fonctionnalités du plan{" "}
                    <span className="text-purple-400 font-medium">
                      {planConfig?.name}
                    </span>
                    .
                  </p>
                  <p className="text-amber-400/80">
                    Les données ne sont pas affectées.
                  </p>
                </div>

                {/* Features preview */}
                {testPlan === "max" && (
                  <div className="text-xs space-y-1">
                    <p className="text-text-muted font-medium">
                      Fonctionnalités actives:
                    </p>
                    <ul className="space-y-0.5 text-purple-300">
                      <li className="flex items-center gap-1">
                        <svg
                          className="w-3 h-3 text-green-400"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Conversations illimitées
                      </li>
                      <li className="flex items-center gap-1">
                        <svg
                          className="w-3 h-3 text-green-400"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Toutes les plateformes
                      </li>
                      <li className="flex items-center gap-1">
                        <svg
                          className="w-3 h-3 text-green-400"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Programmation des posts
                      </li>
                      <li className="flex items-center gap-1">
                        <svg
                          className="w-3 h-3 text-green-400"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Publication simultanée
                      </li>
                    </ul>
                  </div>
                )}

                {/* Disable button */}
                <button
                  onClick={handleDisable}
                  disabled={isDisabling}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg
                    bg-red-500/10 border border-red-500/30 text-red-400
                    hover:bg-red-500/20 transition-colors text-sm font-medium
                    disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDisabling ? (
                    <>
                      <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                      Désactivation...
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 6L18 18M6 18L18 6"
                        />
                      </svg>
                      Désactiver le mode test
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}
