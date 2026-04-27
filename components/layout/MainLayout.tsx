"use client";

import { useState, useMemo, useRef, useEffect, useCallback, ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useQuota } from "@/contexts/QuotaContext";
import { useSidebar } from "@/contexts/SidebarContext";
import { useScheduling } from "@/contexts/SchedulingContext";
import { useLinkedIn } from "@/contexts/LinkedInContext";
import { useFacebook } from "@/contexts/FacebookContext";
import { useThreads } from "@/contexts/ThreadsContext";
import SlideMenu from "./SlideMenu";
import ChatHistoryModal from "./ChatHistoryModal";
import ProfileMenu from "./ProfileMenu";
import ConversationOptionsMenu from "@/components/conversation/ConversationOptionsMenu";
import RenameConversationModal from "@/components/conversation/RenameConversationModal";
import DeleteConfirmModal from "@/components/conversation/DeleteConfirmModal";
import { Post } from "@/types";
import { getUserPostsWithPinned, pinPost, renamePost, deletePost } from "@/lib/db/firestore";
import { invalidateCachedConversation } from "@/lib/storage/conversation-cache";
import { AnimatedSlideIn, AnimatedPageWrapper } from "@/components/animations/AnimatedPageWrapper";
import toast from "@/components/ui/Toast";
import TrialBanner from "@/components/subscription/TrialBanner";
import UsageBanner from "@/components/ui/UsageBanner";
import QuotaExceededModal from "@/components/ui/QuotaExceededModal";
import HelpFloatingButton from "@/components/help/HelpFloatingButton";

// Premium animation easings - consistent across app
const smoothEase = [0.25, 0.1, 0.25, 1] as const;

// Sidebar animation variants
const sidebarContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.02,
    },
  },
};

const sidebarItemVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.25,
      ease: smoothEase,
    },
  },
};

const navItemVariants = {
  hidden: { opacity: 0, x: -8 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.25,
      delay: 0.08 + i * 0.04,
      ease: smoothEase,
    },
  }),
};

const conversationItemVariants = {
  hidden: { opacity: 0, x: -8 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.3,
      delay: i * 0.03,
      ease: smoothEase,
    },
  }),
};

interface MainLayoutProps {
  children: ReactNode;
  posts?: Post[];
  showMobileHeader?: boolean;
  headerTitle?: string;
  onPostUpdate?: () => void;
}

// Sidebar dimensions (constants for consistency)
const SIDEBAR_ICON_WIDTH = 68; // Width of the icon rail (collapsed state)
const SIDEBAR_EXPANDED_WIDTH = 288; // Full expanded width (w-72 = 18rem = 288px)

// Group posts by date with pinned posts first
function groupPostsByDate(posts: Post[], labels: { pinned: string; today: string; yesterday: string; thisWeek: string; older: string }) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Separate pinned posts (using isPinned field)
  const pinnedPosts = posts.filter((post) => post.isPinned);
  const unpinnedPosts = posts.filter((post) => !post.isPinned);

  const groups: { label: string; posts: Post[]; isPinned?: boolean }[] = [];

  // Add pinned section first if there are pinned posts
  if (pinnedPosts.length > 0) {
    groups.push({ label: labels.pinned, posts: pinnedPosts, isPinned: true });
  }

  // Date-based groups for unpinned posts
  const dateGroups: { label: string; posts: Post[] }[] = [
    { label: labels.today, posts: [] },
    { label: labels.yesterday, posts: [] },
    { label: labels.thisWeek, posts: [] },
    { label: labels.older, posts: [] },
  ];

  unpinnedPosts.forEach((post) => {
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

// Nav items - defined inside component to access translations
function getNavItems(t: ReturnType<typeof useLanguage>["t"]) {
  return [
    {
      name: t.nav.chat,
      href: "/app",
      iconColor: "text-[#F8935D]",
      activeClasses: "",
      hoverClasses: "",
      indicatorColor: "",
      glowColor: "",
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
      name: t.nav.history,
      href: "/history",
      iconColor: "text-cyan-500/80 dark:text-cyan-400/80",
      activeClasses: "",
      hoverClasses: "",
      indicatorColor: "",
      glowColor: "",
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
      name: t.nav.schedule,
      href: "/schedule",
      iconColor: "text-violet-500/80 dark:text-violet-400/80",
      activeClasses: "",
      hoverClasses: "",
      indicatorColor: "",
      glowColor: "",
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
      name: t.nav.analytics,
      href: "/analytics",
      iconColor: "text-emerald-500/80 dark:text-emerald-400/80",
      activeClasses: "",
      hoverClasses: "",
      indicatorColor: "",
      glowColor: "",
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
}

export default function MainLayout({
  children,
  posts = [],
  showMobileHeader = true,
  headerTitle,
  onPostUpdate,
}: MainLayoutProps) {
  // Use unified sidebar context - for mobile menu and desktop collapse
  const {
    isOpen: isSidebarOpen,
    isCollapsed,
    open: openSidebar,
    close: closeSidebar,
    toggleCollapse,
  } = useSidebar();

  // Calculate current sidebar width based on collapsed state
  const currentSidebarWidth = isCollapsed ? SIDEBAR_ICON_WIDTH : SIDEBAR_EXPANDED_WIDTH;

  const [searchQuery, setSearchQuery] = useState("");
  const [showChatList, setShowChatList] = useState(true);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [autoLoadedPosts, setAutoLoadedPosts] = useState<Post[]>([]);
  const [localPosts, setLocalPosts] = useState<Post[]>([]);
  const [postToDelete, setPostToDelete] = useState<Post | null>(null);
  const [postToRename, setPostToRename] = useState<Post | null>(null);
  const [hoveredPostId, setHoveredPostId] = useState<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const { user, userProfile } = useAuth();
  const { t } = useLanguage();
  const prefersReducedMotion = useReducedMotion();
  const { refreshScheduledPosts } = useScheduling();
  const { connection: linkedInConnection } = useLinkedIn();
  const { connection: facebookConnection } = useFacebook();
  const { connection: threadsConnection } = useThreads();
  const tokenWarningShown = useRef(false);

  // Get nav items with translations
  const navItems = getNavItems(t);

  // Pages where we should NOT load conversations (subscription page)
  const isSubscriptionPage = pathname === "/subscription" || pathname === "/pricing";


  // Proactive token expiration notification (once per session)
  useEffect(() => {
    if (tokenWarningShown.current) return;

    const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const expiring: string[] = [];

    const connections = [
      { name: "LinkedIn", conn: linkedInConnection },
      { name: "Facebook", conn: facebookConnection },
      { name: "Threads", conn: threadsConnection },
    ];

    for (const { name, conn } of connections) {
      if (!conn?.expiresAt) continue;
      const expiresMs = conn.expiresAt.toDate().getTime();
      const remaining = expiresMs - now;
      if (remaining > 0 && remaining <= THREE_DAYS_MS) {
        const days = Math.ceil(remaining / (24 * 60 * 60 * 1000));
        expiring.push(`${name} (${days}j)`);
      }
    }

    if (expiring.length > 0) {
      tokenWarningShown.current = true;
      toast.warning(
        expiring.length > 1
          ? t.ui.connectionsExpiringSoon.replace("{names}", expiring.join(", "))
          : t.ui.connectionExpiringSoon.replace("{name}", expiring.join(", "))
      );
    }
  }, [linkedInConnection, facebookConnection, threadsConnection]);

  // Auto-load posts for sidebar when not provided and not on subscription page
  useEffect(() => {
    const loadPosts = async () => {
      if (user && posts.length === 0 && !isSubscriptionPage) {
        try {
          const userPosts = await getUserPostsWithPinned(user.uid, 50);
          setAutoLoadedPosts(userPosts);
        } catch (error) {
          console.error("Error auto-loading posts for sidebar:", error);
        }
      }
    };
    loadPosts();
  }, [user, posts.length, isSubscriptionPage]);

  // Use provided posts or auto-loaded posts (but not on subscription page)
  const effectivePosts = useMemo(() => {
    if (isSubscriptionPage) return [];
    return posts.length > 0 ? posts : autoLoadedPosts;
  }, [posts, autoLoadedPosts, isSubscriptionPage]);

  // Sync local posts with effective posts for optimistic updates
  useEffect(() => {
    setLocalPosts(effectivePosts);
  }, [effectivePosts]);

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
    // Check if user is currently viewing the conversation being deleted
    const isViewingDeleted = pathname === `/app/c/${postId}`;

    // Optimistic update
    setLocalPosts((prev) => prev.filter((p) => p.id !== postId));
    invalidateCachedConversation(postId);

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
      return; // Don't redirect on failure
    }

    // Close modal explicitly to clean up any backdrop/overlay
    setPostToDelete(null);
    closeSidebar();

    // Redirect to new post state if user was viewing the deleted conversation
    if (isViewingDeleted) {
      router.push(`/app?new=${Date.now()}`);
    }
  };

  // Prefetch critical routes for faster navigation
  useEffect(() => {
    // Prefetch routes that user is likely to navigate to
    const routesToPrefetch = ["/app", "/history", "/profile", "/pricing", "/settings", "/schedule", "/analytics"];
    routesToPrefetch.forEach((route) => {
      router.prefetch(route);
    });
  }, [router]);

  // Clean up stuck blocking CSS classes on route changes to prevent navigation freeze
  useEffect(() => {
    // Remove classes that may have been left behind by modals/overlays
    document.body.classList.remove("template-modal-open");
    document.documentElement.classList.remove("bottomsheet-open", "modal-open", "scroll-locked");
  }, [pathname]);

  // Add pwa-mobile class to body on mobile devices for proper scroll handling
  // IMPORTANT: Ne pas ajouter pwa-mobile si force-scroll-enabled est présent
  // (certaines pages activent explicitement le scroll)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const isMobile = window.innerWidth < 1024;
    const isPWA = window.matchMedia("(display-mode: standalone)").matches ||
                  (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

    // Add pwa-mobile class for mobile devices ONLY if scroll is not explicitly enabled
    const hasForceScroll = document.body.classList.contains("force-scroll-enabled") ||
                           document.documentElement.classList.contains("force-scroll-enabled");

    if (isMobile && !hasForceScroll) {
      document.body.classList.add("pwa-mobile");
    }

    // Handle resize to update class (respecting force-scroll-enabled)
    const handleResize = () => {
      const hasForceScrollOnResize = document.body.classList.contains("force-scroll-enabled") ||
                                     document.documentElement.classList.contains("force-scroll-enabled");

      if (window.innerWidth < 1024 && !hasForceScrollOnResize) {
        document.body.classList.add("pwa-mobile");
      } else {
        document.body.classList.remove("pwa-mobile");
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      document.body.classList.remove("pwa-mobile");
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Sidebar state is now managed by SidebarContext (see contexts/SidebarContext.tsx)
  // No need for local localStorage handling - it's centralized

  // Ref for search input auto-focus
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [shouldFocusSearch, setShouldFocusSearch] = useState(false);

  // Auto-focus search input when sidebar opens via search click
  useEffect(() => {
    if (isSidebarOpen && shouldFocusSearch && searchInputRef.current) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
        setShouldFocusSearch(false);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isSidebarOpen, shouldFocusSearch]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl+K to focus search
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (!isSidebarOpen) {
          setShouldFocusSearch(true);
          openSidebar();
        } else {
          searchInputRef.current?.focus();
        }
      }
      // Cmd/Ctrl+B to toggle sidebar collapse (desktop)
      if ((e.metaKey || e.ctrlKey) && e.key === "b") {
        e.preventDefault();
        // Only toggle on desktop (lg breakpoint)
        if (window.innerWidth >= 1024) {
          toggleCollapse();
        }
      }
      // Escape to blur search or close sidebar
      if (e.key === "Escape") {
        if (document.activeElement === searchInputRef.current) {
          searchInputRef.current?.blur();
          setSearchQuery("");
        } else if (isSidebarOpen) {
          closeSidebar();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isSidebarOpen, openSidebar, closeSidebar, toggleCollapse]);

  // Handle search icon click
  const handleSearchClick = useCallback(() => {
    if (!isSidebarOpen) {
      setShouldFocusSearch(true);
      openSidebar();
    } else {
      searchInputRef.current?.focus();
    }
  }, [isSidebarOpen, openSidebar]);

  // Filter and group posts (using localPosts for optimistic updates)
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
    [filteredPosts, t]
  );

  return (
    <div className="h-screen bg-app-surface flex overflow-hidden app-layout">
      {/* ========== DESKTOP SIDEBAR - COLLAPSIBLE ========== */}
      <aside
        role="navigation"
        aria-label="Navigation principale"
        className="sidebar-root hidden lg:flex flex-col h-screen bg-background-warm dark:bg-dark-card border-r border-[#F8935D]/10 dark:border-dark-border fixed left-0 top-0 z-40 overflow-hidden scroll-disabled transition-all duration-200 ease-out"
        style={{ width: currentSidebarWidth }}
      >
        {/* Header - Logo when expanded, Toggle when collapsed */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: smoothEase }}
          className={`h-16 border-b border-[#F8935D]/10 dark:border-dark-border flex items-center shrink-0 ${isCollapsed ? "justify-center px-2" : "justify-between px-3"}`}
        >
          {isCollapsed ? (
            /* Toggle button when collapsed - replaces logo */
            <motion.button
              onClick={toggleCollapse}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-[#F8935D]/10 dark:hover:bg-dark-hover transition-colors duration-200 group relative"
              title="Déplier la sidebar"
              aria-label="Déplier la sidebar"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
              {/* Tooltip */}
              <span className="absolute left-full ml-2 px-2 py-1 bg-background-warm dark:bg-dark-elevated border border-[#F8935D]/15 dark:border-dark-border rounded-lg text-sm whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50 shadow-lg pointer-events-none">
                Déplier la sidebar
              </span>
            </motion.button>
          ) : (
            /* Logo + Toggle when expanded */
            <>
              <Link href="/app" className="flex items-center gap-3 group min-w-0">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, ease: smoothEase }}
                  className="relative"
                  whileHover={{ scale: 1.05 }}
                >
                  {/* Subtle glow on hover */}
                  <div className="absolute -inset-1 bg-gradient-to-br from-primary/30 to-accent/30 rounded-2xl opacity-0 group-hover:opacity-100 blur-md transition-opacity duration-300" />
                  <div className="relative w-10 h-10 shrink-0 flex items-center justify-center rounded-2xl overflow-hidden shadow-md ring-1 ring-gray-200/50 dark:ring-dark-border/50">
                    <img
                      src="/logo.png"
                      alt="Posty Logo"
                      className="w-full h-full object-contain"
                    />
                  </div>
                </motion.div>
                <motion.span
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.1, ease: smoothEase }}
                  className="font-bold text-lg whitespace-nowrap text-gray-900 dark:text-white group-hover:text-primary transition-colors duration-300"
                >
                  Posty
                </motion.span>
              </Link>
              <motion.button
                onClick={toggleCollapse}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-[#F8935D]/10 dark:hover:bg-dark-hover transition-colors duration-200"
                title="Replier la sidebar"
                aria-label="Replier la sidebar"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
              </motion.button>
            </>
          )}
        </motion.div>

        {/* Fixed navigation section (search, new post, nav items) */}
        <div className="shrink-0 p-2 space-y-1">
          {/* Search - Only show when expanded */}
          {!isCollapsed && (
            <div className="relative mb-2">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={searchInputRef}
                type="text"
                placeholder={t.sidebar.searchShortPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="sidebar-search-input w-full pl-10 pr-10 py-2.5 text-sm bg-white/70 dark:bg-dark-bg/70 border border-[#F8935D]/12 dark:border-dark-border rounded-xl text-text-primary placeholder-text-muted shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] hover:border-[#F8935D]/25 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/70 transition-[border-color,box-shadow,background-color] duration-150"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center text-text-muted hover:text-text-primary">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 6L18 18M6 18L18 6" />
                  </svg>
                </button>
              )}
            </div>
          )}

          {/* Search icon button - Only show when collapsed */}
          {isCollapsed && (
            <button
              onClick={handleSearchClick}
              className="w-full h-11 rounded-xl flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-[#F8935D]/10 dark:hover:bg-dark-hover transition-colors group relative"
              title={t.sidebar.searchShortPlaceholder}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {/* Tooltip */}
              <span className="absolute left-full ml-2 px-2 py-1 bg-background-warm dark:bg-dark-elevated border border-[#F8935D]/15 dark:border-dark-border rounded-lg text-sm whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50 shadow-lg pointer-events-none">
                {t.sidebar.searchShortPlaceholder}
              </span>
            </button>
          )}

          {/* New post button - Clean professional version */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1, ease: smoothEase }}
            className="relative group"
          >
            <button
              onClick={() => {
                // Force a fresh conversation — even if already on /app
                // Using a timestamp param forces Next.js to re-render the page
                router.push(`/app?new=${Date.now()}`);
              }}
              className={`
                sidebar-new-post-btn group/newpost
                relative w-full h-11 rounded-xl flex items-center gap-2.5
                bg-gradient-to-br from-primary to-[#F76B54] hover:brightness-[1.05]
                text-white shadow-[0_4px_14px_rgba(248,147,93,0.25)]
                hover:shadow-[0_6px_20px_rgba(248,147,93,0.40)]
                transition-[box-shadow,filter,transform] duration-150 ease-out cursor-pointer
                active:scale-[0.985]
                ${isCollapsed ? "justify-center px-0" : "px-3"}
              `}
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
              {!isCollapsed && <span className="font-semibold whitespace-nowrap tracking-[-0.01em]">{t.sidebar.newPost}</span>}
              {/* Tooltip for collapsed mode */}
              {isCollapsed && (
                <span className="absolute left-full ml-2 px-2 py-1 bg-background-warm dark:bg-dark-elevated border border-[#F8935D]/15 dark:border-dark-border rounded-lg text-sm text-text-primary whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50 shadow-lg pointer-events-none">
                  {t.sidebar.newPost}
                </span>
              )}
            </button>
          </motion.div>

          {/* Nav items — unified primary palette + shared layoutId active indicator */}
          {navItems.map((item, index) => {
            const isActive = pathname === item.href || (item.href === "/app" && pathname === "/chat");
            return (
              <motion.div
                key={item.name}
                custom={index}
                variants={navItemVariants}
                initial="hidden"
                animate="visible"
                className="relative"
              >
                {/* Shared active indicator — slides smoothly between items */}
                {isActive && (
                  <motion.div
                    layoutId="mainlayout-active-indicator"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-7 rounded-r-full bg-primary"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}

                <Link
                  href={item.href}
                  className={`
                    relative w-full h-10 rounded-lg flex items-center gap-3 transition-colors duration-150 ease-out group
                    ${isCollapsed ? "justify-center px-0" : "px-3"}
                    ${isActive
                      ? "bg-primary/[0.06] text-primary"
                      : "text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-dark-hover/60 hover:text-gray-900 dark:hover:text-white"
                    }
                  `}
                  title={item.name}
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
                  {!isCollapsed && (
                    <span className={`whitespace-nowrap flex-1 text-[13.5px] ${isActive ? "font-bold" : "font-semibold"}`}>{item.name}</span>
                  )}

                  {/* Tooltip for collapsed mode */}
                  {isCollapsed && (
                    <span className="absolute left-full ml-2 px-2 py-1 bg-background-warm dark:bg-dark-elevated border border-[#F8935D]/15 dark:border-dark-border rounded-lg text-sm text-text-primary whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50 shadow-lg pointer-events-none">
                      {item.name}
                    </span>
                  )}
                </Link>
              </motion.div>
            );
          })}

          {/* Conversations icon - Only show when collapsed and has posts */}
          {isCollapsed && localPosts.length > 0 && (
            <button
              onClick={() => setShowHistoryModal(true)}
              className="w-full h-11 rounded-xl flex items-center justify-center text-primary hover:text-primary-hover hover:bg-[#F8935D]/5 transition-colors group relative mt-4 pt-4 border-t border-[#F8935D]/10 dark:border-dark-border"
              title={t.sidebar.conversations}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              {/* Tooltip */}
              <span className="absolute left-full ml-2 px-2 py-1 bg-background-warm dark:bg-dark-elevated border border-[#F8935D]/15 dark:border-dark-border rounded-lg text-sm whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50 shadow-lg pointer-events-none">
                {t.sidebar.conversations} ({localPosts.length})
              </span>
            </button>
          )}
        </div>

        {/* Scrollable conversations list (header + items scroll together) */}
        <nav className="sidebar-scroll flex-1 overflow-y-auto overflow-x-hidden px-2">
          {!isCollapsed && localPosts.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.3, ease: smoothEase }}
              className="pt-4 border-t border-[#F8935D]/10 dark:border-dark-border"
            >
              <button
                onClick={() => setShowChatList(!showChatList)}
                className="group flex items-center justify-between w-full px-3 py-2 text-text-muted hover:text-text-primary hover:bg-[#F8935D]/8 dark:hover:bg-dark-hover transition-[background-color,color] duration-150 rounded-lg"
              >
                <span className="text-xs font-bold uppercase tracking-wider text-silver-solid flex items-center gap-2">
                  <svg
                    className="w-4 h-4 text-primary group-hover:text-primary-hover transition-colors"
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
                  <span className="text-2xs font-semibold text-primary dark:text-primary bg-[#F8935D]/10 dark:bg-[#F8935D]/20 px-2 py-0.5 rounded-full">
                    {localPosts.length}
                  </span>
                  <motion.svg
                    animate={{ rotate: showChatList ? 0 : -90 }}
                    transition={{ duration: 0.2, ease: smoothEase }}
                    className="w-4 h-4 text-primary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </motion.svg>
                </div>
              </button>

              {showChatList && (
                <div className="mt-2 space-y-0.5"
                  >
                    {groupedPosts.map((group, groupIndex) => {
                      // Determine group visual properties
                      const isToday = group.label.includes(t.sidebar.today || "Aujourd'hui");
                      const isYesterday = group.label.includes(t.sidebar.yesterday || "Hier");
                      const isPinned = group.isPinned;

                      return (
                      <div key={group.label} className={groupIndex > 0 ? "mt-2.5 mb-3" : "mb-3"}>
                        {/* Simple group header */}
                        <motion.div
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: groupIndex * 0.05, ease: smoothEase }}
                          className="px-3 py-1.5 flex items-center gap-2"
                        >
                          {/* Simple colored icon based on group type */}
                          {isPinned && (
                            <svg
                              className="w-3.5 h-3.5 text-primary dark:text-primary"
                              fill="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path d="M16 4a1 1 0 0 1 1 1v3.586l1.707 1.707a1 1 0 0 1 .293.707v2a1 1 0 0 1-1 1h-4v6a1 1 0 0 1-2 0v-6H8a1 1 0 0 1-1-1v-2a1 1 0 0 1 .293-.707L9 8.586V5a1 1 0 0 1 1-1h6z"/>
                            </svg>
                          )}
                          {isToday && (
                            <svg
                              className="w-3.5 h-3.5 text-primary dark:text-primary"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
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
                              className="w-3.5 h-3.5 text-text-muted dark:text-text-muted"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
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
                              className="w-3.5 h-3.5 text-text-muted"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                          )}

                          {/* Group label - simple text */}
                          <span className="text-2xs font-semibold uppercase tracking-wider text-text-muted">
                            {group.label}
                          </span>

                          {/* Post count badge - Simple text */}
                          <span className="ml-auto text-2xs font-medium text-text-muted">
                            {group.posts.length}
                          </span>
                        </motion.div>
                        {/* Posts list - Compact spacing for professional look */}
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
                              onMouseEnter={() => setHoveredPostId(post.id)}
                              onMouseLeave={() => setHoveredPostId(null)}
                              className="relative group"
                            >
                              <Link
                                href={`/app/c/${post.id}`}
                                className={`
                                  sidebar-conv-item
                                  relative flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm w-full
                                  transition-[background-color,color,transform] duration-150 ease-out cursor-pointer transform-gpu
                                  active:scale-[0.985] active:transition-none
                                  ${
                                    isActive
                                      ? "sidebar-conv-item--active bg-primary/10 dark:bg-primary/10 text-text-primary shadow-sm"
                                      : "text-gray-900 dark:text-gray-200 hover:text-gray-950 dark:hover:text-white hover:bg-[#F8935D]/8 dark:hover:bg-dark-hover"
                                  }
                                `}
                              >
                                {/* Pin indicator */}
                                {post.isPinned && (
                                  <svg
                                    className="w-3.5 h-3.5 shrink-0 text-primary dark:text-primary group-hover:scale-110 transition-transform duration-200"
                                    fill="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path d="M16 4a1 1 0 0 1 1 1v3.586l1.707 1.707a1 1 0 0 1 .293.707v2a1 1 0 0 1-1 1h-4v6a1 1 0 0 1-2 0v-6H8a1 1 0 0 1-1-1v-2a1 1 0 0 1 .293-.707L9 8.586V5a1 1 0 0 1 1-1h6z"/>
                                  </svg>
                                )}
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
                                  {(post.title || post.prompt).slice(0, 25)}{(post.title || post.prompt).length > 25 ? "..." : ""}
                                </span>
                              </Link>
                              <div className="absolute right-1 top-1/2 -translate-y-1/2 shrink-0 z-10">
                                <ConversationOptionsMenu post={post} onPin={handlePin} onRename={handleRename} onDelete={handleDeleteClick} isVisible={hoveredPostId === post.id} />
                              </div>
                            </motion.div>
                          );
                        })}
                        </div>
                      </div>
                    );
                    })}
                    {localPosts.length > 5 && (
                      <motion.button
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3, delay: 0.2, ease: smoothEase }}
                        onClick={() => setShowHistoryModal(true)}
                        className="flex items-center justify-center gap-1.5 w-full mt-2 px-2 py-1.5 text-xs text-primary hover:text-accent hover:bg-primary/5 rounded-lg transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
                        {t.sidebar.viewAll} ({localPosts.length})
                      </motion.button>
                    )}
                </div>
              )}
            </motion.div>
          )}
        </nav>

        {/* Profile */}
        <div className="p-2 border-t border-[#F8935D]/10 dark:border-dark-border shrink-0">
          <ProfileMenu isCollapsed={isCollapsed} />
        </div>
      </aside>

      {/* Mobile Slide Menu */}
      <div className="lg:hidden">
        <SlideMenu isOpen={isSidebarOpen} onClose={closeSidebar} onOpen={openSidebar} posts={effectivePosts} onPostUpdate={onPostUpdate} />
      </div>

      {/* Main Content - Responsive padding for desktop sidebar */}
      <main
        id="main-content"
        role="main"
        aria-label="Contenu principal"
        tabIndex={-1}
        className={`flex-1 flex flex-col h-screen focus:outline-none transition-all duration-200 ease-out ${isCollapsed ? "lg:pl-[68px]" : "lg:pl-[288px]"}`}
      >
        {/* Desktop spacer - hidden on mobile */}
        <div className="hidden lg:block" />

        {/* Mobile Header - Fixed position WITHOUT animation wrapper for true viewport positioning */}
        {showMobileHeader && (
          <header
            role="banner"
            aria-label="En-tête mobile"
            className="mobile-header lg:hidden fixed top-0 left-0 right-0 bg-background-warm/95 dark:bg-dark-card/95 backdrop-blur-xl border-b border-[#F8935D]/10 dark:border-dark-border z-[60]"
            style={{
              paddingTop: "env(safe-area-inset-top, 0px)",
            }}
          >
            <div className="flex items-center justify-between h-14 min-h-[56px] px-4">
              <button
                onClick={openSidebar}
                className="min-w-[44px] min-h-[44px] p-2.5 -ml-2 flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-[#F8935D]/10 dark:hover:bg-dark-hover rounded-lg transition-colors duration-200"
                aria-label={t.sidebar.openMenu}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  {/* Subtle glow */}
                  <div className="absolute -inset-0.5 bg-gradient-to-br from-primary/20 to-accent/20 rounded-xl blur-sm" />
                  <div className="relative w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-2xl overflow-hidden shadow-md ring-1 ring-white/50 dark:ring-dark-border/50 flex-shrink-0">
                    <img
                      src="/logo.png"
                      alt="Posty Logo"
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
                <span className="font-bold text-gray-900 dark:text-white text-base sm:text-lg tracking-tight truncate max-w-[200px] sm:max-w-none">
                  {headerTitle || "Posty"}
                </span>
              </div>
              <div className="w-10 flex-shrink-0" />
            </div>
          </header>
        )}

        {/* Spacer for fixed mobile header - accounts for safe area + header height */}
        {showMobileHeader && (
          <div
            className="lg:hidden flex-shrink-0"
            style={{
              height: "calc(env(safe-area-inset-top, 0px) + 56px)",
            }}
          />
        )}

        {/* Trial / Guarantee Banner */}
        <TrialBanner />

        {/* Quota Usage Banner (Free + Pro plans) */}
        <UsageBanner className="px-3 sm:px-4 pt-2" />

        {/* Page Content - No scroll on mobile (children handle scroll), scroll on desktop */}
        <AnimatedPageWrapper delay={0.2} className="flex-1 overflow-hidden lg:overflow-y-auto lg:overflow-x-hidden lg:overscroll-contain">
          {children}
        </AnimatedPageWrapper>

        {/* Help floating "?" button */}
        <HelpFloatingButton />

        {/* Quota Exceeded Modal (opens when user attempts action at limit) */}
        <QuotaExceededModal />
      </main>

      {/* Chat History Modal */}
      <ChatHistoryModal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        posts={localPosts}
        searchQuery={searchQuery}
      />

      {/* Conversation Modals */}
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
    </div>
  );
}

// Quota Badge Component - Collapsed version (icon only)
function QuotaBadgeCollapsed() {
  const { planName, messagesUsedToday, dailyLimit, isPremium } = useQuota();
  const { t } = useLanguage();

  const getProgressPercentage = () => {
    if (dailyLimit === -1) return 0;
    return Math.min((messagesUsedToday / dailyLimit) * 100, 100);
  };

  const getProgressColor = () => {
    const percentage = getProgressPercentage();
    if (percentage >= 100) return "stroke-error";
    if (percentage >= 80) return "stroke-warning";
    return "stroke-primary";
  };

  return (
    <Link
      href="/pricing"
      className={`
        w-full h-11 rounded-xl flex items-center justify-center
        ${isPremium
          ? "bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30"
          : "bg-[#F8935D]/5 dark:bg-dark-hover border border-[#F8935D]/15 dark:border-dark-border hover:border-primary/30"
        }
        transition-colors duration-200
      `}
      title={`${planName} - ${dailyLimit === -1 ? t.sidebar.unlimited : `${messagesUsedToday}/${dailyLimit}`}`}
    >
      {isPremium ? (
        <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ) : (
        <div className="relative w-5 h-5">
          <svg className="w-5 h-5" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="16" fill="none" stroke="currentColor" strokeWidth="3" opacity="0.2" className="text-text-muted" />
            <circle
              cx="18"
              cy="18"
              r="16"
              fill="none"
              strokeWidth="3"
              strokeDasharray={`${getProgressPercentage()} 100`}
              strokeLinecap="round"
              transform="rotate(-90 18 18)"
              className={getProgressColor()}
            />
          </svg>
        </div>
      )}
    </Link>
  );
}

// Quota Badge Component - Expanded version (full details)
function QuotaBadgeExpanded() {
  const { planName, messagesUsedToday, dailyLimit, isPremium } = useQuota();
  const { t } = useLanguage();

  const getProgressPercentage = () => {
    if (dailyLimit === -1) return 0;
    return Math.min((messagesUsedToday / dailyLimit) * 100, 100);
  };

  const getProgressColor = () => {
    const percentage = getProgressPercentage();
    if (percentage >= 100) return "bg-error";
    if (percentage >= 80) return "bg-warning";
    return "bg-primary";
  };

  return (
    <div className="px-3 pb-3">
      <Link
        href="/pricing"
        className={`
          block p-3 rounded-xl
          ${isPremium
            ? "bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20"
            : "bg-[#F8935D]/5 dark:bg-dark-hover/50 border border-[#F8935D]/15 dark:border-dark-border hover:border-primary/30"
          }
          transition-colors duration-200 group
        `}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {isPremium ? (
              <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            )}
            <span className={`text-sm font-medium ${isPremium ? "text-primary" : "text-text-primary"}`}>
              {planName}
            </span>
          </div>
          {!isPremium && (
            <span className="text-xs text-primary group-hover:underline">{t.sidebar.upgrade}</span>
          )}
        </div>

        {!isPremium && dailyLimit > 0 && (
          <>
            <div className="h-1.5 bg-[#F8935D]/15 dark:bg-dark-border rounded-full overflow-hidden mb-1.5">
              <div
                className={`h-full ${getProgressColor()} transition-all duration-300`}
                style={{ width: `${getProgressPercentage()}%` }}
              />
            </div>
            <p className="text-xs text-text-muted">
              {messagesUsedToday}/{dailyLimit} {t.sidebar.messagesToday}
            </p>
          </>
        )}

        {isPremium && (
          <p className="text-xs text-text-secondary">{t.sidebar.unlimitedMessages}</p>
        )}
      </Link>
    </div>
  );
}
