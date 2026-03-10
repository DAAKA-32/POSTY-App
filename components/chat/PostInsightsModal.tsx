"use client";

import { useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { PostInsights } from "@/types";
import { useScrollLock } from "@/hooks/useScrollLock";
import { useLanguage } from "@/contexts/LanguageContext";

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
  // Centralized scroll lock
  useScrollLock(isOpen);
  const { t } = useLanguage();

  // Close on ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  // Prevent rendering on server
  if (typeof window === "undefined") return null;

  const insightCards = [
    {
      id: "effective",
      icon: "✨",
      title: t.insights.whyEffective,
      content: insights.whyEffective,
      iconBg: "bg-primary/10 border border-primary/20",
      textColor: "text-primary",
    },
    {
      id: "timing",
      icon: "⏰",
      title: t.insights.bestTime,
      content: insights.bestTimeToPost,
      iconBg: "bg-primary/10 border border-primary/20",
      textColor: "text-primary",
    },
    {
      id: "engagement",
      icon: "📈",
      title: t.insights.expectedEngagement,
      content: insights.expectedEngagement,
      iconBg: "bg-primary/10 border border-primary/20",
      textColor: "text-primary",
    },
    {
      id: "takeaway",
      icon: "🎯",
      title: t.insights.keyTakeaway,
      content: insights.keyTakeaway,
      iconBg: "bg-primary/10 border border-primary/20",
      textColor: "text-primary",
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
                rounded-2xl shadow-lg
                border border-gray-200 dark:border-dark-border
              "
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="insights-title"
            >
              {/* Header */}
              <div className="relative px-6 py-5 border-b border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-elevated">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                      <span className="text-2xl">💡</span>
                    </div>
                    <div>
                      <h2
                        id="insights-title"
                        className="text-lg font-bold text-gray-900 dark:text-white"
                      >
                        {t.insights.title}
                      </h2>
                      <p className="text-xs text-text-muted">
                        {t.insights.subtitle}
                      </p>
                    </div>
                  </div>

                  {/* Close button */}
                  <button
                    onClick={onClose}
                    className="
                      w-9 h-9 rounded-lg
                      flex items-center justify-center
                      text-text-muted hover:text-text-primary
                      bg-gray-100 hover:bg-gray-200
                      dark:bg-dark-elevated dark:hover:bg-dark-hover
                      transition-colors duration-200
                    "
                    aria-label={t.common.close}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
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
                    >
                      {/* Card */}
                      <div className="h-full p-4 bg-white dark:bg-dark-elevated rounded-xl border border-gray-200 dark:border-dark-border hover:border-gray-300 dark:hover:border-dark-border-hover transition-colors duration-200">
                        {/* Icon */}
                        <div className={`w-12 h-12 mb-3 rounded-xl ${card.iconBg} flex items-center justify-center`}>
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
                  className="mt-6 p-4 bg-gray-50 dark:bg-dark-elevated rounded-xl border border-gray-200 dark:border-dark-border"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-600 dark:text-text-muted leading-relaxed">
                        <span className="font-semibold text-primary">{t.insights.tip}</span> {t.insights.tipDescription}
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
