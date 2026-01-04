"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { Post } from "@/types";

interface CommandPaletteProps {
  posts?: Post[];
}

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  action: () => void;
  category: "navigation" | "action" | "conversation";
  keywords?: string[];
}

// Icons
const SearchIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const PlusIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const HomeIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);

const HistoryIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const SettingsIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const UserIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const LogoutIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
);

const ChatIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);

export default function CommandPalette({ posts = [] }: CommandPaletteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { user, signOut } = useAuth();

  // Build command items
  const commands = useMemo<CommandItem[]>(() => {
    const items: CommandItem[] = [
      // Navigation
      {
        id: "new-post",
        label: "Nouveau post",
        description: "Creer un nouveau post LinkedIn",
        icon: <PlusIcon />,
        action: () => router.push("/app"),
        category: "navigation",
        keywords: ["new", "create", "nouveau", "creer"],
      },
      {
        id: "home",
        label: "Accueil",
        description: "Retour a l'accueil",
        icon: <HomeIcon />,
        action: () => router.push("/app"),
        category: "navigation",
        keywords: ["home", "accueil", "chat"],
      },
      {
        id: "history",
        label: "Historique",
        description: "Voir toutes les conversations",
        icon: <HistoryIcon />,
        action: () => router.push("/history"),
        category: "navigation",
        keywords: ["history", "historique", "posts", "conversations"],
      },
      {
        id: "profile",
        label: "Profil",
        description: "Voir et modifier votre profil",
        icon: <UserIcon />,
        action: () => router.push("/profile"),
        category: "navigation",
        keywords: ["profile", "profil", "compte", "account"],
      },
      {
        id: "settings",
        label: "Parametres",
        description: "Configurer l'application",
        icon: <SettingsIcon />,
        action: () => router.push("/settings"),
        category: "navigation",
        keywords: ["settings", "parametres", "config", "preferences"],
      },
    ];

    // Add logout action if user is logged in
    if (user) {
      items.push({
        id: "logout",
        label: "Deconnexion",
        description: "Se deconnecter de POSTY",
        icon: <LogoutIcon />,
        action: () => {
          signOut();
          router.push("/");
        },
        category: "action",
        keywords: ["logout", "deconnexion", "sortir", "quitter"],
      });
    }

    // Add recent conversations
    posts.slice(0, 5).forEach((post) => {
      items.push({
        id: `post-${post.id}`,
        label: post.title || post.prompt.slice(0, 40) + (post.prompt.length > 40 ? "..." : ""),
        description: "Ouvrir la conversation",
        icon: <ChatIcon />,
        action: () => router.push(`/app/c/${post.id}`),
        category: "conversation",
        keywords: [post.prompt.toLowerCase()],
      });
    });

    return items;
  }, [posts, user, router, signOut]);

  // Filter commands based on query
  const filteredCommands = useMemo(() => {
    if (!query) return commands;

    const lowerQuery = query.toLowerCase();
    return commands.filter((cmd) => {
      const matchLabel = cmd.label.toLowerCase().includes(lowerQuery);
      const matchDescription = cmd.description?.toLowerCase().includes(lowerQuery);
      const matchKeywords = cmd.keywords?.some((kw) => kw.includes(lowerQuery));
      return matchLabel || matchDescription || matchKeywords;
    });
  }, [commands, query]);

  // Group filtered commands by category
  const groupedCommands = useMemo(() => {
    const groups: { [key: string]: CommandItem[] } = {
      navigation: [],
      action: [],
      conversation: [],
    };

    filteredCommands.forEach((cmd) => {
      groups[cmd.category].push(cmd);
    });

    return groups;
  }, [filteredCommands]);

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Handle keyboard shortcut to open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < filteredCommands.length - 1 ? prev + 1 : 0
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : filteredCommands.length - 1
          );
          break;
        case "Enter":
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            filteredCommands[selectedIndex].action();
            setIsOpen(false);
          }
          break;
        case "Escape":
          e.preventDefault();
          setIsOpen(false);
          break;
      }
    },
    [filteredCommands, selectedIndex]
  );

  // Scroll selected item into view
  useEffect(() => {
    const selectedElement = listRef.current?.querySelector(
      `[data-index="${selectedIndex}"]`
    );
    selectedElement?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  const categoryLabels: { [key: string]: string } = {
    navigation: "Navigation",
    action: "Actions",
    conversation: "Conversations recentes",
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />

          {/* Command Palette */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="fixed left-1/2 top-[20%] -translate-x-1/2 z-[101] w-full max-w-lg mx-4"
          >
            <div className="bg-dark-card border border-dark-border rounded-xl shadow-2xl overflow-hidden">
              {/* Search input */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-dark-border">
                <SearchIcon />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Rechercher une action..."
                  className="flex-1 bg-transparent text-white placeholder-text-muted outline-none text-sm"
                />
                <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-xs text-text-muted bg-dark-bg border border-dark-border rounded">
                  ESC
                </kbd>
              </div>

              {/* Results */}
              <div
                ref={listRef}
                className="max-h-[60vh] overflow-y-auto py-2"
              >
                {filteredCommands.length === 0 ? (
                  <div className="px-4 py-8 text-center text-text-muted">
                    <p className="text-sm">Aucun resultat pour "{query}"</p>
                  </div>
                ) : (
                  <>
                    {(["navigation", "action", "conversation"] as const).map(
                      (category) => {
                        const items = groupedCommands[category];
                        if (items.length === 0) return null;

                        return (
                          <div key={category} className="mb-2">
                            <p className="px-4 py-1.5 text-xs font-medium text-text-muted uppercase tracking-wider">
                              {categoryLabels[category]}
                            </p>
                            {items.map((cmd) => {
                              const globalIndex = filteredCommands.indexOf(cmd);
                              const isSelected = globalIndex === selectedIndex;

                              return (
                                <button
                                  key={cmd.id}
                                  data-index={globalIndex}
                                  onClick={() => {
                                    cmd.action();
                                    setIsOpen(false);
                                  }}
                                  onMouseEnter={() => setSelectedIndex(globalIndex)}
                                  className={`
                                    w-full flex items-center gap-3 px-4 py-2.5 text-left
                                    transition-colors duration-100
                                    ${isSelected
                                      ? "bg-primary/10 text-primary"
                                      : "text-text-secondary hover:bg-dark-hover hover:text-white"
                                    }
                                  `}
                                >
                                  <span
                                    className={`
                                      w-8 h-8 flex items-center justify-center rounded-lg
                                      ${isSelected ? "bg-primary/20" : "bg-dark-bg"}
                                      transition-colors duration-100
                                    `}
                                  >
                                    {cmd.icon}
                                  </span>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">
                                      {cmd.label}
                                    </p>
                                    {cmd.description && (
                                      <p className="text-xs text-text-muted truncate">
                                        {cmd.description}
                                      </p>
                                    )}
                                  </div>
                                  {isSelected && (
                                    <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-xs bg-dark-bg border border-dark-border rounded">
                                      ↵
                                    </kbd>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        );
                      }
                    )}
                  </>
                )}
              </div>

              {/* Footer hint */}
              <div className="px-4 py-2 border-t border-dark-border flex items-center justify-between text-xs text-text-muted">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-dark-bg border border-dark-border rounded">↑</kbd>
                    <kbd className="px-1.5 py-0.5 bg-dark-bg border border-dark-border rounded">↓</kbd>
                    <span className="ml-1">naviguer</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-dark-bg border border-dark-border rounded">↵</kbd>
                    <span className="ml-1">selectionner</span>
                  </span>
                </div>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-dark-bg border border-dark-border rounded">⌘</kbd>
                  <kbd className="px-1.5 py-0.5 bg-dark-bg border border-dark-border rounded">K</kbd>
                  <span className="ml-1">ouvrir</span>
                </span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
