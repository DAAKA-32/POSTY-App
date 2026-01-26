"use client";

import { useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Post } from "@/types";
import { useReducedMotion } from "@/hooks/useReducedMotion";

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
  const prefersReducedMotion = useReducedMotion();

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

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <>
          {/* Overlay - Click to close */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: prefersReducedMotion ? 0.1 : 0.2,
              ease: "easeOut",
            }}
            className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Modal - Perfectly centered */}
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{
                opacity: 0,
                scale: prefersReducedMotion ? 1 : 0.95,
                y: prefersReducedMotion ? 0 : 20,
              }}
              animate={{
                opacity: 1,
                scale: 1,
                y: 0,
              }}
              exit={{
                opacity: 0,
                scale: prefersReducedMotion ? 1 : 0.95,
                y: prefersReducedMotion ? 0 : 10,
              }}
              transition={{
                duration: prefersReducedMotion ? 0.1 : 0.25,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="
                w-full max-w-2xl max-h-[90vh] lg:max-h-[80vh]
                bg-dark-card border border-dark-border rounded-2xl shadow-2xl
                flex flex-col overflow-hidden
                pointer-events-auto
              "
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 lg:p-5 border-b border-dark-border shrink-0">
                <div>
                  <h2 className="text-lg lg:text-xl font-semibold text-text-primary">
                    Historique des chats
                  </h2>
                  <p className="text-sm text-text-muted mt-0.5">
                    {filteredPosts.length} conversation{filteredPosts.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="min-w-[44px] min-h-[44px] p-2 flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-dark-hover rounded-lg transition-colors"
                  aria-label="Fermer"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 6L18 18M6 18L18 6" />
                  </svg>
                </button>
              </div>

              {/* Content - Scrollable with stable scrollbar gutter */}
              <div
                className="flex-1 overflow-y-scroll p-4 lg:p-5"
                style={{
                  scrollbarGutter: "stable",
                }}
              >
                {filteredPosts.length === 0 ? (
                  <motion.div
                    className="text-center py-12"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{
                      duration: prefersReducedMotion ? 0.1 : 0.4,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                  >
                    <motion.div
                      className="w-16 h-16 bg-dark-hover rounded-full flex items-center justify-center mx-auto mb-4"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{
                        duration: prefersReducedMotion ? 0.1 : 0.5,
                        delay: prefersReducedMotion ? 0 : 0.1,
                        type: "spring",
                        stiffness: 200,
                        damping: 15,
                      }}
                    >
                      <svg className="w-8 h-8 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                      </svg>
                    </motion.div>
                    <motion.p
                      className="text-text-secondary text-sm"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: prefersReducedMotion ? 0.1 : 0.3,
                        delay: prefersReducedMotion ? 0 : 0.2,
                      }}
                    >
                      {searchQuery ? "Aucun résultat pour cette recherche" : "Aucune conversation"}
                    </motion.p>
                  </motion.div>
                ) : (
                  <motion.div
                    className="space-y-6"
                    initial="hidden"
                    animate="visible"
                    variants={{
                      hidden: { opacity: 0 },
                      visible: {
                        opacity: 1,
                        transition: {
                          staggerChildren: prefersReducedMotion ? 0 : 0.05,
                        },
                      },
                    }}
                  >
                    {groupedPosts.map((group, groupIndex) => (
                      <motion.div
                        key={group.date}
                        variants={{
                          hidden: { opacity: 0, y: 20 },
                          visible: {
                            opacity: 1,
                            y: 0,
                            transition: {
                              duration: prefersReducedMotion ? 0.1 : 0.3,
                              ease: [0.22, 1, 0.36, 1],
                            },
                          },
                        }}
                      >
                        {/* Date header */}
                        <motion.div
                          className="flex items-center gap-3 mb-3"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{
                            duration: prefersReducedMotion ? 0.1 : 0.4,
                            delay: prefersReducedMotion ? 0 : groupIndex * 0.05,
                            ease: [0.22, 1, 0.36, 1],
                          }}
                        >
                          <span className="text-xs font-medium text-primary uppercase tracking-wider">
                            {group.date}
                          </span>
                          <div className="flex-1 h-px bg-dark-border" />
                        </motion.div>

                        {/* Posts for this date */}
                        <motion.div
                          className="space-y-2"
                          variants={{
                            hidden: {},
                            visible: {
                              transition: {
                                staggerChildren: prefersReducedMotion ? 0 : 0.04,
                              },
                            },
                          }}
                          initial="hidden"
                          animate="visible"
                        >
                          {group.posts.map((post, postIndex) => (
                            <motion.div
                              key={post.id}
                              variants={{
                                hidden: {
                                  opacity: 0,
                                  x: -20,
                                  scale: 0.95,
                                },
                                visible: {
                                  opacity: 1,
                                  x: 0,
                                  scale: 1,
                                  transition: {
                                    duration: prefersReducedMotion ? 0.1 : 0.35,
                                    ease: [0.22, 1, 0.36, 1],
                                  },
                                },
                              }}
                            >
                              <Link
                                href={`/app/c/${post.id}`}
                                onClick={onClose}
                                className="
                                  flex items-start gap-3 p-3 rounded-lg
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
                                <p className="text-text-primary font-medium truncate group-hover:text-primary transition-colors">
                                  {post.prompt}
                                </p>
                                <p className="text-xs text-text-muted mt-1">
                                  {formatTime(post.createdAt)}
                                </p>
                              </div>
                              <svg
                                className="w-5 h-5 text-text-muted group-hover:text-primary shrink-0 transition-colors"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                              </Link>
                            </motion.div>
                          ))}
                        </motion.div>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 lg:p-5 border-t border-dark-border shrink-0">
                <Link
                  href="/history"
                  onClick={onClose}
                  className="flex items-center justify-center gap-2 w-full px-4 py-2.5 text-primary hover:text-white hover:bg-primary rounded-lg transition-all duration-200 text-sm font-medium"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Voir tout l&apos;historique
                </Link>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
