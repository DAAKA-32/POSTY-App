"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PostInsights as PostInsightsType } from "@/types";
import { useLanguage } from "@/contexts/LanguageContext";

interface PostInsightsProps {
  insights: PostInsightsType;
  className?: string;
}

/**
 * Score indicator component with visual ring
 */
function ScoreIndicator({ score, label, color }: { score: number; label: string; color: "green" | "yellow" | "orange" }) {
  const colorClasses = {
    green: "text-emerald-600 dark:text-emerald-400 border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20",
    yellow: "text-amber-600 dark:text-amber-400 border-amber-500 bg-amber-50 dark:bg-amber-900/20",
    orange: "text-orange-600 dark:text-orange-400 border-orange-500 bg-orange-50 dark:bg-orange-900/20",
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`w-14 h-14 rounded-full border-2 flex items-center justify-center ${colorClasses[color]}`}>
        <span className="text-lg font-bold">{score}</span>
      </div>
      <span className="text-xs text-gray-500 dark:text-gray-400 text-center">{label}</span>
    </div>
  );
}

/**
 * PostInsights Component
 * Displays AI-generated coaching insights about a LinkedIn post
 * Available for all plans (FREE, PRO, MAX)
 */
export function PostInsights({ insights, className = "" }: PostInsightsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "details" | "coaching">("overview");
  const { t: globalT } = useLanguage();

  // Use global translations — works for all 10 languages
  const t = {
    title: globalT.insights.title,
    subtitle: globalT.insights.subtitle,
    whyEffective: globalT.insights.whyEffective,
    bestTime: globalT.insights.bestTime,
    engagement: globalT.insights.expectedEngagement,
    takeaway: globalT.insights.priorityAction,
    strengths: globalT.insights.strengths,
    improvements: globalT.ui.toImprove,
    coaching: globalT.insights.personalizedAdvice,
    hook: globalT.insights.hookAnalysis,
    cta: globalT.insights.ctaAnalysis,
    expand: globalT.ui.viewFullAnalysis,
    collapse: globalT.insights.collapse,
    overview: globalT.insights.overview,
    details: globalT.insights.details,
    coachingTab: globalT.insights.coachingTab,
    engagementScore: globalT.insights.engagementScore,
    readabilityScore: globalT.insights.readabilityScore,
  };

  // Determine score colors
  const getScoreColor = (score: number): "green" | "yellow" | "orange" => {
    if (score >= 70) return "green";
    if (score >= 50) return "yellow";
    return "orange";
  };

  return (
    <div
      className={`mt-4 rounded-xl border border-[#F8935D]/30 bg-gradient-to-br from-orange-50/80 to-amber-50/50 dark:from-[#F8935D]/10 dark:to-amber-900/10 dark:border-[#F8935D]/20 overflow-hidden ${className}`}
    >
      {/* Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between px-4 py-3.5 text-left transition-colors hover:bg-[#F8935D]/10 dark:hover:bg-[#F8935D]/5"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#F8935D] to-amber-500 flex items-center justify-center shadow-sm">
            <span className="text-lg text-white">🎯</span>
          </div>
          <div>
            <span className="font-semibold text-gray-900 dark:text-white block">
              {t.title}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {t.subtitle}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Quick score preview when collapsed */}
          {!isExpanded && insights.engagementScore !== undefined && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/60 dark:bg-dark-card/60 border border-gray-200 dark:border-dark-border">
              <span className="text-xs text-gray-500 dark:text-gray-400">Score:</span>
              <span className={`text-sm font-bold ${
                insights.engagementScore >= 70 ? "text-emerald-600 dark:text-emerald-400" :
                insights.engagementScore >= 50 ? "text-amber-600 dark:text-amber-400" :
                "text-orange-600 dark:text-orange-400"
              }`}>
                {insights.engagementScore}/100
              </span>
            </div>
          )}
          <span className="text-sm text-[#F8935D] dark:text-[#F8935D] font-medium">
            {isExpanded ? t.collapse : t.expand}
          </span>
          <motion.svg
            animate={{ rotate: isExpanded ? 180 : 0 }}
            className="w-4 h-4 text-[#F8935D]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </motion.svg>
        </div>
      </button>

      {/* Expanded content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="border-t border-[#F8935D]/20 dark:border-[#F8935D]/10">
              {/* Scores row */}
              {(insights.engagementScore !== undefined || insights.readabilityScore !== undefined) && (
                <div className="flex justify-center gap-8 py-4 px-4 bg-white/50 dark:bg-dark-card/30 border-b border-[#F8935D]/10">
                  {insights.engagementScore !== undefined && (
                    <ScoreIndicator
                      score={insights.engagementScore}
                      label={t.engagementScore}
                      color={getScoreColor(insights.engagementScore)}
                    />
                  )}
                  {insights.readabilityScore !== undefined && (
                    <ScoreIndicator
                      score={insights.readabilityScore}
                      label={t.readabilityScore}
                      color={getScoreColor(insights.readabilityScore)}
                    />
                  )}
                </div>
              )}

              {/* Tab navigation */}
              <div className="flex border-b border-[#F8935D]/10 px-4">
                {(["overview", "details", "coaching"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
                      activeTab === tab
                        ? "text-[#F8935D]"
                        : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                    }`}
                  >
                    {tab === "overview" ? t.overview : tab === "details" ? t.details : t.coachingTab}
                    {activeTab === tab && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#F8935D]"
                      />
                    )}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div className="p-4">
                <AnimatePresence mode="wait">
                  {activeTab === "overview" && (
                    <motion.div
                      key="overview"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-4"
                    >
                      {/* Why Effective */}
                      <div className="rounded-lg bg-white/70 dark:bg-dark-card/50 p-4 border border-gray-100 dark:border-dark-border">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">✨</span>
                          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t.whyEffective}</span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                          {insights.whyEffective}
                        </p>
                      </div>

                      {/* Expected Engagement */}
                      <div className="rounded-lg bg-white/70 dark:bg-dark-card/50 p-4 border border-gray-100 dark:border-dark-border">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">📈</span>
                          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t.engagement}</span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                          {insights.expectedEngagement}
                        </p>
                      </div>

                      {/* Key Takeaway */}
                      <div className="rounded-lg bg-gradient-to-r from-[#F8935D]/10 to-amber-500/10 p-4 border border-[#F8935D]/20">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">🎯</span>
                          <span className="text-sm font-semibold text-[#F8935D]">{t.takeaway}</span>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed font-medium">
                          {insights.keyTakeaway}
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === "details" && (
                    <motion.div
                      key="details"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-4"
                    >
                      {/* Strengths */}
                      {insights.strengths && insights.strengths.length > 0 && (
                        <div className="rounded-lg bg-emerald-50/70 dark:bg-emerald-900/10 p-4 border border-emerald-200 dark:border-emerald-800/30">
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-lg">💪</span>
                            <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">{t.strengths}</span>
                          </div>
                          <ul className="space-y-2">
                            {insights.strengths.map((strength, index) => (
                              <li key={index} className="flex items-start gap-2 text-sm text-emerald-800 dark:text-emerald-300">
                                <span className="text-emerald-500 mt-0.5">✓</span>
                                <span>{strength}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Improvements */}
                      {insights.improvements && insights.improvements.length > 0 && (
                        <div className="rounded-lg bg-amber-50/70 dark:bg-amber-900/10 p-4 border border-amber-200 dark:border-amber-800/30">
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-lg">🔧</span>
                            <span className="text-sm font-semibold text-amber-700 dark:text-amber-400">{t.improvements}</span>
                          </div>
                          <ul className="space-y-3">
                            {insights.improvements.map((improvement, index) => (
                              <li key={index} className="text-sm text-amber-800 dark:text-amber-300 leading-relaxed">
                                {improvement}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Hook Analysis */}
                      {insights.hookAnalysis && (
                        <div className="rounded-lg bg-white/70 dark:bg-dark-card/50 p-4 border border-gray-100 dark:border-dark-border">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">🪝</span>
                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t.hook}</span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                            {insights.hookAnalysis}
                          </p>
                        </div>
                      )}

                      {/* CTA Analysis */}
                      {insights.ctaAnalysis && (
                        <div className="rounded-lg bg-white/70 dark:bg-dark-card/50 p-4 border border-gray-100 dark:border-dark-border">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">👆</span>
                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t.cta}</span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                            {insights.ctaAnalysis}
                          </p>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {activeTab === "coaching" && (
                    <motion.div
                      key="coaching"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-4"
                    >
                      {/* Personalized Coaching Tip */}
                      {insights.coachingTip && (
                        <div className="rounded-lg bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 p-5 border border-violet-200 dark:border-violet-800/30">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
                              <span className="text-white text-sm">🧠</span>
                            </div>
                            <span className="text-sm font-semibold text-violet-700 dark:text-violet-400">{t.coaching}</span>
                          </div>
                          <p className="text-sm text-violet-800 dark:text-violet-300 leading-relaxed">
                            {insights.coachingTip}
                          </p>
                        </div>
                      )}

                      {/* Best Time to Post */}
                      <div className="rounded-lg bg-white/70 dark:bg-dark-card/50 p-4 border border-gray-100 dark:border-dark-border">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">⏰</span>
                          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t.bestTime}</span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                          {insights.bestTimeToPost}
                        </p>
                      </div>

                      {/* Pro tip box */}
                      <div className="rounded-lg bg-gray-50 dark:bg-dark-hover p-4 border border-gray-200 dark:border-dark-border">
                        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                          <span className="font-semibold text-gray-700 dark:text-gray-300">{globalT.insights.proTip}</span> {globalT.insights.proTipDescription}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default PostInsights;
