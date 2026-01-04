"use client";

import { useState, useEffect } from "react";
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
import ResponseCard from "@/components/chat/ResponseCard";
import toast from "react-hot-toast";

function HistoryContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("id");

  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

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

  const formatDate = (timestamp: { toDate?: () => Date } | Date | null) => {
    if (!timestamp) return "";
    const date = typeof (timestamp as { toDate?: () => Date }).toDate === 'function'
      ? (timestamp as { toDate: () => Date }).toDate()
      : new Date(timestamp as Date);
    return new Intl.DateTimeFormat("fr-FR", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;

    try {
      await deletePost(deleteConfirm);
      setPosts(posts.filter(p => p.id !== deleteConfirm));
      toast.success("Post supprime");
      setDeleteConfirm(null);
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
      <div className="h-full overflow-y-auto">
        <div className="max-w-2xl xl:max-w-5xl mx-auto px-4 lg:px-8 py-6 lg:py-12">
          {/* Header */}
          <div className="flex items-center justify-between mb-6 lg:mb-8">
            <div>
              <h1 className="text-xl lg:text-2xl xl:text-3xl font-bold text-white mb-1 lg:mb-2 hidden lg:block">
                Historique
              </h1>
              <p className="text-sm lg:text-base text-gray-400">
                {posts.length} post{posts.length !== 1 ? "s" : ""} genere{posts.length !== 1 ? "s" : ""}
              </p>
            </div>
            <Link href="/app">
              <Button size="sm" className="lg:hidden">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Nouveau
              </Button>
              <Button className="hidden lg:flex">
                <svg className="w-4 h-4 lg:w-5 lg:h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Nouveau post
              </Button>
            </Link>
          </div>

          {/* Selected post detail */}
          {selectedPost && (
            <div className="mb-8 animate-fade-in-up">
              <div className="flex items-center gap-4 mb-4 lg:mb-6">
                <Link
                  href="/history"
                  className="text-gray-400 hover:text-white transition-colors p-2 -ml-2 lg:p-3 lg:-ml-3 hover:bg-dark-card rounded-lg"
                >
                  <svg className="w-5 h-5 lg:w-6 lg:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </Link>
                <span className="text-sm lg:text-base text-gray-500">
                  {formatDate(selectedPost.createdAt)}
                </span>
              </div>

              <div className="mb-6 lg:mb-8 p-4 lg:p-6 bg-dark-card border border-dark-border rounded-xl lg:rounded-2xl">
                <p className="text-xs lg:text-sm text-gray-500 mb-1 lg:mb-2">Prompt :</p>
                <p className="text-white text-sm lg:text-base">{selectedPost.prompt}</p>
              </div>

              <div className="space-y-4 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-6">
                <ResponseCard
                  title="Version Storytelling"
                  content={selectedPost.responseA}
                  type="storytelling"
                  isSelected={selectedPost.selectedVersion === "A"}
                  onCopy={() => handleCopy(selectedPost.responseA)}
                />
                <ResponseCard
                  title="Version Business"
                  content={selectedPost.responseB}
                  type="business"
                  isSelected={selectedPost.selectedVersion === "B"}
                  onCopy={() => handleCopy(selectedPost.responseB)}
                />
              </div>
            </div>
          )}

          {/* Posts list */}
          {!selectedPost && (
            <>
              {isLoading ? (
                <div className="flex items-center justify-center py-12 lg:py-20">
                  <div className="w-12 h-12 lg:w-16 lg:h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : posts.length === 0 ? (
                <div className="text-center py-12 lg:py-20">
                  <div className="w-16 h-16 lg:w-20 lg:h-20 bg-dark-card rounded-full flex items-center justify-center mx-auto mb-4 lg:mb-6">
                    <svg className="w-8 h-8 lg:w-10 lg:h-10 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-xl lg:text-2xl font-semibold text-white mb-2 lg:mb-3">Aucun post</h3>
                  <p className="text-gray-400 mb-6 lg:mb-8 text-sm lg:text-base max-w-md mx-auto">
                    Commencez a generer des posts pour les retrouver ici
                  </p>
                  <Link href="/app">
                    <Button>Creer mon premier post</Button>
                  </Link>
                </div>
              ) : (
                <>
                  {/* Mobile hint */}
                  <p className="text-xs text-gray-500 mb-3 lg:hidden">
                    Glissez vers la gauche pour supprimer
                  </p>

                  {/* Desktop hint */}
                  <p className="hidden lg:block text-sm text-gray-500 mb-4">
                    Cliquez sur un post pour voir les details
                  </p>

                  <div className="space-y-3 lg:space-y-0 lg:grid lg:grid-cols-2 xl:grid-cols-3 lg:gap-4">
                    {posts.map((post, index) => (
                      <div
                        key={post.id}
                        className="animate-fade-in-up"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        {/* Mobile: Swipeable card */}
                        <div className="lg:hidden">
                          <SwipeableCard onDelete={() => handleSwipeDelete(post.id)}>
                            <Link href={`/history?id=${post.id}`}>
                              <div className="p-4 rounded-xl">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-white font-medium truncate mb-1">
                                      {post.prompt}
                                    </p>
                                    <p className="text-sm text-gray-500">
                                      {formatDate(post.createdAt)}
                                    </p>
                                  </div>
                                  <svg
                                    className="w-5 h-5 text-gray-500 shrink-0 ml-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                </div>
                              </div>
                            </Link>
                          </SwipeableCard>
                        </div>

                        {/* Desktop: Card with hover and delete button */}
                        <div className="hidden lg:block">
                          <div className="group relative bg-dark-card border border-dark-border rounded-xl hover:border-primary/50 transition-all duration-200 hover-lift">
                            <Link href={`/history?id=${post.id}`} className="block p-5">
                              <p className="text-white font-medium line-clamp-2 mb-3 group-hover:text-primary transition-colors">
                                {post.prompt}
                              </p>
                              <p className="text-sm text-gray-500">
                                {formatDate(post.createdAt)}
                              </p>
                            </Link>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                handleSwipeDelete(post.id);
                              }}
                              className="absolute top-3 right-3 p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200"
                              title="Supprimer"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Delete confirmation modal */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Supprimer ce post ?"
      >
        <div className="text-center">
          <p className="text-gray-400 mb-6 text-sm">
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
