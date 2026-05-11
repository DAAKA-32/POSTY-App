"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ScheduledPost, ScheduleStatus } from "@/types";
import { toDate } from "@/lib/utils/timestamp";
import Button from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/Modal";
import { triggerHaptic } from "@/hooks/ui/useHapticFeedback";
import { LinkedInIcon } from "@/components/linkedin/LinkedInConnectButton";
import { ThreadsIcon, FacebookIcon, BlueskyIcon, MastodonIcon, DiscordIcon } from "@/components/publish/platform-icons";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatTimeLocale } from "@/components/ui/IOSTimePicker";

interface ScheduledPostCardProps {
  post: ScheduledPost;
  onCancel: (postId: string) => Promise<void>;
  onDelete: (postId: string) => Promise<void>;
  onReschedule: (post: ScheduledPost) => void;
  onEdit: (post: ScheduledPost) => void;
}

// Platform display labels
const PLATFORM_LABELS: Record<string, string> = {
  linkedin: "LinkedIn",
  facebook: "Facebook",
  threads: "Threads",
  bluesky: "Bluesky",
  mastodon: "Mastodon",
  discord: "Discord",
};

// i18n day/month helpers — built from translation keys at render time
const getDaysFull = (t: any) => [t.scheduler.daysSundayFull, t.scheduler.daysMondayFull, t.scheduler.daysTuesdayFull, t.scheduler.daysWednesdayFull, t.scheduler.daysThursdayFull, t.scheduler.daysFridayFull, t.scheduler.daysSaturdayFull];
const getMonthsShort = (t: any) => {
  // Use Intl for short month names based on locale
  const locale = t.ui.timeLocale;
  return Array.from({ length: 12 }, (_, i) => {
    const date = new Date(2024, i, 1);
    return new Intl.DateTimeFormat(locale, { month: "short" }).format(date);
  });
};

// Map raw failureReason to a user-friendly message (safety net for legacy data in Firestore)
const DEFAULT_FAILURE_MSG = "Une erreur est survenue lors de la publication. Vous pouvez reprogrammer ce post.";
function getUserFriendlyError(reason: string): string {
  // Catch raw API error patterns (e.g. "LinkedIn API error: 422", "Erreur Facebook: 400")
  if (/api\s*error|status\s*\d{3}|\d{3}\s*error/i.test(reason)) return DEFAULT_FAILURE_MSG;
  if (/^erreur (facebook|threads)\s*(\(|:)/i.test(reason)) return DEFAULT_FAILURE_MSG;
  if (/plateforme non support/i.test(reason)) return "Cette plateforme n'est pas encore disponible.";
  // Already user-friendly — pass through
  return reason;
}

// Status config - Clean professional styling
const STATUS_CONFIG: Record<ScheduleStatus, {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
}> = {
  pending: {
    label: "Programmé",
    color: "text-primary",
    bgColor: "bg-primary/10",
    borderColor: "border-primary/20",
  },
  published: {
    label: "Publié",
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/20",
  },
  failed: {
    label: "Échec",
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/20",
  },
  cancelled: {
    label: "Annulé",
    color: "text-gray-500 dark:text-text-muted",
    bgColor: "bg-gray-100 dark:bg-dark-hover",
    borderColor: "border-gray-200 dark:border-dark-border",
  },
};

// Platform badge config for all supported platforms
const PLATFORM_BADGE_CONFIG: Record<string, {
  icon: React.ReactNode;
  name: string;
  textColor: string;
  bgColor: string;
  borderColor: string;
}> = {
  linkedin: {
    icon: <LinkedInIcon className="w-3.5 h-3.5" />,
    name: "LinkedIn",
    textColor: "text-[#0A66C2] dark:text-[#4B9FE1]",
    bgColor: "bg-[#0A66C2]/10 dark:bg-[#0A66C2]/20",
    borderColor: "border-[#0A66C2]/10 dark:border-[#0A66C2]/25",
  },
  facebook: {
    icon: <FacebookIcon className="w-3.5 h-3.5" />,
    name: "Facebook",
    textColor: "text-[#1877F2] dark:text-[#5B9BF2]",
    bgColor: "bg-[#1877F2]/10 dark:bg-[#1877F2]/20",
    borderColor: "border-[#1877F2]/10 dark:border-[#1877F2]/25",
  },
  threads: {
    icon: <ThreadsIcon className="w-3.5 h-3.5" />,
    name: "Threads",
    textColor: "text-black dark:text-white",
    bgColor: "bg-black/10 dark:bg-white/15",
    borderColor: "border-black/10 dark:border-white/20",
  },
  bluesky: {
    icon: <BlueskyIcon className="w-3.5 h-3.5" />,
    name: "Bluesky",
    textColor: "text-[#0085FF] dark:text-[#33A0FF]",
    bgColor: "bg-[#0085FF]/10 dark:bg-[#0085FF]/20",
    borderColor: "border-[#0085FF]/10 dark:border-[#0085FF]/25",
  },
  mastodon: {
    icon: <MastodonIcon className="w-3.5 h-3.5" />,
    name: "Mastodon",
    textColor: "text-[#6364FF] dark:text-[#8485FF]",
    bgColor: "bg-[#6364FF]/10 dark:bg-[#6364FF]/20",
    borderColor: "border-[#6364FF]/10 dark:border-[#6364FF]/25",
  },
  discord: {
    icon: <DiscordIcon className="w-3.5 h-3.5" />,
    name: "Discord",
    textColor: "text-[#5865F2] dark:text-[#7984FF]",
    bgColor: "bg-[#5865F2]/10 dark:bg-[#5865F2]/20",
    borderColor: "border-[#5865F2]/10 dark:border-[#5865F2]/25",
  },
};

export default function ScheduledPostCard({
  post,
  onCancel,
  onDelete,
  onReschedule,
  onEdit,
}: ScheduledPostCardProps) {
  const { t } = useLanguage();
  const [isCancelling, setIsCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Parse scheduled date
  const scheduledDate = toDate(post.scheduledAt);

  const dayName = getDaysFull(t)[scheduledDate.getDay()];
  const day = scheduledDate.getDate();
  const month = getMonthsShort(t)[scheduledDate.getMonth()];
  const time = formatTimeLocale(scheduledDate.getHours(), scheduledDate.getMinutes(), t.ui.timeLocale);

  const statusConfig = STATUS_CONFIG[post.status];

  // Check if the post is in the past and still pending (should have been published)
  const isPastDue = post.status === "pending" && scheduledDate < new Date();

  // Handle cancel (pending → cancelled)
  const handleCancel = async () => {
    triggerHaptic("error");
    setIsCancelling(true);
    try {
      await onCancel(post.id);
    } finally {
      setIsCancelling(false);
      setShowCancelConfirm(false);
    }
  };

  // Handle delete (permanent removal)
  const handleDelete = async () => {
    triggerHaptic("error");
    setIsDeleting(true);
    try {
      await onDelete(post.id);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <>
      <div
        className={`
          group relative
          bg-white dark:bg-dark-card min-w-0
          border rounded-xl sm:rounded-2xl p-3 sm:p-4
          transition-all duration-300 ease-out
          ${post.status === "cancelled"
            ? "opacity-60 border-gray-200 dark:border-dark-border"
            : `border-gray-200/80 dark:border-dark-border/80
               hover:border-primary/30 dark:hover:border-primary/40
               hover:shadow-lg hover:shadow-primary/5 dark:hover:shadow-primary/10`
          }
        `}
      >
        {/* Subtle gradient overlay on hover */}
        <div className="absolute inset-0 rounded-xl sm:rounded-2xl bg-gradient-to-br from-primary/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

        {/* Header: Date & Status */}
        <div className="relative flex items-start justify-between gap-1.5 sm:gap-2 mb-3 sm:mb-4 min-w-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Date badge - Clean design */}
            <div className="relative shrink-0">
              <div className={`
                ${scheduledDate.toDateString() === new Date().toDateString()
                  ? "bg-primary/10 border-primary/20"
                  : "bg-gray-100 dark:bg-primary/10 border-gray-200 dark:border-primary/15"
                }
                rounded-lg sm:rounded-xl p-1.5 sm:p-2.5 text-center min-w-[44px] sm:min-w-[64px] border
              `}>
                <span className={`block text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider ${
                  scheduledDate.toDateString() === new Date().toDateString()
                    ? "text-primary"
                    : "text-gray-500 dark:text-text-muted"
                }`}>{month}</span>
                <span className={`block text-lg sm:text-2xl font-bold leading-tight ${
                  scheduledDate.toDateString() === new Date().toDateString()
                    ? "text-primary"
                    : "text-gray-900 dark:text-white"
                }`}>{day}</span>
              </div>
              {/* Today indicator dot */}
              {scheduledDate.toDateString() === new Date().toDateString() && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full border-2 border-white dark:border-dark-card" />
              )}
            </div>

            {/* Time and day */}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span className="text-gray-900 dark:text-white font-semibold text-base sm:text-lg">{time}</span>
                {isPastDue && (
                  <motion.span
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    className="inline-flex items-center gap-1 text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 rounded-full font-medium"
                  >
                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                    En retard
                  </motion.span>
                )}
              </div>
              <span className="text-xs sm:text-sm text-gray-500 dark:text-text-muted">{dayName}</span>
            </div>
          </div>

          {/* Status badge */}
          <span
            className={`
              inline-flex items-center shrink-0
              text-[10px] sm:text-xs px-2 sm:px-3 py-1 sm:py-1.5 rounded-full font-medium
              border ${statusConfig.borderColor}
              ${statusConfig.bgColor} ${statusConfig.color}
            `}
          >
            {statusConfig.label}
          </span>
        </div>

        {/* Platform indicator */}
        <div className="relative flex flex-wrap items-center gap-2 mb-3 sm:mb-4">
          {(() => {
            const config = PLATFORM_BADGE_CONFIG[post.platform];
            if (!config) return null;
            return (
              <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg ${config.textColor} ${config.bgColor} border ${config.borderColor}`}>
                {config.icon}
                <span className="text-xs font-medium">{config.name}</span>
              </div>
            );
          })()}
          {post.platform === "linkedin" && post.postType && (
            <span className="text-xs text-gray-500 dark:text-text-muted px-2 py-1 bg-gray-100 dark:bg-primary/10 rounded-md">
              {post.postType === "feed" ? "Post" : "Article"}
            </span>
          )}
        </div>

        {/* Content preview with premium styling */}
        <div className="relative mb-3 sm:mb-4">
          <p className="text-xs sm:text-sm text-gray-700 dark:text-text-secondary line-clamp-2 leading-relaxed break-words">
            {post.content}
          </p>
          {/* Fade out effect for long content */}
          <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-white dark:from-dark-card to-transparent pointer-events-none" />
        </div>

        {/* Image thumbnails */}
        {post.images && post.images.length > 0 && (
          <div className="relative flex gap-1 sm:gap-1.5 mb-3 sm:mb-4 overflow-x-auto scroll-disabled">
            {post.images.slice(0, 4).map((img, idx) => (
              <div
                key={idx}
                className="relative w-12 h-12 sm:w-16 sm:h-16 rounded-lg overflow-hidden border border-gray-200 dark:border-dark-border shrink-0"
              >
                <img
                  src={img.downloadURL}
                  alt={img.fileName || `Image ${idx + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                {/* Show +N overlay on the 4th image if there are more */}
                {idx === 3 && post.images!.length > 4 && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="text-white text-xs font-bold">+{post.images!.length - 4}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Error message if failed - Premium alert style */}
        {post.status === "failed" && post.failureReason && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.15 }}
            className="mb-4 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl"
          >
            <div className="flex items-start gap-2">
              <svg className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs text-red-700 dark:text-red-400">{getUserFriendlyError(post.failureReason)}</p>
            </div>
          </motion.div>
        )}

        {/* Published URL if available - Premium link style */}
        {post.status === "published" && post.publishedUrl && (
          <motion.a
            href={post.publishedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 font-medium mb-4 group/link"
            whileHover={{ x: 2 }}
            aria-label={`${t.ui.viewPostOn} ${PLATFORM_LABELS[post.platform] || post.platform}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            {t.ui.viewPostOn} {PLATFORM_LABELS[post.platform] || post.platform}
            <svg className="w-3.5 h-3.5 transition-transform group-hover/link:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </motion.a>
        )}

        {/* Actions - Clean design, responsive for mobile */}
        {post.status === "pending" && (
          <div className="relative flex gap-1 sm:gap-2 pt-3 sm:pt-4 mt-1 border-t border-gray-200 dark:border-dark-border">
            <button
              onClick={() => {
                triggerHaptic("light");
                onEdit(post);
              }}
              className="flex-1 inline-flex items-center justify-center gap-1 sm:gap-1.5 px-1.5 sm:px-3 py-2 text-[11px] sm:text-sm font-medium
                text-gray-700 dark:text-text-secondary
                bg-gray-100 dark:bg-dark-hover
                hover:bg-gray-200 dark:hover:bg-dark-active
                border border-gray-200 dark:border-dark-border
                rounded-lg sm:rounded-xl transition-colors duration-200 min-w-0"
            >
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span className="truncate">Modifier</span>
            </button>
            <button
              onClick={() => {
                triggerHaptic("medium");
                onReschedule(post);
              }}
              className="flex-1 inline-flex items-center justify-center gap-1 sm:gap-1.5 px-1.5 sm:px-3 py-2 text-[11px] sm:text-sm font-medium
                text-primary
                bg-primary/10
                hover:bg-primary/15
                border border-primary/20
                rounded-lg sm:rounded-xl transition-colors duration-200 min-w-0"
            >
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="sm:hidden truncate">Reprog.</span>
              <span className="hidden sm:inline truncate">Reprogrammer</span>
            </button>
            <button
              onClick={() => {
                triggerHaptic("warning");
                setShowCancelConfirm(true);
              }}
              className="p-1.5 sm:p-2 shrink-0 text-gray-400 dark:text-text-muted
                hover:text-red-500 dark:hover:text-red-400
                hover:bg-red-50 dark:hover:bg-red-500/10
                border border-gray-200 dark:border-dark-border
                hover:border-red-200 dark:hover:border-red-500/20
                rounded-lg sm:rounded-xl transition-colors duration-200"
              title={t.ui.unschedule}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 6L18 18M6 18L18 6" />
              </svg>
            </button>
          </div>
        )}

        {/* Actions for failed posts: Edit + Reschedule + Delete */}
        {post.status === "failed" && (
          <div className="relative flex gap-1 sm:gap-2 pt-3 sm:pt-4 mt-1 border-t border-gray-200 dark:border-dark-border">
            <button
              onClick={() => {
                triggerHaptic("light");
                onEdit(post);
              }}
              className="flex-1 inline-flex items-center justify-center gap-1 sm:gap-1.5 px-1.5 sm:px-3 py-2 text-[11px] sm:text-sm font-medium
                text-gray-700 dark:text-text-secondary
                bg-gray-100 dark:bg-dark-hover
                hover:bg-gray-200 dark:hover:bg-dark-active
                border border-gray-200 dark:border-dark-border
                rounded-lg sm:rounded-xl transition-colors duration-200 min-w-0"
            >
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span className="truncate">Modifier</span>
            </button>
            <button
              onClick={() => {
                triggerHaptic("medium");
                onReschedule(post);
              }}
              className="flex-1 inline-flex items-center justify-center gap-1 sm:gap-1.5 px-1.5 sm:px-3 py-2 text-[11px] sm:text-sm font-medium
                text-white bg-primary hover:bg-primary-hover
                rounded-lg sm:rounded-xl transition-colors duration-200 min-w-0"
            >
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="sm:hidden truncate">Reprog.</span>
              <span className="hidden sm:inline truncate">Reprogrammer</span>
            </button>
            <button
              onClick={() => {
                triggerHaptic("warning");
                setShowDeleteConfirm(true);
              }}
              className="p-1.5 sm:p-2 shrink-0 text-gray-400 dark:text-text-muted
                hover:text-red-500 dark:hover:text-red-400
                hover:bg-red-50 dark:hover:bg-red-500/10
                border border-gray-200 dark:border-dark-border
                hover:border-red-200 dark:hover:border-red-500/20
                rounded-lg sm:rounded-xl transition-colors duration-200"
              title={t.ui.deletePost}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Cancel confirmation modal */}
      <ConfirmModal
        isOpen={showCancelConfirm}
        onClose={() => setShowCancelConfirm(false)}
        onConfirm={handleCancel}
        title={t.ui.unschedule}
        message={t.ui.unscheduleWarning}
        confirmText={t.ui.unschedule}
        cancelText={t.templates.cancel}
        variant="danger"
      />

      {/* Delete confirmation modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title={t.ui.deletePost}
        message={t.ui.deletePostWarning}
        confirmText={t.ui.confirmDeletion}
        cancelText={t.templates.cancel}
        variant="danger"
      />
    </>
  );
}
