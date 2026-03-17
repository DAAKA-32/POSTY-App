"use client";

import { useCallback, useEffect, useState } from "react";
import { useHapticFeedback } from "@/hooks/ui/useHapticFeedback";

interface UseKeyboardNavigationOptions {
  itemCount: number;
  onSelect?: (index: number) => void;
  onEscape?: () => void;
  enabled?: boolean;
  loop?: boolean; // Wrap around at start/end
  orientation?: "vertical" | "horizontal";
}

/**
 * Hook for keyboard navigation in lists
 * Supports arrow keys, Enter to select, Escape to cancel
 */
export function useKeyboardNavigation({
  itemCount,
  onSelect,
  onEscape,
  enabled = true,
  loop = true,
  orientation = "vertical",
}: UseKeyboardNavigationOptions) {
  const [activeIndex, setActiveIndex] = useState(-1);
  const { trigger: triggerHaptic } = useHapticFeedback();

  const moveUp = useCallback(() => {
    setActiveIndex((prev) => {
      if (prev <= 0) {
        return loop ? itemCount - 1 : 0;
      }
      return prev - 1;
    });
    triggerHaptic("light");
  }, [itemCount, loop, triggerHaptic]);

  const moveDown = useCallback(() => {
    setActiveIndex((prev) => {
      if (prev >= itemCount - 1) {
        return loop ? 0 : itemCount - 1;
      }
      return prev + 1;
    });
    triggerHaptic("light");
  }, [itemCount, loop, triggerHaptic]);

  const selectCurrent = useCallback(() => {
    if (activeIndex >= 0 && activeIndex < itemCount && onSelect) {
      onSelect(activeIndex);
      triggerHaptic("medium");
    }
  }, [activeIndex, itemCount, onSelect, triggerHaptic]);

  const reset = useCallback(() => {
    setActiveIndex(-1);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const prevKey = orientation === "vertical" ? "ArrowUp" : "ArrowLeft";
      const nextKey = orientation === "vertical" ? "ArrowDown" : "ArrowRight";

      switch (e.key) {
        case prevKey:
          e.preventDefault();
          moveUp();
          break;
        case nextKey:
          e.preventDefault();
          moveDown();
          break;
        case "Enter":
          e.preventDefault();
          selectCurrent();
          break;
        case "Escape":
          e.preventDefault();
          onEscape?.();
          reset();
          break;
        case "Home":
          e.preventDefault();
          setActiveIndex(0);
          triggerHaptic("light");
          break;
        case "End":
          e.preventDefault();
          setActiveIndex(itemCount - 1);
          triggerHaptic("light");
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    enabled,
    orientation,
    moveUp,
    moveDown,
    selectCurrent,
    onEscape,
    reset,
    itemCount,
    triggerHaptic,
  ]);

  // Reset when item count changes
  useEffect(() => {
    if (activeIndex >= itemCount) {
      setActiveIndex(itemCount - 1);
    }
  }, [activeIndex, itemCount]);

  return {
    activeIndex,
    setActiveIndex,
    reset,
    isActive: (index: number) => index === activeIndex,
  };
}

/**
 * Hook to detect keyboard vs mouse navigation
 * Adds 'keyboard-nav-active' class to body when using keyboard
 */
export function useKeyboardDetection() {
  const [isKeyboardNav, setIsKeyboardNav] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Tab or arrow keys indicate keyboard navigation
      if (e.key === "Tab" || e.key.startsWith("Arrow")) {
        setIsKeyboardNav(true);
        document.body.classList.add("keyboard-nav-active");
      }
    };

    const handleMouseDown = () => {
      setIsKeyboardNav(false);
      document.body.classList.remove("keyboard-nav-active");
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("mousedown", handleMouseDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("mousedown", handleMouseDown);
      document.body.classList.remove("keyboard-nav-active");
    };
  }, []);

  return isKeyboardNav;
}

/**
 * Global keyboard shortcuts hook
 */
interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: () => void;
  description?: string;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        const ctrlMatch = shortcut.ctrl ? e.ctrlKey : !e.ctrlKey;
        const metaMatch = shortcut.meta ? e.metaKey : !e.metaKey;
        const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey;
        const altMatch = shortcut.alt ? e.altKey : !e.altKey;
        const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();

        // Allow either ctrl or meta (for cross-platform)
        const modifierMatch =
          (shortcut.ctrl || shortcut.meta)
            ? (e.ctrlKey || e.metaKey)
            : ctrlMatch && metaMatch;

        if (keyMatch && modifierMatch && shiftMatch && altMatch) {
          e.preventDefault();
          shortcut.action();
          return;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shortcuts]);
}

export default useKeyboardNavigation;
