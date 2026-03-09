"use client";

import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

interface ActivityChartProps {
  data: { date: string; count: number }[];
  title: string;
  subtitle?: string;
}

export default function ActivityChart({ data, title, subtitle }: ActivityChartProps) {
  const { t, language } = useLanguage();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [period, setPeriod] = useState<"7" | "30">("30");

  const filteredData = period === "7" ? data.slice(-7) : data;
  const maxValue = Math.max(...filteredData.map((d) => d.count), 1);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(language === "en" ? "en-US" : "fr-FR", { day: "numeric", month: "short" });
  };

  const getDayName = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(language === "en" ? "en-US" : "fr-FR", { weekday: "short" });
  };

  return (
    <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-2xl p-4 sm:p-6 hover:border-gray-300 dark:hover:border-dark-border-hover transition-colors duration-200">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
          {subtitle && <p className="text-gray-500 dark:text-text-muted text-sm">{subtitle}</p>}
        </div>

        {/* Period selector - Clean design */}
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-dark-elevated rounded-xl p-1 border border-gray-200 dark:border-dark-border">
          <button
            onClick={() => setPeriod("7")}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors duration-200 ${
              period === "7"
                ? "bg-primary text-white shadow-sm"
                : "text-gray-600 dark:text-text-muted hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            {t.dashboard.days7}
          </button>
          <button
            onClick={() => setPeriod("30")}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors duration-200 ${
              period === "30"
                ? "bg-primary text-white shadow-sm"
                : "text-gray-600 dark:text-text-muted hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            {t.dashboard.days30}
          </button>
        </div>
      </div>

      {/* Chart */}
      <div className="relative h-48">
        {/* Grid lines */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="border-b border-gray-100 dark:border-dark-border w-full"
              style={{ height: "1px" }}
            />
          ))}
        </div>

        {/* Bars */}
        <div className="relative h-full flex items-end gap-1">
          {filteredData.map((item, index) => {
            const height = maxValue > 0 ? (item.count / maxValue) * 100 : 0;
            const isHovered = hoveredIndex === index;

            return (
              <div
                key={item.date}
                className="flex-1 flex flex-col items-center justify-end h-full relative group"
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {/* Tooltip */}
                {isHovered && (
                  <div className="absolute -top-12 left-1/2 -translate-x-1/2 z-10 bg-white dark:bg-dark-elevated border border-gray-200 dark:border-dark-border rounded-lg px-3 py-2 shadow-md whitespace-nowrap">
                    <p className="text-xs text-gray-900 dark:text-white font-medium">{item.count} posts</p>
                    <p className="text-xs text-gray-500 dark:text-text-muted">{formatDate(item.date)}</p>
                  </div>
                )}

                {/* Bar - Clean solid color */}
                <div
                  className={`
                    w-full rounded-t-md transition-colors duration-200 cursor-pointer
                    ${isHovered ? "bg-primary" : "bg-primary/60"}
                  `}
                  style={{
                    height: `${Math.max(height, item.count > 0 ? 8 : 0)}%`,
                    minHeight: item.count > 0 ? "4px" : "0",
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* X-axis labels */}
      <div className="flex justify-between mt-3 px-1">
        {period === "7" ? (
          filteredData.map((item) => (
            <span key={item.date} className="text-xs text-gray-500 dark:text-text-muted capitalize">
              {getDayName(item.date)}
            </span>
          ))
        ) : (
          <>
            <span className="text-xs text-gray-500 dark:text-text-muted">
              {formatDate(filteredData[0]?.date || "")}
            </span>
            <span className="text-xs text-gray-500 dark:text-text-muted">
              {formatDate(filteredData[Math.floor(filteredData.length / 2)]?.date || "")}
            </span>
            <span className="text-xs text-gray-500 dark:text-text-muted">
              {formatDate(filteredData[filteredData.length - 1]?.date || "")}
            </span>
          </>
        )}
      </div>

      {/* Summary */}
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-dark-border flex items-center justify-between">
        <div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {filteredData.reduce((sum, d) => sum + d.count, 0)}
          </p>
          <p className="text-xs text-gray-500 dark:text-text-muted">
            {t.dashboard.postsOverDays.replace("{days}", period === "7" ? "7" : "30")}
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold text-primary">
            {(
              filteredData.reduce((sum, d) => sum + d.count, 0) /
              (period === "7" ? 7 : 30)
            ).toFixed(1)}
          </p>
          <p className="text-xs text-gray-500 dark:text-text-muted">{t.dashboard.avgPerDay}</p>
        </div>
      </div>
    </div>
  );
}
