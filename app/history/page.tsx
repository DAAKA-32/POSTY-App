"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useLinkedIn } from "@/contexts/LinkedInContext";
import { getUserPosts, deletePost } from "@/lib/firestore";
import { Post } from "@/types";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import MainLayout from "@/components/layout/MainLayout";
import Button from "@/components/ui/Button";
import DropdownMenu, { MenuIcons } from "@/components/ui/DropdownMenu";
import PublishToLinkedInModal from "@/components/linkedin/PublishToLinkedInModal";
import { useDeleteWithUndo } from "@/hooks/useDeleteWithUndo";
import toast from "react-hot-toast";

// Format date helper
function formatDate(timestamp: { toDate?: () => Date } | Date | null): string {
  if (!timestamp) return "";
  const date =
    typeof (timestamp as { toDate?: () => Date }).toDate === "function"
      ? (timestamp as { toDate: () => Date }).toDate()
      : new Date(timestamp as unknown as string);

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
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date);
  }
}

// Format time helper
function formatTime(timestamp: { toDate?: () => Date } | Date | null): string {
  if (!timestamp) return "";
  const date =
    typeof (timestamp as { toDate?: () => Date }).toDate === "function"
      ? (timestamp as { toDate: () => Date }).toDate()
      : new Date(timestamp as unknown as string);

  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

// Truncate text helper
function truncateText(text: string, maxLength: number = 120): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + "...";
}

function HistoryContent() {
  const { user } = useAuth();
  const { connection: linkedInConnection, publishToLinkedIn } = useLinkedIn();

  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedPost, setExpandedPost] = useState<string | null>(null);

  // LinkedIn publish state
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishContent, setPublishContent] = useState("");

  // Delete with undo functionality
  const { scheduleDelete, isDeleted } = useDeleteWithUndo<Post>({
    undoDuration: 5000,
    onDelete: async (post) => {
      await deletePost(post.id);
      setPosts((prev) => prev.filter((p) => p.id !== post.id));
    },
    toastMessage: "Conversation supprimee",
    undoText: "Annuler",
  });

  // Fetch posts
  useEffect(() => {
    const fetchPosts = async () => {
      if (user) {
        setIsLoading(true);
        const userPosts = await getUserPosts(user.uid, 100);
        setPosts(userPosts);
        setIsLoading(false);
      }
    };
    fetchPosts();
  }, [user]);

  // Filter posts by search (excluding deleted ones)
  const filteredPosts = useMemo(() => {
    const activePosts = posts.filter((p) => !isDeleted(p.id));
    if (!searchQuery.trim()) return activePosts;
    const query = searchQuery.toLowerCase();
    return activePosts.filter(
      (post) =>
        post.prompt.toLowerCase().includes(query) ||
        post.responseA?.toLowerCase().includes(query) ||
        post.responseB?.toLowerCase().includes(query)
    );
  }, [posts, searchQuery, isDeleted]);

  // Group posts by date
  const groupedPosts = useMemo(() => {
    const groups: { [key: string]: Post[] } = {};

    filteredPosts.forEach((post) => {
      const dateLabel = formatDate(post.createdAt);
      if (!groups[dateLabel]) {
        groups[dateLabel] = [];
      }
      groups[dateLabel].push(post);
    });

    // Sort: Aujourd'hui first, then Hier, then by date
    const sortedKeys = Object.keys(groups).sort((a, b) => {
      if (a === "Aujourd'hui") return -1;
      if (b === "Aujourd'hui") return 1;
      if (a === "Hier") return -1;
      if (b === "Hier") return 1;
      return 0;
    });

    return sortedKeys.map((key) => ({ date: key, posts: groups[key] }));
  }, [filteredPosts]);

  // Handle delete
  const handleDelete = useCallback(
    (post: Post) => {
      scheduleDelete(post);
    },
    [scheduleDelete]
  );

  // Copy content
  const handleCopy = useCallback(async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success("Copie !");
    } catch {
      toast.error("Erreur lors de la copie");
    }
  }, []);

  // Publish to LinkedIn
  const handlePublishToLinkedIn = useCallback((content: string) => {
    setPublishContent(content);
    setShowPublishModal(true);
  }, []);

  const handleConfirmPublish = async (editedContent: string) => {
    return await publishToLinkedIn(editedContent);
  };

  // Get content to display for a post
  const getPostContent = useCallback((post: Post): string => {
    if (post.selectedVersion === "A") return post.responseA;
    if (post.selectedVersion === "B") return post.responseB;
    return post.responseA || post.responseB || "";
  }, []);

  // Get version badge
  const getVersionBadge = useCallback((post: Post) => {
    if (post.selectedVersion === "A") {
      return (
        <span className="inline-flex items-center px-2 py-0.5 bg-accent/10 text-accent text-xs font-medium rounded-md">
          Storytelling
        </span>
      );
    }
    if (post.selectedVersion === "B") {
      return (
        <span className="inline-flex items-center px-2 py-0.5 bg-primary/10 text-primary text-xs font-medium rounded-md">
          Business
        </span>
      );
    }
    return null;
  }, []);

  // Build menu items for a post
  const getMenuItems = useCallback(
    (post: Post, content: string) => [
      {
        id: "copy",
        label: "Copier",
        icon: MenuIcons.copy,
        variant: "default" as const,
        onClick: () => handleCopy(content),
      },
      {
        id: "linkedin",
        label: "Publier sur LinkedIn",
        icon: MenuIcons.linkedin,
        variant: "default" as const,
        onClick: () => handlePublishToLinkedIn(content),
      },
      {
        id: "delete",
        label: "Supprimer",
        icon: MenuIcons.delete,
        variant: "danger" as const,
        onClick: () => handleDelete(post),
      },
    ],
    [handleCopy, handlePublishToLinkedIn, handleDelete]
  );

  return (
    <MainLayout posts={posts} showMobileHeader={true} headerTitle="Historique" onDeletePost={handleDelete}>
      {/*
        Responsive container with smooth scroll
        - Mobile: Full height with native scroll
        - Tablet/Desktop: Optimized spacing and width
      */}
      <div className="min-h-full bg-background overflow-y-auto scroll-smooth">
        {/*
          Content wrapper with responsive max-width and padding
          - Mobile: px-4, compact
          - Tablet (md): px-6, max-w-2xl
          - Desktop (lg): px-8, max-w-3xl
          - Large Desktop (xl): max-w-4xl
        */}
        <div className="
          w-full mx-auto
          px-4 py-6
          md:px-6 md:py-8 md:max-w-2xl
          lg:px-8 lg:py-10 lg:max-w-3xl
          xl:max-w-4xl
          2xl:max-w-5xl
        ">
          {/* Header - Responsive typography and spacing */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="
              flex items-center justify-between
              mb-5 md:mb-6 lg:mb-8
            "
          >
            <div>
              <h1 className="
                text-xl font-bold text-white
                md:text-2xl
                lg:text-3xl
              ">
                Historique
              </h1>
              <p className="
                text-sm text-text-muted mt-0.5
                md:text-base md:mt-1
              ">
                {filteredPosts.length} post{filteredPosts.length !== 1 ? "s" : ""} genere{filteredPosts.length !== 1 ? "s" : ""}
              </p>
            </div>
            <Link href="/app">
              <Button size="sm" className="md:hidden">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Nouveau
              </Button>
              <Button className="hidden md:flex">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Nouveau post
              </Button>
            </Link>
          </motion.div>

          {/* Search - Responsive sizing */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="
              relative
              mb-5 md:mb-6 lg:mb-8
            "
          >
            <svg
              className="
                absolute left-3 top-1/2 -translate-y-1/2
                w-4 h-4 md:w-5 md:h-5
                text-text-muted
              "
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher dans l'historique..."
              className="
                w-full
                pl-9 pr-4 py-2.5
                md:pl-11 md:pr-5 md:py-3
                lg:py-3.5
                bg-dark-card border border-dark-border rounded-xl
                text-sm md:text-base
                text-white placeholder-text-muted
                focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20
                transition-all duration-200
              "
            />
          </motion.div>

          {/* Content */}
          {isLoading ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="
                flex justify-center
                py-16 md:py-20 lg:py-24
              "
            >
              <div className="
                w-8 h-8 md:w-10 md:h-10
                border-2 border-primary border-t-transparent
                rounded-full animate-spin
              " />
            </motion.div>
          ) : filteredPosts.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="
                text-center
                py-16 md:py-20 lg:py-24
              "
            >
              {/* Empty state icon */}
              <div className="
                w-16 h-16 md:w-20 md:h-20
                bg-dark-card rounded-2xl
                flex items-center justify-center
                mx-auto mb-4 md:mb-6
              ">
                <svg
                  className="w-8 h-8 md:w-10 md:h-10 text-text-muted"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
              </div>
              <h3 className="
                text-lg md:text-xl lg:text-2xl
                font-semibold text-white mb-2
              ">
                {searchQuery ? "Aucun resultat" : "Aucun post pour le moment"}
              </h3>
              <p className="
                text-sm md:text-base
                text-text-muted mb-6 md:mb-8
                max-w-sm mx-auto
              ">
                {searchQuery
                  ? "Essayez avec d'autres mots-cles"
                  : "Commencez a creer des posts pour les retrouver ici"}
              </p>
              {!searchQuery && (
                <Link href="/app">
                  <Button>Creer mon premier post</Button>
                </Link>
              )}
            </motion.div>
          ) : (
            <LayoutGroup>
              {/*
                Posts grouped by date
                - Responsive spacing between groups
              */}
              <div className="space-y-6 md:space-y-8 lg:space-y-10">
                {groupedPosts.map((group, groupIndex) => (
                  <motion.div
                    key={group.date}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: groupIndex * 0.05 }}
                  >
                    {/* Date header - Responsive styling */}
                    <div className="
                      flex items-center gap-3
                      mb-3 md:mb-4
                    ">
                      <h2 className="
                        text-sm md:text-base
                        font-semibold text-text-secondary
                      ">
                        {group.date}
                      </h2>
                      <div className="flex-1 h-px bg-dark-border" />
                      <span className="
                        text-xs md:text-sm
                        text-text-muted
                      ">
                        {group.posts.length} post{group.posts.length !== 1 ? "s" : ""}
                      </span>
                    </div>

                    {/* Posts list - Responsive spacing */}
                    <div className="space-y-3 md:space-y-4">
                      <AnimatePresence mode="popLayout">
                        {group.posts.map((post, postIndex) => {
                          const content = getPostContent(post);
                          const isExpanded = expandedPost === post.id;
                          const menuItems = getMenuItems(post, content);
                          const versionBadge = getVersionBadge(post);
                          const time = formatTime(post.createdAt);

                          return (
                            <motion.div
                              key={post.id}
                              layout
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{
                                opacity: 0,
                                x: -100,
                                scale: 0.95,
                                transition: { duration: 0.25, ease: [0.4, 0, 0.2, 1] },
                              }}
                              transition={{
                                layout: { duration: 0.25, ease: [0.4, 0, 0.2, 1] },
                                opacity: { duration: 0.2, delay: postIndex * 0.03 },
                              }}
                              className="group"
                            >
                              {/*
                                Post card - Responsive padding and styling
                                - Mobile: Compact (p-4)
                                - Tablet: Medium (p-5)
                                - Desktop: Spacious (p-6)
                              */}
                              <div className="
                                bg-dark-card border border-dark-border rounded-xl
                                p-4 md:p-5 lg:p-6
                                hover:border-dark-hover hover:bg-dark-elevated/50
                                transition-all duration-200
                              ">
                                {/* Header with prompt, time, badge and menu */}
                                <div className="flex items-start justify-between gap-3 mb-2 md:mb-3">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap mb-1">
                                      <span className="text-xs text-text-muted">
                                        {time}
                                      </span>
                                      {versionBadge}
                                    </div>
                                    <p className="
                                      text-xs md:text-sm
                                      text-text-muted
                                      line-clamp-1 md:line-clamp-2
                                    ">
                                      {post.prompt}
                                    </p>
                                  </div>

                                  {/* Menu - Always visible on mobile, hover on desktop */}
                                  <div className="
                                    opacity-100 lg:opacity-0 lg:group-hover:opacity-100
                                    transition-opacity duration-200
                                    shrink-0
                                  ">
                                    <DropdownMenu items={menuItems} position="right" />
                                  </div>
                                </div>

                                {/* Content - Responsive typography */}
                                <p className="
                                  text-white
                                  text-sm md:text-base
                                  leading-relaxed
                                  whitespace-pre-wrap
                                ">
                                  {isExpanded ? content : truncateText(content, 200)}
                                </p>

                                {/* Actions footer - Responsive */}
                                <div className="
                                  flex items-center justify-between
                                  mt-3 md:mt-4 pt-3 md:pt-4
                                  border-t border-dark-border
                                ">
                                  <div className="flex items-center gap-2">
                                    {/* Expand/Collapse */}
                                    {content.length > 200 && (
                                      <button
                                        onClick={() => setExpandedPost(isExpanded ? null : post.id)}
                                        className="
                                          text-xs md:text-sm
                                          text-text-muted hover:text-primary
                                          transition-colors
                                        "
                                      >
                                        {isExpanded ? "Reduire" : "Voir plus"}
                                      </button>
                                    )}
                                  </div>

                                  {/* Quick action buttons - Desktop only */}
                                  <div className="hidden lg:flex items-center gap-1">
                                    {/* Copy */}
                                    <button
                                      onClick={() => handleCopy(content)}
                                      className="
                                        p-2 rounded-lg
                                        text-text-muted hover:text-white hover:bg-dark-hover
                                        transition-colors
                                      "
                                      title="Copier"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                      </svg>
                                    </button>

                                    {/* Publish to LinkedIn */}
                                    <button
                                      onClick={() => handlePublishToLinkedIn(content)}
                                      className="
                                        p-2 rounded-lg
                                        text-text-muted hover:text-[#0A66C2] hover:bg-[#0A66C2]/10
                                        transition-colors
                                      "
                                      title="Publier sur LinkedIn"
                                    >
                                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                                      </svg>
                                    </button>

                                    {/* Delete */}
                                    <button
                                      onClick={() => handleDelete(post)}
                                      className="
                                        p-2 rounded-lg
                                        text-text-muted hover:text-error hover:bg-error/10
                                        transition-colors
                                      "
                                      title="Supprimer"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                ))}
              </div>
            </LayoutGroup>
          )}

          {/* Bottom spacing for mobile navigation */}
          <div className="h-20 md:h-8" />
        </div>
      </div>

      {/* Publish to LinkedIn modal */}
      <PublishToLinkedInModal
        isOpen={showPublishModal}
        onClose={() => setShowPublishModal(false)}
        content={publishContent}
        linkedInConnection={linkedInConnection}
        onPublish={handleConfirmPublish}
      />
    </MainLayout>
  );
}

export default function HistoryPage() {
  return (
    <ProtectedRoute>
      <HistoryContent />
    </ProtectedRoute>
  );
}
