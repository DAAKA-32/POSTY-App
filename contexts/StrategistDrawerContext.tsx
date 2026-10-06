"use client";

/**
 * StrategistDrawerContext — global open/close state for the Strategist drawer.
 *
 * API:
 *   - open() / close() / toggle() / isOpen
 *   - openBatch(batchId) → opens the drawer AND queues a batch to show in the
 *     conversation (used by the "your weekly plan is ready" banner). The
 *     session inside the drawer consumes it with takePendingBatch(), so the
 *     batch is never lost even though the drawer content mounts after the click.
 *
 * Mounted once at AppProvider level (no dependency on other contexts) so any
 * consumer can open the drawer. The conversation state itself lives in the
 * drawer's session provider (components/strategist/StrategistSession.tsx) and
 * survives open/close.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  ReactNode,
} from "react";

interface StrategistDrawerContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  /** Open the drawer and show this batch in the conversation. */
  openBatch: (batchId: string) => void;
  /** Batch queued by openBatch, if any. */
  pendingBatchId: string | null;
  /** Read and clear the queued batch. */
  takePendingBatch: () => string | null;
}

const StrategistDrawerContext = createContext<StrategistDrawerContextValue | null>(null);

/** Esc inside a field cancels the edit — it must not also close the drawer
 *  (that used to wipe the whole conversation mid-edit). */
function isEditableTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el || typeof el.closest !== "function") return false;
  return !!el.closest("input, textarea, select, [contenteditable='true']");
}

export function StrategistDrawerProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [pendingBatchId, setPendingBatchId] = useState<string | null>(null);
  const pendingRef = useRef<string | null>(null);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((v) => !v), []);

  const openBatch = useCallback((batchId: string) => {
    pendingRef.current = batchId;
    setPendingBatchId(batchId);
    setIsOpen(true);
  }, []);

  const takePendingBatch = useCallback(() => {
    const id = pendingRef.current;
    pendingRef.current = null;
    setPendingBatchId(null);
    return id;
  }, []);

  // Global ESC-to-close — only attached while open, and ignored when the key
  // is meant for a field or was already handled (e.g. cancelling an edit).
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented || isEditableTarget(e.target)) return;
      close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, close]);

  // Lock body scroll while drawer is open so the page underneath stays put.
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

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
