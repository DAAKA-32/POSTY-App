"use client";

import { useState } from "react";
import { PostInsights as PostInsightsType } from "@/types";
import { useLanguage } from "@/contexts/LanguageContext";

interface PostInsightsProps {
  insights: PostInsightsType;
  className?: string;
}

/**
 * PostInsights Component
 * Displays AI-generated insights about a LinkedIn post
 * Available for all plans (FREE, PRO, MAX)
 */
export function PostInsights({ insights, className = "" }: PostInsightsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { language } = useLanguage();

  const labels = {
    fr: {
      title: "Insights IA",
      whyEffective: "Pourquoi ca fonctionne",
      bestTime: "Meilleur moment",
      engagement: "Engagement attendu",
      takeaway: "Point cle",
      expand: "Voir les insights",
      collapse: "Masquer",
    },
    en: {
      title: "AI Insights",
      whyEffective: "Why it works",
      bestTime: "Best time",
      engagement: "Expected engagement",
      takeaway: "Key takeaway",
      expand: "View insights",
      collapse: "Hide",
    },
  };

  const t = labels[language] || labels.fr;

  return (
    <div
      className={`mt-4 rounded-lg border border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50 dark:border-purple-800 dark:from-purple-900/20 dark:to-indigo-900/20 ${className}`}
    >
      {/* Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-purple-100/50 dark:hover:bg-purple-800/20"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">💡</span>
          <span className="font-medium text-purple-700 dark:text-purple-300">
            {t.title}
          </span>
        </div>
        <span className="text-sm text-purple-600 dark:text-purple-400">
          {isExpanded ? t.collapse : t.expand}
        </span>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-purple-200 px-4 py-3 dark:border-purple-800">
          <div className="grid gap-3 sm:grid-cols-2">
            {/* Why Effective */}
            <div className="rounded-md bg-white/60 p-3 dark:bg-gray-800/40">
              <div className="mb-1 flex items-center gap-1.5 text-xs font-medium uppercase text-purple-600 dark:text-purple-400">
                <span>✨</span>
                {t.whyEffective}
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {insights.whyEffective}
              </p>
            </div>

            {/* Best Time to Post */}
            <div className="rounded-md bg-white/60 p-3 dark:bg-gray-800/40">
              <div className="mb-1 flex items-center gap-1.5 text-xs font-medium uppercase text-purple-600 dark:text-purple-400">
                <span>⏰</span>
                {t.bestTime}
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {insights.bestTimeToPost}
              </p>
            </div>

            {/* Expected Engagement */}
            <div className="rounded-md bg-white/60 p-3 dark:bg-gray-800/40">
              <div className="mb-1 flex items-center gap-1.5 text-xs font-medium uppercase text-purple-600 dark:text-purple-400">
                <span>📈</span>
                {t.engagement}
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {insights.expectedEngagement}
              </p>
            </div>

            {/* Key Takeaway */}
            <div className="rounded-md bg-white/60 p-3 dark:bg-gray-800/40">
              <div className="mb-1 flex items-center gap-1.5 text-xs font-medium uppercase text-purple-600 dark:text-purple-400">
                <span>🎯</span>
                {t.takeaway}
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {insights.keyTakeaway}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PostInsights;
