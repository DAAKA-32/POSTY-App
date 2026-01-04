"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Post } from "@/types";
import { pinPost, renamePost, deletePost } from "@/lib/firestore";
import toast from "react-hot-toast";
import ConversationOptionsMenu from "@/components/conversation/ConversationOptionsMenu";
import RenameConversationModal from "@/components/conversation/RenameConversationModal";
import DeleteConfirmModal from "@/components/conversation/DeleteConfirmModal";
import ProfileMenu from "@/components/layout/ProfileMenu";

interface SlideMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onOpen?: () => void;
  posts?: Post[];
  onPostUpdate?: () => void;
}

// Group posts by date with pinned posts first
function groupPostsByDate(posts: Post[]) {
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
    groups.push({ label: "Epingles", posts: pinnedPosts, isPinnedGroup: true });
  }

  // Date-based groups for non-pinned posts
  const dateGroups: { label: string; posts: Post[] }[] = [
    { label: "Aujourd'hui", posts: [] },
    { label: "Hier", posts: [] },
    { label: "Cette semaine", posts: [] },
    { label: "Plus ancien", posts: [] },
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
    name: "Chat",
    href: "/app",
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
    name: "Historique",
    href: "/history",
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
];

export default function SlideMenu({ isOpen, onClose, onOpen, posts = [], onPostUpdate }: SlideMenuProps) {
  const pathname = usePathname();
  const { user, userProfile } = useAuth();
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
    () => groupPostsByDate(filteredPosts),
    [filteredPosts]
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

  return (
    <>
      {/* Overlay */}
      <div
        className={`
          fixed inset-0 z-[60] popup-overlay
          transition-opacity duration-300
          lg:hidden
          ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}
        `}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide Menu */}
      <aside
        className={`
          fixed top-0 left-0 z-[70] h-full w-80
          bg-dark-card border-r border-dark-border
          flex flex-col
          transform transition-transform duration-300 ease-smooth
          lg:hidden
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-dark-border">
          <Link href="/app" className="flex items-center gap-3 group" onClick={onClose}>
            <div className="w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-lg overflow-hidden flex items-center justify-center shadow-glow transition-transform group-hover:scale-105">
              <img
                src="/logo.png"
                alt="POSTY Logo"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const sibling = e.currentTarget.nextElementSibling as HTMLElement | null; if (sibling) sibling.style.display = 'flex';
                }}
              />
              <span className="text-white font-bold text-xl hidden">P</span>
            </div>
            <span className="font-semibold text-white text-xl tracking-tight">POSTY</span>
          </Link>
          <button
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] p-2.5 flex items-center justify-center text-text-secondary hover:text-white hover:bg-dark-hover rounded-lg transition-all duration-200 haptic-feedback"
            aria-label="Fermer le menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 overflow-y-auto no-scrollbar">
          {/* New post button */}
          <Link
            href="/app"
            onClick={onClose}
            className="
              flex items-center justify-center gap-3 w-full px-4 py-3.5 mb-5
              bg-gradient-to-r from-primary to-primary-hover
              hover:from-primary-hover hover:to-primary
              text-white rounded-lg transition-all duration-200
              shadow-glow hover:shadow-lg haptic-feedback
            "
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="font-semibold">Nouveau post</span>
          </Link>

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
              placeholder="Rechercher un chat..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="
                w-full pl-11 pr-4 py-3 text-sm
                bg-dark-bg border border-dark-border rounded-lg
                text-white placeholder-text-muted
                focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary
                transition-all duration-200
              "
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-1 top-1/2 -translate-y-1/2 min-w-[44px] min-h-[44px] flex items-center justify-center text-text-muted hover:text-white transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Nav items */}
          <div className="space-y-1.5">
            {menuItems.map((item) => {
              const isActive = pathname === item.href || (item.href === "/app" && pathname === "/chat");
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={onClose}
                  className={`
                    relative flex items-center gap-3 px-4 py-3 rounded-lg
                    transition-all duration-200 group haptic-feedback
                    ${isActive
                      ? "bg-primary/10 text-primary before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-1 before:h-6 before:bg-primary before:rounded-full before:shadow-glow"
                      : "text-text-secondary hover:text-white hover:bg-dark-hover hover:border-l-2 hover:border-primary/30 hover:pl-[14px]"
                    }
                  `}
                >
                  <span className={`transition-transform duration-200 ${isActive ? "scale-110" : "group-hover:scale-110"}`}>
                    {item.icon(isActive)}
                  </span>
                  <span className="font-medium">{item.name}</span>
                </Link>
              );
            })}
          </div>

          {/* Chat list section */}
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

            {/* Grouped posts - No max-height for unified scroll */}
            <div
              className={`
                transition-all duration-300 ease-smooth
                ${showChatList ? "opacity-100" : "max-h-0 opacity-0 overflow-hidden"}
              `}
            >
              {groupedPosts.length > 0 ? (
                <>
                  {groupedPosts.map((group, groupIndex) => (
                    <div key={group.label} className={groupIndex > 0 ? "mt-4" : "mt-2"}>
                      <p className={`
                        px-3 py-1 text-2xs font-medium uppercase tracking-wider flex items-center gap-1.5
                        ${group.isPinnedGroup ? "text-accent" : "text-text-muted"}
                      `}>
                        {group.isPinnedGroup && (
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                          </svg>
                        )}
                        {group.label}
                      </p>
                      <div className="space-y-0.5 mt-1">
                        {group.posts.map((post) => (
                          <div
                            key={post.id}
                            className="
                              relative flex items-center gap-2 px-3 py-2.5 rounded-lg
                              text-text-secondary text-sm
                              hover:text-white hover:bg-dark-hover
                              hover:border-l-2 hover:border-primary/40 hover:pl-[10px]
                              transition-all duration-200 group haptic-feedback
                              cursor-pointer
                            "
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
                              onClick={onClose}
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
                        ))}
                      </div>
                    </div>
                  ))}

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
                      Voir tout l&apos;historique
                    </Link>
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
        </nav>

        {/* Footer - User Profile Menu */}
        <div className="p-4 border-t border-dark-border">
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
                Connexion
              </Link>
              <Link
                href="/signup"
                onClick={onClose}
                className="
                  flex items-center justify-center gap-2 w-full px-4 py-3
                  text-text-secondary hover:text-white
                  bg-dark-elevated hover:bg-dark-hover
                  border border-dark-border hover:border-primary/30
                  rounded-lg transition-all duration-200 haptic-feedback
                "
              >
                Creer un compte
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
