"use client";

import { useState, useEffect, useCallback, useMemo, useRef, Fragment } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { motion } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useScheduling } from "@/contexts/SchedulingContext";
import { Post } from "@/types";
import { pinPost, renamePost, deletePost } from "@/lib/db/firestore";
import {
  navItemVariants,
  conversationItemVariants,
  sidebarSmoothEase,
} from "@/lib/motion";
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

  // Defensive dedup-by-id — mirrors the desktop sidebar's groupPostsByDate
  // logic. Optimistic upserts on both `localPosts` and `sidebarCtx` can
  // briefly land the same id twice with different `isPinned` values, which
  // would route the post into BOTH the pinned group and a date group and
  // surface as a duplicated row in the slide menu. Keep first occurrence
  // because upsertPost prepends fresh data.
  const seen = new Set<string>();
  const deduped: Post[] = [];
  for (const p of posts) {
    if (!p || !p.id || seen.has(p.id)) continue;
    seen.add(p.id);
    deduped.push(p);
  }

  // Separate pinned and non-pinned posts
  const pinnedPosts = deduped.filter((post) => post.isPinned);
  const nonPinnedPosts = deduped.filter((post) => !post.isPinned);

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
 * Nav data — mirrors the desktop sidebar's getNavItems shape so that mobile
 * and desktop render identical rows. Icons sized at w-5 h-5 / strokeWidth=2
 * to match the desktop's optical weight (do NOT shrink for mobile — the
 * drawer is 85vw wide and matches the desktop sidebar's spacing).
 */
const menuItems: {
  nameKey: "chat" | "history" | "schedule" | "analytics";
  href: string;
  iconColor: string;
  icon: (isActive: boolean) => React.ReactNode;
}[] = [
  {
    nameKey: "chat" as const,
    href: "/app",
    iconColor: "text-[#F8935D]",
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
    iconColor: "text-cyan-500/80 dark:text-cyan-400/80",
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
    iconColor: "text-violet-500/80 dark:text-violet-400/80",
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
    iconColor: "text-emerald-500/80 dark:text-emerald-400/80",
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

export default function SlideMenu({ isOpen, onClose, posts = [], onPostUpdate }: SlideMenuProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { refreshScheduledPosts } = useScheduling();
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

  // SSR guard for the Portal. On the server `document` is undefined, so we
  // skip rendering entirely; the drawer is mobile-only and the first paint
  // never needs it. On client hydration the effect runs and the portal
  // attaches to `document.body`.
  const [portalReady, setPortalReady] = useState(false);
  useEffect(() => {
    setPortalReady(true);
  }, []);

  // The drawer + its backdrop MUST escape MainLayout's `isolate` stacking
  // context. MainLayout's outer wrapper carries `isolation: isolate`, which
  // creates a fresh stacking context that traps every internal z-index. The
  // PersistentMobileHeader (z=40, rendered at root layout) would otherwise
  // sit ABOVE the entire MainLayout subtree — including this drawer's
  // z-[70] panel — because the MainLayout container itself reads as
  // z-auto (=0) against root. Portaling overlay + aside into `document.body`
  // restores the natural z-index arithmetic: overlay z=60 and panel z=70
  // are now in the root stacking context, comfortably above the header.
  if (!portalReady) return null;

  return createPortal(
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

      {/* Slide Menu — same polished glass recipe as the desktop sidebar:
          translucent surface, ring-inset, multi-shadow, white-tinted borders,
          backdrop-blur-2xl + saturate-200. The per-route signature ambient is
          painted on the panel itself (not bleed-through) because the popup
          overlay between drawer and page would otherwise darken everything.
          Border + shadow values match the desktop sidebar so the surface
          reads as the same UI element across breakpoints. */}
      <aside
        className={`
          fixed top-0 left-0 z-[70] w-[85vw] max-w-80
          ${toneBg}
          bg-white/15 dark:bg-white/[0.04]
          border-r border-white/50 dark:border-white/15
          ring-1 ring-inset ring-white/40 dark:ring-white/10
          backdrop-blur-2xl backdrop-saturate-200
          shadow-[0_12px_40px_rgba(15,17,21,0.10),0_2px_10px_rgba(15,17,21,0.06)]
          dark:shadow-[0_12px_40px_rgba(0,0,0,0.45),0_2px_10px_rgba(0,0,0,0.30)]
          flex flex-col
          transform transition-transform duration-300 ease-smooth
          lg:hidden
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
        style={{
          // Use dynamic viewport height so mobile browser chrome (URL bar
          // showing/hiding) doesn't cut off the footer. Falls back to 100vh
          // on browsers without dvh support.
          height: "100dvh",
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

        {/* Header — same shape as desktop sidebar header: 64px tall, logo +
            wordmark on the left, close affordance on the right (mobile-only,
            replaces the desktop "collapse" affordance). */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: sidebarSmoothEase }}
          className="h-16 border-b border-gray-200/55 dark:border-dark-border flex items-center justify-between px-3 shrink-0"
        >
          <Link href="/app" className="flex items-center gap-2.5 group min-w-0" onClick={onClose}>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: sidebarSmoothEase }}
              className="relative"
              whileHover={{ scale: 1.05 }}
            >
              {/* Subtle gradient halo on hover — uses the Posty signature
                  "welcome" gradient (orange → coral → rose) so the brand
                  stamp echoes the onboarding hero. Identical to desktop. */}
              <div className="absolute -inset-1 bg-signature-welcome rounded-xl opacity-0 group-hover:opacity-30 blur-md transition-opacity duration-300" />
              <div className="relative w-7 h-7 shrink-0 flex items-center justify-center rounded-lg overflow-hidden shadow-sm ring-1 ring-gray-200/50 dark:ring-dark-border/50">
                <img
                  src="/logo.png"
                  alt="Posty Logo"
                  className="w-full h-full object-contain"
                />
              </div>
            </motion.div>
            <motion.span
              translate="no"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.1, ease: sidebarSmoothEase }}
              className="notranslate font-bold text-sm whitespace-nowrap text-gray-900 dark:text-white group-hover:text-primary transition-colors duration-300"
            >
              Posty
            </motion.span>
          </Link>
          <motion.button
            onClick={onClose}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-[#F8935D]/10 dark:hover:bg-dark-hover transition-colors duration-200 haptic-feedback"
            aria-label={t.sidebar.closeMenu}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 6L18 18" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6" />
            </svg>
          </motion.button>
        </motion.div>

        {/* Fixed navigation section — new post button + nav-card. Matches the
            desktop sidebar structure exactly: New Post first, then the
            nav-card containing Chat / Search / History / Schedule /
            Analytics with horizontal dividers between rows. */}
        <div className="shrink-0 px-2.5 pt-2 pb-3">
          {/* New post button — same gradient + top-sheen + premium shadow
              treatment as the desktop sidebar so the primary CTA reads
              identically on every breakpoint. */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1, ease: sidebarSmoothEase }}
            className="relative group"
          >
            <button
              onClick={() => {
                onClose();
                router.push(`/app?new=${Date.now()}`);
              }}
              className="
                sidebar-new-post-btn group/newpost
                relative w-full h-10 px-3 rounded-lg flex items-center gap-3
                bg-gradient-to-br from-primary to-[#F76B54] hover:brightness-[1.05]
                text-white shadow-[0_4px_14px_rgba(248,147,93,0.25)]
                hover:shadow-[0_6px_20px_rgba(248,147,93,0.40)]
                transition-[box-shadow,filter,transform] duration-150 ease-out cursor-pointer
                active:scale-[0.985] haptic-feedback
              "
              title={t.sidebar.newPost}
            >
              {/* subtle top highlight — adds depth without being flashy */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-2 top-0 h-px rounded-full bg-white/40"
              />
              <svg
                className="w-5 h-5 shrink-0 transition-transform duration-200 ease-out group-hover/newpost:rotate-90"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              <span className="font-semibold whitespace-nowrap tracking-[-0.01em] text-[13.5px]">
                {t.sidebar.newPost}
              </span>
            </button>
          </motion.div>

          {/* Nav items — grouped in the same subtle card as desktop.
              Search affordance is injected after the first item (Chat) so
              the row order mirrors the desktop sidebar exactly. */}
          <div className="sidebar-nav-card mt-2 rounded-xl overflow-hidden ring-1 ring-gray-200/40 dark:ring-white/[0.04] bg-white/15 dark:bg-white/[0.02]">
            {menuItems.map((item, index) => {
              const isActive = pathname === item.href || (item.href === "/app" && pathname === "/chat");
              const itemName = t.nav[item.nameKey];

              return (
                <Fragment key={item.nameKey}>
                  {index > 0 && (
                    <div className="h-px bg-gray-100/70 dark:bg-white/[0.04] mx-0" />
                  )}
                  <motion.div
                    custom={index}
                    variants={navItemVariants}
                    initial="hidden"
                    animate="visible"
                    whileTap={{ scale: 0.985 }}
                    transition={{ type: "spring", stiffness: 420, damping: 22, mass: 0.7 }}
                    className="relative mx-2 my-0.5"
                  >
                    <Link
                      href={item.href}
                      onClick={onClose}
                      className={`
                        relative w-full h-10 flex items-center gap-3 px-3 rounded-lg
                        border transition-[background-color,border-color,color,box-shadow] duration-200 ease-out group haptic-feedback
                        ${isActive
                          ? "bg-white/55 dark:bg-white/[0.12] backdrop-blur-md backdrop-saturate-150 dark:backdrop-saturate-125 border-white/60 dark:border-white/20 shadow-sm dark:shadow-black/20 text-primary"
                          : "border-transparent text-gray-700 dark:text-gray-200 hover:bg-white/35 dark:hover:bg-white/[0.08] hover:backdrop-blur-md hover:border-white/40 dark:hover:border-white/15 hover:text-gray-900 dark:hover:text-white"
                        }
                      `}
                      title={itemName}
                    >
                      <span
                        className={`
                          relative shrink-0 transition-colors duration-150
                          ${isActive
                            ? "text-primary"
                            : `${item.iconColor} opacity-80 group-hover:opacity-100`
                          }
                        `}
                      >
                        {item.icon(isActive)}
                      </span>
                      <span className={`whitespace-nowrap flex-1 text-[13.5px] ${isActive ? "font-bold" : "font-semibold"}`}>
                        {itemName}
                      </span>
                    </Link>
                  </motion.div>

                  {/* Search row — injected after Chat (index 0), styled
                      identically to the surrounding nav rows: h-10, glass
                      hover, primary text + glass surface when open. Tapping
                      it opens the shared SidebarSearchModal (same component
                      used on desktop). */}
                  {index === 0 && (
                    <>
                      <div className="h-px bg-gray-100/70 dark:bg-white/[0.04] mx-0" />
                      <div className="relative mx-2 my-0.5">
                        <button
                          onClick={() => setSearchOpen(true)}
                          aria-haspopup="dialog"
                          aria-expanded={searchOpen}
                          className={`
                            relative w-full h-10 flex items-center gap-3 px-3 rounded-lg
                            border transition-all duration-200 ease-out group haptic-feedback
                            ${searchOpen
                              ? "bg-white/55 dark:bg-white/[0.12] backdrop-blur-md backdrop-saturate-150 dark:backdrop-saturate-125 border-white/60 dark:border-white/20 shadow-sm dark:shadow-black/20 text-primary"
                              : "border-transparent text-gray-700 dark:text-gray-200 hover:bg-white/35 dark:hover:bg-white/[0.08] hover:backdrop-blur-md hover:border-white/40 dark:hover:border-white/15 hover:text-gray-900 dark:hover:text-white"
                            }
                          `}
                          title={t.common.search}
                        >
                          <span
                            className={`
                              relative shrink-0 transition-colors duration-150
                              ${searchOpen
                                ? "text-primary"
                                : "text-gray-500/80 dark:text-gray-400/80 opacity-80 group-hover:opacity-100"
                              }
                            `}
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                          </span>
                          <span className={`whitespace-nowrap flex-1 text-left text-[13.5px] ${searchOpen ? "font-bold" : "font-semibold"}`}>
                            {t.common.search}
                          </span>
                        </button>
                      </div>
                    </>
                  )}
                </Fragment>
              );
            })}
          </div>
        </div>

        {/* Scrollable conversations list — same structure and styling as
            desktop sidebar: section toggle header (label + rule + count +
            chevron), grouped posts with per-group header, glass active /
            hover states (no border-l-2 layout shift).

            `min-h-0` is critical: without it, flex children default to
            `min-height: auto`, so a tall conversations list would push the
            <aside> beyond the viewport and the footer (profile) off-screen.
            With min-h-0, the nav properly constrains and scrolls internally. */}
        <nav className="sidebar-scroll flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-2 no-scrollbar overscroll-contain">
          {localPosts.length > 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.3, ease: sidebarSmoothEase }}
              className="pt-4 border-t border-gray-200/55 dark:border-dark-border"
            >
              <button
                onClick={() => setShowChatList(!showChatList)}
                className="group flex items-center gap-2 w-full px-2 py-1.5 rounded-md hover:bg-white/30 dark:hover:bg-white/[0.05] hover:backdrop-blur-md transition-all duration-150"
              >
                <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-gray-400 dark:text-gray-500 group-hover:text-gray-500 dark:group-hover:text-gray-400 transition-colors shrink-0">
                  {t.sidebar.conversations}
                </span>
                <div className="flex-1 h-px bg-gray-200/60 dark:bg-dark-border/50" />
                <span className="text-[10px] tabular-nums text-gray-400 dark:text-gray-500 shrink-0">{localPosts.length}</span>
                <motion.svg
                  animate={{ rotate: showChatList ? 0 : -90 }}
                  transition={{ duration: 0.2, ease: sidebarSmoothEase }}
                  className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </motion.svg>
              </button>

              {showChatList && (
                <div className="mt-2 space-y-0.5">
                  {groupedPosts.map((group, groupIndex) => {
                    const isPinned = group.isPinnedGroup;

                    return (
                      <div key={group.label} className={groupIndex > 0 ? "mt-2.5 mb-3" : "mb-3"}>
                        {/* Group header — label + trailing rule + count */}
                        <motion.div
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: groupIndex * 0.05, ease: sidebarSmoothEase }}
                          className="px-2 pt-2 pb-1 flex items-center gap-2"
                        >
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
                        </motion.div>

                        {/* Posts list — same glass active / hover states as
                            the desktop sidebar. No border-l-2 + pl-shift
                            (the old mobile pattern caused a jiggle on
                            hover and visually drifted from desktop). */}
                        <div className="space-y-0.5 mt-0.5">
                          {group.posts.map((post, postIndex) => {
                            const isActive = pathname === `/app/c/${post.id}`;
                            return (
                              <motion.div
                                key={post.id}
                                custom={postIndex}
                                variants={conversationItemVariants}
                                initial="hidden"
                                animate="visible"
                                whileTap={{ scale: 0.985 }}
                                transition={{ type: "spring", stiffness: 420, damping: 22, mass: 0.7 }}
                                className="relative group"
                              >
                                <Link
                                  href={`/app/c/${post.id}`}
                                  onClick={onClose}
                                  className={`
                                    sidebar-conv-item
                                    relative flex items-center gap-2 pl-3 pr-9 py-1.5 rounded-lg text-sm w-full
                                    border transition-[background-color,border-color,color,box-shadow] duration-200 ease-out cursor-pointer transform-gpu haptic-feedback
                                    ${
                                      isActive
                                        ? "sidebar-conv-item--active bg-white/55 dark:bg-white/[0.12] backdrop-blur-md backdrop-saturate-150 dark:backdrop-saturate-125 border-white/60 dark:border-white/20 text-text-primary shadow-sm dark:shadow-black/20"
                                        : "border-transparent text-gray-900 dark:text-gray-200 group-hover:text-gray-950 dark:group-hover:text-white group-hover:bg-white/35 dark:group-hover:bg-white/[0.08] group-hover:backdrop-blur-md group-hover:border-white/40 dark:group-hover:border-white/15"
                                    }
                                  `}
                                >
                                  {post.isPinned ? (
                                    <svg
                                      className="w-3.5 h-3.5 shrink-0 text-primary dark:text-primary group-hover:scale-110 transition-transform duration-200"
                                      fill="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path d="M16 4a1 1 0 0 1 1 1v3.586l1.707 1.707a1 1 0 0 1 .293.707v2a1 1 0 0 1-1 1h-4v6a1 1 0 0 1-2 0v-6H8a1 1 0 0 1-1-1v-2a1 1 0 0 1 .293-.707L9 8.586V5a1 1 0 0 1 1-1h6z"/>
                                    </svg>
                                  ) : (
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
                                    {(post.title || post.prompt).slice(0, 25)}
                                    {(post.title || post.prompt).length > 25 ? "..." : ""}
                                  </span>
                                </Link>
                                <div className="absolute right-1 top-1/2 -translate-y-1/2 shrink-0 z-10">
                                  <ConversationOptionsMenu
                                    post={post}
                                    onPin={handlePin}
                                    onRename={handleRename}
                                    onDelete={handleDeleteClick}
                                  />
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  {/* View all link — leads to full history. Same primary
                      treatment as desktop's "View all" affordance. */}
                  {localPosts.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3, delay: 0.2, ease: sidebarSmoothEase }}
                    >
                      <Link
                        href="/history"
                        onClick={onClose}
                        className="flex items-center justify-center gap-1.5 w-full mt-2 px-2 py-1.5 text-xs text-primary hover:text-accent hover:bg-primary/5 rounded-lg transition-colors haptic-feedback"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                        </svg>
                        {t.sidebar.viewAllHistory}
                      </Link>
                    </motion.div>
                  )}
                </div>
              )}
            </motion.div>
          ) : (
            /* Empty state — same warm CTA as desktop. */
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2, ease: sidebarSmoothEase }}
              className="flex flex-col items-center justify-center px-5 text-center py-16"
            >
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </div>
              <p className="text-[13px] font-semibold text-gray-800 dark:text-gray-100 mb-1">
                {t.sidebar.emptyStateTitle}
              </p>
              <p className="text-[11.5px] text-text-muted leading-snug mb-4">
                {t.sidebar.emptyStateSubtitle}
              </p>
              <button
                onClick={() => {
                  onClose();
                  router.push(`/app?new=${Date.now()}`);
                }}
                className="
                  flex items-center gap-1.5 px-4 py-2
                  bg-primary hover:bg-primary-hover
                  text-white text-[12px] font-semibold rounded-lg
                  shadow-sm shadow-primary/20 hover:shadow-md hover:shadow-primary/30
                  transition-all duration-200 active:scale-95 cursor-pointer haptic-feedback
                "
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                {t.sidebar.newPost}
              </button>
            </motion.div>
          )}
        </nav>

        {/* Profile footer — fully transparent wrapper so the per-route
            signature ambient continues seamlessly through the bottom of the
            drawer, exactly as on desktop. The only mobile-specific concession
            is `env(safe-area-inset-bottom)` padding for iOS notched devices. */}
        <div
          className="px-2.5 py-2.5 shrink-0 border-t border-[#F8935D]/15 dark:border-white/10"
          style={{
            paddingBottom: "max(env(safe-area-inset-bottom, 0px), 10px)",
          }}
        >
          {user ? (
            <ProfileMenu onNavigate={onClose} />
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
    </>,
    document.body
  );
}
