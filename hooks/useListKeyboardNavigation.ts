import { useState, useCallback, useEffect, RefObject } from "react";

interface UseListKeyboardNavigationOptions {
  /** Total number of items in the list */
  itemCount: number;
  /** Callback when an item is activated (Enter key) */
  onActivate?: (index: number) => void;
  /** Callback when focus changes */
  onFocusChange?: (index: number) => void;
  /** Whether keyboard navigation is enabled (default: true) */
  enabled?: boolean;
  /** Whether to wrap around at list boundaries (default: true) */
  wrapAround?: boolean;
  /** Container ref - navigation only works when container or its children have focus */
  containerRef?: RefObject<HTMLElement | null>;
}

interface UseListKeyboardNavigationReturn {
  /** Currently focused index (-1 if none) */
  focusedIndex: number;
  /** Set the focused index manually */
  setFocusedIndex: (index: number) => void;
  /** Clear focus */
  clearFocus: () => void;
  /** Check if an index is focused */
  isFocused: (index: number) => boolean;
  /** Props to spread on list items for accessibility */
  getItemProps: (index: number) => {
    tabIndex: number;
    "aria-selected": boolean;
    "data-focused": boolean;
  };
}

/**
 * Hook for keyboard navigation in lists.
 * Implements standard patterns from apps like Notion, Linear, Slack.
 *
 * Keyboard shortcuts:
 * - j / ArrowDown: Move focus down
 * - k / ArrowUp: Move focus up
 * - Enter / Space: Activate focused item
 * - Escape: Clear focus
 * - Home: Focus first item
 * - End: Focus last item
 *
 * @example
 * const { focusedIndex, getItemProps } = useListKeyboardNavigation({
 *   itemCount: posts.length,
 *   onActivate: (index) => toggleExpand(posts[index].id),
 *   containerRef: listRef,
 * });
 *
 * return (
 *   <div ref={listRef}>
 *     {posts.map((post, i) => (
 *       <div key={post.id} {...getItemProps(i)}>
 *         {post.title}
 *       </div>
 *     ))}
 *   </div>
 * );
 */
export function useListKeyboardNavigation({
  itemCount,
  onActivate,
  onFocusChange,
  enabled = true,
  wrapAround = true,
  containerRef,
}: UseListKeyboardNavigationOptions): UseListKeyboardNavigationReturn {
  const [focusedIndex, setFocusedIndexState] = useState(-1);

  const setFocusedIndex = useCallback(
    (index: number) => {
      const newIndex = Math.max(-1, Math.min(index, itemCount - 1));
      setFocusedIndexState(newIndex);
      onFocusChange?.(newIndex);
    },
    [itemCount, onFocusChange]
  );

  const clearFocus = useCallback(() => {
    setFocusedIndex(-1);
  }, [setFocusedIndex]);

  const moveUp = useCallback(() => {
    setFocusedIndexState((prev) => {
      if (prev <= 0) {
        return wrapAround ? itemCount - 1 : 0;
      }
      return prev - 1;
    });
  }, [itemCount, wrapAround]);

  const moveDown = useCallback(() => {
    setFocusedIndexState((prev) => {
      if (prev >= itemCount - 1) {
        return wrapAround ? 0 : itemCount - 1;
      }
      if (prev < 0) {
        return 0;
      }
      return prev + 1;
    });
  }, [itemCount, wrapAround]);

  const moveToFirst = useCallback(() => {
    setFocusedIndex(0);
  }, [setFocusedIndex]);

  const moveToLast = useCallback(() => {
    setFocusedIndex(itemCount - 1);
  }, [setFocusedIndex, itemCount]);

  const activate = useCallback(() => {
    if (focusedIndex >= 0 && focusedIndex < itemCount) {
      onActivate?.(focusedIndex);
    }
  }, [focusedIndex, itemCount, onActivate]);

  // Reset focus when item count changes significantly
  useEffect(() => {
    if (focusedIndex >= itemCount) {
      setFocusedIndex(itemCount - 1);
    }
  }, [itemCount, focusedIndex, setFocusedIndex]);

  // Keyboard event handler
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if we should handle this event
      // Only handle if container or its children have focus, OR if no specific element has focus
      if (containerRef?.current) {
        const activeElement = document.activeElement;
        const isInContainer = containerRef.current.contains(activeElement);
        const isInputFocused =
          activeElement instanceof HTMLInputElement ||
          activeElement instanceof HTMLTextAreaElement;

        // Don't intercept when typing in inputs
        if (isInputFocused) return;

        // Only handle if focus is in container or on body
        if (!isInContainer && activeElement !== document.body) return;
      }

      switch (e.key) {
        case "j":
        case "ArrowDown":
          e.preventDefault();
          moveDown();
          break;

        case "k":
        case "ArrowUp":
          e.preventDefault();
          moveUp();
          break;

        case "Enter":
        case " ":
          if (focusedIndex >= 0) {
            e.preventDefault();
            activate();
          }
          break;

        case "Escape":
          e.preventDefault();
          clearFocus();
          break;

        case "Home":
          e.preventDefault();
          moveToFirst();
          break;

        case "End":
          e.preventDefault();
          moveToLast();
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    enabled,
    containerRef,
    focusedIndex,
    moveDown,
    moveUp,
    activate,
    clearFocus,
    moveToFirst,
    moveToLast,
  ]);

  const isFocused = useCallback(
    (index: number) => focusedIndex === index,
    [focusedIndex]
  );

  const getItemProps = useCallback(
    (index: number) => ({
      tabIndex: focusedIndex === index ? 0 : -1,
      "aria-selected": focusedIndex === index,
      "data-focused": focusedIndex === index,
    }),
    [focusedIndex]
  );

  return {
    focusedIndex,
    setFocusedIndex,
    clearFocus,
    isFocused,
    getItemProps,
  };
}
