"use client";

/**
 * StrategistDrawerContext — navigation state for the Strategist workspace.
 *
 * The Strategist used to be a drawer laid OVER the studio. It is now its own
 * workspace at /app/strategist, rendered by the shared app shell instead of a
 * panel on top of it (components/strategist/StrategistWorkspace.tsx). The name
 * of this context and its API are unchanged on purpose, so every existing
 * caller keeps working:
 *
 *   - isOpen   → true while the user is ON the workspace route.
 *   - open()   → go to the workspace.   close() → back to the post studio.
 *   - openBatch(batchId) → open the workspace AND queue a batch to show in the
 *     conversation (used by the "your weekly plan is ready" banner). The
 *     session consumes it with takePendingBatch(), so the batch is never lost
 *     even though the workspace content mounts after the navigation.
 *
 * Because the state is the URL, back / forward / reload / deep links behave like
 * any page. No Esc handler and no body scroll lock any more: a page is not a
 * modal. Mounted once at AppProvider level.
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";

export const STRATEGIST_PATH = "/app/strategist";
const POST_STUDIO_PATH = "/app";

interface StrategistDrawerContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  /** Open the workspace and show this batch in the conversation. */
  openBatch: (batchId: string) => void;
  /** Batch queued by openBatch, if any. */
  pendingBatchId: string | null;
  /** Read and clear the queued batch. */
  takePendingBatch: () => string | null;
}

const StrategistDrawerContext = createContext<StrategistDrawerContextValue | null>(null);

export function StrategistDrawerProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isOpen = pathname === STRATEGIST_PATH;

  const [pendingBatchId, setPendingBatchId] = useState<string | null>(null);
  const pendingRef = useRef<string | null>(null);

  const open = useCallback(() => {
    if (pathname !== STRATEGIST_PATH) router.push(STRATEGIST_PATH);
  }, [pathname, router]);

  const close = useCallback(() => {
    if (pathname === STRATEGIST_PATH) router.push(POST_STUDIO_PATH);
  }, [pathname, router]);

  const toggle = useCallback(() => {
    router.push(pathname === STRATEGIST_PATH ? POST_STUDIO_PATH : STRATEGIST_PATH);
  }, [pathname, router]);

  const openBatch = useCallback(
    (batchId: string) => {
      pendingRef.current = batchId;
      setPendingBatchId(batchId);
      open();
    },
    [open]
  );

  const takePendingBatch = useCallback(() => {
    const id = pendingRef.current;
    pendingRef.current = null;
    setPendingBatchId(null);
    return id;
  }, []);

  const value = useMemo(
    () => ({ isOpen, open, close, toggle, openBatch, pendingBatchId, takePendingBatch }),
    [isOpen, open, close, toggle, openBatch, pendingBatchId, takePendingBatch]
  );

  return (
    <StrategistDrawerContext.Provider value={value}>
      {children}
    </StrategistDrawerContext.Provider>
  );
}

export function useStrategistDrawer(): StrategistDrawerContextValue {
  const ctx = useContext(StrategistDrawerContext);
  if (!ctx) {
    // Soft fallback so consumers in trees that forgot the provider don't crash —
    // useful during the migration window. Logs a warning in dev.
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[Strategist] useStrategistDrawer used outside <StrategistDrawerProvider>."
      );
    }
    return {
      isOpen: false,
      open: () => {},
      close: () => {},
      toggle: () => {},
      openBatch: () => {},
      pendingBatchId: null,
      takePendingBatch: () => null,
    };
  }
  return ctx;
}
