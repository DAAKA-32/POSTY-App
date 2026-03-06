import { Post } from "@/types";

/**
 * In-memory conversation cache.
 * Prevents re-fetching from Firestore when revisiting conversations,
 * eliminating visible "Loading conversation..." spinners.
 */

const cache = new Map<string, Post>();
const MAX_CACHE_SIZE = 30;

/** Get a cached conversation (or null if not cached) */
export function getCachedConversation(id: string): Post | null {
  return cache.get(id) ?? null;
}

/** Store a conversation in cache */
export function setCachedConversation(post: Post): void {
  // Evict oldest if at capacity
  if (cache.size >= MAX_CACHE_SIZE && !cache.has(post.id)) {
    const firstKey = cache.keys().next().value;
    if (firstKey) cache.delete(firstKey);
  }
  cache.set(post.id, post);
}

/** Update cached conversation (e.g. after new messages) */
export function updateCachedConversation(id: string, updates: Partial<Post>): void {
  const existing = cache.get(id);
  if (existing) {
    cache.set(id, { ...existing, ...updates });
  }
}

/** Remove a conversation from cache */
export function invalidateCachedConversation(id: string): void {
  cache.delete(id);
}

/** Clear all cached conversations */
export function clearConversationCache(): void {
  cache.clear();
}
