"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ScheduledPost, ScheduleStatus } from "@/types";
import Button from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/Modal";
import { triggerHaptic } from "@/hooks/useHapticFeedback";

interface ScheduledPostCardProps {
  post: ScheduledPost;
  onCancel: (postId: string) => Promise<void>;
  onReschedule: (post: ScheduledPost) => void;
  onEdit: (post: ScheduledPost) => void;
}

// Days and months in French
const DAYS_FR = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const MONTHS_FR_SHORT = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sept", "Oct", "Nov", "Déc"];

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
    bgColor: "bg-gray-100 dark:bg-dark-elevated",
    borderColor: "border-gray-200 dark:border-dark-border",
  },
};

export default function ScheduledPostCard({
  post,
  onCancel,
  onReschedule,
  onEdit,
}: ScheduledPostCardProps) {
  const [isCancelling, setIsCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // Parse scheduled date
  const scheduledDate =
    post.scheduledAt &&
    typeof (post.scheduledAt as { toDate?: () => Date }).toDate === "function"
      ? (post.scheduledAt as { toDate: () => Date }).toDate()
      : new Date(post.scheduledAt as unknown as string);

  const dayName = DAYS_FR[scheduledDate.getDay()];
  const day = scheduledDate.getDate();
  const month = MONTHS_FR_SHORT[scheduledDate.getMonth()];
  const time = `${scheduledDate.getHours().toString().padStart(2, "0")}:${scheduledDate.getMinutes().toString().padStart(2, "0")}`;

  const statusConfig = STATUS_CONFIG[post.status];

  // Check if the post is in the past and still pending (should have been published)
  const isPastDue = post.status === "pending" && scheduledDate < new Date();

  // Handle cancel
  const handleCancel = async () => {
    // Haptic feedback for destructive action confirmation
    triggerHaptic("error");
    setIsCancelling(true);
    try {
      await onCancel(post.id);
    } finally {
      setIsCancelling(false);
      setShowCancelConfirm(false);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
        className={`
          group relative
          bg-white dark:bg-dark-card
          border rounded-2xl p-4
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
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

        {/* Header: Date & Status */}
        <div className="relative flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {/* Date badge - Clean design */}
            <div className="relative">
              <div className={`
                ${scheduledDate.toDateString() === new Date().toDateString()
                  ? "bg-primary/10 border-primary/20"
                  : "bg-gray-100 dark:bg-dark-elevated border-gray-200 dark:border-dark-border"
                }
                rounded-xl p-2.5 text-center min-w-[64px] border
              `}>
                <span className={`block text-[10px] font-semibold uppercase tracking-wider ${
                  scheduledDate.toDateString() === new Date().toDateString()
                    ? "text-primary"
                    : "text-gray-500 dark:text-text-muted"
                }`}>{month}</span>
                <span className={`block text-2xl font-bold leading-tight ${
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
            <div>
              <div className="flex items-center gap-2">
                <span className="text-gray-900 dark:text-white font-semibold text-lg">{time}</span>
                {isPastDue && (
                  <motion.span
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 rounded-full font-medium"
                  >
                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                    En retard
                  </motion.span>
                )}
              </div>
              <span className="text-sm text-gray-500 dark:text-text-muted">{dayName}</span>
            </div>
          </div>

          {/* Status badge */}
          <span
            className={`
              inline-flex items-center
              text-xs px-3 py-1.5 rounded-full font-medium
              border ${statusConfig.borderColor}
              ${statusConfig.bgColor} ${statusConfig.color}
            `}
          >
            {statusConfig.label}
          </span>
        </div>

        {/* Platform indicator */}
        <div className="relative flex items-center gap-2 mb-4">
          {post.platform === "linkedin" && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#0A66C2]/10 dark:bg-[#0A66C2]/15 rounded-lg text-[#0A66C2] border border-[#0A66C2]/10">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
              <span className="text-xs font-medium">LinkedIn</span>
            </div>
          )}
          {post.postType && (
            <span className="text-xs text-gray-500 dark:text-text-muted px-2 py-1 bg-gray-100 dark:bg-dark-elevated rounded-md">
              {post.postType === "feed" ? "Post" : "Article"}
            </span>
          )}
        </div>

        {/* Content preview with premium styling */}
        <div className="relative mb-4">
          <p className="text-sm text-gray-700 dark:text-text-secondary line-clamp-2 leading-relaxed">
            {post.content}
          </p>
          {/* Fade out effect for long content */}
          <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-white dark:from-dark-card to-transparent pointer-events-none" />
        </div>

        {/* Error message if failed - Premium alert style */}
        {post.status === "failed" && post.failureReason && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl"
          >
            <div className="flex items-start gap-2">
              <svg className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs text-red-700 dark:text-red-400">{post.failureReason}</p>
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
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Voir le post
            <svg className="w-3.5 h-3.5 transition-transform group-hover/link:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </motion.a>
        )}

        {/* Actions - Clean design */}
        {post.status === "pending" && (
          <div className="relative flex gap-2 pt-4 mt-1 border-t border-gray-200 dark:border-dark-border">
            <button
              onClick={() => {
                triggerHaptic("light");
                onEdit(post);
              }}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium
                text-gray-700 dark:text-text-secondary
                bg-gray-100 dark:bg-dark-elevated
                hover:bg-gray-200 dark:hover:bg-dark-hover
                border border-gray-200 dark:border-dark-border
                rounded-xl transition-colors duration-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Modifier
            </button>
            <button
              onClick={() => {
                triggerHaptic("medium");
                onReschedule(post);
              }}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium
                text-primary
                bg-primary/10
                hover:bg-primary/15
                border border-primary/20
                rounded-xl transition-colors duration-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Reprogrammer
            </button>
            <button
              onClick={() => {
                triggerHaptic("warning");
                setShowCancelConfirm(true);
              }}
              className="p-2 text-gray-400 dark:text-text-muted
                hover:text-red-500 dark:hover:text-red-400
                hover:bg-red-50 dark:hover:bg-red-500/10
                border border-gray-200 dark:border-dark-border
                hover:border-red-200 dark:hover:border-red-500/20
                rounded-xl transition-colors duration-200"
              title="Annuler la programmation"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 6L18 18M6 18L18 6" />
              </svg>
            </button>
          </div>
        )}

        {/* Retry button for failed posts */}
        {post.status === "failed" && (
          <div className="relative flex gap-2 pt-4 mt-1 border-t border-gray-200 dark:border-dark-border">
            <button
              onClick={() => {
                triggerHaptic("medium");
                onReschedule(post);
              }}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium
                text-white bg-primary hover:bg-primary-hover
                rounded-xl transition-colors duration-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Reprogrammer
            </button>
          </div>
        )}
      </motion.div>

      {/* Cancel confirmation modal */}
      <ConfirmModal
        isOpen={showCancelConfirm}
        onClose={() => setShowCancelConfirm(false)}
        onConfirm={handleCancel}
        title="Annuler la programmation"
        message="Etes-vous sur de vouloir annuler ce post programme ? Cette action est irreversible."
        confirmText="Annuler le post"
        cancelText="Retour"
        variant="danger"
      />
    </>
  );
}
