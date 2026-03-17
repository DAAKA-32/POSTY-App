"use client";

import { ResponseMode } from "@/types";
import { PlanType } from "@/lib/config/plans";
import { getPlanFeatures } from "@/lib/config/plan-features";
import { useLanguage } from "@/contexts/LanguageContext";

interface ResponseModeSelectorProps {
  plan: PlanType | null;
  selectedStyle: "storytelling" | "business";
  onStyleChange: (style: "storytelling" | "business") => void;
  disabled?: boolean;
  className?: string;
}

/**
 * ResponseModeSelector Component
 * Displays style selection based on user's plan:
 * - No plan (null): Shows locked message (business only)
 * - PRO: Toggle between Storytelling/Business
 * - MAX: Shows "Both styles" badge (no toggle needed)
 */
export function ResponseModeSelector({
  plan,
  selectedStyle,
  onStyleChange,
  disabled = false,
  className = "",
}: ResponseModeSelectorProps) {
  const { t } = useLanguage();
  const planFeatures = getPlanFeatures(plan);
  const responseMode = planFeatures.responseMode;

  // No plan / unsubscribed: Show locked indicator
  if (responseMode === "business-only") {
    return (
      <div
        className={`flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-500 dark:bg-gray-800 dark:text-gray-400 ${className}`}
      >
        <span className="text-xs">🔒</span>
        <span>{t.ui.businessOnly}</span>
        <span className="ml-1 text-xs opacity-70">• {t.ui.upgradeForChoice}</span>
      </div>
    );
  }

  // MAX plan: Show "both styles" badge
  if (responseMode === "dual") {
    return (
      <div
        className={`flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-100 to-indigo-100 px-3 py-2 text-sm dark:from-purple-900/30 dark:to-indigo-900/30 ${className}`}
      >
        <span className="text-xs">✨</span>
        <span className="font-medium text-purple-700 dark:text-purple-300">
          {t.ui.bothStyles}
        </span>
        <span className="rounded bg-purple-200 px-1.5 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-800 dark:text-purple-300">
          MAX
        </span>
      </div>
    );
  }

  // PRO plan: Show toggle between styles
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-xs text-gray-500 dark:text-gray-400">
        {t.ui.selectStyle}:
      </span>
      <div className="flex rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
        <button
          type="button"
          onClick={() => onStyleChange("storytelling")}
          disabled={disabled}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
            selectedStyle === "storytelling"
              ? "bg-white text-purple-700 shadow-sm dark:bg-gray-700 dark:text-purple-300"
              : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
          } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
          aria-pressed={selectedStyle === "storytelling"}
        >
          <span className="mr-1">📖</span>
          {t.chat.storytelling}
        </button>
        <button
          type="button"
          onClick={() => onStyleChange("business")}
          disabled={disabled}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
            selectedStyle === "business"
              ? "bg-white text-purple-700 shadow-sm dark:bg-gray-700 dark:text-purple-300"
              : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
          } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
          aria-pressed={selectedStyle === "business"}
        >
          <span className="mr-1">💼</span>
          {t.chat.business}
        </button>
      </div>
    </div>
  );
}

export default ResponseModeSelector;
