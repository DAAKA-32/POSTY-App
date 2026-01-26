"use client";

import { motion } from "framer-motion";

interface HistoryCardSkeletonProps {
  index?: number;
}

/**
 * Skeleton loader for history cards.
 * Matches the exact structure of ExpandableHistoryCard for seamless loading states.
 */
export default function HistoryCardSkeleton({ index = 0 }: HistoryCardSkeletonProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.2 }}
      className="group relative"
    >
      {/* Left border placeholder */}
      <div className="absolute left-0 top-4 bottom-4 w-1 bg-dark-border/30 rounded-full" />

      <div className="bg-dark-card border border-dark-border rounded-xl ml-2 p-4 md:p-5 lg:p-6">
        <div className="flex items-center gap-3">
          {/* Content area */}
          <div className="flex-1 min-w-0 space-y-3">
            {/* Metadata row skeleton */}
            <div className="flex items-center gap-2">
              {/* Time skeleton */}
              <div className="h-4 w-12 bg-dark-hover rounded animate-pulse" />
              {/* Badge skeleton */}
              <div className="h-5 w-20 bg-dark-hover rounded-md animate-pulse" />
            </div>

            {/* Title skeleton - variable width for natural look */}
            <div
              className="h-5 bg-dark-hover rounded animate-pulse"
              style={{ width: `${60 + (index % 3) * 15}%` }}
            />
          </div>

          {/* Chevron skeleton */}
          <div className="shrink-0 w-11 h-11 flex items-center justify-center rounded-lg bg-dark-hover/50 animate-pulse">
            <div className="w-5 h-5 rounded bg-dark-border/50" />
          </div>

          {/* Menu button skeleton */}
          <div className="shrink-0 w-11 h-11 flex items-center justify-center rounded-lg bg-dark-hover/30 animate-pulse">
            <div className="flex gap-0.5">
              <div className="w-1 h-1 rounded-full bg-dark-border/50" />
              <div className="w-1 h-1 rounded-full bg-dark-border/50" />
              <div className="w-1 h-1 rounded-full bg-dark-border/50" />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Group skeleton with date header
 */
export function HistoryGroupSkeleton({
  cardCount = 3,
  groupIndex = 0
}: {
  cardCount?: number;
  groupIndex?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: groupIndex * 0.1 }}
    >
      {/* Date header skeleton */}
      <div className="flex items-center gap-3 mb-3 md:mb-4">
        <div className="h-4 w-24 bg-dark-hover rounded animate-pulse" />
        <div className="flex-1 h-px bg-dark-border" />
        <div className="h-3 w-12 bg-dark-hover rounded animate-pulse" />
      </div>

      {/* Cards */}
      <div className="space-y-2 md:space-y-3">
        {Array.from({ length: cardCount }).map((_, i) => (
          <HistoryCardSkeleton key={i} index={groupIndex * cardCount + i} />
        ))}
      </div>
    </motion.div>
  );
}

/**
 * Full history skeleton loader
 * Shows 2-3 groups with varying card counts for natural feel
 */
export function HistoryPageSkeleton() {
  return (
    <div className="space-y-6 md:space-y-8 lg:space-y-10">
      <HistoryGroupSkeleton cardCount={2} groupIndex={0} />
      <HistoryGroupSkeleton cardCount={3} groupIndex={1} />
      <HistoryGroupSkeleton cardCount={2} groupIndex={2} />
    </div>
  );
}
