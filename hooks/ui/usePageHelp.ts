"use client";

import { useCallback, useMemo, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useLocalStorage, STORAGE_KEYS } from "@/hooks/data/useLocalStorage";
import { getPageHelpConfig, PageHelpConfig } from "@/lib/ui/help-content";
import { useAuth } from "@/contexts/AuthContext";
import { updateUserProfile } from "@/lib/db/firestore";

interface UsePageHelpReturn {
  hasHelp: boolean;
  isRead: boolean;
  config: PageHelpConfig | null;
  markAsRead: () => void;
  isPathRead: (path: string) => boolean;
  markPathAsRead: (path: string) => void;
}

export function usePageHelp(): UsePageHelpReturn {
  const pathname = usePathname();
  const { user, userProfile } = useAuth();

  // localStorage as fast cache (immediate UI response)
  const [localReadPages, setLocalReadPages] = useLocalStorage<string[]>(
    STORAGE_KEYS.HELP_READ_PAGES,
    []
  );

  // Hydrated state: merge of Firestore + local cache
  const [readPages, setReadPages] = useState<string[]>(localReadPages);

  // Sync readPages from localStorage when the stored value becomes available.
  // useLocalStorage initializes with [] then reads the real value in useEffect,
  // so readPages must track that delayed update.
  const localReadPagesJson = JSON.stringify(localReadPages);
  useEffect(() => {
    const local: string[] = JSON.parse(localReadPagesJson);
    if (local.length === 0) return;
    setReadPages((prev) => {
      const merged = Array.from(new Set([...prev, ...local]));
      return merged.length === prev.length ? prev : merged;
    });
  }, [localReadPagesJson]);

  // Stable primitive key — avoids infinite loop from array reference changes
  const firestorePagesJson = JSON.stringify(userProfile?.helpReadPages ?? []);

  // On mount / profile change: hydrate from Firestore (source of truth)
  useEffect(() => {
    const firestorePages: string[] = JSON.parse(firestorePagesJson);
    if (firestorePages.length === 0) return;

    setReadPages((prev) => {
      const merged = Array.from(new Set([...prev, ...firestorePages]));
      return merged.length === prev.length ? prev : merged;
    });
    // Also sync localStorage cache with Firestore data
    setLocalReadPages((prev: string[]) => {
      const merged = Array.from(new Set([...prev, ...firestorePages]));
      return merged.length === prev.length ? prev : merged;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firestorePagesJson]);

  const config = useMemo(() => getPageHelpConfig(pathname), [pathname]);
  const hasHelp = config !== null;
  const isRead = readPages.includes(pathname);

  // Persist a new page dismissal to Firestore + localStorage
  const persistPage = useCallback(
    (path: string) => {
      // 1. Update local state immediately (instant UI)
      setReadPages((prev) => {
        if (prev.includes(path)) return prev;
        return [...prev, path];
      });

      // 2. Update localStorage cache
      setLocalReadPages((prev: string[]) => {
        if (prev.includes(path)) return prev;
        return [...prev, path];
      });

      // 3. Persist to Firestore (async, fire-and-forget)
      if (user) {
        const newPages = Array.from(new Set([...readPages, path]));
        updateUserProfile(user.uid, { helpReadPages: newPages }).catch((err) =>
          console.error("Failed to sync help state:", err)
        );
      }
    },
    [user, readPages, setLocalReadPages]
  );

  const markAsRead = useCallback(() => {
    persistPage(pathname);
  }, [pathname, persistPage]);

  const isPathRead = useCallback(
    (path: string) => readPages.includes(path),
    [readPages]
  );

  const markPathAsRead = useCallback(
    (path: string) => {
      persistPage(path);
    },
    [persistPage]
  );

  return { hasHelp, isRead, config, markAsRead, isPathRead, markPathAsRead };
}
