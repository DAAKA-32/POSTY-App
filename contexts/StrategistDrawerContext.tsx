"use client";

/**
 * StrategistDrawerContext — global state for the inline Strategist assistant.
 *
 * The Strategist used to live on a dedicated /strategist route. We replaced
 * the navigation with a slide-in drawer so the user can consult the agent
 * without losing context of the page they were on (post draft, history, etc.).
 *
 * API:
 *   - open()  → reveals the drawer
 *   - close() → hides it
 *   - toggle()
 *   - isOpen  → boolean
 *
 * Mounted once at AppProvider level. The drawer UI itself
 * (<StrategistDrawer>) is also rendered there so any consumer (FAB, sidebar,
 * keyboard shortcut, deep-link redirect) can call open() and see it appear.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";

interface StrategistDrawerContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

const StrategistDrawerContext = createContext<StrategistDrawerContextValue | null>(null);

export function StrategistDrawerProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((v) => !v), []);

  // Global ESC-to-close — only attached while open to avoid noise.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
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
    () => ({ isOpen, open, close, toggle }),
    [isOpen, open, close, toggle]
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
    };
  }
  return ctx;
}
