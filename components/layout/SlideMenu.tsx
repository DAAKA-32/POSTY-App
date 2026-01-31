"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSchedulingPendingCount } from "@/contexts/SchedulingContext";
import { Post } from "@/types";
import { pinPost, renamePost, deletePost } from "@/lib/firestore";
import toast from "@/components/ui/Toast";
import ConversationOptionsMenu from "@/components/conversation/ConversationOptionsMenu";
import RenameConversationModal from "@/components/conversation/RenameConversationModal";
import DeleteConfirmModal from "@/components/conversation/DeleteConfirmModal";
import ProfileMenu from "@/components/layout/ProfileMenu";
import { useScrollLock } from "@/hooks/useScrollLock";

interface SlideMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onOpen?: () => void;
  posts?: Post[];
  onPostUpdate?: () => void;
}

// Group posts by date with pinned posts first
interface SidebarTranslations {
  pinned: string;
  today: string;
  yesterday: string;
  thisWeek: string;
  older: string;
}

function groupPostsByDate(posts: Post[], labels: SidebarTranslations) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Separate pinned and non-pinned posts
  const pinnedPosts = posts.filter((post) => post.isPinned);
  const nonPinnedPosts = posts.filter((post) => !post.isPinned);

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

  const groups: { label: string; posts: Post[]; isPinnedGroup?: boolean }[] = [];

  // Add pinned group first if there are pinned posts
  if (pinnedPosts.length > 0) {
    groups.push({ label: labels.pinned, posts: pinnedPosts, isPinnedGroup: true });
  }

  // Date-based groups for non-pinned posts
  const dateGroups: { label: string; posts: Post[] }[] = [
    { label: labels.today, posts: [] },
    { label: labels.yesterday, posts: [] },
    { label: labels.thisWeek, posts: [] },
    { label: labels.older, posts: [] },
  ];

  nonPinnedPosts.forEach((post) => {
    const createdAt = post.createdAt as { toDate?: () => Date } | Date | string;
    const postDate = typeof createdAt === 'object' && createdAt && 'toDate' in createdAt
      ? createdAt.toDate?.() || new Date()
      : new Date(createdAt as string | Date);
    if (postDate >= today) {
      dateGroups[0].posts.push(post);
    } else if (postDate >= yesterday) {
      dateGroups[1].posts.push(post);
    } else if (postDate >= weekAgo) {
      dateGroups[2].posts.push(post);
    } else {
      dateGroups[3].posts.push(post);
    }
  });

  // Add non-empty date groups
  dateGroups.forEach((g) => {
    if (g.posts.length > 0) {
      groups.push(g);
    }
  });

  return groups;
}

const menuItems = [
  {
    nameKey: "chat" as const,
    href: "/app",
    color: "orange",
    activeClasses: "bg-orange-500/10 text-orange-500",
    hoverClasses: "hover:text-orange-500 hover:bg-orange-500/5",
    indicatorColor: "bg-orange-500",
    icon: (isActive: boolean) => (
      <svg className="w-5 h-5" fill={isActive ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={isActive ? 0 : 2}
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
        />
      </svg>
    ),
  },
  {
    nameKey: "history" as const,
    href: "/history",
    color: "cyan",
    activeClasses: "bg-cyan-500/10 text-cyan-500",
    hoverClasses: "hover:text-cyan-500 hover:bg-cyan-500/5",
    indicatorColor: "bg-cyan-500",
    icon: (isActive: boolean) => (
      <svg className="w-5 h-5" fill={isActive ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={isActive ? 0 : 2}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
  {
    nameKey: "schedule" as const,
    href: "/schedule",
    hasBadge: true,
    color: "violet",
    activeClasses: "bg-violet-500/10 text-violet-500",
    hoverClasses: "hover:text-violet-500 hover:bg-violet-500/5",
    indicatorColor: "bg-violet-500",
    icon: (isActive: boolean) => (
      <svg className="w-5 h-5" fill={isActive ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={isActive ? 0 : 2}
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    ),
  },
  {
    nameKey: "analytics" as const,
    href: "/analytics",
    color: "emerald",
    activeClasses: "bg-emerald-500/10 text-emerald-500",
    hoverClasses: "hover:text-emerald-500 hover:bg-emerald-500/5",
    indicatorColor: "bg-emerald-500",
    icon: (isActive: boolean) => (
      <svg className="w-5 h-5" fill={isActive ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={isActive ? 0 : 2}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
    ),
  },
];

export default function SlideMenu({ isOpen, onClose, onOpen, posts = [], onPostUpdate }: SlideMenuProps) {
  const pathname = usePathname();
  const { user, userProfile } = useAuth();
  const { t } = useLanguage();
  const schedulingPendingCount = useSchedulingPendingCount();
  const [searchQuery, setSearchQuery] = useState("");
  const [showChatList, setShowChatList] = useState(true);

  // Local state for optimistic updates
  const [localPosts, setLocalPosts] = useState<Post[]>(posts);
  const [postToDelete, setPostToDelete] = useState<Post | null>(null);
  const [postToRename, setPostToRename] = useState<Post | null>(null);

  // Sync local posts with prop
  useEffect(() => {
    setLocalPosts(posts);
  }, [posts]);

  // Filter and group posts
  const filteredPosts = useMemo(() => {
    if (!searchQuery) return localPosts;
    return localPosts.filter((post) =>
      post.prompt.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [localPosts, searchQuery]);

  const groupedPosts = useMemo(
    () => groupPostsByDate(filteredPosts, {
      pinned: t.sidebar.pinned,
      today: t.sidebar.today,
      yesterday: t.sidebar.yesterday,
      thisWeek: t.sidebar.thisWeek,
      older: t.sidebar.older,
    }),
    [filteredPosts, t.sidebar]
  );

  // Handle escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose]
  );

  // Centralized scroll lock
  useScrollLock(isOpen);

  // Add event listener for escape key
  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, handleKeyDown]);

  // Block horizontal swipe gestures when sidebar is open
  // This prevents browser back gesture, page reload, and theme changes on swipe
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const isSwipeBlocked = useRef(false);

  useEffect(() => {
    if (!isOpen) return;

    const handleTouchStart = (e: TouchEvent) => {
      // Don't track touch on form elements
      const target = e.target as HTMLElement;
      const isFormElement = target.tagName === "INPUT" ||
                           target.tagName === "TEXTAREA" ||
                           target.tagName === "SELECT" ||
                           target.closest("input, textarea, select") !== null;
      if (isFormElement) {
        touchStartX.current = null;
        touchStartY.current = null;
        return;
      }

      if (e.touches.length === 1) {
        touchStartX.current = e.touches[0].clientX;
        touchStartY.current = e.touches[0].clientY;
        isSwipeBlocked.current = false;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (touchStartX.current === null || touchStartY.current === null) return;
      if (e.touches.length !== 1) return;

      // Don't block touch interactions on form elements (input, textarea, select)
      const target = e.target as HTMLElement;
      const isFormElement = target.tagName === "INPUT" ||
                           target.tagName === "TEXTAREA" ||
                           target.tagName === "SELECT" ||
                           target.closest("input, textarea, select") !== null;
      if (isFormElement) return;

      const touch = e.touches[0];
      const deltaX = touch.clientX - touchStartX.current;
      const deltaY = Math.abs(touch.clientY - touchStartY.current);
      const absDeltaX = Math.abs(deltaX);

      // Block ALL horizontal movements when sidebar is open (except form elements)
      // This prevents: browser back gesture, pull-to-refresh, theme changes, page reload
      if (absDeltaX > deltaY && absDeltaX > 5) {
        e.preventDefault();
        e.stopPropagation();
        isSwipeBlocked.current = true;
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      // If we blocked a swipe, also prevent the touchend from triggering any navigation
      if (isSwipeBlocked.current) {
        e.preventDefault();
        e.stopPropagation();
      }
      touchStartX.current = null;
      touchStartY.current = null;
      isSwipeBlocked.current = false;
    };

    // Add listeners to document to catch all touch events when sidebar is open
    // Use capture phase to intercept before any other handlers
    document.addEventListener("touchstart", handleTouchStart, { passive: true, capture: true });
    document.addEventListener("touchmove", handleTouchMove, { passive: false, capture: true });
    document.addEventListener("touchend", handleTouchEnd, { passive: false, capture: true });
    document.addEventListener("touchcancel", handleTouchEnd, { passive: true, capture: true });

    // Add touch-action CSS to body to further prevent gestures
    document.body.style.touchAction = "pan-y";
    document.documentElement.style.touchAction = "pan-y";
    // Prevent overscroll which can trigger page reload
    document.body.style.overscrollBehavior = "none";
    document.documentElement.style.overscrollBehavior = "none";

    return () => {
      document.removeEventListener("touchstart", handleTouchStart, { capture: true });
      document.removeEventListener("touchmove", handleTouchMove, { capture: true });
      document.removeEventListener("touchend", handleTouchEnd, { capture: true });
      document.removeEventListener("touchcancel", handleTouchEnd, { capture: true });
      document.body.style.touchAction = "";
      document.documentElement.style.touchAction = "";
      document.body.style.overscrollBehavior = "";
      document.documentElement.style.overscrollBehavior = "";
      touchStartX.current = null;
      touchStartY.current = null;
      isSwipeBlocked.current = false;
    };
  }, [isOpen]);

  // Handle pin/unpin
  const handlePin = async (postId: string, isPinned: boolean) => {
    // Optimistic update
    setLocalPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, isPinned } : p))
    );

    try {
      await pinPost(postId, isPinned);
      toast.success(isPinned ? t.toasts.conversationPinned : t.toasts.conversationUnpinned);
      onPostUpdate?.();
    } catch (error) {
      console.error("Error pinning post:", error);
      // Revert on error
      setLocalPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, isPinned: !isPinned } : p))
      );
      toast.error(t.toasts.errorPinning);
    }
  };

  // Handle rename click (opens modal)
  const handleRename = (postId: string) => {
    const post = localPosts.find((p) => p.id === postId);
    if (post) {
      setPostToRename(post);
    }
  };

  // Handle rename submit
  const handleRenameSubmit = async (postId: string, newTitle: string) => {
    // Optimistic update
    setLocalPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, title: newTitle } : p))
    );

    try {
      await renamePost(postId, newTitle);
      toast.success(t.toasts.conversationRenamed);
      onPostUpdate?.();
    } catch (error) {
      console.error("Error renaming post:", error);
      toast.error(t.toasts.errorRenaming);
    }
  };

  // Handle delete click (opens modal)
  const handleDeleteClick = (postId: string) => {
    const post = localPosts.find((p) => p.id === postId);
    if (post) {
      setPostToDelete(post);
    }
  };

  // Handle delete confirm
  const handleDeleteConfirm = async (postId: string) => {
    // Optimistic update
    setLocalPosts((prev) => prev.filter((p) => p.id !== postId));

    try {
      await deletePost(postId);
      toast.success(t.toasts.conversationDeleted);
      onPostUpdate?.();
    } catch (error) {
      console.error("Error deleting post:", error);
      // Revert - re-fetch posts
      onPostUpdate?.();
      toast.error(t.toasts.errorDelete);
    }
  };

  return (
    <>
      {/* Overlay - blocks all touch gestures when open */}
      <div
        className={`
          fixed inset-0 z-[60] popup-overlay
          transition-opacity duration-300
          lg:hidden
          ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}
        `}
        onClick={onClose}
        aria-hidden="true"
        style={{ touchAction: isOpen ? "none" : "auto" }}
      />

      {/* Slide Menu - PWA Safe Area Support */}
      <aside
        className={`
          fixed top-0 left-0 z-[70] h-full w-[85vw] max-w-80
          bg-background-warm dark:bg-dark-card border-r border-[#F8935D]/10 dark:border-dark-border
          flex flex-col
          transform transition-transform duration-300 ease-smooth
          lg:hidden
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
        style={{
          touchAction: "pan-y",
          paddingTop: "env(safe-area-inset-top, 0px)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#F8935D]/10 dark:border-dark-border">
          <Link href="/app" className="flex items-center gap-2.5 group min-w-0 flex-1" onClick={onClose}>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl overflow-hidden flex items-center justify-center shadow-glow transition-transform group-hover:scale-105 flex-shrink-0">
              <img
                src="/logo.jpg"
                alt="Posty Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <span className="font-bold text-gray-900 dark:text-white text-lg sm:text-xl truncate">Posty</span>
          </Link>
          <button
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] p-2.5 flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-[#F8935D]/10 dark:hover:bg-dark-hover rounded-lg transition-all duration-200 haptic-feedback"
            aria-label={t.sidebar.closeMenu}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {/* Symmetric X icon - both lines use absolute coordinates */}
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 6L18 18" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6" />
            </svg>
          </button>
        </div>

        {/* Navigation - overscroll-contain prevents scroll chaining */}
        <nav className="flex-1 p-4 overflow-y-auto no-scrollbar overscroll-contain">
          {/* New post button - Enhanced with shimmer glow */}
          <div className="relative mb-5 group">
            {/* Animated glow effect - orange AUTOSCROLL */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-primary via-orange-500 to-primary rounded-lg opacity-75 blur-sm group-hover:opacity-100 animate-pulse-glow" />

            <Link
              href="/app"
              onClick={onClose}
              className="
                relative flex items-center justify-center gap-3 w-full px-4 py-3.5
                bg-gradient-to-r from-orange-500 via-orange-400 to-orange-500
                hover:from-orange-600 hover:via-orange-500 hover:to-orange-600
                text-white rounded-xl
                transition-all duration-200 ease-out
                shadow-lg hover:shadow-xl
                active:scale-[0.97] active:transition-none
                haptic-feedback
                overflow-hidden
              "
              style={{
                boxShadow: "0 4px 20px rgba(249, 115, 22, 0.3)",
              }}
            >
              {/* Shimmer overlay - enhanced */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-shimmer-enhanced" />

              <svg
                className="w-5 h-5 relative z-10"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                style={{
                  filter: "drop-shadow(0 0 4px rgba(255, 255, 255, 0.5))",
                }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>

              <span className="font-bold relative z-10">{t.sidebar.newPost}</span>

              {/* Emoji indicator */}
              <span className="relative z-10 text-sm animate-pulse">✨</span>
            </Link>
          </div>

          {/* Search bar */}
          <div className="relative mb-5">
            <svg
              className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted"
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
              placeholder={t.sidebar.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="
                w-full pl-11 pr-4 py-3 text-sm
                bg-white/70 dark:bg-dark-bg border border-[#F8935D]/15 dark:border-dark-border rounded-lg
                text-text-primary placeholder-text-muted
                focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary
                transition-all duration-200
              "
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-1 top-1/2 -translate-y-1/2 min-w-[44px] min-h-[44px] flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 6L18 18" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6" />
                </svg>
              </button>
            )}
          </div>

          {/* Nav items - Enhanced with vivid colors and glow effects */}
          <div className="space-y-1">
            {menuItems.map((item) => {
              const isActive = pathname === item.href || (item.href === "/app" && pathname === "/chat");
              const itemName = t.nav[item.nameKey];
              const showBadge = item.hasBadge && schedulingPendingCount > 0;

              // Color mapping for glow effects
              const glowColors = {
                orange: "rgba(249, 115, 22, 0.35)",
                cyan: "rgba(6, 182, 212, 0.35)",
                violet: "rgba(139, 92, 246, 0.35)",
              };

              return (
                <div key={item.nameKey} className="relative">
                  {/* Enhanced active indicator with glow */}
                  {isActive && (
                    <div
                      className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-full ${
                        item.color === "orange"
                          ? "bg-orange-500"
                          : item.color === "cyan"
                          ? "bg-cyan-500"
                          : item.color === "violet"
                          ? "bg-violet-500"
                          : "bg-primary"
                      }`}
                      style={{
                        boxShadow: `0 0 12px ${glowColors[item.color as keyof typeof glowColors]}`,
                      }}
                    />
                  )}

                  {/* Glow effect behind active item */}
                  {isActive && (
                    <div
                      className="absolute inset-0 rounded-lg blur-xl pointer-events-none"
                      style={{
                        background: `radial-gradient(circle at center left, ${glowColors[item.color as keyof typeof glowColors]} 0%, transparent 60%)`,
                      }}
                    />
                  )}

                  <Link
                    href={item.href}
                    onClick={onClose}
                    className={`
                      relative flex items-center gap-3 px-4 py-2 rounded-lg
                      transition-all duration-200 ease-out group haptic-feedback
                      transform-gpu overflow-hidden
                      ${
                        isActive
                          ? item.activeClasses
                          : `text-text-secondary ${item.hoverClasses} hover:translate-x-1 active:scale-[0.98] active:transition-none`
                      }
                    `}
                  >
                    {/* Vivid colored icon with enhanced glow */}
                    <span
                      className={`
                        relative transition-all duration-200
                        ${isActive ? "scale-110" : "group-hover:scale-110"}
                        ${item.color === "orange" ? "text-orange-500" : ""}
                        ${item.color === "cyan" ? "text-cyan-500" : ""}
                        ${item.color === "violet" ? "text-violet-500" : ""}
                      `}
                      style={isActive ? {
                        filter: `drop-shadow(0 0 6px ${glowColors[item.color as keyof typeof glowColors]})`
                      } : undefined}
                    >
                      {item.icon(isActive)}
                    </span>

                    <span className="font-bold flex-1">{itemName}</span>

                    {showBadge && (
                      <div className="relative flex-shrink-0">
                        {/* Pulsing glow effect for visibility */}
                        <div className="absolute inset-0 bg-violet-500/30 rounded-full blur-md animate-pulse" />

                        {/* Badge with enhanced styling */}
                        <span
                          className="relative px-2.5 py-0.5 text-xs font-bold bg-gradient-to-r from-violet-500 via-purple-500 to-violet-500 text-white rounded-full min-w-[24px] text-center shadow-lg flex items-center justify-center"
                          style={{
                            boxShadow: "0 0 12px rgba(139, 92, 246, 0.5), 0 0 20px rgba(139, 92, 246, 0.3)",
                          }}
                        >
                          {schedulingPendingCount}
                        </span>
                      </div>
                    )}

                    {/* Arrow indicator for active state */}
                    {isActive && (
                      <svg
                        className={`
                          w-4 h-4 transition-all duration-200
                          ${item.color === "orange" ? "text-orange-500" : ""}
                          ${item.color === "cyan" ? "text-cyan-500" : ""}
                          ${item.color === "violet" ? "text-violet-500" : ""}
                        `}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    )}
                  </Link>
                </div>
              );
            })}
          </div>

          {/* Chat list section - Compact spacing */}
          <div className="mt-4">
            {/* Toggle header - Enhanced with color */}
            <button
              onClick={() => setShowChatList(!showChatList)}
              className="group flex items-center justify-between w-full px-3 py-2 text-text-muted hover:text-text-primary hover:bg-[#F8935D]/10 dark:hover:bg-dark-hover transition-all duration-200 rounded-lg"
            >
              <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-blue-500 group-hover:text-blue-600 transition-colors"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
                {t.sidebar.conversations}
              </span>
              <div className="flex items-center gap-2">
                <span
                  className="text-2xs font-bold text-white bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-500 px-2.5 py-0.5 rounded-full shadow-lg"
                  style={{
                    boxShadow: "0 0 8px rgba(59, 130, 246, 0.4)",
                  }}
                >
                  {localPosts.length}
                </span>
                <svg
                  className={`w-4 h-4 transition-all duration-200 text-blue-500 ${showChatList ? "rotate-0" : "-rotate-90"}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            {/* Grouped posts - No max-height for unified scroll */}
            <div
              className={`
                transition-all duration-300 ease-smooth
                ${showChatList ? "opacity-100" : "max-h-0 opacity-0 overflow-hidden"}
              `}
            >
              {groupedPosts.length > 0 ? (
                <>
                  {groupedPosts.map((group, groupIndex) => {
                    // Determine group visual properties
                    const isToday = group.label.includes(t.sidebar.today || "Aujourd'hui");
                    const isYesterday = group.label.includes(t.sidebar.yesterday || "Hier");
                    const isPinned = group.isPinnedGroup;

                    return (
                      <div key={group.label} className={groupIndex > 0 ? "mt-2.5" : "mt-1.5"}>
                        {/* Enhanced group header with vivid icons */}
                        <div className={`
                          px-3 py-1 rounded-lg mb-0.5
                          flex items-center gap-2
                          ${isPinned ? "bg-violet-500/5 dark:bg-violet-500/10" : ""}
                          ${isToday ? "bg-emerald-500/5 dark:bg-emerald-500/10" : ""}
                          ${isYesterday ? "bg-blue-500/5 dark:bg-blue-500/10" : ""}
                        `}>
                          {/* Vivid colored icon based on group type */}
                          {isPinned && (
                            <svg
                              className="w-4 h-4 text-violet-500 dark:text-violet-400"
                              fill="currentColor"
                              viewBox="0 0 24 24"
                              style={{
                                filter: "drop-shadow(0 0 4px rgba(139, 92, 246, 0.3))",
                              }}
                            >
                              <path d="M16 4a1 1 0 0 1 1 1v3.586l1.707 1.707a1 1 0 0 1 .293.707v2a1 1 0 0 1-1 1h-4v6a1 1 0 0 1-2 0v-6H8a1 1 0 0 1-1-1v-2a1 1 0 0 1 .293-.707L9 8.586V5a1 1 0 0 1 1-1h6z"/>
                            </svg>
                          )}
                          {isToday && (
                            <svg
                              className="w-4 h-4 text-emerald-500 dark:text-emerald-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              style={{
                                filter: "drop-shadow(0 0 4px rgba(16, 185, 129, 0.3))",
                              }}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                              />
                            </svg>
                          )}
                          {isYesterday && (
                            <svg
                              className="w-4 h-4 text-blue-500 dark:text-blue-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              style={{
                                filter: "drop-shadow(0 0 4px rgba(59, 130, 246, 0.3))",
                              }}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                              />
                            </svg>
                          )}
                          {!isPinned && !isToday && !isYesterday && (
                            <svg
                              className="w-4 h-4 text-amber-500 dark:text-amber-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              style={{
                                filter: "drop-shadow(0 0 4px rgba(245, 158, 11, 0.3))",
                              }}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                          )}

                          {/* Group label with enhanced color */}
                          <span className={`
                            text-2xs font-bold uppercase tracking-wider
                            ${isPinned ? "text-violet-600 dark:text-violet-400" : ""}
                            ${isToday ? "text-emerald-600 dark:text-emerald-400" : ""}
                            ${isYesterday ? "text-blue-600 dark:text-blue-400" : ""}
                            ${!isPinned && !isToday && !isYesterday ? "text-amber-600 dark:text-amber-400" : ""}
                          `}>
                            {group.label}
                          </span>

                          {/* Post count badge - Enhanced with consistent styling */}
                          <span className={`
                            ml-auto text-2xs font-bold px-2 py-0.5 rounded-full
                            transition-all duration-200
                            ${isPinned ? "bg-violet-100 dark:bg-violet-500/25 text-violet-700 dark:text-violet-300 ring-1 ring-violet-200 dark:ring-violet-500/30" : ""}
                            ${isToday ? "bg-emerald-100 dark:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-200 dark:ring-emerald-500/30" : ""}
                            ${isYesterday ? "bg-blue-100 dark:bg-blue-500/25 text-blue-700 dark:text-blue-300 ring-1 ring-blue-200 dark:ring-blue-500/30" : ""}
                            ${!isPinned && !isToday && !isYesterday ? "bg-amber-100 dark:bg-amber-500/25 text-amber-700 dark:text-amber-300 ring-1 ring-amber-200 dark:ring-amber-500/30" : ""}
                          `}>
                            {group.posts.length}
                          </span>
                        </div>

                        {/* Posts list - Compact spacing for professional look */}
                        <div className="space-y-0.5 mt-0.5">
                          {group.posts.map((post) => {
                          const isActive = pathname === `/app/c/${post.id}`;
                          return (
                            <div
                              key={post.id}
                              className={`
                                relative flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm
                                transition-all duration-200 ease-out group haptic-feedback
                                cursor-pointer transform-gpu
                                active:scale-[0.98] active:transition-none
                                ${
                                  isActive
                                    ? "bg-primary/10 dark:bg-primary/10 text-text-primary border-l-2 border-primary pl-[10px] shadow-sm"
                                    : "text-text-secondary hover:text-text-primary hover:bg-[#F8935D]/10 dark:hover:bg-dark-hover hover:border-l-2 hover:border-primary/40 hover:pl-[10px]"
                                }
                              `}
                            >
                            {/* Pin indicator - Premium violet color */}
                            {post.isPinned && (
                              <svg
                                className="w-3.5 h-3.5 shrink-0 text-violet-500 dark:text-violet-400 group-hover:scale-110 transition-transform duration-200"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path d="M16 4a1 1 0 0 1 1 1v3.586l1.707 1.707a1 1 0 0 1 .293.707v2a1 1 0 0 1-1 1h-4v6a1 1 0 0 1-2 0v-6H8a1 1 0 0 1-1-1v-2a1 1 0 0 1 .293-.707L9 8.586V5a1 1 0 0 1 1-1h6z"/>
                              </svg>
                            )}
                            <Link
                              href={`/app/c/${post.id}`}
                              onClick={onClose}
                              className="flex items-center gap-2 flex-1 min-w-0"
                            >
                              {!post.isPinned && (
                                <svg
                                  className={`w-4 h-4 shrink-0 group-hover:scale-110 transition-all duration-200 ${
                                    isActive ? "text-primary" : "text-text-muted group-hover:text-primary"
                                  }`}
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                                  />
                                </svg>
                              )}
                              <span className={`truncate flex-1 group-hover:translate-x-0.5 transition-transform duration-200 ${
                                isActive ? "font-semibold" : ""
                              }`}>
                                {(post.title || post.prompt).slice(0, 30)}
                                {(post.title || post.prompt).length > 30 ? "..." : ""}
                              </span>
                            </Link>
                            {/* Options menu */}
                            <div className="shrink-0">
                              <ConversationOptionsMenu
                                post={post}
                                onPin={handlePin}
                                onRename={handleRename}
                                onDelete={handleDeleteClick}
                              />
                            </div>
                          </div>
                          );
                        })}
                        </div>
                      </div>
                    );
                  })}

                  {/* View all button - Always show for full history page access */}
                  {localPosts.length > 0 && (
                    <Link
                      href="/history"
                      onClick={onClose}
                      className="
                        flex items-center justify-center gap-2 mt-4 px-3 py-2.5
                        text-sm text-primary hover:text-accent
                        hover:bg-primary/5 rounded-lg transition-all duration-200 haptic-feedback
                      "
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                      </svg>
                      {t.sidebar.viewAllHistory}
                    </Link>
                  )}
                </>
              ) : (
                <div className="px-3 py-8 text-center">
                  <div className="w-12 h-12 mx-auto mb-3 bg-[#F8935D]/10 dark:bg-dark-elevated rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {searchQuery ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      )}
                    </svg>
                  </div>
                  <p className="text-sm text-text-muted">
                    {searchQuery ? t.sidebar.noResults : t.sidebar.noConversations}
                  </p>
                  {searchQuery && (
                    <p className="text-xs text-text-muted mt-1">{t.sidebar.forQuery} &ldquo;{searchQuery}&rdquo;</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </nav>

        {/* Footer - User Profile Menu with safe area for iOS home indicator */}
        <div
          className="px-3 py-3 border-t border-gray-200 dark:border-dark-border"
          style={{
            paddingBottom: "max(env(safe-area-inset-bottom, 0px), 12px)",
          }}
        >
          {user ? (
            // Compact profile container - reduced width for balanced mobile appearance
            <div className="max-w-[92%]">
              <ProfileMenu onNavigate={onClose} />
            </div>
          ) : (
            <div className="space-y-2">
              <Link
                href="/login"
                onClick={onClose}
                className="
                  flex items-center justify-center gap-2 w-full px-4 py-3
                  bg-gradient-to-r from-primary to-primary-hover
                  hover:from-primary-hover hover:to-primary
                  text-white font-medium rounded-lg
                  transition-all duration-200 shadow-glow hover:shadow-lg haptic-feedback
                "
              >
                {t.common.login}
              </Link>
              <Link
                href="/signup"
                onClick={onClose}
                className="
                  flex items-center justify-center gap-2 w-full px-4 py-3
                  text-text-secondary hover:text-text-primary
                  bg-[#F8935D]/5 dark:bg-dark-elevated hover:bg-[#F8935D]/10 dark:hover:bg-dark-hover
                  border border-gray-200 dark:border-dark-border hover:border-primary/30
                  rounded-lg transition-all duration-200 haptic-feedback
                "
              >
                {t.auth.createAccount}
              </Link>
            </div>
          )}
        </div>
      </aside>

      {/* Modals */}
      <RenameConversationModal
        isOpen={!!postToRename}
        onClose={() => setPostToRename(null)}
        post={postToRename}
        onRename={handleRenameSubmit}
      />

      <DeleteConfirmModal
        isOpen={!!postToDelete}
        onClose={() => setPostToDelete(null)}
        post={postToDelete}
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
}
