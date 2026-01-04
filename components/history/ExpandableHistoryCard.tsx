"use client";

import { memo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Post } from "@/types";
import DropdownMenu from "@/components/ui/DropdownMenu";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";
import { useSmartCentering } from "@/hooks/useSmartCentering";

interface ExpandableHistoryCardProps {
  post: Post;
  content: string;
  versionBadge: React.ReactNode;
  time: string;
  menuItems: Array<{
    id: string;
    label: string;
    icon: React.ReactNode;
    variant: "default" | "danger";
    onClick: () => void;
  }>;
  onCopy: (content: string) => void;
  onPublishToLinkedIn: (content: string) => void;
  onDelete: () => void;
}

/**
 * Expandable history card with accordion-style animation.
 * Features:
 * - Smooth expand/collapse animation
 * - Auto-scroll to center when expanded (mobile + desktop)
 * - Visual highlight feedback on expansion
 * - Left border indicator for active reading
 */
const ExpandableHistoryCard = memo(function ExpandableHistoryCard({
  post,
  content,
  versionBadge,
  time,
  menuItems,
  onCopy,
  onPublishToLinkedIn,
}: ExpandableHistoryCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showHighlight, setShowHighlight] = useState(false);
  const { trigger: triggerHaptic } = useHapticFeedback();

  // Handle highlight animation after centering
  const handleCenterComplete = useCallback(() => {
    setShowHighlight(true);
    setTimeout(() => setShowHighlight(false), 800);
  }, []);

  // Smart centering with mobile support
  const { elementRef, isCentering } = useSmartCentering<HTMLDivElement>({
    isExpanded,
    delay: 280,
    threshold: 60,
    enabled: true,
    mobileEnabled: true,
    behavior: "smooth",
    onCenterComplete: handleCenterComplete,
  });

  const toggleExpand = () => {
    triggerHaptic("light");
    if (!isExpanded) {
      setIsExpanded(true);
    } else {
      setShowHighlight(false);
      setIsExpanded(false);
    }
  };

  const title = post.title || post.prompt;
  const displayTitle = title.length > 80 ? title.substring(0, 80) + "..." : title;

  // Animation variants for smoother content expansion
  const contentVariants = {
    collapsed: {
      height: 0,
      opacity: 0,
      transition: {
        height: { duration: 0.25, ease: [0.4, 0, 0.2, 1] as const },
        opacity: { duration: 0.15 },
      },
    },
    expanded: {
      height: "auto",
      opacity: 1,
      transition: {
        height: { duration: 0.3, ease: [0.4, 0, 0.2, 1] as const },
        opacity: { duration: 0.25, delay: 0.08 },
      },
    },
  };

  return (
    <motion.div
      ref={elementRef}
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{
        opacity: 0,
        x: -100,
        scale: 0.95,
        transition: { duration: 0.25, ease: [0.4, 0, 0.2, 1] },
      }}
      transition={{
        layout: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
        opacity: { duration: 0.2 },
      }}
      className="group relative"
    >
      {/* Highlight flash overlay - appears after scroll centering */}
      <AnimatePresence>
        {showHighlight && (
          <motion.div
            initial={{ opacity: 0, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="
              absolute inset-0 -m-1 rounded-xl pointer-events-none z-10
              bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10
              ring-2 ring-primary/30 ring-offset-2 ring-offset-dark-bg
            "
          />
        )}
      </AnimatePresence>

      {/* Active reading indicator - left border */}
      <motion.div
        initial={false}
        animate={{
          scaleY: isExpanded ? 1 : 0,
          opacity: isExpanded ? 1 : 0,
        }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        className="
          absolute left-0 top-4 bottom-4 w-1
          bg-gradient-to-b from-primary via-primary/80 to-primary/40
          rounded-full shadow-glow
          origin-top
        "
      />

      <div
        className={`
          bg-dark-card border rounded-xl ml-2
          transition-all duration-300 ease-out
          ${isExpanded
            ? "border-primary/40 shadow-xl shadow-primary/10 ring-1 ring-primary/20"
            : "border-dark-border hover:border-dark-hover hover:bg-dark-elevated/30 hover:shadow-lg"
          }
          ${isCentering ? "ring-2 ring-primary/20" : ""}
        `}
      >
        {/* Header */}
        <div className="flex items-center gap-2 p-4 md:p-5 lg:p-6">
          {/* Clickable area for expand/collapse */}
          <button
            onClick={toggleExpand}
            className="
              flex-1 flex items-center gap-3 min-w-0
              text-left
              focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50
              rounded-lg -m-2 p-2
            "
            aria-expanded={isExpanded}
            aria-controls={`content-${post.id}`}
          >
            {/* Left: Title and metadata */}
            <div className="flex-1 min-w-0">
              {/* Metadata row */}
              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                {post.isPinned && (
                  <motion.span
                    initial={false}
                    animate={{ scale: isExpanded ? 1.1 : 1 }}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-accent/10 text-accent text-xs font-medium rounded"
                  >
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                  </motion.span>
                )}
                <span className="text-xs text-text-muted">{time}</span>
                {versionBadge}
              </div>

              {/* Title */}
              <h3
                className={`
                  text-sm md:text-base font-medium
                  transition-all duration-300
                  ${isExpanded
                    ? "text-white"
                    : "text-text-secondary group-hover:text-white"
                  }
                `}
              >
                {displayTitle}
              </h3>
            </div>

            {/* Animated chevron - min 44x44px for touch accessibility */}
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className={`
                shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg
                transition-all duration-300
                ${isExpanded
                  ? "text-primary bg-primary/15 shadow-sm shadow-primary/20"
                  : "text-text-muted group-hover:text-white group-hover:bg-dark-hover"
                }
              `}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </motion.div>
          </button>

          {/* Three dots menu - Always visible, next to chevron */}
          <div
            className="shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <DropdownMenu
              items={menuItems}
              position="right"
            />
          </div>
        </div>

        {/* Expandable content */}
        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              id={`content-${post.id}`}
              key="content"
              initial="collapsed"
              animate="expanded"
              exit="collapsed"
              variants={contentVariants}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 md:px-5 md:pb-5 lg:px-6 lg:pb-6">
                {/* Elegant divider with animated gradient */}
                <div className="relative mb-4">
                  <div className="border-t border-dark-border" />
                  <motion.div
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.4, delay: 0.1 }}
                    className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent origin-center"
                  />
                </div>

                {/* Original prompt (if different from title) */}
                {post.title && post.title !== post.prompt && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15, duration: 0.25 }}
                    className="mb-4 p-3 bg-dark-elevated/50 rounded-lg border border-dark-border/50"
                  >
                    <span className="text-xs text-text-muted mb-1 block font-medium">
                      Prompt original
                    </span>
                    <p className="text-sm text-text-secondary italic leading-relaxed">
                      {post.prompt}
                    </p>
                  </motion.div>
                )}

                {/* Main content with staggered reveal */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.25 }}
                  className="mb-4"
                >
                  <p
                    className="
                      text-white text-sm md:text-base
                      leading-relaxed whitespace-pre-wrap
                    "
                  >
                    {content}
                  </p>
                </motion.div>

                {/* Actions footer with fade-in - min 44px touch targets */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.2 }}
                  className="flex items-center gap-2 pt-3 border-t border-dark-border"
                >
                  {/* Copy */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCopy(content);
                    }}
                    className="
                      flex items-center gap-2 px-4 min-h-[44px]
                      text-sm font-medium text-text-muted hover:text-white
                      bg-dark-hover/50 hover:bg-dark-hover
                      rounded-lg transition-all duration-200
                      active:scale-95
                    "
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                    Copier
                  </button>

                  {/* Publish to LinkedIn */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onPublishToLinkedIn(content);
                    }}
                    className="
                      flex items-center gap-2 px-4 min-h-[44px]
                      text-sm font-medium text-text-muted hover:text-[#0A66C2]
                      hover:bg-[#0A66C2]/10
                      rounded-lg transition-all duration-200
                      active:scale-95
                    "
                  >
                    <svg
                      className="w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                    </svg>
                    LinkedIn
                  </button>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
});

export default ExpandableHistoryCard;
