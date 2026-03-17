"use client";

import { useCallback, useMemo } from "react";
import { usePathname } from "next/navigation";
import { useLocalStorage, STORAGE_KEYS } from "@/hooks/data/useLocalStorage";
import { getPageHelpConfig, PageHelpConfig } from "@/lib/ui/help-content";

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
  const [readPages, setReadPages] = useLocalStorage<string[]>(
    STORAGE_KEYS.HELP_READ_PAGES,
    []
  );

  const config = useMemo(() => getPageHelpConfig(pathname), [pathname]);
  const hasHelp = config !== null;
  const isRead = readPages.includes(pathname);

  const markAsRead = useCallback(() => {
    setReadPages((prev: string[]) => {
      if (prev.includes(pathname)) return prev;
      return [...prev, pathname];
    });
  }, [pathname, setReadPages]);

  const isPathRead = useCallback(
    (path: string) => readPages.includes(path),
    [readPages]
  );

  const markPathAsRead = useCallback(
    (path: string) => {
      setReadPages((prev: string[]) => {
        if (prev.includes(path)) return prev;
        return [...prev, path];
      });
    },
    [setReadPages]
  );

  return { hasHelp, isRead, config, markAsRead, isPathRead, markPathAsRead };
}
