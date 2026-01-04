"use client";

import { useState, useMemo, useRef, useEffect, useCallback, ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useQuota } from "@/contexts/QuotaContext";
import SlideMenu from "./SlideMenu";
import ChatHistoryModal from "./ChatHistoryModal";
import ProfileMenu from "./ProfileMenu";
import ConversationOptionsMenu from "@/components/conversation/ConversationOptionsMenu";
import RenameConversationModal from "@/components/conversation/RenameConversationModal";
import DeleteConfirmModal from "@/components/conversation/DeleteConfirmModal";
import { Post } from "@/types";
import { getUserPostsWithPinned, pinPost, renamePost, deletePost } from "@/lib/firestore";
import { AnimatedSlideIn, AnimatedPageWrapper } from "@/components/animations/AnimatedPageWrapper";
import toast from "react-hot-toast";

interface MainLayoutProps {
  children: ReactNode;
  posts?: Post[];
  showMobileHeader?: boolean;
  headerTitle?: string;
  onPostUpdate?: () => void;
}

// Group posts by date with pinned posts first
function groupPostsByDate(posts: Post[]) {
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
    groups.push({ label: "Epingles", posts: pinnedPosts, isPinned: true });
  }

  // Date-based groups for unpinned posts
  const dateGroups: { label: string; posts: Post[] }[] = [
    { label: "Aujourd'hui", posts: [] },
    { label: "Hier", posts: [] },
    { label: "Cette semaine", posts: [] },
    { label: "Plus ancien", posts: [] },
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

const navItems = [
  {
    name: "Chat",
    href: "/app",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
        />
      </svg>
    ),
  },
  {
    name: "Historique",
    href: "/history",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
];

// LocalStorage key for sidebar state (per user)
const getSidebarStorageKey = (userId: string) => `posty_sidebar_collapsed_${userId}`;

export default function MainLayout({
  children,
  posts = [],
  showMobileHeader = true,
  headerTitle,
  onPostUpdate,
}: MainLayoutProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  // Sidebar state: null = not yet determined (prevents flash)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean | null>(null);
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

  // Pages where we should NOT load conversations (subscription page)
  const isSubscriptionPage = pathname === "/subscription" || pathname === "/pricing";

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
      toast.success(isPinned ? "Conversation epinglee" : "Conversation desepinglee");
      onPostUpdate?.();
    } catch (error) {
      console.error("Error pinning post:", error);
      // Revert on error
      setLocalPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, isPinned: !isPinned } : p))
      );
      toast.error("Erreur lors de l'epinglage");
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
      toast.success("Conversation renommee");
      onPostUpdate?.();
    } catch (error) {
      console.error("Error renaming post:", error);
      toast.error("Erreur lors du renommage");
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
      toast.success("Conversation supprimee");
      onPostUpdate?.();
    } catch (error) {
      console.error("Error deleting post:", error);
      // Revert - re-fetch posts
      onPostUpdate?.();
      toast.error("Erreur lors de la suppression");
    }
  };

  // Prefetch critical routes for faster navigation
  useEffect(() => {
    // Prefetch routes that user is likely to navigate to
    const routesToPrefetch = ["/app", "/history", "/profile", "/pricing", "/settings"];
    routesToPrefetch.forEach((route) => {
      router.prefetch(route);
    });
  }, [router]);

  // Restore sidebar state from localStorage on mount
  useEffect(() => {
    if (user?.uid) {
      const storageKey = getSidebarStorageKey(user.uid);
      const savedState = localStorage.getItem(storageKey);
      if (savedState !== null) {
        setIsSidebarCollapsed(savedState === "true");
      } else {
        // Default: collapsed for first-time users
        setIsSidebarCollapsed(true);
      }
    } else {
      // Not logged in: default to collapsed
      setIsSidebarCollapsed(true);
    }
  }, [user?.uid]);

  // Save sidebar state to localStorage when it changes
  useEffect(() => {
    if (user?.uid && isSidebarCollapsed !== null) {
      const storageKey = getSidebarStorageKey(user.uid);
      localStorage.setItem(storageKey, String(isSidebarCollapsed));
    }
  }, [isSidebarCollapsed, user?.uid]);

  // Ref for search input auto-focus
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [shouldFocusSearch, setShouldFocusSearch] = useState(false);

  // Auto-focus search input when sidebar opens via search click
  useEffect(() => {
    if (isSidebarCollapsed === false && shouldFocusSearch && searchInputRef.current) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
        setShouldFocusSearch(false);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isSidebarCollapsed, shouldFocusSearch]);

  // Keyboard shortcut: Cmd/Ctrl+K to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (isSidebarCollapsed) {
          setShouldFocusSearch(true);
          setIsSidebarCollapsed(false);
        } else {
          searchInputRef.current?.focus();
        }
      }
      // Escape to blur search
      if (e.key === "Escape" && document.activeElement === searchInputRef.current) {
        searchInputRef.current?.blur();
        setSearchQuery("");
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isSidebarCollapsed]);

  // Handle search icon click
  const handleSearchClick = useCallback(() => {
    if (isSidebarCollapsed) {
      setShouldFocusSearch(true);
      setIsSidebarCollapsed(false);
    } else {
      searchInputRef.current?.focus();
    }
  }, [isSidebarCollapsed]);

  // Toggle sidebar
  const toggleSidebar = useCallback(() => {
    setIsSidebarCollapsed((prev) => !prev);
    setShouldFocusSearch(false);
  }, []);

  // Effective collapsed state (use true as fallback while loading)
  const isCollapsed = isSidebarCollapsed ?? true;
  // Whether state has been determined (to control visibility)
  const isStateReady = isSidebarCollapsed !== null;

  // Filter and group posts (using localPosts for optimistic updates)
  const filteredPosts = useMemo(() => {
    if (!searchQuery) return localPosts;
    return localPosts.filter((post) =>
      post.prompt.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [localPosts, searchQuery]);

  const groupedPosts = useMemo(
    () => groupPostsByDate(filteredPosts),
    [filteredPosts]
  );

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      {/* Desktop/Tablet Sidebar */}
      <AnimatedSlideIn direction="left" delay={0.1}>
        <aside
          className={`
            hidden lg:flex flex-col
            ${isCollapsed ? "w-[68px]" : "w-72"}
            h-screen bg-dark-card border-r border-dark-border
            transition-[width,box-shadow] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
            fixed left-0 top-0 z-40
            gpu-accelerated
            ${!isCollapsed ? "shadow-xl shadow-black/20" : ""}
            ${isStateReady ? "opacity-100" : "opacity-0"}
          `}
        >
        {/* Sidebar Header */}
        <div className={`p-4 border-b border-dark-border flex items-center ${isCollapsed ? "justify-center" : "justify-between"}`}>
          {isCollapsed ? (
            /* Collapsed: Only expand arrow button */
            <button
              onClick={toggleSidebar}
              className="
                p-2.5 rounded-lg
                text-text-secondary hover:text-primary
                hover:bg-dark-hover
                transition-all duration-300 ease-out
                group
              "
              title="Ouvrir la sidebar"
            >
              <svg
                className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            </button>
          ) : (
            /* Expanded: Logo + collapse button */
            <>
              <Link href="/app" className="flex items-center gap-3 group">
                <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-lg overflow-hidden flex items-center justify-center shadow-glow transition-transform duration-300 group-hover:scale-105">
                  <img
                    src="/logo.png"
                    alt="POSTY Logo"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      const sibling = e.currentTarget.nextElementSibling as HTMLElement | null;
                      if (sibling) sibling.style.display = 'flex';
                    }}
                  />
                  <span className="text-white font-bold text-lg hidden items-center justify-center">P</span>
                </div>
                <span className="font-semibold text-white text-lg tracking-tight transition-opacity duration-300">POSTY</span>
              </Link>
              <button
                onClick={toggleSidebar}
                className="min-w-[44px] min-h-[44px] p-2 flex items-center justify-center text-text-secondary hover:text-white hover:bg-dark-hover rounded-lg transition-all duration-200"
                title="Reduire"
              >
                <svg
                  className="w-5 h-5 transition-transform duration-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
              </button>
            </>
          )}
        </div>

        {/* Search Section */}
        <div className={`${isCollapsed ? "p-2" : "p-3"}`}>
          {isCollapsed ? (
            /* Collapsed: Search icon button */
            <button
              onClick={handleSearchClick}
              className="
                w-full p-3 rounded-lg
                bg-dark-bg border border-dark-border
                hover:bg-dark-hover hover:border-primary/30
                text-text-muted hover:text-primary
                transition-all duration-200
                flex items-center justify-center
                group
              "
              title="Rechercher"
            >
              <svg
                className="w-5 h-5 transition-transform duration-200 group-hover:scale-110"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          ) : (
            /* Expanded: Full search input with keyboard shortcut hint */
            <div className="relative group">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none transition-colors group-focus-within:text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="
                  w-full pl-10 pr-16 py-2.5 text-sm
                  bg-dark-bg border border-dark-border rounded-lg
                  text-white placeholder-text-muted
                  focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary
                  transition-all duration-200
                "
              />
              {/* Keyboard shortcut hint or clear button */}
              {searchQuery ? (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-1 top-1/2 -translate-y-1/2 min-w-[44px] min-h-[44px] flex items-center justify-center text-text-muted hover:text-white transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              ) : (
                <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center text-2xs text-text-muted/60 font-mono px-1.5 py-0.5 bg-dark-hover rounded border border-dark-border">
                  <span className="text-[10px]">⌘</span>K
                </kbd>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav
          id="navigation"
          aria-label="Navigation principale"
          className={`flex-1 overflow-y-auto no-scrollbar gpu-scroll ${isCollapsed ? "p-2" : "p-3"}`}
        >
          {/* New post button */}
          <Link
            href="/app"
            className={`
              flex items-center gap-3 mb-4 rounded-lg
              bg-gradient-to-r from-primary to-primary-hover
              hover:from-primary-hover hover:to-primary
              text-white shadow-glow hover:shadow-lg
              transition-all duration-200
              ${isCollapsed ? "justify-center p-3" : "px-3 py-2.5"}
            `}
            title={isCollapsed ? "Nouveau post" : undefined}
          >
            <svg className={`${isCollapsed ? "w-6 h-6" : "w-5 h-5"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {!isCollapsed && <span className="font-medium">Nouveau post</span>}
          </Link>

          {/* Nav items with improved visual hierarchy */}
          <div className={`${isCollapsed ? "space-y-2" : "space-y-1"}`}>
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.href === "/app" && pathname === "/chat");
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`
                    flex items-center rounded-lg relative
                    transition-all duration-200 group
                    ${isActive
                      ? "bg-primary/10 text-primary"
                      : "text-text-secondary hover:text-white hover:bg-dark-hover"
                    }
                    ${isCollapsed
                      ? "justify-center p-3"
                      : "gap-3 px-3 py-2.5"
                    }
                  `}
                  title={isCollapsed ? item.name : undefined}
                >
                  {/* Active indicator bar */}
                  {isActive && !isCollapsed && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full" />
                  )}
                  <span className={`transition-all duration-200 ${!isActive && "group-hover:scale-110"} ${isCollapsed && "flex items-center"}`}>
                    {item.icon}
                  </span>
                  {!isCollapsed && (
                    <span className={`font-medium ${isActive ? "text-primary" : ""}`}>
                      {item.name}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>


          {/* Chat history section */}
          {!isCollapsed && localPosts.length > 0 && (
            <div className="mt-6">
              {/* Toggle header */}
              <button
                onClick={() => setShowChatList(!showChatList)}
                className="flex items-center justify-between w-full px-3 py-2 text-text-muted hover:text-white transition-colors rounded-lg"
              >
                <span className="text-xs font-semibold uppercase tracking-wider">
                  Conversations
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-2xs text-text-muted bg-dark-hover px-2 py-0.5 rounded-full">
                    {localPosts.length}
                  </span>
                  <svg
                    className={`w-4 h-4 transition-transform duration-200 ${showChatList ? "" : "-rotate-90"}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {/* Grouped posts - Unified scroll (no separate scroll container) */}
              <div
                className={`
                  transition-all duration-300 ease-smooth gpu-layer
                  ${showChatList ? "opacity-100" : "max-h-0 opacity-0 overflow-hidden"}
                `}
              >
                {groupedPosts.length > 0 ? (
                  <>
                    {groupedPosts.map((group, groupIndex) => (
                      <div key={group.label} className={groupIndex > 0 ? "mt-4" : "mt-2"}>
                        <div className="flex items-center gap-2 px-3 py-1">
                          {/* Pin icon for pinned section */}
                          {group.isPinned && (
                            <svg className="w-3 h-3 text-primary" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                            </svg>
                          )}
                          <span className={`text-2xs font-semibold uppercase tracking-wider ${group.isPinned ? "text-primary" : "text-text-muted"}`}>
                            {group.label}
                          </span>
                        </div>
                        <div className="space-y-0.5 mt-1">
                          {group.posts.map((post) => (
                            <div
                              key={post.id}
                              onMouseEnter={() => setHoveredPostId(post.id)}
                              onMouseLeave={() => setHoveredPostId(null)}
                              className={`
                                relative flex items-center gap-2 px-3 py-2 rounded-lg
                                text-sm transition-all duration-200 group cursor-pointer
                                ${post.isPinned
                                  ? "text-white bg-primary/5 border border-primary/10 hover:bg-primary/10 hover:border-primary/20"
                                  : "text-text-secondary hover:text-white hover:bg-dark-hover"
                                }
                              `}
                            >
                              {/* Pin indicator */}
                              {post.isPinned && (
                                <svg
                                  className="w-3 h-3 shrink-0 text-accent group-hover:scale-110 transition-transform duration-200"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                                </svg>
                              )}
                              <Link
                                href={`/app/c/${post.id}`}
                                className="flex items-center gap-2 flex-1 min-w-0"
                              >
                                {!post.isPinned && (
                                  <svg
                                    className="w-4 h-4 shrink-0 text-text-muted group-hover:text-primary group-hover:scale-110 transition-all duration-200"
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
                                <span className="truncate flex-1 group-hover:translate-x-0.5 transition-transform duration-200">
                                  {(post.title || post.prompt).slice(0, 22)}
                                  {(post.title || post.prompt).length > 22 ? "..." : ""}
                                </span>
                              </Link>
                              {/* Options menu - visible on hover */}
                              <div className="shrink-0">
                                <ConversationOptionsMenu
                                  post={post}
                                  onPin={handlePin}
                                  onRename={handleRename}
                                  onDelete={handleDeleteClick}
                                  isVisible={hoveredPostId === post.id}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}

                    {/* View all button */}
                    {localPosts.length > 5 && (
                      <button
                        onClick={() => setShowHistoryModal(true)}
                        className="
                          flex items-center justify-center gap-2 w-full mt-3 px-3 py-2
                          text-xs text-primary hover:text-accent
                          hover:bg-primary/5 rounded-lg transition-all duration-200
                        "
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                        </svg>
                        Voir tout ({localPosts.length})
                      </button>
                    )}
                  </>
                ) : (
                  <div className="px-3 py-8 text-center">
                    <div className="w-12 h-12 mx-auto mb-3 bg-dark-elevated rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {searchQuery ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        )}
                      </svg>
                    </div>
                    <p className="text-sm text-text-muted">
                      {searchQuery ? "Aucun resultat" : "Aucune conversation"}
                    </p>
                    {searchQuery && (
                      <p className="text-xs text-text-muted mt-1">pour &ldquo;{searchQuery}&rdquo;</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </nav>

        {/* Quota Badge */}
        <QuotaBadge isSidebarCollapsed={isCollapsed} />

        {/* Sidebar Footer - User Profile Menu */}
        <div className="p-3 border-t border-dark-border">
          <ProfileMenu isCollapsed={isCollapsed} />
        </div>
        </aside>
      </AnimatedSlideIn>

      {/* Mobile Slide Menu with Swipe Gesture Support */}
      <SlideMenu
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        onOpen={() => setIsMenuOpen(true)}
        posts={effectivePosts}
        onPostUpdate={onPostUpdate}
      />

      {/* Main Content */}
      <main
        id="main-content"
        role="main"
        aria-label="Contenu principal"
        tabIndex={-1}
        className={`
          flex-1 flex flex-col h-screen
          transition-all duration-300 ease-in-out
          ${isCollapsed ? "lg:pl-[68px]" : "lg:pl-72"}
          focus:outline-none
        `}
      >
        {/* Mobile Header */}
        {showMobileHeader && (
          <AnimatedSlideIn direction="top" delay={0.05}>
            <header className="lg:hidden flex-shrink-0 bg-dark-card/95 backdrop-blur-xl border-b border-dark-border z-30">
            <div className="flex items-center justify-between h-16 px-4">
              <button
                onClick={() => setIsMenuOpen(true)}
                className="min-w-[44px] min-h-[44px] p-2.5 -ml-2 flex items-center justify-center text-text-secondary hover:text-white hover:bg-dark-hover rounded-lg transition-all duration-200 haptic-feedback"
                aria-label="Ouvrir le menu"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-lg overflow-hidden flex items-center justify-center shadow-glow">
                  <img
                    src="/logo.png"
                    alt="POSTY Logo"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      const sibling = e.currentTarget.nextElementSibling as HTMLElement | null; if (sibling) sibling.style.display = 'flex';
                    }}
                  />
                  <span className="text-white font-bold hidden">P</span>
                </div>
                <span className="font-semibold text-white text-lg tracking-tight">
                  {headerTitle || "POSTY"}
                </span>
              </div>
              <div className="w-10" /> {/* Spacer for centering */}
            </div>
            </header>
          </AnimatedSlideIn>
        )}

        {/* Page Content */}
        <AnimatedPageWrapper delay={0.2} className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain gpu-scroll">
          {children}
        </AnimatedPageWrapper>
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

// Quota Badge Component
function QuotaBadge({ isSidebarCollapsed }: { isSidebarCollapsed: boolean }) {
  const { currentPlan, planName, messagesUsedToday, dailyLimit, isPremium } = useQuota();

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

  if (isSidebarCollapsed) {
    return (
      <div className="px-2 pb-2">
        <Link
          href="/pricing"
          className={`
            flex items-center justify-center p-3 rounded-lg
            ${isPremium
              ? "bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30"
              : "bg-dark-hover border border-dark-border hover:border-primary/30"
            }
            transition-all duration-200 group
          `}
          title={`${planName} - ${dailyLimit === -1 ? "Illimite" : `${messagesUsedToday}/${dailyLimit}`}`}
        >
          {isPremium ? (
            <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          ) : (
            <div className="relative w-5 h-5">
              <svg className="w-5 h-5 text-text-muted" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="16" fill="none" stroke="currentColor" strokeWidth="3" opacity="0.3" />
                <circle
                  cx="18"
                  cy="18"
                  r="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeDasharray={`${getProgressPercentage()} 100`}
                  strokeLinecap="round"
                  transform="rotate(-90 18 18)"
                  className={getProgressColor().replace("bg-", "stroke-")}
                />
              </svg>
            </div>
          )}
        </Link>
      </div>
    );
  }

  return (
    <div className="px-3 pb-3">
      <Link
        href="/pricing"
        className={`
          block p-3 rounded-lg
          ${isPremium
            ? "bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20"
            : "bg-dark-hover/50 border border-dark-border hover:border-primary/30"
          }
          transition-all duration-200 group
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
            <span className={`text-sm font-medium ${isPremium ? "text-primary" : "text-white"}`}>
              {planName}
            </span>
          </div>
          {!isPremium && (
            <span className="text-xs text-primary group-hover:underline">Upgrade</span>
          )}
        </div>

        {/* Progress bar for free users */}
        {!isPremium && dailyLimit > 0 && (
          <>
            <div className="h-1.5 bg-dark-border rounded-full overflow-hidden mb-1.5">
              <div
                className={`h-full ${getProgressColor()} transition-all duration-300`}
                style={{ width: `${getProgressPercentage()}%` }}
              />
            </div>
            <p className="text-xs text-text-muted">
              {messagesUsedToday}/{dailyLimit} messages aujourd'hui
            </p>
          </>
        )}

        {isPremium && (
          <p className="text-xs text-text-secondary">Messages illimites</p>
        )}
      </Link>
    </div>
  );
}
