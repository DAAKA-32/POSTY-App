"use client";

import { useState, useMemo, useRef, useEffect, useCallback, Fragment, ReactNode } from "react";
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
import SidebarSearchModal from "./SidebarSearchModal";
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
import FreeTrialPaywall from "@/components/subscription/FreeTrialPaywall";
import UsageBanner from "@/components/ui/UsageBanner";
import QuotaExceededModal from "@/components/ui/QuotaExceededModal";
import HelpFloatingButton from "@/components/help/HelpFloatingButton";
import { useScrolledPast } from "@/hooks/scroll/useScrolledPast";
import {
  navItemVariants,
  conversationItemVariants,
  sidebarSmoothEase as smoothEase,
} from "@/lib/motion";

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
  // True until we have confirmed data state — prevents empty-state flash for users with conversations
  const [sidebarLoading, setSidebarLoading] = useState(true);
  const [localPosts, setLocalPosts] = useState<Post[]>([]);
  const [postToDelete, setPostToDelete] = useState<Post | null>(null);
  const [postToRename, setPostToRename] = useState<Post | null>(null);
  const [hoveredPostId, setHoveredPostId] = useState<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const { user, userProfile, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const { isScrolled: isMobileScrolled, sentinelRef: mobileScrollSentinelRef } = useScrolledPast(8);

  // Per-route Posty signature ambient — applied directly as a CSS class on
  // this layout's outer wrapper. Parent background paints BEFORE children
  // (CSS spec), so no descendant stacking context can mask it. SSR-safe: the
  // class is computed from `usePathname()` and serialized in the initial HTML.
  //
  // We use the `.posty-soft-{tone}` classes (defined in globals.css) instead
  // of the full-saturation `bg-signature-{tone}` Tailwind tokens. Soft
  // variants composite two radial halos at ~30-45% alpha over the theme
  // surface — the identity color is unmistakable, but content cards and
  // floating text remain perfectly readable without contrast hacks. Same
  // pattern as Linear, Arc, Vercel and Notion AI.
  //
  // ⚙ FEATURE FLAG: flip `ENABLE_PAGE_TONE_BG` to disable the ambients.
  const ENABLE_PAGE_TONE_BG = true;
  const toneBg = ENABLE_PAGE_TONE_BG ? (() => {
    const p = pathname || "";
    // Each app page wears a distinct signature ambient so the user feels they
    // move into a different "room" of the product on every navigation.
    if (p.startsWith("/app/c/")) return "posty-soft-posts";        // writing room — violet + coral
    if (p === "/app" || p.startsWith("/app/")) return "posty-soft-welcome"; // chat home — warm brand
    if (p.startsWith("/history")) return "posty-soft-visuals";     // archive — fuchsia + rose
    if (p.startsWith("/schedule")) return "posty-soft-schedule";   // planning — sky + violet
    if (p.startsWith("/analytics") || p.startsWith("/dashboard")) return "posty-soft-optimize"; // growth — emerald + orange
    if (p.startsWith("/settings")) return "posty-soft-welcome";    // home base — warm brand
    if (p.startsWith("/profile") || p.startsWith("/brand")) return "posty-soft-visuals"; // creative archive
    if (p.startsWith("/subscription") || p.startsWith("/pricing")) return "posty-soft-posts"; // VIP plans — violet + coral
    if (p.startsWith("/chat")) return "posty-soft-posts";
    return "posty-soft-welcome";
  })() : "";

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

  // Immediately unblock loading when the parent already provides posts (e.g. /app page)
  useEffect(() => {
    if (posts.length > 0 || isSubscriptionPage) {
      setSidebarLoading(false);
    }
  }, [posts.length, isSubscriptionPage]);

  // Auto-load posts for sidebar when not provided and not on subscription page.
  // setSidebarLoading(false) is called in finally so the empty state only appears
  // after we have confirmed there are no conversations — never during the fetch.
  useEffect(() => {
    if (authLoading) return; // wait for Firebase auth to resolve before fetching

    const loadPosts = async () => {
      if (user && posts.length === 0 && !isSubscriptionPage) {
        try {
          const userPosts = await getUserPostsWithPinned(user.uid, 50);
          setAutoLoadedPosts(userPosts);
        } catch (error) {
          console.error("Error auto-loading posts for sidebar:", error);
        } finally {
          setSidebarLoading(false);
        }
      } else {
        // Subscription page, or parent provided posts, or no user — nothing to fetch
        setSidebarLoading(false);
      }
    };
    loadPosts();
  }, [user, authLoading, posts.length, isSubscriptionPage]);

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

  // Whether the search modal (ChatGPT-style command palette) is open.
  // The modal owns its own input ref + focus management, so MainLayout no
  // longer needs `searchInputRef` / `shouldFocusSearch`.
  const [searchOpen, setSearchOpen] = useState(false);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl+K → open the search modal
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
      // Cmd/Ctrl+B → toggle sidebar collapse (desktop only)
      if ((e.metaKey || e.ctrlKey) && e.key === "b") {
        e.preventDefault();
        if (window.innerWidth >= 1024) {
          toggleCollapse();
        }
      }
      // Escape → close sidebar (the modal handles its own Esc internally)
      if (e.key === "Escape" && !searchOpen && isSidebarOpen) {
        closeSidebar();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isSidebarOpen, closeSidebar, toggleCollapse, searchOpen]);

  // Handle search nav-row click — just opens the modal. No more inline input
  // toggle / sidebar-expand dance: the modal works the same on collapsed,
  // expanded, mobile, desktop.
  const handleSearchClick = useCallback(() => {
    setSearchOpen(true);
  }, []);

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
    <div className={`relative h-screen flex overflow-hidden app-layout isolate`}>
      {/* Per-route signature ambient — viewport-fixed gradient layer behind
          everything. Using `position: fixed; inset: 0` (instead of painting
          on `.app-layout`, which is `h-screen` and gets scrolled past on
          long pages like /settings) guarantees the halo always covers the
          full viewport, no matter the scroll mode of the route. */}
      <div
        aria-hidden="true"
        className={`pointer-events-none fixed inset-0 ${toneBg}`}
        style={{ zIndex: -1 }}
      />
      {/* ========== DESKTOP SIDEBAR - COLLAPSIBLE ==========
          Sidebar stays fully transparent — the per-route signature ambient
          painted on the MainLayout outer wrapper (a CSS sibling/parent here)
          bleeds through and gives the sidebar the SAME continuous gradient
          as the page. No mini per-element gradient, no white opaque layer:
          one single ambient spanning the whole shell, morphing on each
          navigation. */}
      <aside
        role="navigation"
        aria-label="Navigation principale"
        // Surface en verre poli — même recette que le menu options et le
        // header mobile. Translucide (bg-white/15) + double bordure (border +
        // ring-inset) + multi-ombres pour la profondeur + saturate-200 pour
        // garder la teinte de la page derrière vivante. Le dégradé signature
        // bleed through depuis la fixed div à z=-1.
        className="sidebar-root hidden lg:flex flex-col h-screen fixed left-0 top-0 z-40 overflow-hidden scroll-disabled transition-all duration-200 ease-out
          bg-white/15 dark:bg-white/[0.04]
          border-r border-white/50 dark:border-white/15
          ring-1 ring-inset ring-white/40 dark:ring-white/10
          backdrop-blur-2xl backdrop-saturate-200
          shadow-[0_12px_40px_rgba(15,17,21,0.10),0_2px_10px_rgba(15,17,21,0.06)]
          dark:shadow-[0_12px_40px_rgba(0,0,0,0.45),0_2px_10px_rgba(0,0,0,0.30)]"
        style={{ width: currentSidebarWidth }}
      >
        {/* Glass sheen — fine horizontal highlight running along the top
            edge, catches the light to read as polished glass. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-4 top-0 h-px rounded-full bg-gradient-to-r from-transparent via-white/80 dark:via-white/40 to-transparent z-[1]"
        />
        {/* Subtle internal gradient wash — adds depth + matter without
            obstructing the per-page ambient bleeding through. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/20 via-white/[0.02] to-transparent dark:from-white/[0.04] dark:via-transparent z-0"
        />
        {/* Header - Logo when expanded, Toggle when collapsed */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: smoothEase }}
          className={`h-16 border-b border-gray-200/55 dark:border-dark-border flex items-center shrink-0 ${isCollapsed ? "justify-center px-2" : "justify-between px-3"}`}
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
              <Link href="/app" className="flex items-center gap-2.5 group min-w-0">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, ease: smoothEase }}
                  className="relative"
                  whileHover={{ scale: 1.05 }}
                >
                  {/* Subtle gradient halo on hover — uses the Posty signature
                      "welcome" gradient (orange → coral → rose) so the brand
                      stamp echoes the onboarding hero. */}
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
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.1, ease: smoothEase }}
                  className="font-bold text-sm whitespace-nowrap text-gray-900 dark:text-white group-hover:text-primary transition-colors duration-300"
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

        {/* Fixed navigation section (new post button + nav items + inline
            search affordance injected right after the Chat nav item below). */}
        <div className="shrink-0 px-2.5 pt-2 pb-3">
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
                relative w-full h-10 rounded-lg flex items-center gap-3
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
              {!isCollapsed && <span className="font-semibold whitespace-nowrap tracking-[-0.01em] text-[13.5px]">{t.sidebar.newPost}</span>}
              {/* Tooltip for collapsed mode */}
              {isCollapsed && (
                <span className="absolute left-full ml-2 px-2 py-1 bg-background-warm dark:bg-dark-elevated border border-[#F8935D]/15 dark:border-dark-border rounded-lg text-sm text-text-primary whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50 shadow-lg pointer-events-none">
                  {t.sidebar.newPost}
                </span>
              )}
            </button>
          </motion.div>

          {/* Nav items — grouped in a subtle card for visual hierarchy */}
          <div className="sidebar-nav-card mt-2 rounded-xl overflow-hidden ring-1 ring-gray-200/40 dark:ring-white/[0.04] bg-white/15 dark:bg-white/[0.02]">
          {navItems.map((item, index) => {
            const isActive = pathname === item.href || (item.href === "/app" && pathname === "/chat");
            return (
              <Fragment key={item.name}>
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
                    className={`
                      relative w-full h-10 flex items-center gap-3 rounded-lg
                      border transition-[background-color,border-color,color,box-shadow] duration-200 ease-out group
                      ${isCollapsed ? "justify-center px-0" : "px-3"}
                      ${isActive
                        ? "bg-white/55 dark:bg-white/[0.12] backdrop-blur-md backdrop-saturate-150 dark:backdrop-saturate-125 border-white/60 dark:border-white/20 shadow-sm dark:shadow-black/20 text-primary"
                        : "border-transparent text-gray-700 dark:text-gray-200 hover:bg-white/35 dark:hover:bg-white/[0.08] hover:backdrop-blur-md hover:border-white/40 dark:hover:border-white/15 hover:text-gray-900 dark:hover:text-white"
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

                {/* ─── Search affordance — injected directly under Chat ───
                    Expanded sidebar: full text input.
                    Collapsed sidebar: nav-row-styled icon button matching the
                    height + spacing of the surrounding nav items. */}
                {/* Search row — same shape as Chat / History / Schedule /
                    Analytics (h-10, rounded-lg, hover bg, gap-3, px-3,
                    13.5px label). Toggles `searchOpen` to reveal the input
                    below. Active state: left primary indicator + bg tint +
                    primary text — mirrors the active Link rows above. */}
                {index === 0 && (
                  <div className="relative mx-2 my-0.5">
                    <button
                      onClick={handleSearchClick}
                      className={`
                        relative w-full h-10 flex items-center gap-3 rounded-lg
                        border transition-all duration-200 ease-out group
                        ${isCollapsed ? "justify-center px-0" : "px-3"}
                        ${searchOpen
                          ? "bg-white/55 dark:bg-white/[0.12] backdrop-blur-md backdrop-saturate-150 dark:backdrop-saturate-125 border-white/60 dark:border-white/20 shadow-sm dark:shadow-black/20 text-primary"
                          : "border-transparent text-gray-700 dark:text-gray-200 hover:bg-white/35 dark:hover:bg-white/[0.08] hover:backdrop-blur-md hover:border-white/40 dark:hover:border-white/15 hover:text-gray-900 dark:hover:text-white"
                        }
                      `}
                      title={t.common.search}
                      aria-expanded={searchOpen}
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
                      {!isCollapsed && (
                        <span className={`whitespace-nowrap flex-1 text-left text-[13.5px] ${searchOpen ? "font-bold" : "font-semibold"}`}>
                          {t.common.search}
                        </span>
                      )}
                      {isCollapsed && (
                        <span className="absolute left-full ml-2 px-2 py-1 bg-background-warm dark:bg-dark-elevated border border-[#F8935D]/15 dark:border-dark-border rounded-lg text-sm text-text-primary whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50 shadow-lg pointer-events-none">
                          {t.common.search}
                        </span>
                      )}
                    </button>

                    {/* Inline input removed — search now opens in a centered
                        modal (SidebarSearchModal) for a ChatGPT-style command
                        palette experience. The modal is rendered once at the
                        layout root, controlled by `searchOpen`. */}
                  </div>
                )}
              </Fragment>
            );
          })}
          </div>

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

        {/* Scrollable conversations list (header + items scroll together).
            `min-h-0` is critical for flex children to actually scroll instead
            of pushing the sidebar past the viewport — without it, a long
            conversation list would push the footer (profile menu) off-screen
            on shorter viewports. */}
        <nav className="sidebar-scroll flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-2">
          {!isCollapsed && localPosts.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.3, ease: smoothEase }}
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
                  transition={{ duration: 0.2, ease: smoothEase }}
                  className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </motion.svg>
              </button>

              {showChatList && (
                <div className="mt-2 space-y-0.5"
                  >
                    {groupedPosts.map((group, groupIndex) => {
                      // Determine group visual properties
                      const isPinned = group.isPinned;

                      return (
                      <div key={group.label} className={groupIndex > 0 ? "mt-2.5 mb-3" : "mb-3"}>
                        {/* Group header — label + trailing rule + count */}
                        <motion.div
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: groupIndex * 0.05, ease: smoothEase }}
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
                              whileTap={{ scale: 0.985 }}
                              transition={{ type: "spring", stiffness: 420, damping: 22, mass: 0.7 }}
                              onMouseEnter={() => setHoveredPostId(post.id)}
                              onMouseLeave={() => setHoveredPostId(null)}
                              className="relative group"
                            >
                              <Link
                                href={`/app/c/${post.id}`}
                                className={`
                                  sidebar-conv-item
                                  relative flex items-center gap-2 pl-3 pr-9 py-1.5 rounded-lg text-sm w-full
                                  border transition-[background-color,border-color,color,box-shadow] duration-200 ease-out cursor-pointer transform-gpu
                                  ${
                                    isActive
                                      ? "sidebar-conv-item--active bg-white/55 dark:bg-white/[0.12] backdrop-blur-md backdrop-saturate-150 dark:backdrop-saturate-125 border-white/60 dark:border-white/20 text-text-primary shadow-sm dark:shadow-black/20"
                                      : "border-transparent text-gray-900 dark:text-gray-200 group-hover:text-gray-950 dark:group-hover:text-white group-hover:bg-white/35 dark:group-hover:bg-white/[0.08] group-hover:backdrop-blur-md group-hover:border-white/40 dark:group-hover:border-white/15"
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

          {/* Skeleton — shown while the initial data fetch is in progress */}
          {!isCollapsed && sidebarLoading && localPosts.length === 0 && (
            <div className="px-3 pt-2 space-y-1" aria-hidden="true">
              {[72, 55, 80, 63].map((w, i) => (
                <div key={i} className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg">
                  <div className="w-3.5 h-3.5 rounded bg-gray-200 dark:bg-dark-elevated animate-pulse flex-shrink-0" />
                  <div
                    className="h-2.5 bg-gray-200 dark:bg-dark-elevated rounded-full animate-pulse"
                    style={{ width: `${w}%` }}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Empty state CTA — only after loading confirmed no conversations exist */}
          {!isCollapsed && !sidebarLoading && localPosts.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2, ease: smoothEase }}
              className="flex flex-col items-center justify-center px-5 text-center py-16"
            >
              {/* Icon */}
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </div>

              {/* Text */}
              <p className="text-[13px] font-semibold text-gray-800 dark:text-gray-100 mb-1">
                {t.sidebar.emptyStateTitle}
              </p>
              <p className="text-[11.5px] text-text-muted leading-snug mb-4">
                {t.sidebar.emptyStateSubtitle}
              </p>

              {/* CTA button */}
              <button
                onClick={() => router.push(`/app?new=${Date.now()}`)}
                className="
                  flex items-center gap-1.5 px-4 py-2
                  bg-primary hover:bg-primary-hover
                  text-white text-[12px] font-semibold rounded-lg
                  shadow-sm shadow-primary/20 hover:shadow-md hover:shadow-primary/30
                  transition-all duration-200 active:scale-95 cursor-pointer
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

        {/* Profile — fully transparent wrapper so the per-route signature
            ambient continues seamlessly through the bottom of the sidebar.
            Coverage is now guaranteed by a bottom-left halo added to each
            `posty-soft-*` tone in globals.css (the original 2-anchor design
            left the sidebar foot outside both ellipses, causing the bare
            `#FAFBFC` to bleed through). */}
        <div className="px-2.5 py-2.5 shrink-0 border-t border-[#F8935D]/15 dark:border-white/10">
          <ProfileMenu isCollapsed={isCollapsed} />
        </div>
      </aside>

      {/* Mobile Slide Menu — `display: contents` makes the wrapper invisible
          to flex layout, so the (otherwise) static block doesn't claim a full
          viewport of height inside the column-flex `.pwa-mobile .app-layout`,
          which would push <main> entirely off-screen on mobile. The
          SlideMenu's own backdrop + aside are `position: fixed` and render
          at the viewport regardless — the wrapper just needs to disappear
          from the flex flow. */}
      <div className="contents lg:hidden">
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
            // Transparent au repos pour laisser passer le dégradé signature
            // de la page (fixed inset-0 à z=-1). Bascule en glass dès qu'un
            // scroll commence, pour garder la lisibilité du contenu qui
            // passe en dessous.
            className={`mobile-header lg:hidden fixed top-0 left-0 right-0 z-[60] transition-[background-color,border-color,box-shadow,backdrop-filter] duration-300 ease-out ${
              isMobileScrolled
                ? "backdrop-blur-xl backdrop-saturate-150 bg-white/60 dark:bg-black/40 border-b border-white/30 dark:border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.04)]"
                : "bg-transparent border-b border-transparent"
            }`}
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

        {/* Sentinel for scroll-aware mobile header (transparent → glass) */}
        {showMobileHeader && (
          <div
            ref={mobileScrollSentinelRef}
            aria-hidden="true"
            className="lg:hidden h-2 w-full -mb-2 pointer-events-none"
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

      {/* Sidebar Search Modal — ChatGPT-style command palette.
          Opened by the "Rechercher" sidebar nav row. Shares searchQuery +
          filteredPosts with the rest of the layout so results stay coherent. */}
      <SidebarSearchModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filteredPosts={filteredPosts}
        hasAnyPosts={localPosts.length > 0}
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

      {/* 30-day Free trial expiration paywall — renders only when expired.
          Sits at z-[100] above every modal/sheet so the user can SEE the
          familiar UI behind a blur but cannot interact with it. The user
          stays on /app: conversion happens in-context, not via redirect. */}
      <FreeTrialPaywall />
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
