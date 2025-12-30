"use client";

import { useEffect, useCallback } from "react";
import Link from "next/link";
import { Post } from "@/types";

interface ChatHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  posts: Post[];
  searchQuery: string;
}

export default function ChatHistoryModal({
  isOpen,
  onClose,
  posts,
  searchQuery,
}: ChatHistoryModalProps) {
  // Handle escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose]
  );

  // Add event listener for escape key
  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleKeyDown]);

  // Format date with relative labels
  const formatDate = (timestamp: { toDate?: () => Date } | Date | null): string => {
    if (!timestamp) return "";
    const date = typeof (timestamp as { toDate?: () => Date }).toDate === "function"
      ? (timestamp as { toDate: () => Date }).toDate()
      : new Date(timestamp as Date);

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const postDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    if (postDate.getTime() === today.getTime()) {
      return "Aujourd'hui";
    } else if (postDate.getTime() === yesterday.getTime()) {
      return "Hier";
    } else {
      return new Intl.DateTimeFormat("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(date);
    }
  };

  // Format time
  const formatTime = (timestamp: { toDate?: () => Date } | Date | null): string => {
    if (!timestamp) return "";
    const date = typeof (timestamp as { toDate?: () => Date }).toDate === "function"
      ? (timestamp as { toDate: () => Date }).toDate()
      : new Date(timestamp as Date);

    return new Intl.DateTimeFormat("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  // Group posts by date
  const groupPostsByDate = (posts: Post[]) => {
    const groups: { [key: string]: Post[] } = {};

    posts.forEach((post) => {
      const dateLabel = formatDate(post.createdAt);
      if (!groups[dateLabel]) {
        groups[dateLabel] = [];
      }
      groups[dateLabel].push(post);
    });

    // Sort groups: Aujourd'hui first, then Hier, then by date descending
    const sortedKeys = Object.keys(groups).sort((a, b) => {
      if (a === "Aujourd'hui") return -1;
      if (b === "Aujourd'hui") return 1;
      if (a === "Hier") return -1;
      if (b === "Hier") return 1;
      // Parse dates for comparison
      const dateA = a.split("/").reverse().join("-");
      const dateB = b.split("/").reverse().join("-");
      return dateB.localeCompare(dateA);
    });

    return sortedKeys.map((key) => ({
      date: key,
      posts: groups[key],
    }));
  };

  // Filter posts by search query
  const filteredPosts = posts.filter((post) =>
    post.prompt.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedPosts = groupPostsByDate(filteredPosts);

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className="
          fixed z-[90] bg-dark-card border border-dark-border rounded-2xl shadow-2xl
          animate-scale-in overflow-hidden
          inset-4 lg:inset-auto lg:left-1/2 lg:top-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2
          lg:w-full lg:max-w-2xl lg:max-h-[80vh]
          flex flex-col
        "
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-dark-border shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-white">Historique des chats</h2>
            <p className="text-sm text-gray-500">
              {filteredPosts.length} conversation{filteredPosts.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-dark-hover rounded-lg transition-colors"
            aria-label="Fermer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredPosts.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-dark-hover rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <p className="text-gray-400 text-sm">
                {searchQuery ? "Aucun resultat pour cette recherche" : "Aucune conversation"}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {groupedPosts.map((group) => (
                <div key={group.date}>
                  {/* Date header */}
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xs font-medium text-primary uppercase tracking-wider">
                      {group.date}
                    </span>
                    <div className="flex-1 h-px bg-dark-border" />
                  </div>

                  {/* Posts for this date */}
                  <div className="space-y-2">
                    {group.posts.map((post) => (
                      <Link
                        key={post.id}
                        href={`/history?id=${post.id}`}
                        onClick={onClose}
                        className="
                          flex items-start gap-3 p-3 rounded-xl
                          bg-dark-bg hover:bg-dark-hover
                          border border-dark-border hover:border-primary/30
                          transition-all duration-200 group
                        "
                      >
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                          <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                            />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium truncate group-hover:text-primary transition-colors">
                            {post.prompt}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatTime(post.createdAt)}
                          </p>
                        </div>
                        <svg
                          className="w-5 h-5 text-gray-500 group-hover:text-primary shrink-0 transition-colors"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-dark-border shrink-0">
          <Link
            href="/history"
            onClick={onClose}
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 text-primary hover:text-white hover:bg-primary rounded-lg transition-colors text-sm font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Voir tout l&apos;historique
          </Link>
        </div>
      </div>
    </>
  );
}
