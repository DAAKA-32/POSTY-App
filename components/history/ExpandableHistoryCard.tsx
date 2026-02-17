"use client";

import { memo, useState, useCallback, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Post } from "@/types";
import DropdownMenu from "@/components/ui/DropdownMenu";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";
import { useSmartCentering } from "@/hooks/useSmartCentering";
import { useCanHover } from "@/hooks/useCanHover";

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
  /** Whether this card is keyboard-focused */
  isKeyboardFocused?: boolean;
  /** External control for expanded state */
  isExpanded?: boolean;
  /** Callback when expand state changes */
  onExpandChange?: (expanded: boolean) => void;
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
  isKeyboardFocused = false,
  isExpanded: controlledExpanded,
  onExpandChange,
}: ExpandableHistoryCardProps) {
  // Support both controlled and uncontrolled expand state
  const [internalExpanded, setInternalExpanded] = useState(false);
  const isExpanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded;
  const [showHighlight, setShowHighlight] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0, width: 0 });
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const { trigger: triggerHaptic } = useHapticFeedback();
  const canHover = useCanHover();

  // Check if mounted for portal
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Calculate tooltip position when showing preview
  const updateTooltipPosition = useCallback(() => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const tooltipHeight = 140; // Approximate height
    const padding = 8;

    // Check if tooltip would go below viewport
    const spaceBelow = viewportHeight - rect.bottom;
    const showAbove = spaceBelow < tooltipHeight + padding;

    setTooltipPosition({
      top: showAbove ? rect.top - tooltipHeight - padding : rect.bottom + padding,
      left: rect.left + 16,
      width: rect.width - 32,
    });
  }, []);

  // Handle hover preview (desktop only)
  const handleMouseEnter = useCallback(() => {
    if (!canHover || isExpanded) return;
    hoverTimeoutRef.current = setTimeout(() => {
      updateTooltipPosition();
      setShowPreview(true);
    }, 400); // 400ms delay to avoid flickering
  }, [canHover, isExpanded, updateTooltipPosition]);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setShowPreview(false);
  }, []);

  // Generate preview snippet (first 150 chars)
  const previewSnippet = content.length > 150
    ? content.substring(0, 150).trim() + "..."
    : content;

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
    const newExpanded = !isExpanded;
    if (onExpandChange) {
      onExpandChange(newExpanded);
    } else {
      setInternalExpanded(newExpanded);
    }
    if (!newExpanded) {
      setShowHighlight(false);
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

  // Merge refs for both smart centering and card position
  const setRefs = useCallback((node: HTMLDivElement | null) => {
    // Set both refs
    (elementRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
    (cardRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
  }, [elementRef]);

  // Render preview tooltip in portal to avoid layout shift
  const renderPreviewTooltip = () => {
    if (!isMounted || !showPreview || isExpanded || !canHover) return null;

    return createPortal(
      <AnimatePresence>
        {showPreview && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
            style={{
              position: "fixed",
              top: tooltipPosition.top,
              left: tooltipPosition.left,
              width: tooltipPosition.width,
              zIndex: 9999,
            }}
            className="
              p-4 bg-white dark:bg-dark-elevated border border-gray-200 dark:border-dark-border
              rounded-xl shadow-2xl shadow-black/20 dark:shadow-black/40
              pointer-events-none
            "
          >
            <p className="text-sm text-text-secondary leading-relaxed line-clamp-4">
              {previewSnippet}
            </p>
            <div className="mt-2 pt-2 border-t border-gray-200 dark:border-dark-border flex items-center gap-2 text-xs text-text-muted">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>Cliquez pour développer</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body
    );
  };

  return (
    <motion.div
      ref={setRefs}
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
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Highlight flash overlay - appears after scroll centering */}
      <AnimatePresence>
        {showHighlight && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="
              absolute inset-0 -m-1 rounded-xl pointer-events-none z-10
              ring-2 ring-primary/30 ring-offset-2 ring-offset-white dark:ring-offset-dark-bg
            "
          />
        )}
      </AnimatePresence>

      {/* Quick preview tooltip - rendered in portal to avoid layout shift */}
      {renderPreviewTooltip()}

      {/* Active reading indicator - left border */}
      <motion.div
        initial={false}
        animate={{
          scaleY: isExpanded ? 1 : 0,
          opacity: isExpanded ? 1 : 0,
        }}
        transition={{ duration: 0.2 }}
        className="
          absolute left-0 top-4 bottom-4 w-1
          bg-primary
          rounded-full
          origin-top
        "
      />

      <div
        className={`
          bg-white dark:bg-dark-card border rounded-2xl ml-2
          transition-all duration-200
          ${isExpanded
            ? "border-primary/40 shadow-md"
            : "border-gray-200 dark:border-dark-border hover:border-gray-300 dark:hover:border-dark-border-hover hover:shadow-sm"
          }
          ${isCentering ? "ring-2 ring-primary/20" : ""}
          ${isKeyboardFocused && !isExpanded ? "ring-2 ring-primary/30 border-primary/30" : ""}
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
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{
                      opacity: 1,
                      scale: isExpanded ? 1.05 : 1,
                    }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="inline-flex items-center gap-1.5 px-2 py-1 bg-accent/15 text-accent text-xs font-semibold rounded-md border border-accent/20 shadow-sm"
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M16 4a1 1 0 0 1 1 1v3.586l1.707 1.707a1 1 0 0 1 .293.707v2a1 1 0 0 1-1 1h-4v6a1 1 0 0 1-2 0v-6H8a1 1 0 0 1-1-1v-2a1 1 0 0 1 .293-.707L9 8.586V5a1 1 0 0 1 1-1h6z"/>
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
                    ? "text-gray-900 dark:text-white"
                    : "text-gray-900 dark:text-gray-200 group-hover:text-gray-950 dark:group-hover:text-white"
                  }
                `}
              >
                {displayTitle}
              </h3>
            </div>

            {/* Animated chevron - min 44x44px for touch accessibility */}
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className={`
                shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg
                transition-colors duration-200
                ${isExpanded
                  ? "text-primary bg-primary/10"
                  : "text-gray-400 dark:text-text-muted group-hover:text-gray-600 dark:group-hover:text-white group-hover:bg-gray-100 dark:group-hover:bg-dark-hover"
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
                {/* Simple divider */}
                <div className="border-t border-gray-200 dark:border-dark-border mb-4" />

                {/* Original prompt (if different from title) */}
                {post.title && post.title !== post.prompt && (
                  <div className="mb-4 p-3 bg-gray-50 dark:bg-dark-elevated rounded-xl border border-gray-200 dark:border-dark-border">
                    <span className="text-xs text-gray-500 dark:text-text-muted font-medium uppercase tracking-wide">
                      Prompt original
                    </span>
                    <p className="text-sm text-gray-600 dark:text-text-secondary mt-1 leading-relaxed">
                      {post.prompt}
                    </p>
                  </div>
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
                      text-gray-900 dark:text-white text-sm md:text-base
                      leading-relaxed whitespace-pre-wrap
                    "
                  >
                    {content}
                  </p>
                </motion.div>

                {/* Actions footer - Clean buttons */}
                <div className="flex items-center gap-2 pt-4 border-t border-gray-200 dark:border-dark-border">
                  {/* Copy */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCopy(content);
                    }}
                    className="
                      flex items-center gap-2 px-4 min-h-[44px]
                      text-sm font-medium
                      text-gray-700 dark:text-white
                      bg-gray-100 dark:bg-dark-hover
                      hover:bg-gray-200 dark:hover:bg-dark-elevated
                      border border-gray-200 dark:border-dark-border
                      rounded-xl transition-colors duration-200
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
                      text-sm font-medium
                      text-[#0A66C2]
                      bg-[#0A66C2]/5 dark:bg-[#0A66C2]/10
                      hover:bg-[#0A66C2]/10 dark:hover:bg-[#0A66C2]/15
                      border border-[#0A66C2]/20
                      rounded-xl transition-colors duration-200
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
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
});

export default ExpandableHistoryCard;
