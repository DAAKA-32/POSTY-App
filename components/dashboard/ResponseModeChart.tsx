"use client";

import { useLanguage } from "@/contexts/LanguageContext";

interface ResponseModeChartProps {
  data: { mode: string; count: number }[];
}

export default function ResponseModeChart({ data }: ResponseModeChartProps) {
  const { t } = useLanguage();
  const total = data.reduce((sum, d) => sum + d.count, 0);

  const getPercentage = (count: number) => {
    if (total === 0) return 0;
    return Math.round((count / total) * 100);
  };

  // Three-color palette matching the app design system
  const modeColors: Record<string, { bg: string; bar: string; border: string; text: string; stroke: string }> = {
    "Storytelling seul": {
      bg: "bg-red-500/10",
      bar: "bg-red-500",
      border: "border-red-500/20",
      text: "text-red-600 dark:text-red-400",
      stroke: "#ef4444",
    },
    "Business seul": {
      bg: "bg-primary/10",
      bar: "bg-primary",
      border: "border-primary/20",
      text: "text-primary",
      stroke: "#F8935D",
    },
    "Double Réponse": {
      bg: "bg-violet-500/10",
      bar: "bg-violet-500",
      border: "border-violet-500/20",
      text: "text-violet-600 dark:text-violet-400",
      stroke: "#8b5cf6",
    },
  };

  const defaultColors = {
    bg: "bg-gray-100 dark:bg-gray-800",
    bar: "bg-gray-400",
    border: "border-gray-200 dark:border-gray-700",
    text: "text-gray-600 dark:text-gray-400",
    stroke: "#9ca3af",
  };

  // Compute cumulative offsets for the donut chart segments
  const cumulativeOffset = (index: number) => {
    let offset = 0;
    for (let i = 0; i < index; i++) {
      offset += getPercentage(data[i]?.count || 0);
    }
    return offset;
  };

  return (
    <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-2xl p-4 sm:p-6 hover:border-gray-300 dark:hover:border-dark-border-hover transition-colors duration-200">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t.dashboard.responseMode}</h3>
        <p className="text-gray-500 dark:text-text-muted text-sm">{t.dashboard.responseModeSubtitle}</p>
      </div>

      {/* Distribution bars */}
      <div className="space-y-4">
        {data.map((item) => {
          const percentage = getPercentage(item.count);
          const colors = modeColors[item.mode] || defaultColors;

          return (
            <div key={item.mode} className="group">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${colors.bar}`} />
                  <span className="text-sm text-gray-600 dark:text-text-secondary font-medium">{item.mode}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-500 dark:text-text-muted">{item.count} posts</span>
                  <span className={`text-sm font-semibold ${colors.text}`}>{percentage}%</span>
                </div>
              </div>
              {/* Progress bar */}
              <div className={`h-2.5 rounded-full ${colors.bg} overflow-hidden border ${colors.border}`}>
                <div
                  className={`h-full rounded-full ${colors.bar} transition-all duration-500`}
                  style={{ width: `${Math.max(percentage, percentage > 0 ? 3 : 0)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty state */}
      {total === 0 && (
        <div className="text-center py-8">
          <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 dark:bg-dark-elevated rounded-full flex items-center justify-center border border-gray-200 dark:border-dark-border">
            <svg className="w-6 h-6 text-gray-400 dark:text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
            </svg>
          </div>
          <p className="text-gray-500 dark:text-text-muted text-sm">
            {t.dashboard.noPostGenerated}
          </p>
        </div>
      )}

      {/* Donut visualization with 3 segments */}
      {total > 0 && (
        <div className="mt-8 flex items-center justify-center">
          <div className="relative w-36 h-36">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              {/* Background circle */}
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="currentColor"
                strokeWidth="10"
                className="text-gray-100 dark:text-dark-elevated"
              />
              {/* Render each segment */}
              {data.map((item, index) => {
                const percentage = getPercentage(item.count);
                if (percentage === 0) return null;
                const colors = modeColors[item.mode] || defaultColors;
                const offset = cumulativeOffset(index);
                return (
                  <circle
                    key={item.mode}
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke={colors.stroke}
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={`${percentage * 2.51} 251`}
                    strokeDashoffset={`-${offset * 2.51}`}
                    className="transition-all duration-500"
                  />
                );
              })}
            </svg>
            {/* Center content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-gray-900 dark:text-white">{total}</span>
              <span className="text-xs text-gray-500 dark:text-text-muted font-medium">total</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
