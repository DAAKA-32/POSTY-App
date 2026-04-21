"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useLinkedIn } from "@/contexts/LinkedInContext";
import { getUserPostsWithPinned, deletePost, pinPost, renamePost } from "@/lib/db/firestore";
import { Post } from "@/types";
import { toDate } from "@/lib/utils/timestamp";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import MainLayout from "@/components/layout/MainLayout";
import Button from "@/components/ui/Button";
import { MenuIcons } from "@/components/ui/DropdownMenu";
import ExpandableHistoryCard from "@/components/history/ExpandableHistoryCard";
import { HistoryPageSkeleton } from "@/components/history/HistoryCardSkeleton";
import HistoryStatsBanner from "@/components/history/HistoryStatsBanner";
import PublishToLinkedInModal from "@/components/linkedin/PublishToLinkedInModal";
import DeleteConfirmModal from "@/components/conversation/DeleteConfirmModal";
import RenameConversationModal from "@/components/conversation/RenameConversationModal";
import toast from "@/components/ui/Toast";
import { useDebouncedValue } from "@/hooks/input/useDebouncedValue";
import { useListKeyboardNavigation } from "@/hooks/input/useListKeyboardNavigation";
import { usePageTitle } from "@/hooks/ui/usePageTitle";

// Format date helper - accepts translations for today/yesterday
interface DateLabels {
  today: string;
  yesterday: string;
}

function formatDate(
  timestamp: { toDate?: () => Date } | Date | null,
  labels: DateLabels,
  locale: string = "fr-FR"
): string {
  if (!timestamp) return "";
  const date = toDate(timestamp);

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
    return labels.today;
  } else if (postDate.getTime() === yesterday.getTime()) {
    return labels.yesterday;
  } else {
    return new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date);
  }
}

// Format time helper
function formatTime(timestamp: { toDate?: () => Date } | Date | null, locale: string = "fr-FR"): string {
  if (!timestamp) return "";
  const date = toDate(timestamp);

  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function HistoryContent() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const { connection: linkedInConnection, publishToLinkedIn } = useLinkedIn();
  usePageTitle("history");

  // Enable full scrolling on History page (mouse wheel, trackpad, touch, keyboard)
  useEffect(() => {
    document.documentElement.classList.add("history-scroll-enabled");
    document.body.classList.add("history-scroll-enabled");
    document.body.classList.remove("pwa-mobile", "no-scroll", "scroll-locked", "modal-open");

    return () => {
      document.documentElement.classList.remove("history-scroll-enabled");
      document.body.classList.remove("history-scroll-enabled");
    };
  }, []);

  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 300);
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);

  // Ref for keyboard navigation container
  const listContainerRef = useRef<HTMLDivElement>(null);

  // LinkedIn publish state
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishContent, setPublishContent] = useState("");

  // Delete confirmation modal state
  const [postToDelete, setPostToDelete] = useState<Post | null>(null);

  // Rename modal state
  const [postToRename, setPostToRename] = useState<Post | null>(null);

  // Locale for date formatting based on active language
  const locale = language === "en" ? "en-US" : "fr-FR";
  const dateLabels = { today: t.history.today, yesterday: t.history.yesterday };

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

  // Filter posts by search (using debounced value for performance)
  const filteredPosts = useMemo(() => {
    if (!debouncedSearchQuery.trim()) return posts;
    const query = debouncedSearchQuery.toLowerCase();
    return posts.filter(
      (post) =>
        post.prompt.toLowerCase().includes(query) ||
        post.responseA?.toLowerCase().includes(query) ||
        post.responseB?.toLowerCase().includes(query),
    );
  }, [posts, debouncedSearchQuery]);

  // Flatten grouped posts for keyboard navigation indexing
  const flatPostIds = useMemo(() => {
    return filteredPosts.map((p) => p.id);
  }, [filteredPosts]);

  // Keyboard navigation hook
  const {
    focusedIndex,
    isFocused: isPostFocused,
  } = useListKeyboardNavigation({
    itemCount: flatPostIds.length,
    onActivate: (index) => {
      const postId = flatPostIds[index];
      setExpandedPostId((prev) => (prev === postId ? null : postId));
    },
    containerRef: listContainerRef,
    enabled: !isLoading && filteredPosts.length > 0,
  });

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
        const aDate = toDate(a.pinnedAt);
        const bDate = toDate(b.pinnedAt);
        return bDate.getTime() - aDate.getTime();
      });
      result.push({ date: t.history.pinned, posts: pinnedPosts, isPinnedGroup: true });
    }

    // Group non-pinned posts by date
    const groups: { [key: string]: Post[] } = {};
    nonPinnedPosts.forEach((post) => {
      const dateLabel = formatDate(post.createdAt, dateLabels, locale);
      if (!groups[dateLabel]) {
        groups[dateLabel] = [];
      }
      groups[dateLabel].push(post);
    });

    // Sort: Today first, then Yesterday, then by date
    const sortedKeys = Object.keys(groups).sort((a, b) => {
      if (a === dateLabels.today) return -1;
      if (b === dateLabels.today) return 1;
      if (a === dateLabels.yesterday) return -1;
      if (b === dateLabels.yesterday) return 1;
      return 0;
    });

    sortedKeys.forEach((key) => {
      result.push({ date: key, posts: groups[key] });
    });

    return result;
  }, [filteredPosts, t.history.pinned, dateLabels, locale]);

  // Handle delete - opens confirmation modal
  const handleDelete = useCallback((post: Post) => {
    setPostToDelete(post);
  }, []);

  // Confirm delete - actually performs the deletion
  const handleDeleteConfirm = useCallback(async (postId: string) => {
    await deletePost(postId);
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    toast.success(t.history.conversationDeleted);
  }, [t.history.conversationDeleted]);

  // Handle rename - opens modal
  const handleRename = useCallback((post: Post) => {
    setPostToRename(post);
  }, []);

  // Confirm rename - actually performs the rename
  const handleRenameSubmit = useCallback(async (postId: string, newTitle: string) => {
    // Optimistic update
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, title: newTitle } : p))
    );
    try {
      await renamePost(postId, newTitle);
      toast.success(t.toasts.conversationRenamed);
    } catch (error) {
      console.error("Error renaming post:", error);
      toast.error(t.toasts.errorRenaming);
      // Reload posts on error to revert
      loadPosts();
    }
  }, [t.toasts.conversationRenamed, t.toasts.errorRenaming, loadPosts]);

  // Copy content
  const handleCopy = useCallback(async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success(t.chat.copied);
    } catch {
      toast.error(t.chat.copyError);
    }
  }, [t.chat.copied, t.chat.copyError]);

  // Handle pin/unpin
  const handlePin = useCallback(async (post: Post) => {
    const newPinnedState = !post.isPinned;
    // Optimistic update
    setPosts((prev) =>
      prev.map((p) => (p.id === post.id ? { ...p, isPinned: newPinnedState } : p))
    );
    try {
      await pinPost(post.id, newPinnedState);
      toast.success(newPinnedState ? t.toasts.conversationPinned : t.toasts.conversationUnpinned);
    } catch {
      // Revert on error
      setPosts((prev) =>
        prev.map((p) => (p.id === post.id ? { ...p, isPinned: !newPinnedState } : p))
      );
      toast.error(t.toasts.errorPinning);
    }
  }, [t.toasts.conversationPinned, t.toasts.conversationUnpinned, t.toasts.errorPinning]);

  // Publish to LinkedIn
  const handlePublishToLinkedIn = useCallback((content: string) => {
    setPublishContent(content);
    setShowPublishModal(true);
  }, []);

  const handleConfirmPublish = async (
    editedContent: string,
    visibility: "PUBLIC" | "CONNECTIONS" = "PUBLIC",
    organizationUrn?: string
  ) => {
    return await publishToLinkedIn(editedContent, visibility, undefined, organizationUrn);
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

  // Build menu items for a post - same as Sidebar (ConversationOptionsMenu)
  const getMenuItems = useCallback(
    (post: Post) => [
      {
        id: "pin",
        label: post.isPinned ? t.history.unpin : t.history.pin,
        icon: post.isPinned ? MenuIcons.unpin : MenuIcons.pin,
        variant: "default" as const,
        onClick: () => handlePin(post),
      },
      {
        id: "rename",
        label: t.history.rename,
        icon: MenuIcons.edit,
        variant: "default" as const,
        onClick: () => handleRename(post),
      },
      {
        id: "delete",
        label: t.history.delete,
        icon: MenuIcons.delete,
        variant: "danger" as const,
        onClick: () => handleDelete(post),
      },
    ],
    [handleDelete, handlePin, handleRename, t.history],
  );

  return (
    <MainLayout
      posts={posts}
      showMobileHeader={true}
      headerTitle={t.history.title}
      onPostUpdate={loadPosts}
    >
      {/*
        Wrapper for PWA mobile scroll management
        - app-content-wrapper: allows flex child to scroll
        - app-scroll-container: defines scrollable area
      */}
      <div className="flex flex-col min-h-full bg-background-warm dark:bg-dark-bg app-content-wrapper">
        {/*
          Responsive container with smooth scroll and pull-to-refresh (mobile only)
          - Mobile: Full height with native scroll + pull-to-refresh
          - Tablet/Desktop: Optimized spacing and width
        */}
        <div
          className="flex-1 min-h-0 bg-background-warm dark:bg-dark-bg scroll-smooth app-scroll-container"
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
          {/* Header - Premium responsive typography and spacing */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="
              flex items-center justify-between
              mb-6 md:mb-8 lg:mb-10
            "
          >
            <div>
              <h1
                className="
                text-xl font-bold text-silver-shimmer dark:text-white
                md:text-2xl
                lg:text-3xl
              "
              >
                {t.history.title}
              </h1>
              <p
                className="
                text-sm text-gray-500 dark:text-text-muted mt-1
                md:text-base md:mt-1.5
              "
              >
                <span className="font-medium text-gray-900 dark:text-white">{filteredPosts.length}</span> {filteredPosts.length !== 1 ? t.history.postsGenerated : t.history.postGenerated}
              </p>
            </div>
          </motion.div>

          {/* Search - Premium responsive sizing */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="
              relative
              mb-6 md:mb-8
            "
          >
            <svg
              className="
                absolute left-4 top-1/2 -translate-y-1/2
                w-4 h-4 md:w-5 md:h-5
                text-gray-400 dark:text-text-muted
                transition-colors duration-200
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
              placeholder={t.history.searchPlaceholder}
              className="
                w-full
                pl-11 pr-4 py-3
                md:pl-12 md:pr-5 md:py-3.5
                lg:py-4
                bg-white dark:bg-dark-card
                border border-gray-200 dark:border-dark-border
                rounded-2xl
                text-sm md:text-base
                text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-text-muted
                focus:outline-none focus:border-primary dark:focus:border-primary/50 focus:ring-2 focus:ring-primary/20
                shadow-sm hover:shadow-md hover:border-[#F8935D]/30 dark:hover:border-primary/30
                transition-all duration-200
              "
            />
            {searchQuery && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => setSearchQuery("")}
                className="
                  absolute right-3 top-1/2 -translate-y-1/2
                  p-1.5 rounded-lg
                  text-gray-400 hover:text-gray-600
                  dark:text-text-muted dark:hover:text-white
                  hover:bg-gray-100 dark:hover:bg-dark-elevated
                  transition-all duration-200
                "
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </motion.button>
            )}
          </motion.div>

          {/* Stats Banner */}
          {!isLoading && posts.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-6 md:mb-8"
            >
              <HistoryStatsBanner posts={posts} />
            </motion.div>
          )}

          {/* Content */}
          {isLoading ? (
            <HistoryPageSkeleton />
          ) : filteredPosts.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="
                text-center
                py-16 md:py-20 lg:py-24
              "
            >
              {/* Empty state icon - Clean version */}
              <div className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-6 bg-gray-100 dark:bg-dark-card rounded-2xl border border-gray-200 dark:border-dark-border flex items-center justify-center">
                <svg
                  className="w-8 h-8 md:w-10 md:h-10 text-gray-400 dark:text-text-muted"
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
                font-semibold text-gray-900 dark:text-white mb-2
              "
              >
                {searchQuery ? t.history.noResults : t.history.noPostsYet}
              </h3>
              <p
                className="
                text-sm md:text-base
                text-gray-500 dark:text-text-muted mb-8
                max-w-sm mx-auto
              "
              >
                {searchQuery
                  ? t.history.tryOtherKeywords
                  : t.history.startCreating}
              </p>
              {!searchQuery && (
                <Link
                  href="/app"
                  className="
                    inline-flex items-center gap-2.5 px-6 py-3
                    bg-primary hover:bg-primary-hover
                    text-white font-semibold
                    rounded-xl shadow-sm hover:shadow-md
                    transition-all duration-200
                  "
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>{t.history.createFirst}</span>
                </Link>
              )}
            </motion.div>
          ) : (
            <LayoutGroup>
              {/*
                Posts grouped by date
                - Responsive spacing between groups
                - Keyboard navigation enabled with j/k/Enter keys
              */}
              <div
                ref={listContainerRef}
                className="space-y-6 md:space-y-8 lg:space-y-10"
                tabIndex={-1}
              >
                {groupedPosts.map((group, groupIndex) => (
                  <motion.div
                    key={group.date}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: groupIndex * 0.05 }}
                  >
                    {/* Date header - Clean professional styling */}
                    <div
                      className="
                      sticky top-0 z-10
                      flex items-center gap-3
                      mb-4 py-2
                      bg-background-warm/95 dark:bg-dark-bg/95 backdrop-blur-sm
                      -mx-4 px-4
                    "
                    >
                      <h2 className="text-sm md:text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        {group.isPinnedGroup && (
                          <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M16 4a1 1 0 0 1 1 1v3.586l1.707 1.707a1 1 0 0 1 .293.707v2a1 1 0 0 1-1 1h-4v6a1 1 0 0 1-2 0v-6H8a1 1 0 0 1-1-1v-2a1 1 0 0 1 .293-.707L9 8.586V5a1 1 0 0 1 1-1h6z"/>
                          </svg>
                        )}
                        {group.date}
                      </h2>
                      <div className="flex-1 h-px bg-gray-200 dark:bg-dark-border" />
                      <span className="text-xs md:text-sm px-2.5 py-1 rounded-lg font-medium text-gray-500 dark:text-text-muted bg-gray-100 dark:bg-dark-card border border-gray-200 dark:border-dark-border">
                        {group.posts.length} {group.posts.length !== 1 ? t.history.posts : t.history.post}
                      </span>
                    </div>

                    {/* Posts list - Accordion style with expandable cards */}
                    <div className="space-y-2 md:space-y-3">
                      <AnimatePresence mode="popLayout">
                        {group.posts.map((post) => {
                          const content = getPostContent(post);
                          const menuItems = getMenuItems(post);
                          const versionBadge = getVersionBadge(post);
                          const time = formatTime(post.createdAt, locale);
                          const postIndex = flatPostIds.indexOf(post.id);

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
                              isKeyboardFocused={isPostFocused(postIndex)}
                              isExpanded={expandedPostId === post.id}
                              onExpandChange={(expanded) => {
                                setExpandedPostId(expanded ? post.id : null);
                              }}
                            />
                          );
                        })}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                ))}

                {/* Load more indicator - Shows when there are many posts */}
                {filteredPosts.length > 50 && (
                  <div
                    className="flex justify-center py-4 text-text-muted text-sm"
                    role="status"
                    aria-label={`${filteredPosts.length} ${t.history.postsLoaded}`}
                  >
                    {filteredPosts.length} {t.history.postsDisplayed}
                  </div>
                )}
              </div>
            </LayoutGroup>
          )}

          {/* Bottom spacing for mobile navigation */}
          <div className="h-20 md:h-8" />
        </div>
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

      {/* Delete confirmation modal */}
      <DeleteConfirmModal
        isOpen={!!postToDelete}
        onClose={() => setPostToDelete(null)}
        post={postToDelete}
        onConfirm={handleDeleteConfirm}
      />

      {/* Rename modal */}
      <RenameConversationModal
        isOpen={!!postToRename}
        onClose={() => setPostToRename(null)}
        post={postToRename}
        onRename={handleRenameSubmit}
      />
    </MainLayout>
  );
}

export default function HistoryPage() {
  return (
    <ProtectedRoute requireOnboarding requireSubscription>
      <HistoryContent />
    </ProtectedRoute>
  );
}
