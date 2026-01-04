"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useLinkedIn } from "@/contexts/LinkedInContext";
import { getUserPostsWithPinned, deletePost, pinPost } from "@/lib/firestore";
import { Post } from "@/types";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import MainLayout from "@/components/layout/MainLayout";
import Button from "@/components/ui/Button";
import PullToRefresh from "@/components/ui/PullToRefresh";
import { MenuIcons } from "@/components/ui/DropdownMenu";
import ExpandableHistoryCard from "@/components/history/ExpandableHistoryCard";
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

  const postDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );

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

function HistoryContent() {
  const { user } = useAuth();
  const { connection: linkedInConnection, publishToLinkedIn } = useLinkedIn();

  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

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

  // Fetch posts function - extracted for reuse (with pinned posts first)
  const loadPosts = useCallback(async () => {
    if (user) {
      setIsLoading(true);
      const userPosts = await getUserPostsWithPinned(user.uid, 100);
      setPosts(userPosts);
      setIsLoading(false);
    }
  }, [user]);

  // Fetch posts on mount
  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  // Filter posts by search (excluding deleted ones)
  const filteredPosts = useMemo(() => {
    const activePosts = posts.filter((p) => !isDeleted(p.id));
    if (!searchQuery.trim()) return activePosts;
    const query = searchQuery.toLowerCase();
    return activePosts.filter(
      (post) =>
        post.prompt.toLowerCase().includes(query) ||
        post.responseA?.toLowerCase().includes(query) ||
        post.responseB?.toLowerCase().includes(query),
    );
  }, [posts, searchQuery, isDeleted]);

  // Group posts by date with pinned posts first
  const groupedPosts = useMemo(() => {
    // Separate pinned and non-pinned posts
    const pinnedPosts = filteredPosts.filter((post) => post.isPinned);
    const nonPinnedPosts = filteredPosts.filter((post) => !post.isPinned);

    const result: { date: string; posts: Post[]; isPinnedGroup?: boolean }[] = [];

    // Add pinned group first if there are pinned posts
    if (pinnedPosts.length > 0) {
      // Sort pinned posts by pinnedAt (most recent first)
      pinnedPosts.sort((a, b) => {
        const aPinnedAt = a.pinnedAt as { toDate?: () => Date } | Date | undefined;
        const bPinnedAt = b.pinnedAt as { toDate?: () => Date } | Date | undefined;
        const aDate = aPinnedAt && typeof aPinnedAt === 'object' && 'toDate' in aPinnedAt
          ? aPinnedAt.toDate?.() || new Date(0)
          : new Date(aPinnedAt as unknown as string || 0);
        const bDate = bPinnedAt && typeof bPinnedAt === 'object' && 'toDate' in bPinnedAt
          ? bPinnedAt.toDate?.() || new Date(0)
          : new Date(bPinnedAt as unknown as string || 0);
        return bDate.getTime() - aDate.getTime();
      });
      result.push({ date: "Epingles", posts: pinnedPosts, isPinnedGroup: true });
    }

    // Group non-pinned posts by date
    const groups: { [key: string]: Post[] } = {};
    nonPinnedPosts.forEach((post) => {
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

    sortedKeys.forEach((key) => {
      result.push({ date: key, posts: groups[key] });
    });

    return result;
  }, [filteredPosts]);

  // Handle delete
  const handleDelete = useCallback(
    (post: Post) => {
      scheduleDelete(post);
    },
    [scheduleDelete],
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

  // Handle pin/unpin
  const handlePin = useCallback(async (post: Post) => {
    const newPinnedState = !post.isPinned;
    // Optimistic update
    setPosts((prev) =>
      prev.map((p) => (p.id === post.id ? { ...p, isPinned: newPinnedState } : p))
    );
    try {
      await pinPost(post.id, newPinnedState);
      toast.success(newPinnedState ? "Conversation epinglee" : "Conversation desepinglee");
    } catch {
      // Revert on error
      setPosts((prev) =>
        prev.map((p) => (p.id === post.id ? { ...p, isPinned: !newPinnedState } : p))
      );
      toast.error("Erreur lors de l'epinglage");
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
        id: "pin",
        label: post.isPinned ? "Desepingler" : "Epingler",
        icon: post.isPinned ? MenuIcons.unpin : MenuIcons.pin,
        variant: "default" as const,
        onClick: () => handlePin(post),
      },
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
    [handleCopy, handlePublishToLinkedIn, handleDelete, handlePin],
  );

  return (
    <MainLayout
      posts={posts}
      showMobileHeader={true}
      headerTitle="Historique"
      onPostUpdate={loadPosts}
    >
      {/*
        Responsive container with smooth scroll and pull-to-refresh (mobile only)
        - Mobile: Full height with native scroll + pull-to-refresh
        - Tablet/Desktop: Optimized spacing and width
      */}
      <PullToRefresh
        onRefresh={loadPosts}
        className="min-h-full bg-background scroll-smooth lg:overflow-y-auto"
        disabled={isLoading}
      >
        {/*
          Content wrapper with responsive max-width and padding
          - Mobile: px-4, compact
          - Tablet (md): px-6, max-w-2xl
          - Desktop (lg): px-8, max-w-3xl
          - Large Desktop (xl): max-w-4xl
        */}
        <div
          className="
          w-full mx-auto
          px-4 py-6
          md:px-6 md:py-8 md:max-w-2xl
          lg:px-8 lg:py-10 lg:max-w-3xl
          xl:max-w-4xl
          2xl:max-w-5xl
        "
        >
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
              <h1
                className="
                text-xl font-bold text-white
                md:text-2xl
                lg:text-3xl
              "
              >
                Historique
              </h1>
              <p
                className="
                text-sm text-text-muted mt-0.5
                md:text-base md:mt-1
              "
              >
                {filteredPosts.length} post
                {filteredPosts.length !== 1 ? "s" : ""} genere
                {filteredPosts.length !== 1 ? "s" : ""}
              </p>
            </div>
            <Link href="/app">
              <Button size="sm" className="md:hidden">
                <svg
                  className="w-4 h-4 mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Nouveau
              </Button>
              <Button className="hidden md:flex">
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
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
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
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
              <div
                className="
                w-8 h-8 md:w-10 md:h-10
                border-2 border-primary border-t-transparent
                rounded-full animate-spin
              "
              />
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
              <div
                className="
                w-16 h-16 md:w-20 md:h-20
                bg-dark-card rounded-2xl
                flex items-center justify-center
                mx-auto mb-4 md:mb-6
              "
              >
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
              <h3
                className="
                text-lg md:text-xl lg:text-2xl
                font-semibold text-white mb-2
              "
              >
                {searchQuery ? "Aucun resultat" : "Aucun post pour le moment"}
              </h3>
              <p
                className="
                text-sm md:text-base
                text-text-muted mb-6 md:mb-8
                max-w-sm mx-auto
              "
              >
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
                    <div
                      className="
                      flex items-center gap-3
                      mb-3 md:mb-4
                    "
                    >
                      <h2
                        className={`
                          text-sm md:text-base font-semibold flex items-center gap-2
                          ${group.isPinnedGroup ? "text-accent" : "text-text-secondary"}
                        `}
                      >
                        {group.isPinnedGroup && (
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                          </svg>
                        )}
                        {group.date}
                      </h2>
                      <div className={`flex-1 h-px ${group.isPinnedGroup ? "bg-accent/30" : "bg-dark-border"}`} />
                      <span
                        className={`
                          text-xs md:text-sm
                          ${group.isPinnedGroup ? "text-accent" : "text-text-muted"}
                        `}
                      >
                        {group.posts.length} post
                        {group.posts.length !== 1 ? "s" : ""}
                      </span>
                    </div>

                    {/* Posts list - Accordion style with expandable cards */}
                    <div className="space-y-2 md:space-y-3">
                      <AnimatePresence mode="popLayout">
                        {group.posts.map((post) => {
                          const content = getPostContent(post);
                          const menuItems = getMenuItems(post, content);
                          const versionBadge = getVersionBadge(post);
                          const time = formatTime(post.createdAt);

                          return (
                            <ExpandableHistoryCard
                              key={post.id}
                              post={post}
                              content={content}
                              versionBadge={versionBadge}
                              time={time}
                              menuItems={menuItems}
                              onCopy={handleCopy}
                              onPublishToLinkedIn={handlePublishToLinkedIn}
                              onDelete={() => handleDelete(post)}
                            />
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
      </PullToRefresh>

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
