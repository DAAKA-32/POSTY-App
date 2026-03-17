"use client";

import { useState, useEffect, useCallback, useRef, RefObject } from "react";

interface UseSmartScrollOptions {
  /** Threshold in pixels to consider "near bottom" */
  threshold?: number;
  /** Messages or content that changes and should trigger scroll check */
  dependencies?: unknown[];
  /** Whether streaming is currently active */
  isStreaming?: boolean;
  /** Whether loading is active */
  isLoading?: boolean;
}

interface UseSmartScrollReturn {
  /** Ref to attach to the scroll container */
  containerRef: RefObject<HTMLDivElement | null>;
  /** Ref to attach to the bottom marker element */
  bottomRef: RefObject<HTMLDivElement | null>;
  /** Whether user is currently near the bottom */
  isNearBottom: boolean;
  /** Whether there are new messages user hasn't seen */
  hasNewContent: boolean;
  /** Number of new messages since user scrolled away */
  newContentCount: number;
  /** Scroll to bottom smoothly */
  scrollToBottom: () => void;
  /** Mark all content as seen (resets hasNewContent) */
  markAsSeen: () => void;
}

/**
 * Smart scroll hook that:
 * - Only auto-scrolls when user is near the bottom
 * - Tracks when new content arrives while user is scrolled up
 * - Provides indicator state for "new response" notification
 * - Allows manual scroll to bottom
 */
export function useSmartScroll({
  threshold = 150,
  dependencies = [],
  isStreaming = false,
  isLoading = false,
}: UseSmartScrollOptions = {}): UseSmartScrollReturn {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [hasNewContent, setHasNewContent] = useState(false);
  const [newContentCount, setNewContentCount] = useState(0);
  const lastMessageCountRef = useRef(0);
  const userHasScrolledRef = useRef(false);

  // Check if user is near bottom of scroll container
  const checkScrollPosition = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const nearBottom = distanceFromBottom <= threshold;

    setIsNearBottom(nearBottom);

    // If user scrolled back to bottom, mark content as seen
    if (nearBottom && hasNewContent) {
      setHasNewContent(false);
      setNewContentCount(0);
    }
  }, [threshold, hasNewContent]);

  // Handle scroll events
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      userHasScrolledRef.current = true;
      checkScrollPosition();
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [checkScrollPosition]);

  // Handle new content arriving
  useEffect(() => {
    const currentCount = dependencies.length;

    // If new content arrived
    if (currentCount > lastMessageCountRef.current) {
      const newMessages = currentCount - lastMessageCountRef.current;

      if (isNearBottom || !userHasScrolledRef.current) {
        // User is near bottom or hasn't scrolled yet - auto scroll
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        setHasNewContent(false);
        setNewContentCount(0);
      } else {
        // User has scrolled up - show indicator
        setHasNewContent(true);
        setNewContentCount((prev) => prev + newMessages);
      }
    }

    lastMessageCountRef.current = currentCount;
  }, [dependencies, isNearBottom]);

  // During streaming, scroll if near bottom
  useEffect(() => {
    if (isStreaming && isNearBottom) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [isStreaming, isNearBottom]);

  // Scroll to bottom function
  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    setHasNewContent(false);
    setNewContentCount(0);
  }, []);

  // Mark content as seen
  const markAsSeen = useCallback(() => {
    setHasNewContent(false);
    setNewContentCount(0);
  }, []);

  return {
    containerRef,
    bottomRef,
    isNearBottom,
    hasNewContent,
    newContentCount,
    scrollToBottom,
    markAsSeen,
  };
}
