"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { getUserPosts, getPost, deletePost } from "@/lib/firestore";
import { Post } from "@/types";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import MainLayout from "@/components/layout/MainLayout";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import SwipeableCard from "@/components/ui/SwipeableCard";
import {
  SearchBar,
  FilterPanel,
  DateDivider,
  HistoryListItem,
  HistoryDetailPanel,
  DateFilter,
  TypeFilter,
} from "@/components/history";
import toast from "react-hot-toast";

function HistoryContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("id");

  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");

  // Fetch all posts
  useEffect(() => {
    const fetchPosts = async () => {
      if (user) {
        setIsLoading(true);
        const userPosts = await getUserPosts(user.uid, 50);
        setPosts(userPosts);
        setIsLoading(false);
      }
    };
    fetchPosts();
  }, [user]);

  // Fetch selected post
  useEffect(() => {
    const fetchSelectedPost = async () => {
      if (selectedId) {
        const post = await getPost(selectedId);
        setSelectedPost(post);
      } else {
        setSelectedPost(null);
      }
    };
    fetchSelectedPost();
  }, [selectedId]);

  // Filtering logic
  const filteredPosts = useMemo(() => {
    let filtered = [...posts];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((post) =>
        post.prompt.toLowerCase().includes(query)
      );
    }

    // Date filter
    if (dateFilter !== "all") {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      const monthAgo = new Date(today);
      monthAgo.setMonth(monthAgo.getMonth() - 1);

      filtered = filtered.filter((post) => {
        const postDate =
          typeof (post.createdAt as { toDate?: () => Date }).toDate === "function"
            ? (post.createdAt as { toDate: () => Date }).toDate()
            : new Date(post.createdAt as any);
        const postDateOnly = new Date(
          postDate.getFullYear(),
          postDate.getMonth(),
          postDate.getDate()
        );

        switch (dateFilter) {
          case "today":
            return postDateOnly.getTime() === today.getTime();
          case "yesterday":
            return postDateOnly.getTime() === yesterday.getTime();
          case "week":
            return postDate >= weekAgo;
          case "month":
            return postDate >= monthAgo;
          default:
            return true;
        }
      });
    }

    // Type filter (based on selected version)
    if (typeFilter !== "all") {
      filtered = filtered.filter((post) => {
        if (typeFilter === "storytelling") {
          return post.selectedVersion === "A";
        } else if (typeFilter === "business") {
          return post.selectedVersion === "B";
        }
        return true;
      });
    }

    return filtered;
  }, [posts, searchQuery, dateFilter, typeFilter]);

  // Group posts by date
  const groupedPosts = useMemo(() => {
    const formatDateLabel = (timestamp: { toDate?: () => Date } | Date | null): string => {
      if (!timestamp) return "";
      const date =
        typeof (timestamp as { toDate?: () => Date }).toDate === "function"
          ? (timestamp as { toDate: () => Date }).toDate()
          : new Date(timestamp as any);

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const postDate = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate()
      );

      if (postDate.getTime() === today.getTime()) {
        return "Aujourd'hui";
      } else if (postDate.getTime() === yesterday.getTime()) {
        return "Hier";
      } else {
        return new Intl.DateTimeFormat("fr-FR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }).format(date);
      }
    };

    const groups: { [key: string]: Post[] } = {};

    filteredPosts.forEach((post) => {
      const dateLabel = formatDateLabel(post.createdAt);
      if (!groups[dateLabel]) {
        groups[dateLabel] = [];
      }
      groups[dateLabel].push(post);
    });

    // Sort groups: Aujourd'hui first, then Hier, then by date descending
    const sortedKeys = Object.keys(groups).sort((a, b) => {
      if (a === "Aujourd'hui") return -1;
      if (b === "Aujourd'hui") return 1;
      if (a === "Hier") return -1;
      if (b === "Hier") return 1;
      // Parse dates for comparison
      const dateA = a.split("/").reverse().join("-");
      const dateB = b.split("/").reverse().join("-");
      return dateB.localeCompare(dateA);
    });

    return sortedKeys.map((key) => ({
      date: key,
      posts: groups[key],
    }));
  }, [filteredPosts]);

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;

    try {
      await deletePost(deleteConfirm);
      setPosts(posts.filter((p) => p.id !== deleteConfirm));
      toast.success("Post supprime");
      setDeleteConfirm(null);

      // If deleting current selected post, clear selection
      if (selectedPost?.id === deleteConfirm) {
        setSelectedPost(null);
        window.history.pushState({}, "", "/history");
      }
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Erreur lors de la suppression");
    }
  };

  const handleSwipeDelete = (postId: string) => {
    setDeleteConfirm(postId);
  };

  const handleCopy = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success("Copie !");
    } catch {
      toast.error("Erreur lors de la copie");
    }
  };

  return (
    <MainLayout posts={posts} showMobileHeader={true} headerTitle="Historique">
      <div className="h-full overflow-hidden">
        {/* Mobile Layout: Single Column */}
        <div className="lg:hidden h-full overflow-y-auto">
          <div className="px-4 py-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-sm text-text-secondary">
                  {filteredPosts.length} post{filteredPosts.length !== 1 ? "s" : ""}
                </p>
              </div>
              <Link href="/app">
                <Button size="sm">
                  <svg
                    className="w-4 h-4 mr-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Nouveau
                </Button>
              </Link>
            </div>

            {/* Search */}
            <div className="mb-4">
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Rechercher dans l'historique..."
              />
            </div>

            {/* Filters */}
            <div className="mb-6">
              <FilterPanel
                dateFilter={dateFilter}
                typeFilter={typeFilter}
                onDateFilterChange={setDateFilter}
                onTypeFilterChange={setTypeFilter}
                resultsCount={filteredPosts.length}
              />
            </div>

            {/* Posts List */}
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredPosts.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-16 h-16 bg-dark-hover rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-text-muted"
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
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  {searchQuery || dateFilter !== "all" || typeFilter !== "all"
                    ? "Aucun resultat"
                    : "Aucun post"}
                </h3>
                <p className="text-text-secondary mb-6 text-sm max-w-md mx-auto">
                  {searchQuery || dateFilter !== "all" || typeFilter !== "all"
                    ? "Essayez de modifier vos filtres"
                    : "Commencez a generer des posts pour les retrouver ici"}
                </p>
                {!searchQuery && dateFilter === "all" && typeFilter === "all" && (
                  <Link href="/app">
                    <Button>Creer mon premier post</Button>
                  </Link>
                )}
              </div>
            ) : (
              <>
                <p className="text-xs text-text-muted mb-3">
                  Glissez vers la gauche pour supprimer
                </p>
                <div className="space-y-6">
                  {groupedPosts.map((group) => (
                    <div key={group.date}>
                      <DateDivider date={group.date} count={group.posts.length} />
                      <div className="space-y-2">
                        {group.posts.map((post, index) => (
                          <SwipeableCard key={post.id} onDelete={() => handleSwipeDelete(post.id)}>
                            <HistoryListItem
                              post={post}
                              isSelected={selectedPost?.id === post.id}
                              index={index}
                            />
                          </SwipeableCard>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Desktop Layout: Two Columns */}
        <div className="hidden lg:flex h-full">
          {/* Left Sidebar: Search + Filters + List */}
          <div className="w-[420px] xl:w-[480px] border-r border-dark-border flex flex-col bg-dark-bg">
            {/* Header */}
            <div className="p-6 border-b border-dark-border shrink-0">
              <div className="flex items-center justify-between mb-1">
                <h1 className="text-2xl xl:text-3xl font-bold text-white">
                  Historique
                </h1>
                <Link href="/app">
                  <Button>
                    <svg
                      className="w-5 h-5 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                    Nouveau post
                  </Button>
                </Link>
              </div>
              <p className="text-sm text-text-secondary">
                {filteredPosts.length} conversation{filteredPosts.length !== 1 ? "s" : ""}
              </p>
            </div>

            {/* Search */}
            <div className="p-4 shrink-0">
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Rechercher..."
              />
            </div>

            {/* Filters */}
            <div className="px-4 pb-4 shrink-0">
              <FilterPanel
                dateFilter={dateFilter}
                typeFilter={typeFilter}
                onDateFilterChange={setDateFilter}
                onTypeFilterChange={setTypeFilter}
                resultsCount={filteredPosts.length}
              />
            </div>

            {/* Posts List - Scrollable */}
            <div className="flex-1 overflow-y-auto px-4 pb-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filteredPosts.length === 0 ? (
                <div className="text-center py-20">
                  <div className="w-16 h-16 bg-dark-hover rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg
                      className="w-8 h-8 text-text-muted"
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
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    {searchQuery || dateFilter !== "all" || typeFilter !== "all"
                      ? "Aucun resultat"
                      : "Aucun post"}
                  </h3>
                  <p className="text-text-secondary text-sm max-w-xs mx-auto">
                    {searchQuery || dateFilter !== "all" || typeFilter !== "all"
                      ? "Essayez de modifier vos filtres"
                      : "Commencez a generer des posts"}
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {groupedPosts.map((group) => (
                    <div key={group.date}>
                      <DateDivider date={group.date} count={group.posts.length} />
                      <div className="space-y-2">
                        {group.posts.map((post, index) => (
                          <HistoryListItem
                            key={post.id}
                            post={post}
                            isSelected={selectedPost?.id === post.id}
                            onDelete={handleSwipeDelete}
                            index={index}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Panel: Detail View */}
          <div className="flex-1 overflow-y-auto bg-dark-elevated">
            <div className="max-w-4xl mx-auto p-8">
              <HistoryDetailPanel post={selectedPost} onCopy={handleCopy} />
            </div>
          </div>
        </div>
      </div>

      {/* Delete confirmation modal */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Supprimer ce post ?"
      >
        <div className="text-center">
          <p className="text-text-secondary mb-6 text-sm">
            Cette action est irreversible. Le post sera definitivement supprime.
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" fullWidth onClick={() => setDeleteConfirm(null)}>
              Annuler
            </Button>
            <Button variant="danger" fullWidth onClick={handleDeleteConfirm}>
              Supprimer
            </Button>
          </div>
        </div>
      </Modal>
    </MainLayout>
  );
}

export default function HistoryPage() {
  return (
    <ProtectedRoute>
      <HistoryContent />
    </ProtectedRoute>
  );
}
