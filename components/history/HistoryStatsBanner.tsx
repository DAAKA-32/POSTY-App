"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Post } from "@/types";

interface HistoryStatsBannerProps {
  posts: Post[];
  className?: string;
}

/**
 * Stats banner showing quick insights about user's history.
 * Displays: Total posts, this week count, storytelling vs business split.
 */
export default function HistoryStatsBanner({
  posts,
  className = "",
}: HistoryStatsBannerProps) {
  const stats = useMemo(() => {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    let thisWeekCount = 0;
    let storytellingCount = 0;
    let businessCount = 0;

    posts.forEach((post) => {
      // Count this week's posts
      const postDate = post.createdAt
        ? typeof (post.createdAt as { toDate?: () => Date }).toDate === "function"
          ? (post.createdAt as { toDate: () => Date }).toDate()
          : new Date(post.createdAt as unknown as string)
        : new Date();

      if (postDate >= oneWeekAgo) {
        thisWeekCount++;
      }

      // Count by type
      if (post.selectedVersion === "A") {
        storytellingCount++;
      } else if (post.selectedVersion === "B") {
        businessCount++;
      }
    });

    return {
      total: posts.length,
      thisWeek: thisWeekCount,
      storytelling: storytellingCount,
      business: businessCount,
    };
  }, [posts]);

  // Don't show if no posts
  if (stats.total === 0) return null;

  const statItems = [
    {
      label: "Total",
      value: stats.total,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      color: "text-violet-600 dark:text-violet-400",
      bgColor: "bg-violet-50 dark:bg-violet-500/10",
      borderColor: "border-violet-200 dark:border-violet-500/25",
    },
    {
      label: "Cette semaine",
      value: stats.thisWeek,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-50 dark:bg-amber-500/10",
      borderColor: "border-amber-200 dark:border-amber-500/25",
      highlight: stats.thisWeek > 0,
    },
    {
      label: "Storytelling",
      value: stats.storytelling,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
        </svg>
      ),
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-500/10",
      borderColor: "border-blue-200 dark:border-blue-500/25",
    },
    {
      label: "Business",
      value: stats.business,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      color: "text-orange-600 dark:text-orange-400",
      bgColor: "bg-orange-50 dark:bg-orange-500/10",
      borderColor: "border-orange-200 dark:border-orange-500/25",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className={`
        grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4
        ${className}
      `}
    >
      {statItems.map((item, index) => (
        <motion.div
          key={item.label}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 + index * 0.05 }}
          whileHover={{ scale: 1.02 }}
          className={`
            flex items-center gap-3 p-3 md:p-4
            ${item.bgColor} border ${item.borderColor} rounded-xl
            transition-all duration-200 cursor-default
            ${item.highlight ? "ring-2 ring-amber-400/30 shadow-md shadow-amber-500/10" : "hover:shadow-md"}
          `}
        >
          <div className={`${item.color}`}>
            {item.icon}
          </div>
          <div className="min-w-0">
            <p className={`text-lg md:text-xl font-bold ${item.color}`}>
              {item.value}
            </p>
            <p className={`text-xs truncate ${item.color} opacity-70`}>
              {item.label}
            </p>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}
