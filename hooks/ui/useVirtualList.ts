"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";

interface VirtualListConfig {
  itemHeight: number;
  overscan?: number;
  threshold?: number;
}

interface VirtualListResult<T> {
  virtualItems: Array<{
    item: T;
    index: number;
    style: React.CSSProperties;
  }>;
  totalHeight: number;
  containerRef: React.RefObject<HTMLDivElement | null>;
  isVirtualized: boolean;
}

/**
 * Virtual list hook for rendering large lists efficiently
 * Only renders items visible in the viewport + overscan
 *
 * @param items - Array of items to virtualize
 * @param config - Configuration options
 * @returns Virtual list state and refs
 */
export function useVirtualList<T>(
  items: T[],
  config: VirtualListConfig
): VirtualListResult<T> {
  const { itemHeight, overscan = 5, threshold = 50 } = config;
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  // Only virtualize if items exceed threshold
  const isVirtualized = items.length > threshold;

  // Calculate total height
  const totalHeight = items.length * itemHeight;

  // Calculate visible range
  const visibleRange = useMemo(() => {
    if (!isVirtualized) {
      return { start: 0, end: items.length };
    }

    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const end = Math.min(items.length, start + visibleCount + overscan * 2);

    return { start, end };
  }, [scrollTop, containerHeight, itemHeight, overscan, items.length, isVirtualized]);

  // Create virtual items with positioning
  const virtualItems = useMemo(() => {
    const { start, end } = visibleRange;
    const result: Array<{ item: T; index: number; style: React.CSSProperties }> = [];

    for (let i = start; i < end; i++) {
      result.push({
        item: items[i],
        index: i,
        style: isVirtualized
          ? {
              position: "absolute",
              top: i * itemHeight,
              left: 0,
              right: 0,
              height: itemHeight,
            }
          : {},
      });
    }

    return result;
  }, [items, visibleRange, itemHeight, isVirtualized]);

  // Handle scroll events
  const handleScroll = useCallback(() => {
    if (containerRef.current && isVirtualized) {
      setScrollTop(containerRef.current.scrollTop);
    }
  }, [isVirtualized]);

  // Set up scroll listener and resize observer
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !isVirtualized) return;

    // Initial measurements
    setContainerHeight(container.clientHeight);
    setScrollTop(container.scrollTop);

    // Scroll listener
    container.addEventListener("scroll", handleScroll, { passive: true });

    // Resize observer for container height changes
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });
    resizeObserver.observe(container);

    return () => {
      container.removeEventListener("scroll", handleScroll);
      resizeObserver.disconnect();
    };
  }, [handleScroll, isVirtualized]);

  return {
    virtualItems,
    totalHeight,
    containerRef,
    isVirtualized,
  };
}

/**
 * Simple pagination hook as alternative to virtualization
 * Useful for mobile devices where virtualization can be choppy
 */
export function usePaginatedList<T>(
  items: T[],
  pageSize: number = 20
) {
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const observerRef = useRef<HTMLDivElement>(null);

  const visibleItems = useMemo(
    () => items.slice(0, visibleCount),
    [items, visibleCount]
  );

  const hasMore = visibleCount < items.length;

  const loadMore = useCallback(() => {
    setVisibleCount((prev) => Math.min(prev + pageSize, items.length));
  }, [pageSize, items.length]);

  // Reset when items change significantly
  useEffect(() => {
    if (items.length < visibleCount - pageSize) {
      setVisibleCount(Math.min(pageSize, items.length));
    }
  }, [items.length, visibleCount, pageSize]);

  // Intersection observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore) {
          loadMore();
        }
      },
      { rootMargin: "100px" }
    );

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  return {
    visibleItems,
    hasMore,
    loadMore,
    observerRef,
    totalCount: items.length,
  };
}
