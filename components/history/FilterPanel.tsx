"use client";

import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";

export type DateFilter = "all" | "today" | "yesterday" | "week" | "month";
export type TypeFilter = "all" | "storytelling" | "business";

interface FilterPanelProps {
  dateFilter: DateFilter;
  typeFilter: TypeFilter;
  onDateFilterChange: (filter: DateFilter) => void;
  onTypeFilterChange: (filter: TypeFilter) => void;
  resultsCount: number;
  className?: string;
}

export default function FilterPanel({
  dateFilter,
  typeFilter,
  onDateFilterChange,
  onTypeFilterChange,
  resultsCount,
  className = "",
}: FilterPanelProps) {
  const { t } = useLanguage();
  const dateFilters: { value: DateFilter; label: string }[] = [
    { value: "all", label: t.ui.allFilter },
    { value: "today", label: t.ui.today },
    { value: "yesterday", label: t.ui.yesterday },
    { value: "week", label: t.ui.last7Days },
    { value: "month", label: t.ui.last30Days },
  ];

  const typeFilters: { value: TypeFilter; label: string; icon: string }[] = [
    { value: "all", label: t.ui.allTypes, icon: "📝" },
    { value: "storytelling", label: "Storytelling", icon: "📖" },
    { value: "business", label: "Business", icon: "💼" },
  ];

  const hasActiveFilters = dateFilter !== "all" || typeFilter !== "all";

  const handleClearFilters = () => {
    onDateFilterChange("all");
    onTypeFilterChange("all");
  };

  return (
    <div className={`space-y-4 lg:space-y-5 ${className}`}>
      {/* Header with clear button */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">{t.ui.filters}</h3>
        {hasActiveFilters && (
          <button
            onClick={handleClearFilters}
            className="text-xs text-primary hover:text-accent transition-colors"
          >
            {t.ui.reset}
          </button>
        )}
      </div>

      {/* Date Filter */}
      <div>
        <label className="block text-xs font-medium text-text-muted mb-2 uppercase tracking-wider">
          {t.ui.byDate}
        </label>
        <div className="space-y-1.5">
          {dateFilters.map((filter) => (
            <button
              key={filter.value}
              onClick={() => onDateFilterChange(filter.value)}
              className={`
                w-full flex items-center justify-between px-3 py-2.5 rounded-lg
                text-sm transition-all duration-200
                ${
                  dateFilter === filter.value
                    ? "bg-primary/10 text-primary border border-primary/30"
                    : "text-text-secondary hover:text-white hover:bg-dark-hover border border-transparent"
                }
              `}
            >
              <span>{filter.label}</span>
              {dateFilter === filter.value && (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-dark-border" />

      {/* Type Filter */}
      <div>
        <label className="block text-xs font-medium text-text-muted mb-2 uppercase tracking-wider">
          {t.ui.byType}
        </label>
        <div className="space-y-1.5">
          {typeFilters.map((filter) => (
            <button
              key={filter.value}
              onClick={() => onTypeFilterChange(filter.value)}
              className={`
                w-full flex items-center justify-between px-3 py-2.5 rounded-lg
                text-sm transition-all duration-200
                ${
                  typeFilter === filter.value
                    ? "bg-primary/10 text-primary border border-primary/30"
                    : "text-text-secondary hover:text-white hover:bg-dark-hover border border-transparent"
                }
              `}
            >
              <span className="flex items-center gap-2">
                <span>{filter.icon}</span>
                <span>{filter.label}</span>
              </span>
              {typeFilter === filter.value && (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Results count */}
      {hasActiveFilters && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="pt-4 border-t border-dark-border"
        >
          <p className="text-xs text-text-muted">
            {t.ui.resultsFound.replace("{n}", String(resultsCount))}
          </p>
        </motion.div>
      )}
    </div>
  );
}
