"use client";

import { useLanguage } from "@/contexts/LanguageContext";

interface FeatureUsageChartProps {
  data: { feature: string; count: number }[];
}

/**
 * FeatureUsageChart — horizontal bar chart of where the user is actually
 * getting value from Posty (chat, templates, scheduled, published).
 * Mirrors the design language of ResponseModeChart (same card, same palette).
 */
export default function FeatureUsageChart({ data }: FeatureUsageChartProps) {
  const { t } = useLanguage();
  const max = Math.max(...data.map((d) => d.count), 1);
  const total = data.reduce((sum, d) => sum + d.count, 0);

  const COLORS: Record<string, { bar: string; bg: string; text: string; border: string }> = {
    chat: {
      bar: "bg-primary",
      bg: "bg-primary/10",
      text: "text-primary",
      border: "border-primary/20",
    },
    templates: {
      bar: "bg-violet-500",
      bg: "bg-violet-500/10",
      text: "text-violet-600 dark:text-violet-400",
      border: "border-violet-500/20",
    },
    scheduled: {
      bar: "bg-amber-500",
      bg: "bg-amber-500/10",
      text: "text-amber-600 dark:text-amber-400",
      border: "border-amber-500/20",
    },
    published: {
      bar: "bg-emerald-500",
      bg: "bg-emerald-500/10",
      text: "text-emerald-600 dark:text-emerald-400",
      border: "border-emerald-500/20",
    },
  };

  const defaultColors = {
    bar: "bg-gray-400",
    bg: "bg-gray-100 dark:bg-gray-800",
    text: "text-gray-500 dark:text-gray-400",
    border: "border-gray-200 dark:border-gray-700",
  };

  const labelKey = (f: string) =>
    (t.dashboard.featureUsageLabels as Record<string, string>)[f] ?? f;

  return (
    <div className="posty-card-glass posty-card-glass-hover rounded-2xl p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {t.dashboard.featureUsageTitle}
        </h3>
        <p className="text-gray-500 dark:text-text-muted text-sm">
          {t.dashboard.featureUsageSubtitle}
        </p>
      </div>

      {/* Bars */}
      {total === 0 ? (
        <div className="text-center py-8">
          <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 dark:bg-dark-elevated rounded-full flex items-center justify-center border border-gray-200 dark:border-dark-border">
            <svg className="w-6 h-6 text-gray-400 dark:text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
            </svg>
          </div>
          <p className="text-gray-500 dark:text-text-muted text-sm">
            {t.dashboard.featureUsageEmpty}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {data.map((item) => {
            const c = COLORS[item.feature] ?? defaultColors;
            const width = Math.max((item.count / max) * 100, item.count > 0 ? 4 : 0);
            return (
              <div key={item.feature} className="group">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${c.bar}`} />
                    <span className="text-sm font-medium text-gray-600 dark:text-text-secondary">
                      {labelKey(item.feature)}
                    </span>
                  </div>
                  <span className={`text-sm font-semibold ${c.text}`}>{item.count}</span>
                </div>
                <div className={`h-2.5 rounded-full ${c.bg} overflow-hidden border ${c.border}`}>
                  <div
                    className={`h-full rounded-full ${c.bar} transition-all duration-500`}
                    style={{ width: `${width}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
