"use client";

import { useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { PostInsights } from "@/types";

interface PostInsightsModalProps {
  isOpen: boolean;
  onClose: () => void;
  insights: PostInsights;
}

/**
 * PostInsightsModal - Premium modal to display post insights
 *
 * Features:
 * - Backdrop blur with semi-transparent overlay
 * - Smooth animations with framer-motion
 * - Responsive design (mobile + desktop)
 * - Easy to close (X button, backdrop click, ESC key)
 * - Professional card-based layout
 */
export default function PostInsightsModal({
  isOpen,
  onClose,
  insights,
}: PostInsightsModalProps) {
  // Close on ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  // Prevent rendering on server
  if (typeof window === "undefined") return null;

  const insightCards = [
    {
      id: "effective",
      icon: "✨",
      title: "Pourquoi ça fonctionne",
      content: insights.whyEffective,
      gradient: "from-violet-500/20 via-purple-500/20 to-violet-500/20",
      iconBg: "from-violet-500/15 to-purple-500/15",
      textColor: "text-violet-600 dark:text-violet-400",
    },
    {
      id: "timing",
      icon: "⏰",
      title: "Meilleur moment",
      content: insights.bestTimeToPost,
      gradient: "from-amber-500/20 via-orange-500/20 to-amber-500/20",
      iconBg: "from-amber-500/15 to-orange-500/15",
      textColor: "text-amber-600 dark:text-amber-400",
    },
    {
      id: "engagement",
      icon: "📈",
      title: "Engagement attendu",
      content: insights.expectedEngagement,
      gradient: "from-emerald-500/20 via-green-500/20 to-emerald-500/20",
      iconBg: "from-emerald-500/15 to-green-500/15",
      textColor: "text-emerald-600 dark:text-emerald-400",
    },
    {
      id: "takeaway",
      icon: "🎯",
      title: "Point clé",
      content: insights.keyTakeaway,
      gradient: "from-blue-500/20 via-cyan-500/20 to-blue-500/20",
      iconBg: "from-blue-500/15 to-cyan-500/15",
      textColor: "text-blue-600 dark:text-blue-400",
    },
  ];

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop with blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[9998] bg-black/40 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Modal content */}
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="
                relative w-full max-w-2xl max-h-[85vh] overflow-hidden
                bg-white dark:bg-dark-card
                rounded-2xl shadow-2xl
                border border-gray-200/50 dark:border-dark-border/50
              "
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="insights-title"
            >
              {/* Header */}
              <div className="relative px-6 py-5 border-b border-gray-200/80 dark:border-dark-border/80 bg-gradient-to-r from-violet-50/50 via-purple-50/50 to-violet-50/50 dark:from-violet-900/10 dark:via-purple-900/10 dark:to-violet-900/10">
                {/* Decorative gradient line */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 via-purple-500 to-violet-500" />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center">
                      <span className="text-2xl">💡</span>
                    </div>
                    <div>
                      <h2
                        id="insights-title"
                        className="text-lg font-bold text-gray-900 dark:text-white"
                      >
                        Insights IA
                      </h2>
                      <p className="text-xs text-text-muted">
                        Analyse de votre post par l'intelligence artificielle
                      </p>
                    </div>
                  </div>

                  {/* Close button */}
                  <motion.button
                    onClick={onClose}
                    whileHover={{ scale: 1.05, rotate: 90 }}
                    whileTap={{ scale: 0.95 }}
                    className="
                      w-9 h-9 rounded-lg
                      flex items-center justify-center
                      text-text-muted hover:text-text-primary
                      bg-gray-100 hover:bg-gray-200
                      dark:bg-dark-elevated dark:hover:bg-dark-hover
                      transition-colors duration-150
                    "
                    aria-label="Fermer"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </motion.button>
                </div>
              </div>

              {/* Content - Scrollable */}
              <div className="overflow-y-auto max-h-[calc(85vh-120px)] p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {insightCards.map((card, index) => (
                    <motion.div
                      key={card.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.08, duration: 0.3 }}
                      className="group relative"
                    >
                      {/* Glow effect on hover */}
                      <div className={`absolute -inset-0.5 bg-gradient-to-r ${card.gradient} rounded-xl opacity-0 group-hover:opacity-100 blur transition-opacity duration-300`} />

                      {/* Card */}
                      <div className="relative h-full p-4 bg-white dark:bg-dark-elevated rounded-xl border border-gray-200/80 dark:border-dark-border/80 hover:border-gray-300 dark:hover:border-dark-border transition-colors duration-200">
                        {/* Icon */}
                        <div className={`w-12 h-12 mb-3 rounded-xl bg-gradient-to-br ${card.iconBg} flex items-center justify-center`}>
                          <span className="text-2xl">{card.icon}</span>
                        </div>

                        {/* Title */}
                        <h3 className={`text-sm font-bold uppercase tracking-wide mb-2 ${card.textColor}`}>
                          {card.title}
                        </h3>

                        {/* Content */}
                        <p className="text-sm leading-relaxed text-gray-700 dark:text-text-secondary">
                          {card.content}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Bottom info */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="mt-6 p-4 bg-gradient-to-r from-violet-50/50 to-purple-50/50 dark:from-violet-900/10 dark:to-purple-900/10 rounded-xl border border-violet-200/50 dark:border-violet-800/50"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4 text-violet-600 dark:text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-600 dark:text-text-muted leading-relaxed">
                        <span className="font-semibold text-violet-600 dark:text-violet-400">Astuce :</span> Ces insights sont générés par IA pour vous aider à comprendre les points forts de votre post et optimiser votre stratégie de contenu.
                      </p>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
