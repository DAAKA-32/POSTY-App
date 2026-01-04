"use client";

import { Post } from "@/types";
import ChatMessage from "@/components/chat/ChatMessage";
import { motion, AnimatePresence } from "framer-motion";

interface HistoryDetailPanelProps {
  post: Post | null;
  onCopy: (content: string) => void;
  onPublishToLinkedIn?: (content: string) => void;
  userName?: string;
  userInitial?: string;
}

export default function HistoryDetailPanel({
  post,
  onCopy,
  onPublishToLinkedIn,
  userName = "Vous",
  userInitial = "U",
}: HistoryDetailPanelProps) {
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
        <h3 className="text-xl font-semibold text-white mb-2">Selectionnez un post</h3>
        <p className="text-text-muted text-center max-w-sm">
          Choisissez un post dans la liste pour voir ses details et versions generees
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
        {/* Header with date */}
        <div className="flex items-center justify-between pb-4 border-b border-dark-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <span className="text-white font-bold">T</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Conversation</h2>
              <p className="text-sm text-text-muted">{formatDate(post.createdAt)}</p>
            </div>
          </div>

          {/* Version badge */}
          {post.selectedVersion && (
            <span
              className={`
                px-3 py-1 text-xs font-medium rounded-full
                ${post.selectedVersion === "A"
                  ? "bg-purple-500/20 text-purple-400"
                  : "bg-blue-500/20 text-blue-400"
                }
              `}
            >
              {post.selectedVersion === "A" ? "Storytelling" : "Business"}
            </span>
          )}
        </div>

        {/* Conversational display */}
        <div className="space-y-6">
          <AnimatePresence mode="popLayout">
            {/* User message */}
            <ChatMessage
              key={`user-${post.id}`}
              type="user"
              content={post.prompt}
              userName={userName}
              userInitial={userInitial}
              showActions={false}
              index={0}
            />

            {/* AI Response - Storytelling */}
            <ChatMessage
              key={`ai-storytelling-${post.id}`}
              type="ai"
              content={post.responseA}
              variant="storytelling"
              showActions={true}
              onCopy={() => onCopy(post.responseA)}
              onPublishToLinkedIn={onPublishToLinkedIn ? () => onPublishToLinkedIn(post.responseA) : undefined}
              index={1}
            />

            {/* AI Response - Business */}
            <ChatMessage
              key={`ai-business-${post.id}`}
              type="ai"
              content={post.responseB}
              variant="business"
              showActions={true}
              onCopy={() => onCopy(post.responseB)}
              onPublishToLinkedIn={onPublishToLinkedIn ? () => onPublishToLinkedIn(post.responseB) : undefined}
              index={2}
            />
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
