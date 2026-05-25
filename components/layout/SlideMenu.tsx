"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useScheduling } from "@/contexts/SchedulingContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { PlanType, meetsMinimumPlan } from "@/lib/config/plans";
import { Post } from "@/types";
import { pinPost, renamePost, deletePost } from "@/lib/db/firestore";
import toast from "@/components/ui/Toast";
import ConversationOptionsMenu from "@/components/conversation/ConversationOptionsMenu";
import RenameConversationModal from "@/components/conversation/RenameConversationModal";
import DeleteConfirmModal from "@/components/conversation/DeleteConfirmModal";
import ProfileMenu from "@/components/layout/ProfileMenu";
import SidebarSearchModal from "@/components/layout/SidebarSearchModal";
import { useScrollLock } from "@/hooks/ui/useScrollLock";

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

/**
 * Nav data — each item has a soft accent color for its icon (low saturation
 * for visual cohesion). The active state uses the primary color + a shared
 * `layoutId` indicator pill for smooth transitions between items.
 */
const menuItems: {
  nameKey: "chat" | "history" | "schedule" | "analytics";
  href: string;
  iconColor: string;
  icon: (isActive: boolean) => React.ReactNode;
  requiredPlan?: PlanType;
}[] = [
  {
    nameKey: "chat" as const,
    href: "/app",
    iconColor: "text-[#F8935D]",
    icon: (isActive: boolean) => (
      <svg className="w-[18px] h-[18px]" fill={isActive ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={isActive ? 0 : 1.75}
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
        />
      </svg>
    ),
  },
  {
    nameKey: "history" as const,
    href: "/history",
    iconColor: "text-cyan-500/80 dark:text-cyan-400/80",
    icon: (isActive: boolean) => (
      <svg className="w-[18px] h-[18px]" fill={isActive ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={isActive ? 0 : 1.75}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
  {
    nameKey: "schedule" as const,
    href: "/schedule",
    requiredPlan: "pro",
    iconColor: "text-violet-500/80 dark:text-violet-400/80",
    icon: (isActive: boolean) => (
      <svg className="w-[18px] h-[18px]" fill={isActive ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={isActive ? 0 : 1.75}
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    ),
  },
  {
    nameKey: "analytics" as const,
    href: "/analytics",
    iconColor: "text-emerald-500/80 dark:text-emerald-400/80",
    icon: (isActive: boolean) => (
      <svg className="w-[18px] h-[18px]" fill={isActive ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={isActive ? 0 : 1.75}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
    ),
  },
];

export default function SlideMenu({ isOpen, onClose, onOpen, posts = [], onPostUpdate }: SlideMenuProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, userProfile } = useAuth();
  const { t } = useLanguage();
  const { refreshScheduledPosts } = useScheduling();
  const { currentPlan } = useSubscription();
  const [searchQuery, setSearchQuery] = useState("");
  // Whether the ChatGPT-style search modal is open (mirrors desktop UX).
  const [searchOpen, setSearchOpen] = useState(false);
  const [showChatList, setShowChatList] = useState(true);

  // Local state for optimistic updates
  const [localPosts, setLocalPosts] = useState<Post[]>(posts);
  const [postToDelete, setPostToDelete] = useState<Post | null>(null);
  const [postToRename, setPostToRename] = useState<Post | null>(null);

  // Per-route signature ambient — mirrors MainLayout's toneBg mapping so the
  // mobile drawer wears the SAME atmosphere as the page underneath. The
  // gradient lives on the sidebar itself (not a bleed-through), because the
  // popup overlay between sidebar and page would otherwise darken everything.
  const toneBg = (() => {
    const p = pathname || "";
    if (p.startsWith("/app/c/")) return "posty-soft-posts";
    if (p === "/app" || p.startsWith("/app/")) return "posty-soft-welcome";
    if (p.startsWith("/history")) return "posty-soft-visuals";
    if (p.startsWith("/schedule")) return "posty-soft-schedule";
    if (p.startsWith("/analytics") || p.startsWith("/dashboard")) return "posty-soft-optimize";
    if (p.startsWith("/settings")) return "posty-soft-welcome";
    if (p.startsWith("/profile") || p.startsWith("/brand")) return "posty-soft-visuals";
    if (p.startsWith("/subscription") || p.startsWith("/pricing")) return "posty-soft-posts";
    if (p.startsWith("/chat")) return "posty-soft-posts";
    return "posty-soft-welcome";
  })();


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

      // Don't block touch interactions on interactive elements
      const target = e.target as HTMLElement;
      const isInteractive = target.tagName === "INPUT" ||
                           target.tagName === "TEXTAREA" ||
                           target.tagName === "SELECT" ||
                           target.tagName === "A" ||
                           target.tagName === "BUTTON" ||
                           target.closest("a, button, input, textarea, select, [role='button']") !== null;
      if (isInteractive) return;

      const touch = e.touches[0];
      const deltaX = touch.clientX - touchStartX.current;
      const deltaY = Math.abs(touch.clientY - touchStartY.current);
      const absDeltaX = Math.abs(deltaX);

      // Block horizontal swipe gestures on the overlay area only
      // Threshold raised to 15px to avoid catching normal taps with slight finger drift
      if (absDeltaX > deltaY && absDeltaX > 15) {
        e.preventDefault();
        e.stopPropagation();
        isSwipeBlocked.current = true;
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      // Only block touchend for actual swipe gestures (not taps on links/buttons)
      if (isSwipeBlocked.current) {
        const target = e.target as HTMLElement;
        const isInteractive = target.closest("a, button, [role='button']") !== null;
        if (!isInteractive) {
          e.preventDefault();
          e.stopPropagation();
        }
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

    // Allow taps (manipulation) and vertical scroll (pan-y) but prevent horizontal gestures
    document.body.style.touchAction = "manipulation";
    document.documentElement.style.touchAction = "manipulation";
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
    const isViewingDeleted = pathname === `/app/c/${postId}`;

    // Optimistic update
    setLocalPosts((prev) => prev.filter((p) => p.id !== postId));

    try {
      await deletePost(postId);
      toast.success(t.toasts.conversationDeleted);
      onPostUpdate?.();
      // Refresh badge in case a linked scheduled post was cascade-deleted
      await refreshScheduledPosts();
    } catch (error) {
      console.error("Error deleting post:", error);
      // Revert - re-fetch posts
      onPostUpdate?.();
      toast.error(t.toasts.errorDelete);
      return;
    }

    // Close modal and menu
    setPostToDelete(null);
    onClose();

    // Redirect if user was viewing the deleted conversation
    if (isViewingDeleted) {
      router.push(`/app?new=${Date.now()}`);
    }
  };

  return (
    <>
      {/* Overlay - blocks all touch gestures when open */}
      {/* Uses will-change and contain to prevent repaints on body during animation */}
      <div
        className={`
          fixed inset-0 z-[60] popup-overlay
          transition-opacity duration-300
          lg:hidden
          ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}
        `}
        onClick={onClose}
        aria-hidden="true"
        style={{
          touchAction: isOpen ? "manipulation" : "auto",
          contain: "strict",
          willChange: "opacity",
        }}
      />

      {/* Slide Menu — gradient base + polished glass finishing (sheen,
          ring-inset, multi-shadow, white-tinted borders). Pas de pleine
          translucidité car le popup-overlay derrière assombrirait tout. */}
      <aside
        className={`
          fixed top-0 left-0 z-[70] h-full w-[85vw] max-w-80
          ${toneBg}
          border-r border-white/60 dark:border-white/20
          ring-1 ring-inset ring-white/40 dark:ring-white/10
          shadow-[0_20px_60px_rgba(15,17,21,0.20),0_4px_16px_rgba(15,17,21,0.10)]
          dark:shadow-[0_20px_60px_rgba(0,0,0,0.55),0_4px_16px_rgba(0,0,0,0.35)]
          flex flex-col
          transform transition-transform duration-300 ease-smooth
          lg:hidden
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
        style={{
          touchAction: "pan-y",
          paddingTop: "env(safe-area-inset-top, 0px)",
          contain: "layout style",
          willChange: "transform",
        }}
      >
        {/* Glass sheen — fine horizontal highlight running along the top
            edge, catches the light to read as polished glass. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-4 top-0 h-px rounded-full bg-gradient-to-r from-transparent via-white/80 dark:via-white/40 to-transparent z-[1]"
        />
        {/* Subtle internal gradient wash — adds matter without obstructing
            the per-page ambient bleeding through from behind. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/20 via-white/[0.02] to-transparent dark:from-white/[0.04] dark:via-transparent z-0"
        />
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200/55 dark:border-dark-border">
          <Link href="/app" className="flex items-center gap-2.5 group min-w-0 flex-1" onClick={onClose}>
            <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-2xl overflow-hidden shadow-glow transition-transform group-hover:scale-105 flex-shrink-0">
              <img
                src="/logo.png"
                alt="Posty Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <span translate="no" className="notranslate font-bold text-gray-900 dark:text-white text-lg sm:text-xl truncate">Posty</span>
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

        {/* Fixed section: search + new post */}
        <div className="shrink-0 px-4 pt-4 pb-2">
          {/* Search trigger — looks like an input but is a button. Tapping it
              opens the ChatGPT-style search modal (same component used on
              desktop), keeping mobile + desktop UX consistent. The modal
              owns the actual input + auto-focus + result list. */}
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            aria-haspopup="dialog"
            className="
              relative w-full mb-3 pl-11 pr-4 py-3
              flex items-center
              text-left text-sm
              bg-white/70 dark:bg-dark-bg border border-[#F8935D]/15 dark:border-dark-border rounded-lg
              text-text-muted hover:text-text-primary
              hover:border-[#F8935D]/30
              focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary
              transition-[border-color,box-shadow,color] duration-150
            "
          >
            <svg
              className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <span className="flex-1 truncate">
              {searchQuery || t.sidebar.searchPlaceholder}
            </span>
            {searchQuery && (
              <span
                role="button"
                aria-label={t.common.close}
                onClick={(e) => {
                  // Stop propagation so we don't also open the modal
                  e.stopPropagation();
                  setSearchQuery("");
                }}
                className="ml-2 inline-flex items-center justify-center w-6 h-6 rounded text-text-muted hover:text-text-primary hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 6L18 18" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6" />
                </svg>
              </span>
            )}
          </button>

          {/* New post button — refined: tighter padding, subtler shadow */}
          <button
            onClick={() => {
              onClose();
              router.push(`/app?new=${Date.now()}`);
            }}
            className="
              flex items-center justify-center gap-2 w-full px-4 py-2.5
              bg-primary hover:bg-primary-hover
              text-white text-[13.5px] font-semibold rounded-lg
              transition-all duration-200 ease-out cursor-pointer
              shadow-sm shadow-primary/20 hover:shadow-md hover:shadow-primary/25
              active:scale-[0.98] active:transition-none
              haptic-feedback group
            "
          >
            <svg
              className="w-[18px] h-[18px] transition-transform duration-200 group-hover:rotate-90"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>{t.sidebar.newPost}</span>
          </button>
        </div>

        {/* Scrollable navigation - overscroll-contain prevents scroll chaining */}
        <nav className="flex-1 p-4 pt-2 overflow-y-auto no-scrollbar overscroll-contain">
          {/* Nav items — grouped card for visual hierarchy */}
          <div className="sidebar-nav-card rounded-xl overflow-hidden ring-1 ring-gray-200/40 dark:ring-white/[0.04] bg-white/15 dark:bg-white/[0.02]">
            {menuItems.map((item) => {
              const isActive = pathname === item.href || (item.href === "/app" && pathname === "/chat");
              const itemName = t.nav[item.nameKey];
              const isLocked = item.requiredPlan && !meetsMinimumPlan(currentPlan as PlanType, item.requiredPlan);

              return (
                <div key={item.nameKey} className="relative">
                  {/* Shared active indicator — slides smoothly between items via layoutId */}
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active-indicator"
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full bg-primary"
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    />
                  )}

                  <Link
                    href={item.href}
                    onClick={onClose}
                    className={`
                      relative flex items-center gap-3 px-3 py-2
                      transition-colors duration-150 ease-out group haptic-feedback
                      ${isLocked
                        ? "text-gray-400 dark:text-gray-500 hover:bg-white/70 dark:hover:bg-white/[0.05]"
                        : isActive
                          ? "bg-primary/[0.09] dark:bg-primary/[0.13] text-primary"
                          : "text-gray-700 dark:text-gray-200 hover:bg-white/70 dark:hover:bg-white/[0.05] hover:text-gray-900 dark:hover:text-white"
                      }
                    `}
                  >
                    <span
                      className={`
                        relative transition-colors duration-150
                        ${isLocked
                          ? "text-gray-400 dark:text-gray-500"
                          : isActive
                            ? "text-primary"
                            : `${item.iconColor} opacity-80 group-hover:opacity-100`
                        }
                      `}
                    >
                      {item.icon(isActive)}
                    </span>

                    <span className={`flex-1 text-[13.5px] ${isActive ? "font-semibold" : "font-medium"}`}>{itemName}</span>

                    {isLocked && (
                      <span
                        className={`
                          px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded shrink-0
                          ${item.requiredPlan === "max"
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-400"
                            : "bg-primary/10 text-primary"
                          }
                        `}
                      >
                        {item.requiredPlan === "max" ? "MAX" : "PRO"}
                      </span>
                    )}
                  </Link>
                </div>
              );
            })}
          </div>

          {/* Chat list section */}
          <div className="mt-4">
            {/* Toggle header — Linear-style section label */}
            <button
              onClick={() => setShowChatList(!showChatList)}
              className="group flex items-center gap-2 w-full px-1 py-1.5 rounded-md hover:bg-gray-100/60 dark:hover:bg-dark-hover/40 transition-colors duration-150"
            >
              <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-gray-400 dark:text-gray-500 group-hover:text-gray-500 dark:group-hover:text-gray-400 transition-colors shrink-0">
                {t.sidebar.conversations}
              </span>
              <div className="flex-1 h-px bg-gray-200/60 dark:bg-dark-border/50" />
              <span className="text-[10px] tabular-nums text-gray-400 dark:text-gray-500 shrink-0">{localPosts.length}</span>
              <svg
                className={`w-3.5 h-3.5 transition-transform duration-200 text-gray-400 dark:text-gray-500 shrink-0 ${showChatList ? "rotate-0" : "-rotate-90"}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
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
                    const isPinned = group.isPinnedGroup;

                    return (
                      <div key={group.label} className={groupIndex > 0 ? "mt-3" : "mt-1.5"}>
                        {/* Group header — label + trailing rule */}
                        <div className="px-1 pt-2 pb-1 flex items-center gap-2">
                          {isPinned && (
                            <svg className="w-2.5 h-2.5 shrink-0 text-primary/60" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M16 4a1 1 0 0 1 1 1v3.586l1.707 1.707a1 1 0 0 1 .293.707v2a1 1 0 0 1-1 1h-4v6a1 1 0 0 1-2 0v-6H8a1 1 0 0 1-1-1v-2a1 1 0 0 1 .293-.707L9 8.586V5a1 1 0 0 1 1-1h6z"/>
                            </svg>
                          )}
                          <span className="text-[10px] font-semibold uppercase tracking-[0.07em] text-gray-400 dark:text-gray-500 shrink-0">
                            {group.label}
                          </span>
                          <div className="flex-1 h-px bg-gray-200/50 dark:bg-dark-border/40" />
                          <span className="text-[10px] tabular-nums text-gray-400/70 dark:text-gray-600 shrink-0">
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
                                    : "text-gray-900 dark:text-gray-200 hover:text-gray-950 dark:hover:text-white hover:bg-[#F8935D]/10 dark:hover:bg-dark-hover hover:border-l-2 hover:border-primary/40 hover:pl-[10px]"
                                }
                              `}
                            >
                            {/* Pin indicator - Premium violet color */}
                            {post.isPinned && (
                              <svg
                                className="w-3.5 h-3.5 shrink-0 text-primary dark:text-primary group-hover:scale-110 transition-transform duration-200"
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
          className="px-3 py-3 border-t border-gray-200/55 dark:border-dark-border bg-gradient-to-t from-gray-50/70 dark:from-dark-elevated/25 to-transparent"
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
                  text-gray-900 dark:text-gray-200 hover:text-gray-950 dark:hover:text-white
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

      {/* Search Modal — same ChatGPT-style command palette used on desktop.
          On mobile it slides up as a bottom sheet (handled inside the modal
          via responsive flex alignment). `onResultClick` also closes the
          slide menu so the user lands cleanly on the selected conversation. */}
      <SidebarSearchModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filteredPosts={filteredPosts}
        hasAnyPosts={localPosts.length > 0}
        onResultClick={onClose}
      />
    </>
  );
}
