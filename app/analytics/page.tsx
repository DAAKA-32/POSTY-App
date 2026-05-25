"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import MainLayout from "@/components/layout/MainLayout";
import {
  getLinkedInPosts,
  getLinkedInAnalytics,
  markLinkedInPostDeleted,
  getScheduledPosts,
  LinkedInPostData,
  LinkedInAnalyticsSummary,
} from "@/lib/db/firestore";
import { getAuthHeaders } from "@/lib/api/client";
import toast from "@/components/ui/Toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePageTitle } from "@/hooks/ui/usePageTitle";

// =============================================================================
// AI INSIGHTS PANEL - Coaching intelligence from post history
// =============================================================================

interface AIInsights {
  summary: string;
  strengths: string[];
  improvements: string[];
  nextSteps: string[];
  bestPerformingPattern: string;
  contentScore: number;
}

function AIInsightsPanel({ posts }: { posts: LinkedInPostData[] }) {
  const { t, language } = useLanguage();
  const { user, userProfile } = useAuth();
  const [insights, setInsights] = useState<AIInsights | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

  const generateInsights = useCallback(async () => {
    if (!user || posts.length === 0) return;
    setLoading(true);
    setError(false);

    try {
      const headers = await getAuthHeaders();
      const postData = posts.slice(0, 10).map((p) => ({
        content: p.content,
        likes: p.metrics?.likes || 0,
        comments: p.metrics?.comments || 0,
        shares: p.metrics?.shares || 0,
      }));

      const response = await fetch("/api/analytics/ai-insights", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({
          userId: user.uid,
          posts: postData,
          language,
          userProfile: userProfile?.profile || {},
        }),
      });

      if (!response.ok) throw new Error("Failed");
      const data = await response.json();
      setInsights(data.insights);
      setHasGenerated(true);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [user, posts, language, userProfile]);

  if (posts.length < 2) return null;

  const isFr = language === "fr";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.15 }}
      className="mb-8 bg-white/80 dark:bg-dark-card rounded-2xl border border-violet-200/40 dark:border-violet-500/20 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-dark-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              {isFr ? "Coach IA" : "AI Coach"}
            </h3>
            <p className="text-xs text-gray-500 dark:text-text-muted">
              {isFr ? "Analyse de vos contenus" : "Content analysis"}
            </p>
          </div>
        </div>
        {!loading && (
          <button
            onClick={generateInsights}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-gradient-to-r from-violet-500 to-purple-600 rounded-lg hover:opacity-90 transition-opacity"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            {hasGenerated
              ? (isFr ? "Actualiser" : "Refresh")
              : (isFr ? "Analyser mes posts" : "Analyze my posts")}
          </button>
        )}
      </div>

      {/* Content */}
      <div className="px-5 py-4">
        {loading && (
          <div className="flex items-center gap-3 py-6 justify-center">
            <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-gray-500">{isFr ? "Analyse en cours..." : "Analyzing..."}</span>
          </div>
        )}

        {error && (
          <p className="text-sm text-red-500 py-4 text-center">
            {isFr ? "Erreur lors de l'analyse. Réessayez." : "Analysis failed. Try again."}
          </p>
        )}

        {!loading && !insights && !error && (
          <p className="text-sm text-gray-400 dark:text-text-muted py-4 text-center">
            {isFr
              ? "Cliquez sur \"Analyser mes posts\" pour obtenir des recommandations personnalisées."
              : "Click \"Analyze my posts\" to get personalized recommendations."}
          </p>
        )}

        {insights && !loading && (
          <div className="space-y-5">
            {/* Score + Summary */}
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-500/10 dark:to-purple-500/10 flex flex-col items-center justify-center border border-violet-200/50 dark:border-violet-500/20">
                <span className="text-lg font-bold text-violet-600 dark:text-violet-400">{insights.contentScore}</span>
                <span className="text-[10px] text-violet-400">/10</span>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed pt-1">{insights.summary}</p>
            </div>

            {/* Strengths */}
            <div>
              <h4 className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-2 uppercase tracking-wide">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                {isFr ? "Points forts" : "Strengths"}
              </h4>
              <ul className="space-y-1.5">
                {insights.strengths.map((s, i) => (
                  <li key={i} className="text-sm text-gray-600 dark:text-gray-400 pl-4 relative before:absolute before:left-0 before:top-2 before:w-1.5 before:h-1.5 before:rounded-full before:bg-emerald-400">{s}</li>
                ))}
              </ul>
            </div>

            {/* Improvements */}
            <div>
              <h4 className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 mb-2 uppercase tracking-wide">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {isFr ? "Axes d'amélioration" : "Areas to improve"}
              </h4>
              <ul className="space-y-1.5">
                {insights.improvements.map((s, i) => (
                  <li key={i} className="text-sm text-gray-600 dark:text-gray-400 pl-4 relative before:absolute before:left-0 before:top-2 before:w-1.5 before:h-1.5 before:rounded-full before:bg-amber-400">{s}</li>
                ))}
              </ul>
            </div>

            {/* Next Steps */}
            <div>
              <h4 className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 mb-2 uppercase tracking-wide">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clipRule="evenodd" />
                </svg>
                {isFr ? "Prochaines actions" : "Next steps"}
              </h4>
              <ul className="space-y-1.5">
                {insights.nextSteps.map((s, i) => (
                  <li key={i} className="text-sm text-gray-600 dark:text-gray-400 pl-4 relative before:absolute before:left-0 before:top-2 before:w-1.5 before:h-1.5 before:rounded-full before:bg-blue-400">{s}</li>
                ))}
              </ul>
            </div>

            {/* Best performing pattern */}
            {insights.bestPerformingPattern && (
              <div className="mt-3 p-3 bg-violet-50/50 dark:bg-violet-500/5 rounded-xl border border-violet-200/30 dark:border-violet-500/15">
                <p className="text-xs font-medium text-violet-600 dark:text-violet-400 mb-1">
                  {isFr ? "Ce qui fonctionne le mieux" : "What works best"}
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{insights.bestPerformingPattern}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// =============================================================================
// ANALYTICS DASHBOARD PAGE - Enhanced with Charts & Filters
// =============================================================================

type PeriodFilter = "7d" | "30d" | "all";

// Premium animation easing
const premiumEase = [0.22, 1, 0.36, 1] as const;

// Period Filter Component
function PeriodFilterComponent({
  selected,
  onChange,
}: {
  selected: PeriodFilter;
  onChange: (period: PeriodFilter) => void;
}) {
  const { t } = useLanguage();
  const options: { value: PeriodFilter; label: string }[] = [
    { value: "7d", label: t.analytics.periodFilter.days7 },
    { value: "30d", label: t.analytics.periodFilter.days30 },
    { value: "all", label: t.analytics.periodFilter.all },
  ];

  return (
    <div className="inline-flex items-center p-1 bg-gray-100 dark:bg-dark-elevated rounded-xl border border-gray-200 dark:border-dark-border">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`
            relative px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors duration-200
            ${selected === option.value
              ? "text-white bg-primary shadow-sm"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }
          `}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

// Bar chart — publications per day over the selected period.
// Internal-only: counts from Posty's own `linkedinPosts` docs, no LinkedIn API.
function PostsPerDayChart({ data }: { data: { date: string; count: number }[] }) {
  const { t } = useLanguage();
  const chartHeight = 200;
  const chartWidth = 600;
  const padding = { top: 20, right: 20, bottom: 40, left: 40 };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  const maxValue = useMemo(
    () => Math.max(...data.map((d) => d.count), 1),
    [data]
  );

  const xAxisLabels = useMemo(() => {
    if (data.length <= 7) return data.map((d) => d.date);
    const step = Math.ceil(data.length / 6);
    return data.filter((_, i) => i % step === 0 || i === data.length - 1).map((d) => d.date);
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-gray-400">
        {t.analytics.noDataForPeriod}
      </div>
    );
  }

  // Bar width & gap computed so bars never touch on dense periods.
  const slotWidth = innerWidth / data.length;
  const barWidth = Math.max(4, Math.min(28, slotWidth * 0.7));

  // Horizontal gridlines at 0, mid, max.
  const yAxisLabels = [0, Math.max(1, Math.round(maxValue / 2)), maxValue];

  return (
    <div className="relative w-full">
      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full" preserveAspectRatio="xMidYMid meet">
        {yAxisLabels.map((value, i) => {
          const y = padding.top + innerHeight - (value / maxValue) * innerHeight;
          return (
            <g key={i}>
              <line
                x1={padding.left}
                y1={y}
                x2={chartWidth - padding.right}
                y2={y}
                stroke="currentColor"
                strokeOpacity={0.1}
                strokeDasharray="4 4"
              />
              <text
                x={padding.left - 8}
                y={y + 4}
                textAnchor="end"
                className="fill-gray-400 text-[10px]"
              >
                {value}
              </text>
            </g>
          );
        })}

        {data.map((d, i) => {
          const barHeight = (d.count / maxValue) * innerHeight;
          const x = padding.left + i * slotWidth + (slotWidth - barWidth) / 2;
          const y = padding.top + innerHeight - barHeight;
          const cappedDelay = Math.min(i * 0.015, 0.3);
          return (
            <motion.rect
              key={i}
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              rx={2}
              fill="#F8935D"
              initial={{ scaleY: 0, transformOrigin: `${x + barWidth / 2}px ${padding.top + innerHeight}px` }}
              animate={{ scaleY: 1 }}
              transition={{ duration: 0.4, delay: cappedDelay, ease: "easeOut" }}
            />
          );
        })}

        {xAxisLabels.map((label, i) => {
          const dataIndex = data.findIndex((d) => d.date === label);
          const x = padding.left + dataIndex * slotWidth + slotWidth / 2;
          return (
            <text
              key={i}
              x={x}
              y={chartHeight - 10}
              textAnchor="middle"
              className="fill-gray-400 text-[10px]"
            >
              {label}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

// Stats Card Component
function StatsCard({
  title,
  value,
  icon,
  color,
  trend,
  delay = 0,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  trend?: { value: number; label: string };
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      whileHover={{
        y: -4,
        boxShadow: "0 8px 25px -5px rgba(0, 0, 0, 0.08), 0 4px 10px -6px rgba(0, 0, 0, 0.04)",
        transition: { duration: 0.25, ease: [0.25, 0.1, 0.25, 1] },
      }}
      transition={{ duration: 0.3, delay }}
      className="bg-white/80 dark:bg-dark-card rounded-2xl border border-[#F8935D]/10 dark:border-dark-border p-4 sm:p-6 transition-colors duration-200"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium truncate">{title}</p>
          <p className="mt-1.5 sm:mt-2 text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
          {trend && (
            <p className={`mt-1 text-xs sm:text-sm font-medium ${trend.value >= 0 ? "text-emerald-600" : "text-red-500"}`}>
              {trend.value >= 0 ? "+" : ""}{trend.value}% {trend.label}
            </p>
          )}
        </div>
        <div
          className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${color}15` }}
        >
          <div className="[&>svg]:w-5 [&>svg]:h-5 sm:[&>svg]:w-6 sm:[&>svg]:h-6" style={{ color }}>{icon}</div>
        </div>
      </div>
    </motion.div>
  );
}

// Small pill shown on each post card to signal metrics-sync status.
function SyncStatusPill({ post }: { post: LinkedInPostData }) {
  const { t } = useLanguage();
  const isOrg = post.authorType === "organization";

  // Personal-profile post: LinkedIn has no metrics endpoint for these,
  // so be honest about it — don't show a "pending" spinner forever.
  if (!isOrg) {
    return (
      <span
        title={t.analytics.metricsNotAvailableTooltip}
        className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 dark:bg-dark-elevated text-gray-500 dark:text-gray-400"
      >
        {t.analytics.metricsPersonBadge}
      </span>
    );
  }

  if (post.syncStatus === "failed") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400">
        {t.analytics.metricsSyncFailed}
      </span>
    );
  }
  if (post.syncStatus === "pending" || !post.syncStatus) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400">
        {t.analytics.metricsSyncPending}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
      {t.analytics.metricsSyncOk}
    </span>
  );
}

// Post Card with Metrics
function PostCard({
  post,
  onRemove,
  delay = 0,
}: {
  post: LinkedInPostData;
  onRemove: (post: LinkedInPostData) => void;
  delay?: number;
}) {
  const publishedDate = post.publishedAt?.toDate?.() || new Date();
  const { t } = useLanguage();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(delay, 0.3), ease: premiumEase }}
      className="bg-white/80 dark:bg-dark-card rounded-2xl border border-[#F8935D]/10 dark:border-dark-border p-4 sm:p-5 hover:shadow-lg transition-shadow duration-200"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0077B5] to-[#00A0DC] flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {publishedDate.toLocaleDateString(t.ui.timeLocale, {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
            {post.organizationName && (
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                {post.organizationName}
              </p>
            )}
            {post.postUrl && (
              <a
                href={post.postUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[#0077B5] hover:underline"
              >
                {t.analytics.viewOnLinkedIn}
              </a>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onRemove(post)}
            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
            title={t.ui.removeStatsNote}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content preview */}
      <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3 mb-4">
        {post.content}
      </p>

      {/* Engagement metrics — only rendered when we actually have real data
          (either synced via the LinkedIn org API or pushed by an extension).
          For personal-profile posts where no metrics exist, we skip this
          entirely rather than display a row of misleading zeros. */}
      {post.metrics && (post.metrics.source === "api" || post.metrics.source === "extension") && (
        <div className="flex items-center gap-4 pt-4 border-t border-gray-100 dark:border-dark-border">
          <div className="flex items-center gap-1.5 text-sm">
            <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
            </svg>
            <span className="font-semibold text-gray-900 dark:text-white">{post.metrics.likes || 0}</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm">
            <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zM7 8H5v2h2V8zm2 0h2v2H9V8zm6 0h-2v2h2V8z" clipRule="evenodd" />
            </svg>
            <span className="font-semibold text-gray-900 dark:text-white">{post.metrics.comments || 0}</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm">
            <svg className="w-4 h-4 text-violet-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
            </svg>
            <span className="font-semibold text-gray-900 dark:text-white">{post.metrics.shares || 0}</span>
          </div>
        </div>
      )}
    </motion.div>
  );
}

// Empty State Component
function EmptyState() {
  const { t } = useLanguage();
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center py-16"
    >
      <div className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-6 rounded-2xl bg-gray-100 dark:bg-dark-card border border-gray-200 dark:border-dark-border flex items-center justify-center">
        <svg className="w-8 h-8 md:w-10 md:h-10 text-gray-400 dark:text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      </div>
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
        {t.ui.noPostsGenerated}
      </h3>
      <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto mb-6">
        {t.analytics.emptyStateDescription}
      </p>
      <Link
        href="/app"
        className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary-hover text-white font-medium rounded-xl transition-colors duration-200"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        {t.analytics.createPost}
      </Link>
    </motion.div>
  );
}

// Main Analytics Content
function AnalyticsContent() {
  const { user } = useAuth();
  const { t } = useLanguage();
  usePageTitle("analytics");
  const [posts, setPosts] = useState<LinkedInPostData[]>([]);
  const [analytics, setAnalytics] = useState<LinkedInAnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("30d");
  const [isVerifying, setIsVerifying] = useState(false);
  // Upcoming scheduled posts — fetched from `scheduledPosts` so we can show
  // "X publications programmées" as a real internal KPI.
  const [upcomingScheduledCount, setUpcomingScheduledCount] = useState(0);

  // Enable full scrolling on Analytics page (mouse wheel, trackpad, touch, keyboard)
  useEffect(() => {
    document.documentElement.classList.add("analytics-scroll-enabled");
    document.body.classList.add("analytics-scroll-enabled");
    document.body.classList.remove("pwa-mobile", "no-scroll", "scroll-locked", "modal-open");

    return () => {
      document.documentElement.classList.remove("analytics-scroll-enabled");
      document.body.classList.remove("analytics-scroll-enabled");
    };
  }, []);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [postsData, analyticsData, scheduledData] = await Promise.all([
        getLinkedInPosts(user.uid, 100),
        getLinkedInAnalytics(user.uid),
        getScheduledPosts(user.uid, "pending"),
      ]);
      setPosts(postsData);
      setAnalytics(analyticsData);
      // Only count future scheduled posts — past-dated "pending" docs are
      // stuck retries and don't belong in the "à venir" counter.
      const nowMs = Date.now();
      const upcoming = scheduledData.filter((p) => {
        const ts: { toMillis?: () => number } | undefined = p.scheduledAt;
        const scheduledAtMs = ts?.toMillis?.() ?? 0;
        return scheduledAtMs > nowMs;
      }).length;
      setUpcomingScheduledCount(upcoming);
    } catch (error) {
      console.error("Error loading analytics:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Verify all posts still exist on LinkedIn
  const handleVerifyPosts = useCallback(async () => {
    if (!user || isVerifying) return;
    setIsVerifying(true);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch("/api/linkedin/verify-posts", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ userId: user.uid }),
      });
      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || t.analytics.verifyError);
        return;
      }

      if (data.deleted?.length > 0) {
        // Remove deleted posts from local state
        setPosts((prev) => prev.filter((p) => !data.deleted.includes(p.id)));
        toast.success(`${data.deleted.length} ${t.analytics.postsDeleted}`);
        // Reload analytics to recalculate
        const analyticsData = await getLinkedInAnalytics(user.uid);
        setAnalytics(analyticsData);
      } else {
        toast.success(`${data.verified} ${t.analytics.postsVerified}`);
      }
    } catch (error) {
      console.error("Error verifying posts:", error);
      toast.error(t.analytics.verifyFailed);
    } finally {
      setIsVerifying(false);
    }
  }, [user, isVerifying]);

  // Manually remove a single post from stats
  const handleRemovePost = useCallback(async (post: LinkedInPostData) => {
    try {
      await markLinkedInPostDeleted(post.id);
      setPosts((prev) => prev.filter((p) => p.id !== post.id));
      toast.success(t.analytics.postRemoved);
      // Recalculate analytics
      if (user) {
        const analyticsData = await getLinkedInAnalytics(user.uid);
        setAnalytics(analyticsData);
      }
    } catch (error) {
      console.error("Error removing post:", error);
      toast.error(t.analytics.postRemoveError);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter posts by period (author-type filter removed — we're internal-only now)
  const filteredPosts = useMemo(() => {
    if (periodFilter === "all") return posts;

    const now = new Date();
    const daysAgo = periodFilter === "7d" ? 7 : 30;
    const cutoffDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

    return posts.filter((post) => {
      const publishedAt = post.publishedAt?.toDate?.() || new Date(0);
      return publishedAt >= cutoffDate;
    });
  }, [posts, periodFilter]);

  /**
   * Internal Posty activity metrics — derived purely from `linkedinPosts`
   * timestamps. No external LinkedIn API, no extension needed. This is the
   * source of truth for the new analytics dashboard.
   */
  const internalMetrics = useMemo(() => {
    // ---- Per-day series for the bar chart (aligned with the period filter) ----
    const now = new Date();
    const daysInPeriod = periodFilter === "7d" ? 7 : periodFilter === "30d" ? 30 : 90;

    // Build a dense array so empty days show as 0-height bars, not gaps.
    const perDayCounts: Record<string, number> = {};
    for (let i = daysInPeriod - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString(t.ui.timeLocale, { day: "2-digit", month: "2-digit" });
      perDayCounts[key] = 0;
    }
    filteredPosts.forEach((post) => {
      const date = post.publishedAt?.toDate?.();
      if (!date) return;
      const key = date.toLocaleDateString(t.ui.timeLocale, { day: "2-digit", month: "2-digit" });
      if (key in perDayCounts) perDayCounts[key]++;
    });
    const postsPerDay = Object.entries(perDayCounts).map(([date, count]) => ({ date, count }));

    // ---- Publishing streak: consecutive days with ≥1 publication ----
    // Computed over ALL posts (not just the filtered period) because a streak
    // is inherently a continuous-run property.
    const daysWithPost = new Set<string>();
    posts.forEach((post) => {
      const date = post.publishedAt?.toDate?.();
      if (!date) return;
      daysWithPost.add(date.toISOString().slice(0, 10));
    });
    let streak = 0;
    const cursor = new Date();
    // If no post today, start the streak check from yesterday — publishing
    // daily but not yet today shouldn't zero out the user's streak mid-day.
    const todayKey = cursor.toISOString().slice(0, 10);
    if (!daysWithPost.has(todayKey)) cursor.setDate(cursor.getDate() - 1);
    while (daysWithPost.has(cursor.toISOString().slice(0, 10))) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }

    // ---- Rolling frequency: posts per week over the last 30d ----
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const last30dCount = posts.filter((p) => {
      const d = p.publishedAt?.toDate?.();
      return d && d >= thirtyDaysAgo;
    }).length;
    const avgPostsPerWeek = last30dCount / (30 / 7);

    // ---- Day-of-week and hour-of-day patterns (period-filtered) ----
    const weekdayCounts = [0, 0, 0, 0, 0, 0, 0]; // Sun-Sat
    const hourCounts = new Array<number>(24).fill(0);
    let totalLength = 0;
    filteredPosts.forEach((post) => {
      const date = post.publishedAt?.toDate?.();
      if (!date) return;
      weekdayCounts[date.getDay()]++;
      hourCounts[date.getHours()]++;
      totalLength += (post.content || "").length;
    });
    const bestWeekdayIdx =
      weekdayCounts.reduce((max, v, i, arr) => (v > arr[max] ? i : max), 0);
    const bestHourIdx =
      hourCounts.reduce((max, v, i, arr) => (v > arr[max] ? i : max), 0);
    const bestWeekdayHasData = weekdayCounts[bestWeekdayIdx] > 0;
    const bestHourHasData = hourCounts[bestHourIdx] > 0;
    const avgLength =
      filteredPosts.length > 0 ? Math.round(totalLength / filteredPosts.length) : 0;

    return {
      postsPerDay,
      streak,
      avgPostsPerWeek,
      bestWeekdayIdx,
      bestHourIdx,
      bestWeekdayHasData,
      bestHourHasData,
      avgLength,
      totalPublished: filteredPosts.length,
    };
  }, [posts, filteredPosts, periodFilter, t]);

  // Localized day-of-week label for the "Best day" patterns card.
  const weekdayLabel = useMemo(() => {
    if (!internalMetrics.bestWeekdayHasData) return "—";
    const reference = new Date(2024, 0, 7); // Sun=0 so Jan 7 2024 is a Sunday
    reference.setDate(reference.getDate() + internalMetrics.bestWeekdayIdx);
    return reference.toLocaleDateString(t.ui.timeLocale, { weekday: "long" });
  }, [internalMetrics.bestWeekdayIdx, internalMetrics.bestWeekdayHasData, t.ui.timeLocale]);

  return (
    <MainLayout
      posts={[]}
      showMobileHeader={true}
      headerTitle="Analytics"
    >
      <div className="min-h-full scroll-smooth lg:overflow-y-auto">
        <div className="w-full mx-auto px-4 py-6 md:px-6 md:py-8 lg:px-8 lg:py-10 lg:max-w-4xl xl:max-w-5xl 2xl:max-w-6xl overflow-x-hidden">
          {loading ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-16 md:py-20 lg:py-24"
            >
              <div className="relative">
                <div className="w-12 h-12 md:w-14 md:h-14 border-3 border-primary/20 rounded-full" />
                <div className="absolute inset-0 w-12 h-12 md:w-14 md:h-14 border-3 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
              <p className="mt-4 text-sm text-gray-500 dark:text-text-muted">{t.common.loading}</p>
            </motion.div>
          ) : posts.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              {/* Period Filter & Overview header */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4"
              >
                <div>
                  <h1 className="text-xl font-bold text-silver-shimmer dark:text-white md:text-2xl lg:text-3xl">
                    Analytics
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-text-muted md:text-base mt-1.5">
                    {filteredPosts.length} {t.analytics.publicationsOnPeriod}
                  </p>
                </div>
                <PeriodFilterComponent selected={periodFilter} onChange={setPeriodFilter} />
              </motion.div>

              {/* Internal Posty KPIs — 4 cards.
                  Everything here is computed from timestamps on `linkedinPosts`
                  + count of pending `scheduledPosts`. No LinkedIn API needed. */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatsCard
                  title={t.analytics.publications}
                  value={internalMetrics.totalPublished}
                  icon={
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  }
                  color="#F8935D"
                  delay={0}
                />
                <StatsCard
                  title={t.analytics.scheduledUpcoming}
                  value={upcomingScheduledCount}
                  icon={
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  }
                  color="#3B82F6"
                  delay={0.1}
                />
                <StatsCard
                  title={t.analytics.streakLabel}
                  value={
                    internalMetrics.streak > 0
                      ? `${internalMetrics.streak} ${
                          internalMetrics.streak > 1 ? t.analytics.daysPlural : t.analytics.daySingular
                        }`
                      : "—"
                  }
                  icon={
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A3 3 0 0112.12 15.12z" />
                    </svg>
                  }
                  color="#EF4444"
                  delay={0.2}
                />
                <StatsCard
                  title={t.analytics.weeklyFrequency}
                  value={internalMetrics.avgPostsPerWeek.toFixed(1)}
                  icon={
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  }
                  color="#10B981"
                  delay={0.3}
                />
              </div>

              {/* Posts per day — activity bar chart. Replaces the old line
                  chart that used to plot likes/comments/shares (empty without
                  LinkedIn API). */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.15, ease: premiumEase }}
                className="bg-white/80 dark:bg-dark-card rounded-2xl border border-[#F8935D]/10 dark:border-dark-border p-4 sm:p-6 mb-8"
              >
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4 sm:mb-6">
                  {t.analytics.postsPerDayTitle}
                </h3>
                <PostsPerDayChart data={internalMetrics.postsPerDay} />
              </motion.div>

              {/* Publishing patterns — best day, best hour, avg length. */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-8">
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{
                    y: -4,
                    boxShadow: "0 8px 25px -5px rgba(0, 0, 0, 0.08), 0 4px 10px -6px rgba(0, 0, 0, 0.04)",
                    transition: { duration: 0.25, ease: [0.25, 0.1, 0.25, 1] },
                  }}
                  transition={{ duration: 0.35, delay: 0.2, ease: premiumEase }}
                  className="bg-white/80 dark:bg-dark-card rounded-2xl border border-[#F8935D]/10 dark:border-dark-border p-4 sm:p-6"
                >
                  <h3 className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 sm:mb-4">{t.analytics.bestDayOfWeek}</h3>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white capitalize">{weekdayLabel}</p>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1">{t.analytics.bestDayCaption}</p>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{
                    y: -4,
                    boxShadow: "0 8px 25px -5px rgba(0, 0, 0, 0.08), 0 4px 10px -6px rgba(0, 0, 0, 0.04)",
                    transition: { duration: 0.25, ease: [0.25, 0.1, 0.25, 1] },
                  }}
                  transition={{ duration: 0.35, delay: 0.25, ease: premiumEase }}
                  className="bg-white/80 dark:bg-dark-card rounded-2xl border border-[#F8935D]/10 dark:border-dark-border p-4 sm:p-6"
                >
                  <h3 className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 sm:mb-4">{t.analytics.bestHourOfDay}</h3>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                    {internalMetrics.bestHourHasData ? `${String(internalMetrics.bestHourIdx).padStart(2, "0")}:00` : "—"}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1">{t.analytics.bestHourCaption}</p>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{
                    y: -4,
                    boxShadow: "0 8px 25px -5px rgba(0, 0, 0, 0.08), 0 4px 10px -6px rgba(0, 0, 0, 0.04)",
                    transition: { duration: 0.25, ease: [0.25, 0.1, 0.25, 1] },
                  }}
                  transition={{ duration: 0.35, delay: 0.3, ease: premiumEase }}
                  className="bg-white/80 dark:bg-dark-card rounded-2xl border border-[#F8935D]/10 dark:border-dark-border p-4 sm:p-6"
                >
                  <h3 className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 sm:mb-4">{t.analytics.avgPostLength}</h3>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                    {internalMetrics.avgLength > 0 ? internalMetrics.avgLength : "\u2014"}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1">{t.analytics.avgPostLengthCaption}</p>
                </motion.div>
              </div>

              {/* AI Coach Insights */}
              <AIInsightsPanel posts={filteredPosts} />

              {/* Posts List */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-silver-solid dark:text-white">
                    {t.analytics.yourPublications} ({filteredPosts.length})
                  </h2>
                  {filteredPosts.length > 0 && (
                    <button
                      onClick={handleVerifyPosts}
                      disabled={isVerifying}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-dark-elevated rounded-lg hover:bg-gray-200 dark:hover:bg-dark-hover transition-colors disabled:opacity-50"
                    >
                      {isVerifying ? (
                        <div className="w-3.5 h-3.5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                      {isVerifying ? t.analytics.verifying : t.analytics.verifyPosts}
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredPosts.map((post, index) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      onRemove={handleRemovePost}
                      delay={0.1 * Math.min(index, 5)}
                    />
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Bottom spacing for mobile navigation */}
          <div className="h-20 md:h-8" />
        </div>
      </div>

    </MainLayout>
  );
}

export default function AnalyticsPage() {
  return (
    <ProtectedRoute requireOnboarding requireSubscription>
      <AnalyticsContent />
    </ProtectedRoute>
  );
}
