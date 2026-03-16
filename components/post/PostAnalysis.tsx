"use client";

import { useState } from "react";
import { PostAnalysis as PostAnalysisType } from "@/types";
import { useLanguage } from "@/contexts/LanguageContext";

interface PostAnalysisProps {
  analysis: PostAnalysisType;
  className?: string;
}

/**
 * Score circle component
 */
function ScoreCircle({ score, label }: { score: number; label: string }) {
  // Color based on score
  const getColor = (s: number) => {
    if (s >= 8) return "text-green-600 dark:text-green-400 border-green-500";
    if (s >= 6) return "text-yellow-600 dark:text-yellow-400 border-yellow-500";
    return "text-red-600 dark:text-red-400 border-red-500";
  };

  const getBgColor = (s: number) => {
    if (s >= 8) return "bg-green-100 dark:bg-green-900/30";
    if (s >= 6) return "bg-yellow-100 dark:bg-yellow-900/30";
    return "bg-red-100 dark:bg-red-900/30";
  };

  return (
    <div className="flex flex-col items-center">
      <div
        className={`flex h-12 w-12 items-center justify-center rounded-full border-2 ${getColor(score)} ${getBgColor(score)}`}
      >
        <span className="text-lg font-bold">{score}</span>
      </div>
      <span className="mt-1 text-xs text-gray-600 dark:text-gray-400">
        {label}
      </span>
    </div>
  );
}

/**
 * PostAnalysis Component
 * Displays detailed analysis of a LinkedIn post
 * Available for PRO and MAX plans
 */
export function PostAnalysis({ analysis, className = "" }: PostAnalysisProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const { language } = useLanguage();

  const labels = {
    fr: {
      title: "Analyse du post",
      hook: "Accroche",
      structure: "Structure",
      cta: "CTA",
      overall: "Global",
      improvements: "Ameliorations suggeres",
      hookFeedback: "Analyse de l'accroche",
      structureFeedback: "Analyse de la structure",
      ctaFeedback: "Analyse du call-to-action",
    },
    en: {
      title: "Post Analysis",
      hook: "Hook",
      structure: "Structure",
      cta: "CTA",
      overall: "Overall",
      improvements: "Suggested improvements",
      hookFeedback: "Hook analysis",
      structureFeedback: "Structure analysis",
      ctaFeedback: "Call-to-action analysis",
    },
  };

  const t = labels[language as keyof typeof labels] || labels.en;

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <div
      className={`rounded-lg border border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50 dark:border-blue-800 dark:from-blue-900/20 dark:to-cyan-900/20 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-blue-200 px-4 py-3 dark:border-blue-800">
        <span className="text-lg">📊</span>
        <span className="font-medium text-blue-700 dark:text-blue-300">
          {t.title}
        </span>
        <span className="ml-auto rounded bg-blue-200 px-1.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-800 dark:text-blue-300">
          PRO
        </span>
      </div>

      {/* Scores */}
      <div className="flex justify-around border-b border-blue-200 px-4 py-4 dark:border-blue-800">
        <ScoreCircle score={analysis.hookScore} label={t.hook} />
        <ScoreCircle score={analysis.structureScore} label={t.structure} />
        <ScoreCircle score={analysis.ctaScore} label={t.cta} />
        <ScoreCircle score={analysis.overallScore} label={t.overall} />
      </div>

      {/* Detailed feedback sections */}
      <div className="divide-y divide-blue-200 dark:divide-blue-800">
        {/* Hook feedback */}
        <div>
          <button
            onClick={() => toggleSection("hook")}
            className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-blue-100/50 dark:hover:bg-blue-800/20"
          >
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t.hookFeedback}
            </span>
            <span className="text-gray-400">
              {expandedSection === "hook" ? "−" : "+"}
            </span>
          </button>
          {expandedSection === "hook" && (
            <div className="bg-white/60 px-4 py-3 dark:bg-gray-800/40">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {analysis.hookFeedback}
              </p>
            </div>
          )}
        </div>

        {/* Structure feedback */}
        <div>
          <button
            onClick={() => toggleSection("structure")}
            className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-blue-100/50 dark:hover:bg-blue-800/20"
          >
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t.structureFeedback}
            </span>
            <span className="text-gray-400">
              {expandedSection === "structure" ? "−" : "+"}
            </span>
          </button>
          {expandedSection === "structure" && (
            <div className="bg-white/60 px-4 py-3 dark:bg-gray-800/40">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {analysis.structureFeedback}
              </p>
            </div>
          )}
        </div>

        {/* CTA feedback */}
        <div>
          <button
            onClick={() => toggleSection("cta")}
            className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-blue-100/50 dark:hover:bg-blue-800/20"
          >
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t.ctaFeedback}
            </span>
            <span className="text-gray-400">
              {expandedSection === "cta" ? "−" : "+"}
            </span>
          </button>
          {expandedSection === "cta" && (
            <div className="bg-white/60 px-4 py-3 dark:bg-gray-800/40">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {analysis.ctaFeedback}
              </p>
            </div>
          )}
        </div>

        {/* Improvements */}
        <div>
          <button
            onClick={() => toggleSection("improvements")}
            className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-blue-100/50 dark:hover:bg-blue-800/20"
          >
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t.improvements}
            </span>
            <span className="text-gray-400">
              {expandedSection === "improvements" ? "−" : "+"}
            </span>
          </button>
          {expandedSection === "improvements" && (
            <div className="bg-white/60 px-4 py-3 dark:bg-gray-800/40">
              <ul className="space-y-2">
                {analysis.improvements.map((improvement, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400"
                  >
                    <span className="text-blue-500">•</span>
                    {improvement}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PostAnalysis;
