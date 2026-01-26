"use client";

import { useState } from "react";

interface ActivityChartProps {
  data: { date: string; count: number }[];
  title: string;
  subtitle?: string;
}

export default function ActivityChart({ data, title, subtitle }: ActivityChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [period, setPeriod] = useState<"7" | "30">("30");

  const filteredData = period === "7" ? data.slice(-7) : data;
  const maxValue = Math.max(...filteredData.map((d) => d.count), 1);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  };

  const getDayName = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("fr-FR", { weekday: "short" });
  };

  return (
    <div className="bg-dashboard-card border border-dashboard-card-border rounded-2xl p-6 hover:border-primary/10 transition-colors duration-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
          {subtitle && <p className="text-text-muted text-sm">{subtitle}</p>}
        </div>

        {/* Period selector - Premium dark mode design */}
        <div className="flex items-center gap-1 bg-dashboard-surface-1 rounded-xl p-1 border border-dashboard-card-border/50">
          <button
            onClick={() => setPeriod("7")}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
              period === "7"
                ? "bg-primary text-slate-50 shadow-sm"
                : "text-text-muted hover:text-text-secondary hover:bg-dashboard-surface-2"
            }`}
          >
            7 jours
          </button>
          <button
            onClick={() => setPeriod("30")}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
              period === "30"
                ? "bg-primary text-slate-50 shadow-sm"
                : "text-text-muted hover:text-text-secondary hover:bg-dashboard-surface-2"
            }`}
          >
            30 jours
          </button>
        </div>
      </div>

      {/* Chart */}
      <div className="relative h-48">
        {/* Grid lines - plus subtiles */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="border-b border-dashboard-grid-line w-full"
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
                  <div className="absolute -top-12 left-1/2 -translate-x-1/2 z-10 bg-dashboard-elevated border border-dashboard-card-border rounded-lg px-3 py-2 shadow-elevated whitespace-nowrap animate-fade-in">
                    <p className="text-xs text-text-primary font-medium">{item.count} posts</p>
                    <p className="text-xs text-text-muted">{formatDate(item.date)}</p>
                  </div>
                )}

                {/* Bar - avec gradient subtil pour effet premium */}
                <div
                  className={`
                    w-full rounded-t-md transition-all duration-300 cursor-pointer
                    ${isHovered
                      ? "bg-gradient-to-t from-primary to-primary-light shadow-[0_0_12px_rgba(232,147,77,0.3)]"
                      : "bg-gradient-to-t from-primary/50 to-primary/70"
                    }
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
            <span key={item.date} className="text-xs text-text-muted capitalize">
              {getDayName(item.date)}
            </span>
          ))
        ) : (
          <>
            <span className="text-xs text-text-muted">
              {formatDate(filteredData[0]?.date || "")}
            </span>
            <span className="text-xs text-text-muted">
              {formatDate(filteredData[Math.floor(filteredData.length / 2)]?.date || "")}
            </span>
            <span className="text-xs text-text-muted">
              {formatDate(filteredData[filteredData.length - 1]?.date || "")}
            </span>
          </>
        )}
      </div>

      {/* Summary - Meilleure hiérarchie visuelle */}
      <div className="mt-6 pt-4 border-t border-dashboard-card-border/50 flex items-center justify-between">
        <div>
          <p className="text-2xl font-bold text-text-primary">
            {filteredData.reduce((sum, d) => sum + d.count, 0)}
          </p>
          <p className="text-xs text-text-muted">
            posts sur {period === "7" ? "7" : "30"} jours
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold text-accent">
            {(
              filteredData.reduce((sum, d) => sum + d.count, 0) /
              (period === "7" ? 7 : 30)
            ).toFixed(1)}
          </p>
          <p className="text-xs text-text-muted">moyenne/jour</p>
        </div>
      </div>
    </div>
  );
}
