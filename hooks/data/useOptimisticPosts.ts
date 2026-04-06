"use client";

import { useState, useCallback } from "react";
import { Post } from "@/types";
import { pinPost, deletePost, renamePost } from "@/lib/db/firestore";
import toast from "@/components/ui/Toast";
import { triggerHaptic } from "@/hooks/ui/useHapticFeedback";
import { useLanguage } from "@/contexts/LanguageContext";

interface UseOptimisticPostsOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Hook for managing posts with optimistic UI updates
 * Updates UI immediately, then syncs with server
 * Rolls back on error
 */
export function useOptimisticPosts(
  initialPosts: Post[],
  options: UseOptimisticPostsOptions = {}
) {
  const { t } = useLanguage();
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [isLoading, setIsLoading] = useState(false);

  // Sync posts when initialPosts changes (e.g., from SWR revalidation)
  const syncPosts = useCallback((newPosts: Post[]) => {
    setPosts(newPosts);
  }, []);

  /**
   * Toggle pin status with optimistic update
   */
  const togglePin = useCallback(
    async (postId: string) => {
      const post = posts.find((p) => p.id === postId);
      if (!post) return;

      const newPinnedState = !post.isPinned;

      // Optimistic update
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, isPinned: newPinnedState } : p
        )
      );

      triggerHaptic(newPinnedState ? "success" : "selection");

      try {
        await pinPost(postId, newPinnedState);
        toast.success(newPinnedState ? t.toasts.postPinned : t.toasts.postUnpinned);
        options.onSuccess?.();
      } catch (error) {
        // Rollback on error
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId ? { ...p, isPinned: !newPinnedState } : p
          )
        );
        triggerHaptic("error");
        toast.error(t.toasts.pinError);
        options.onError?.(error as Error);
      }
    },
    [posts, options, t]
  );

  /**
   * Delete post with optimistic update
   */
  const removePost = useCallback(
    async (postId: string) => {
      const postToDelete = posts.find((p) => p.id === postId);
      if (!postToDelete) return;

      const originalIndex = posts.findIndex((p) => p.id === postId);

      // Optimistic update - remove from list
      setPosts((prev) => prev.filter((p) => p.id !== postId));

      triggerHaptic("medium");

      try {
        await deletePost(postId);
        toast.success(t.toasts.postDeleted);
        options.onSuccess?.();
      } catch (error) {
        // Rollback - re-insert at original position
        setPosts((prev) => {
          const newPosts = [...prev];
          newPosts.splice(originalIndex, 0, postToDelete);
          return newPosts;
        });
        triggerHaptic("error");
        toast.error(t.toasts.deleteError);
        options.onError?.(error as Error);
      }
    },
    [posts, options, t]
  );

  /**
   * Rename post with optimistic update
   */
  const updateTitle = useCallback(
    async (postId: string, newTitle: string) => {
      const post = posts.find((p) => p.id === postId);
      if (!post) return;

      const oldTitle = post.title;

      // Optimistic update
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, title: newTitle } : p
        )
      );

      triggerHaptic("light");

      try {
        await renamePost(postId, newTitle);
        toast.success(t.toasts.conversationRenamed);
        options.onSuccess?.();
      } catch (error) {
        // Rollback
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId ? { ...p, title: oldTitle } : p
          )
        );
        triggerHaptic("error");
        toast.error(t.toasts.renameError);
        options.onError?.(error as Error);
      }
    },
    [posts, options, t]
  );

  /**
   * Add a new post to the list (optimistic)
   */
  const addPost = useCallback((newPost: Post) => {
    setPosts((prev) => [newPost, ...prev]);
    triggerHaptic("success");
  }, []);

  /**
   * Batch operations
   */
  const batchTogglePin = useCallback(
    async (postIds: string[], isPinned: boolean) => {
      // Optimistic update for all posts
      const originalStates = new Map<string, boolean>();

      setPosts((prev) =>
        prev.map((p) => {
          if (postIds.includes(p.id)) {
            originalStates.set(p.id, p.isPinned || false);
            return { ...p, isPinned };
          }
          return p;
        })
      );

      triggerHaptic(isPinned ? "success" : "medium");

      try {
        // Import batchPinPosts dynamically to avoid circular dependency
        const { batchPinPosts } = await import("@/lib/db/firestore");
        await batchPinPosts(postIds, isPinned);
        toast.success(
          isPinned
            ? `${postIds.length} ${t.toasts.postPinned}`
            : `${postIds.length} ${t.toasts.postUnpinned}`
        );
        options.onSuccess?.();
      } catch (error) {
        // Rollback all
        setPosts((prev) =>
          prev.map((p) => {
            if (originalStates.has(p.id)) {
              return { ...p, isPinned: originalStates.get(p.id)! };
            }
            return p;
          })
        );
        triggerHaptic("error");
        toast.error(t.toasts.operationError);
        options.onError?.(error as Error);
      }
    },
    [options, t]
  );

  return {
    posts,
    setPosts,
    syncPosts,
    isLoading,
    // Actions
    togglePin,
    removePost,
    updateTitle,
    addPost,
    batchTogglePin,
  };
}

export default useOptimisticPosts;
