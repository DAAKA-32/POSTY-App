"use client";

import { Post } from "@/types";
import ResponseCard from "@/components/chat/ResponseCard";
import { motion } from "framer-motion";

interface HistoryDetailPanelProps {
  post: Post | null;
  onCopy: (content: string) => void;
}

export default function HistoryDetailPanel({ post, onCopy }: HistoryDetailPanelProps) {
  const formatDate = (timestamp: { toDate?: () => Date } | Date | null) => {
    if (!timestamp) return "";
    const date =
      typeof (timestamp as { toDate?: () => Date }).toDate === "function"
        ? (timestamp as { toDate: () => Date }).toDate()
        : new Date(timestamp as Date);
    return new Intl.DateTimeFormat("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  if (!post) {
    return (
      <div className="hidden lg:flex flex-col items-center justify-center h-full p-8 bg-dark-bg/30 rounded-2xl border border-dark-border/50">
        <div className="w-20 h-20 bg-dark-card rounded-full flex items-center justify-center mb-6">
          <svg className="w-10 h-10 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">Sélectionnez un post</h3>
        <p className="text-text-muted text-center max-w-sm">
          Choisissez un post dans la liste pour voir ses détails et versions générées
        </p>
      </div>
    );
  }

  return (
    <motion.div
      key={post.id}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="hidden lg:block h-full overflow-y-auto"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-text-muted mb-1">Créé le</p>
            <p className="text-white font-medium">{formatDate(post.createdAt)}</p>
          </div>
        </div>

        {/* Prompt */}
        <div className="p-6 bg-dark-card border border-dark-border rounded-xl">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
              />
            </svg>
            <p className="text-sm font-medium text-text-muted uppercase tracking-wider">Prompt initial</p>
          </div>
          <p className="text-white leading-relaxed">{post.prompt}</p>
        </div>

        {/* Responses */}
        <div>
          <h3 className="text-sm font-medium text-text-muted uppercase tracking-wider mb-4">
            Versions générées
          </h3>
          <div className="space-y-4">
            <ResponseCard
              title="Version Storytelling"
              content={post.responseA}
              type="storytelling"
              isSelected={post.selectedVersion === "A"}
              onCopy={() => onCopy(post.responseA)}
            />
            <ResponseCard
              title="Version Business"
              content={post.responseB}
              type="business"
              isSelected={post.selectedVersion === "B"}
              onCopy={() => onCopy(post.responseB)}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
