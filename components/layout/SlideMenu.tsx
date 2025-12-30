"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Post } from "@/types";

interface SlideMenuProps {
  isOpen: boolean;
  onClose: () => void;
  posts?: Post[];
}

// Group posts by date
function groupPostsByDate(posts: Post[]) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

  const groups: { label: string; posts: Post[] }[] = [
    { label: "Aujourd'hui", posts: [] },
    { label: "Hier", posts: [] },
    { label: "Cette semaine", posts: [] },
    { label: "Plus ancien", posts: [] },
  ];

  posts.forEach((post) => {
    const createdAt = post.createdAt as { toDate?: () => Date } | Date | string;
    const postDate = typeof createdAt === 'object' && createdAt && 'toDate' in createdAt
      ? createdAt.toDate?.() || new Date()
      : new Date(createdAt as string | Date);
    if (postDate >= today) {
      groups[0].posts.push(post);
    } else if (postDate >= yesterday) {
      groups[1].posts.push(post);
    } else if (postDate >= weekAgo) {
      groups[2].posts.push(post);
    } else {
      groups[3].posts.push(post);
    }
  });

  return groups.filter((g) => g.posts.length > 0);
}

const menuItems = [
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
  {
    name: "Parametres",
    href: "/settings",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
        />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

export default function SlideMenu({ isOpen, onClose, posts = [] }: SlideMenuProps) {
  const pathname = usePathname();
  const { user, userProfile, signOut } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [showChatList, setShowChatList] = useState(true);

  // Filter and group posts
  const filteredPosts = useMemo(() => {
    if (!searchQuery) return posts;
    return posts.filter((post) =>
      post.prompt.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [posts, searchQuery]);

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

  const handleSignOut = async () => {
    await signOut();
    onClose();
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
            <div className="w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-xl overflow-hidden flex items-center justify-center shadow-glow transition-transform group-hover:scale-105">
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
            className="p-2.5 text-text-secondary hover:text-white hover:bg-dark-hover rounded-xl transition-all duration-200 haptic-feedback"
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
              text-white rounded-xl transition-all duration-200
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
                bg-dark-bg border border-dark-border rounded-xl
                text-white placeholder-text-muted
                focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary
                transition-all duration-200
              "
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-text-muted hover:text-white transition-colors"
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
                    flex items-center gap-3 px-4 py-3 rounded-xl
                    transition-all duration-200 group haptic-feedback
                    ${isActive
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : "text-text-secondary hover:text-white hover:bg-dark-hover"
                    }
                  `}
                >
                  <span className={`transition-transform duration-200 ${!isActive && "group-hover:scale-110"}`}>
                    {item.icon}
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
                  {posts.length}
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

            {/* Grouped posts */}
            <div
              className={`
                overflow-hidden transition-all duration-300 ease-smooth
                ${showChatList ? "max-h-[350px] opacity-100 overflow-y-auto" : "max-h-0 opacity-0"}
              `}
            >
              {groupedPosts.length > 0 ? (
                <>
                  {groupedPosts.map((group, groupIndex) => (
                    <div key={group.label} className={groupIndex > 0 ? "mt-4" : "mt-2"}>
                      <p className="px-3 py-1 text-2xs font-medium text-text-muted uppercase tracking-wider">
                        {group.label}
                      </p>
                      <div className="space-y-0.5 mt-1">
                        {group.posts.slice(0, 3).map((post) => (
                          <Link
                            key={post.id}
                            href={`/history?id=${post.id}`}
                            onClick={onClose}
                            className="
                              flex items-center gap-3 px-3 py-2.5 rounded-xl
                              text-text-secondary text-sm
                              hover:text-white hover:bg-dark-hover
                              transition-all duration-200 group haptic-feedback
                            "
                          >
                            <svg
                              className="w-4 h-4 shrink-0 text-text-muted group-hover:text-accent transition-colors"
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
                            <span className="truncate flex-1">
                              {post.prompt.slice(0, 30)}
                              {post.prompt.length > 30 ? "..." : ""}
                            </span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}

                  {/* View all button */}
                  {posts.length > 3 && (
                    <Link
                      href="/history"
                      onClick={onClose}
                      className="
                        flex items-center justify-center gap-2 mt-4 px-3 py-2.5
                        text-sm text-primary hover:text-accent
                        hover:bg-primary/5 rounded-xl transition-all duration-200 haptic-feedback
                      "
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                      </svg>
                      Voir tout ({posts.length})
                    </Link>
                  )}
                </>
              ) : (
                <div className="px-3 py-8 text-center">
                  <div className="w-12 h-12 mx-auto mb-3 bg-dark-elevated rounded-xl flex items-center justify-center">
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

        {/* Footer - User */}
        <div className="p-4 border-t border-dark-border">
          {user ? (
            <div className="space-y-3">
              <Link
                href="/profile"
                onClick={onClose}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-dark-hover transition-all duration-200 group haptic-feedback"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center shrink-0 border border-dark-border group-hover:border-primary/30 transition-colors">
                  {userProfile?.photoURL ? (
                    <img
                      src={userProfile.photoURL}
                      alt={userProfile.displayName || "Avatar"}
                      className="w-12 h-12 rounded-xl object-cover"
                    />
                  ) : (
                    <span className="text-primary font-bold text-xl">
                      {userProfile?.displayName?.charAt(0) || user.email?.charAt(0) || "U"}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">
                    {userProfile?.displayName || "Utilisateur"}
                  </p>
                  {userProfile?.profile?.role ? (
                    <p className="text-xs text-accent truncate">{userProfile.profile.role}</p>
                  ) : (
                    <p className="text-xs text-text-muted truncate">{user.email}</p>
                  )}
                  {userProfile?.profile?.sector && (
                    <p className="text-xs text-text-muted truncate mt-0.5">{userProfile.profile.sector}</p>
                  )}
                </div>
                <svg className="w-5 h-5 text-text-muted group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
              <button
                onClick={handleSignOut}
                className="
                  flex items-center justify-center gap-2 w-full px-4 py-3
                  text-error hover:text-white hover:bg-error/10
                  rounded-xl transition-all duration-200 haptic-feedback
                "
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                <span className="font-medium">Deconnexion</span>
              </button>
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
                  text-white font-medium rounded-xl
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
                  rounded-xl transition-all duration-200 haptic-feedback
                "
              >
                Creer un compte
              </Link>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
