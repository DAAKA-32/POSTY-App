"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import MainLayout from "@/components/layout/MainLayout";
import {
  getLinkedInPosts,
  getLinkedInAnalytics,
  updateLinkedInPostMetrics,
  LinkedInPostData,
  LinkedInAnalyticsSummary,
} from "@/lib/firestore";

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
  const options: { value: PeriodFilter; label: string }[] = [
    { value: "7d", label: "7 jours" },
    { value: "30d", label: "30 jours" },
    { value: "all", label: "Tout" },
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

// Line Chart Component (Pure SVG + Framer Motion)
function EngagementChart({
  data,
  period,
}: {
  data: { date: string; likes: number; comments: number; shares: number }[];
  period: PeriodFilter;
}) {
  const chartHeight = 200;
  const chartWidth = 600;
  const padding = { top: 20, right: 20, bottom: 40, left: 50 };

  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  // Calculate max value for scaling
  const maxValue = useMemo(() => {
    const allValues = data.flatMap((d) => [d.likes, d.comments, d.shares]);
    return Math.max(...allValues, 10);
  }, [data]);

  // Generate path for a line
  const generatePath = (values: number[]) => {
    if (values.length === 0) return "";

    const points = values.map((value, index) => {
      const x = padding.left + (index / Math.max(values.length - 1, 1)) * innerWidth;
      const y = padding.top + innerHeight - (value / maxValue) * innerHeight;
      return { x, y };
    });

    return points.reduce((path, point, index) => {
      if (index === 0) return `M ${point.x} ${point.y}`;

      // Smooth curve using quadratic bezier
      const prev = points[index - 1];
      const cpX = (prev.x + point.x) / 2;
      return `${path} Q ${cpX} ${prev.y} ${point.x} ${point.y}`;
    }, "");
  };

  const likesPath = generatePath(data.map((d) => d.likes));
  const commentsPath = generatePath(data.map((d) => d.comments));
  const sharesPath = generatePath(data.map((d) => d.shares));

  // Y-axis labels
  const yAxisLabels = [0, Math.round(maxValue / 2), maxValue];

  // X-axis labels (dates)
  const xAxisLabels = useMemo(() => {
    if (data.length <= 7) return data.map((d) => d.date);
    // Show fewer labels for longer periods
    const step = Math.ceil(data.length / 6);
    return data.filter((_, i) => i % step === 0 || i === data.length - 1).map((d) => d.date);
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-gray-400">
        Aucune donnée pour cette période
      </div>
    );
  }

  return (
    <div className="relative w-full">
      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full" preserveAspectRatio="xMidYMid meet">
        {/* Grid lines */}
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
                x={padding.left - 10}
                y={y + 4}
                textAnchor="end"
                className="fill-gray-400 text-[10px]"
              >
                {value}
              </text>
            </g>
          );
        })}

        {/* X-axis labels */}
        {xAxisLabels.map((label, i) => {
          const dataIndex = data.findIndex((d) => d.date === label);
          const x = padding.left + (dataIndex / Math.max(data.length - 1, 1)) * innerWidth;
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

        {/* Lines with animation */}
        <motion.path
          d={likesPath}
          fill="none"
          stroke="#3B82F6"
          strokeWidth={2.5}
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
        <motion.path
          d={commentsPath}
          fill="none"
          stroke="#10B981"
          strokeWidth={2.5}
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
        />
        <motion.path
          d={sharesPath}
          fill="none"
          stroke="#8B5CF6"
          strokeWidth={2.5}
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
        />

        {/* Data points */}
        {data.map((d, i) => {
          const x = padding.left + (i / Math.max(data.length - 1, 1)) * innerWidth;
          const cappedDelay = Math.min(i * 0.02, 0.3);
          return (
            <g key={i}>
              <motion.circle
                cx={x}
                cy={padding.top + innerHeight - (d.likes / maxValue) * innerHeight}
                r={4}
                fill="#3B82F6"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.4 + cappedDelay }}
              />
              <motion.circle
                cx={x}
                cy={padding.top + innerHeight - (d.comments / maxValue) * innerHeight}
                r={4}
                fill="#10B981"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.45 + cappedDelay }}
              />
              <motion.circle
                cx={x}
                cy={padding.top + innerHeight - (d.shares / maxValue) * innerHeight}
                r={4}
                fill="#8B5CF6"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5 + cappedDelay }}
              />
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 mt-4">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
          <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Likes</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Commentaires</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-violet-500" />
          <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Partages</span>
        </div>
      </div>
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

// Post Card with Metrics
function PostCard({
  post,
  onEditMetrics,
  delay = 0,
}: {
  post: LinkedInPostData;
  onEditMetrics: (post: LinkedInPostData) => void;
  delay?: number;
}) {
  const publishedDate = post.publishedAt?.toDate?.() || new Date();
  const hasMetrics = post.metrics && (post.metrics.likes > 0 || post.metrics.comments > 0 || post.metrics.shares > 0);

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
              {publishedDate.toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
            {post.postUrl && (
              <a
                href={post.postUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[#0077B5] hover:underline"
              >
                Voir sur LinkedIn
              </a>
            )}
          </div>
        </div>
        <button
          onClick={() => onEditMetrics(post)}
          className="px-3 py-1.5 text-xs font-medium text-[#F8935D] bg-[#F8935D]/10 rounded-lg hover:bg-[#F8935D]/20 transition-colors"
        >
          {hasMetrics ? "Modifier" : "Ajouter stats"}
        </button>
      </div>

      {/* Content preview */}
      <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3 mb-4">
        {post.content}
      </p>

      {/* Metrics */}
      {hasMetrics ? (
        <div className="flex items-center gap-4 pt-4 border-t border-gray-100 dark:border-dark-border">
          <div className="flex items-center gap-1.5 text-sm">
            <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
            </svg>
            <span className="font-semibold text-gray-900 dark:text-white">{post.metrics?.likes || 0}</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm">
            <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zM7 8H5v2h2V8zm2 0h2v2H9V8zm6 0h-2v2h2V8z" clipRule="evenodd" />
            </svg>
            <span className="font-semibold text-gray-900 dark:text-white">{post.metrics?.comments || 0}</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm">
            <svg className="w-4 h-4 text-violet-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
            </svg>
            <span className="font-semibold text-gray-900 dark:text-white">{post.metrics?.shares || 0}</span>
          </div>
          {post.metrics?.source && (
            <span className="ml-auto text-xs text-gray-400 px-2 py-0.5 bg-[#F8935D]/10 dark:bg-gray-800 rounded-full">
              {post.metrics.source === 'manual' ? 'Manuel' : post.metrics.source === 'extension' ? 'Extension' : 'API'}
            </span>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-center py-4 border-t border-gray-100 dark:border-dark-border">
          <p className="text-sm text-gray-400">Aucune statistique - Cliquez pour ajouter</p>
        </div>
      )}
    </motion.div>
  );
}

// Metrics Edit Modal
function MetricsModal({
  post,
  isOpen,
  onClose,
  onSave,
}: {
  post: LinkedInPostData | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (postId: string, metrics: { likes: number; comments: number; shares: number; impressions?: number }) => Promise<void>;
}) {
  const [likes, setLikes] = useState(0);
  const [comments, setComments] = useState(0);
  const [shares, setShares] = useState(0);
  const [impressions, setImpressions] = useState<number | "">("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (post?.metrics) {
      setLikes(post.metrics.likes || 0);
      setComments(post.metrics.comments || 0);
      setShares(post.metrics.shares || 0);
      setImpressions(post.metrics.impressions || "");
    } else {
      setLikes(0);
      setComments(0);
      setShares(0);
      setImpressions("");
    }
  }, [post]);

  const handleSave = async () => {
    if (!post) return;
    setSaving(true);
    try {
      await onSave(post.id, {
        likes,
        comments,
        shares,
        impressions: impressions === "" ? undefined : impressions,
      });
      onClose();
    } catch (error) {
      console.error("Error saving metrics:", error);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !post) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.3, ease: premiumEase }}
          className="relative w-full max-w-md bg-background-warm dark:bg-dark-card rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-100 dark:border-dark-border">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Statistiques du post
            </h3>
            <p className="text-sm text-gray-500 mt-1 line-clamp-1">
              {post.content.substring(0, 60)}...
            </p>
          </div>

          {/* Content */}
          <div className="p-6 space-y-5">
            {/* Likes */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                </svg>
                Likes
              </label>
              <input
                type="number"
                min="0"
                value={likes}
                onChange={(e) => setLikes(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-4 py-3 rounded-xl border border-[#F8935D]/15 dark:border-dark-border bg-white/70 dark:bg-dark-bg text-gray-900 dark:text-white focus:ring-2 focus:ring-[#F8935D]/30 focus:border-[#F8935D] transition-all"
              />
            </div>

            {/* Comments */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zM7 8H5v2h2V8zm2 0h2v2H9V8zm6 0h-2v2h2V8z" clipRule="evenodd" />
                </svg>
                Commentaires
              </label>
              <input
                type="number"
                min="0"
                value={comments}
                onChange={(e) => setComments(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-4 py-3 rounded-xl border border-[#F8935D]/15 dark:border-dark-border bg-white/70 dark:bg-dark-bg text-gray-900 dark:text-white focus:ring-2 focus:ring-[#F8935D]/30 focus:border-[#F8935D] transition-all"
              />
            </div>

            {/* Shares */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <svg className="w-4 h-4 text-violet-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
                </svg>
                Partages
              </label>
              <input
                type="number"
                min="0"
                value={shares}
                onChange={(e) => setShares(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-4 py-3 rounded-xl border border-[#F8935D]/15 dark:border-dark-border bg-white/70 dark:bg-dark-bg text-gray-900 dark:text-white focus:ring-2 focus:ring-[#F8935D]/30 focus:border-[#F8935D] transition-all"
              />
            </div>

            {/* Impressions (optional) */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                  <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                </svg>
                Impressions <span className="text-gray-400">(optionnel)</span>
              </label>
              <input
                type="number"
                min="0"
                value={impressions}
                onChange={(e) => setImpressions(e.target.value === "" ? "" : Math.max(0, parseInt(e.target.value) || 0))}
                placeholder="Nombre de vues"
                className="w-full px-4 py-3 rounded-xl border border-[#F8935D]/15 dark:border-dark-border bg-white/70 dark:bg-dark-bg text-gray-900 dark:text-white focus:ring-2 focus:ring-[#F8935D]/30 focus:border-[#F8935D] transition-all placeholder:text-gray-400"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-100 dark:border-dark-border flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-dark-elevated rounded-xl hover:bg-gray-200 dark:hover:bg-dark-hover transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 px-4 py-3 text-sm font-medium text-white bg-primary hover:bg-primary-hover rounded-xl transition-colors disabled:opacity-50"
            >
              {saving ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Empty State Component
function EmptyState() {
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
        Aucune publication
      </h3>
      <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto mb-6">
        Publiez votre premier post LinkedIn via Posty pour commencer à suivre vos performances.
      </p>
      <Link
        href="/app"
        className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary-hover text-white font-medium rounded-xl transition-colors duration-200"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Créer un post
      </Link>
    </motion.div>
  );
}

// Main Analytics Content
function AnalyticsContent() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<LinkedInPostData[]>([]);
  const [analytics, setAnalytics] = useState<LinkedInAnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<LinkedInPostData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("30d");

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
      const [postsData, analyticsData] = await Promise.all([
        getLinkedInPosts(user.uid, 100),
        getLinkedInAnalytics(user.uid),
      ]);
      setPosts(postsData);
      setAnalytics(analyticsData);
    } catch (error) {
      console.error("Error loading analytics:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter posts by period
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

  // Calculate filtered analytics
  const filteredAnalytics = useMemo(() => {
    const totalLikes = filteredPosts.reduce((sum, p) => sum + (p.metrics?.likes || 0), 0);
    const totalComments = filteredPosts.reduce((sum, p) => sum + (p.metrics?.comments || 0), 0);
    const totalShares = filteredPosts.reduce((sum, p) => sum + (p.metrics?.shares || 0), 0);

    const postsWithEngagement = filteredPosts.filter(p => p.metrics?.engagementRate);
    const avgEngagementRate = postsWithEngagement.length > 0
      ? postsWithEngagement.reduce((sum, p) => sum + (p.metrics?.engagementRate || 0), 0) / postsWithEngagement.length
      : 0;

    return {
      totalPosts: filteredPosts.length,
      totalLikes,
      totalComments,
      totalShares,
      avgEngagementRate,
    };
  }, [filteredPosts]);

  // Prepare chart data (aggregate by date)
  const chartData = useMemo(() => {
    const dataByDate: Record<string, { likes: number; comments: number; shares: number }> = {};

    filteredPosts.forEach((post) => {
      const date = post.publishedAt?.toDate?.() || new Date();
      const dateKey = date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });

      if (!dataByDate[dateKey]) {
        dataByDate[dateKey] = { likes: 0, comments: 0, shares: 0 };
      }

      dataByDate[dateKey].likes += post.metrics?.likes || 0;
      dataByDate[dateKey].comments += post.metrics?.comments || 0;
      dataByDate[dateKey].shares += post.metrics?.shares || 0;
    });

    // Sort by date and convert to array
    return Object.entries(dataByDate)
      .sort((a, b) => {
        const [dayA, monthA] = a[0].split("/").map(Number);
        const [dayB, monthB] = b[0].split("/").map(Number);
        if (monthA !== monthB) return monthA - monthB;
        return dayA - dayB;
      })
      .map(([date, metrics]) => ({ date, ...metrics }));
  }, [filteredPosts]);

  const handleEditMetrics = (post: LinkedInPostData) => {
    setSelectedPost(post);
    setIsModalOpen(true);
  };

  const handleSaveMetrics = async (
    postId: string,
    metrics: { likes: number; comments: number; shares: number; impressions?: number }
  ) => {
    await updateLinkedInPostMetrics(postId, { ...metrics, source: 'manual' });
    await loadData();
  };

  return (
    <MainLayout
      posts={[]}
      showMobileHeader={true}
      headerTitle="Analytics"
    >
      <div className="min-h-full bg-background-warm dark:bg-dark-bg scroll-smooth lg:overflow-y-auto">
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
              <p className="mt-4 text-sm text-gray-500 dark:text-text-muted">Chargement...</p>
            </motion.div>
          ) : posts.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              {/* Period Filter & Overview header */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8"
              >
                <div>
                  <h1 className="text-xl font-bold text-silver-shimmer dark:text-white md:text-2xl lg:text-3xl">
                    Analytics
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-text-muted md:text-base mt-1.5">
                    {filteredPosts.length} publication{filteredPosts.length > 1 ? 's' : ''} sur cette période
                  </p>
                </div>
                <PeriodFilterComponent selected={periodFilter} onChange={setPeriodFilter} />
              </motion.div>

              {/* Stats Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatsCard
                  title="Publications"
                  value={filteredAnalytics.totalPosts}
                  icon={
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  }
                  color="#F8935D"
                  delay={0}
                />
                <StatsCard
                  title="Total Likes"
                  value={filteredAnalytics.totalLikes}
                  icon={
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                    </svg>
                  }
                  color="#3B82F6"
                  delay={0.1}
                />
                <StatsCard
                  title="Commentaires"
                  value={filteredAnalytics.totalComments}
                  icon={
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zM7 8H5v2h2V8zm2 0h2v2H9V8zm6 0h-2v2h2V8z" clipRule="evenodd" />
                    </svg>
                  }
                  color="#10B981"
                  delay={0.2}
                />
                <StatsCard
                  title="Partages"
                  value={filteredAnalytics.totalShares}
                  icon={
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
                    </svg>
                  }
                  color="#8B5CF6"
                  delay={0.3}
                />
              </div>

              {/* Engagement Chart */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.15, ease: premiumEase }}
                className="bg-white/80 dark:bg-dark-card rounded-2xl border border-[#F8935D]/10 dark:border-dark-border p-4 sm:p-6 mb-8"
              >
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4 sm:mb-6">
                  Evolution de l'engagement
                </h3>
                <EngagementChart data={chartData} period={periodFilter} />
              </motion.div>

              {/* Activity Overview */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-8">
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: 0.2, ease: premiumEase }}
                  className="bg-white/80 dark:bg-dark-card rounded-2xl border border-[#F8935D]/10 dark:border-dark-border p-4 sm:p-6"
                >
                  <h3 className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 sm:mb-4">Cette semaine</h3>
                  <p className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">{analytics?.postsThisWeek || 0}</p>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1">publications</p>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: 0.25, ease: premiumEase }}
                  className="bg-white/80 dark:bg-dark-card rounded-2xl border border-[#F8935D]/10 dark:border-dark-border p-4 sm:p-6"
                >
                  <h3 className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 sm:mb-4">Ce mois</h3>
                  <p className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">{analytics?.postsThisMonth || 0}</p>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1">publications</p>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: 0.3, ease: premiumEase }}
                  className="bg-white/80 dark:bg-dark-card rounded-2xl border border-[#F8935D]/10 dark:border-dark-border p-4 sm:p-6"
                >
                  <h3 className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 sm:mb-4">Taux d'engagement moyen</h3>
                  <p className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
                    {filteredAnalytics.avgEngagementRate ? `${filteredAnalytics.avgEngagementRate.toFixed(1)}%` : "\u2014"}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1">sur les posts avec impressions</p>
                </motion.div>
              </div>

              {/* Posts List */}
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-silver-solid dark:text-white mb-4">
                  Vos publications ({filteredPosts.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredPosts.map((post, index) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      onEditMetrics={handleEditMetrics}
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

      {/* Metrics Modal */}
      <MetricsModal
        post={selectedPost}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedPost(null);
        }}
        onSave={handleSaveMetrics}
      />
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
