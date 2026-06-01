"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { Post } from "@/types";
import { useAuth } from "./AuthContext";
import { getUserPostsWithPinned } from "@/lib/db/firestore";
import { readWithAuthRetry } from "@/lib/db/with-auth-retry";

interface SidebarPostsContextValue {
  posts: Post[];
  loading: boolean;
  refresh: () => Promise<void>;
  upsertPost: (post: Post) => void;
  removePost: (id: string) => void;
  updatePost: (id: string, patch: Partial<Post>) => void;
}

const SidebarPostsContext = createContext<SidebarPostsContextValue | null>(null);

const PAGE_SIZE = 50;

export function SidebarPostsProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setPosts([]);
      setLoading(false);
      return;
    }
    try {
      // Retry on stale-token permission-denied (post-login / post-reset window)
      // so the conversation list doesn't render empty when data is intact.
      const fetched = await readWithAuthRetry(() =>
        getUserPostsWithPinned(user.uid, PAGE_SIZE)
      );
      setPosts(fetched);
    } catch (err) {
      console.error("SidebarPostsContext.refresh failed:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    refresh();
  }, [authLoading, refresh]);

  const upsertPost = useCallback((post: Post) => {
    setPosts((prev) => {
      const idx = prev.findIndex((p) => p.id === post.id);
      if (idx >= 0) {
        const next = prev.slice();
        next[idx] = { ...next[idx], ...post };
        return next;
      }
      return [post, ...prev];
    });
  }, []);

  const removePost = useCallback((id: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const updatePost = useCallback((id: string, patch: Partial<Post>) => {
    setPosts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    );
  }, []);

  return (
    <SidebarPostsContext.Provider
      value={{ posts, loading, refresh, upsertPost, removePost, updatePost }}
    >
      {children}
    </SidebarPostsContext.Provider>
  );
}

export function useSidebarPosts() {
  const v = useContext(SidebarPostsContext);
  if (!v) {
    throw new Error("useSidebarPosts must be used inside <SidebarPostsProvider>");
  }
  return v;
}

export function useSidebarPostsOptional(): SidebarPostsContextValue | null {
  return useContext(SidebarPostsContext);
}
