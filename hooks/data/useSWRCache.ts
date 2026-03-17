"use client";

import useSWR, { SWRConfiguration, mutate, useSWRConfig } from "swr";
import { Post, UserProfile } from "@/types";
import { getUserPosts, getUserPostsWithPinned } from "@/lib/db/firestore";

// Default SWR configuration with sensible caching defaults
const defaultConfig: SWRConfiguration = {
  revalidateOnFocus: false, // Don't refetch on window focus
  revalidateOnReconnect: true, // Refetch when connection is restored
  dedupingInterval: 5000, // Dedupe requests within 5 seconds
  errorRetryCount: 3,
  errorRetryInterval: 3000,
  shouldRetryOnError: true,
};

// Cache keys for type safety and consistency
export const CACHE_KEYS = {
  USER_POSTS: (userId: string) => `posts/${userId}`,
  USER_POSTS_PINNED: (userId: string) => `posts-pinned/${userId}`,
  USER_PROFILE: (userId: string) => `profile/${userId}`,
  SUBSCRIPTION: (userId: string) => `subscription/${userId}`,
} as const;

/**
 * Hook for fetching user posts with SWR caching
 */
export function useCachedPosts(userId: string | undefined, limit = 20) {
  const { data, error, isLoading, isValidating, mutate: revalidate } = useSWR<Post[]>(
    userId ? CACHE_KEYS.USER_POSTS(userId) : null,
    () => getUserPosts(userId!, limit),
    {
      ...defaultConfig,
      revalidateOnMount: true,
      refreshInterval: 0, // No auto-refresh
    }
  );

  return {
    posts: data || [],
    isLoading,
    isValidating,
    error,
    refresh: revalidate,
  };
}

/**
 * Hook for fetching user posts with pinned posts first
 */
export function useCachedPostsWithPinned(userId: string | undefined, limit = 20) {
  const { data, error, isLoading, isValidating, mutate: revalidate } = useSWR<Post[]>(
    userId ? CACHE_KEYS.USER_POSTS_PINNED(userId) : null,
    () => getUserPostsWithPinned(userId!, limit),
    {
      ...defaultConfig,
      revalidateOnMount: true,
      refreshInterval: 0,
    }
  );

  return {
    posts: data || [],
    isLoading,
    isValidating,
    error,
    refresh: revalidate,
  };
}

/**
 * Hook to invalidate/refresh all user-related caches
 */
export function useInvalidateUserCache() {
  const { cache } = useSWRConfig();

  const invalidateUserCache = (userId: string) => {
    // Invalidate all user-related cache keys
    mutate(CACHE_KEYS.USER_POSTS(userId));
    mutate(CACHE_KEYS.USER_POSTS_PINNED(userId));
    mutate(CACHE_KEYS.USER_PROFILE(userId));
    mutate(CACHE_KEYS.SUBSCRIPTION(userId));
  };

  const invalidatePostsCache = (userId: string) => {
    mutate(CACHE_KEYS.USER_POSTS(userId));
    mutate(CACHE_KEYS.USER_POSTS_PINNED(userId));
  };

  const clearAllCache = () => {
    // Clear all cache
    if (cache instanceof Map) {
      cache.clear();
    }
  };

  return {
    invalidateUserCache,
    invalidatePostsCache,
    clearAllCache,
  };
}

/**
 * Optimistic update helper for posts
 */
export function optimisticUpdatePosts(
  userId: string,
  updater: (posts: Post[] | undefined) => Post[]
) {
  // Update both cache keys
  mutate(CACHE_KEYS.USER_POSTS(userId), updater, { revalidate: false });
  mutate(CACHE_KEYS.USER_POSTS_PINNED(userId), updater, { revalidate: false });
}

/**
 * Add a new post to cache optimistically
 */
export function addPostToCache(userId: string, newPost: Post) {
  optimisticUpdatePosts(userId, (posts) => {
    if (!posts) return [newPost];
    return [newPost, ...posts];
  });
}

/**
 * Remove a post from cache optimistically
 */
export function removePostFromCache(userId: string, postId: string) {
  optimisticUpdatePosts(userId, (posts) => {
    if (!posts) return [];
    return posts.filter((p) => p.id !== postId);
  });
}

/**
 * Toggle pin status in cache optimistically
 */
export function togglePinInCache(userId: string, postId: string, isPinned: boolean) {
  optimisticUpdatePosts(userId, (posts) => {
    if (!posts) return [];
    return posts.map((p) =>
      p.id === postId ? { ...p, isPinned } : p
    );
  });
}

export { mutate };
