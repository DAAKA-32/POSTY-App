"use client";

import Link from "next/link";
import { Post } from "@/types";
import { motion } from "framer-motion";

interface HistoryListItemProps {
  post: Post;
  isSelected?: boolean;
  onDelete?: (postId: string) => void;
  index?: number;
}

export default function HistoryListItem({
  post,
  isSelected = false,
  onDelete,
  index = 0,
}: HistoryListItemProps) {
  const formatTime = (timestamp: { toDate?: () => Date } | Date | null): string => {
    if (!timestamp) return "";
    const date =
      typeof (timestamp as { toDate?: () => Date }).toDate === "function"
        ? (timestamp as { toDate: () => Date }).toDate()
        : new Date(timestamp as Date);

    return new Intl.DateTimeFormat("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  // Determine preferred version badge
  const getVersionBadge = () => {
    if (post.selectedVersion === "A") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-accent/10 text-accent text-xs rounded-md">
          📖 Storytelling
        </span>
      );
    }
    if (post.selectedVersion === "B") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-md">
          💼 Business
        </span>
      );
    }
    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.2 }}
    >
      <Link
        href={`/history?id=${post.id}`}
        className={`
          group relative block p-4 rounded-xl
          transition-all duration-200
          ${
            isSelected
              ? "bg-primary/10 border-2 border-primary"
              : "bg-dark-card border border-dark-border hover:border-primary/30 hover:bg-dark-hover"
          }
        `}
      >
        {/* Content */}
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
            <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </div>

          {/* Text content */}
          <div className="flex-1 min-w-0">
            <p
              className={`
                font-medium line-clamp-2 mb-2 transition-colors
                ${isSelected ? "text-white" : "text-white group-hover:text-primary"}
              `}
            >
              {post.prompt}
            </p>

            {/* Meta info */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-text-muted">{formatTime(post.createdAt)}</span>
              {getVersionBadge()}
            </div>
          </div>

          {/* Arrow icon */}
          <svg
            className={`
              w-5 h-5 shrink-0 transition-all
              ${isSelected ? "text-primary" : "text-text-muted group-hover:text-primary group-hover:translate-x-0.5"}
            `}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>

        {/* Delete button (desktop only) */}
        {onDelete && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDelete(post.id);
            }}
            className="
              absolute top-2 right-2 p-1.5 text-text-muted hover:text-error hover:bg-error/10
              rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200
            "
            title="Supprimer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        )}
      </Link>
    </motion.div>
  );
}
