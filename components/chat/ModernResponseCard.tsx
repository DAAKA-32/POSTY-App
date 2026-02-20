"use client";

import { useState, memo, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { LinkedInIcon } from "@/components/linkedin/LinkedInConnectButton";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useAuth } from "@/contexts/AuthContext";
import { PlanType } from "@/lib/plans";
import PostInsightsModal from "./PostInsightsModal";
import { generatePostInsights } from "@/lib/generateInsights";

interface ModernResponseCardProps {
  content: string;
  variant?: "storytelling" | "business";
  timestamp?: Date;
  isStreaming?: boolean;
  userPlan: PlanType | null;
  onPublishToLinkedIn?: (content: string) => void;
  onSchedule?: (content: string) => void;
  showVariantBadge?: boolean; // Only show for PRO/MAX when needed
}

interface MenuPosition {
  top: number;
  left: number;
  transformOrigin: string;
  placement: "bottom" | "top";
}

/**
 * ModernResponseCard - ChatGPT-like response display
 *
 * Design principles:
 * - No border, no background block - direct on conversation background
 * - Clean, minimal, professional
 * - Actions visible but not intrusive
 * - Variant badge only shown for PRO/MAX plans
 */
export const ModernResponseCard = memo(function ModernResponseCard({
  content,
  variant = "business",
  timestamp,
  isStreaming = false,
  userPlan,
  onPublishToLinkedIn,
  onSchedule,
  showVariantBadge = false,
}: ModernResponseCardProps) {
  const { trigger: triggerHaptic } = useHapticFeedback();
  const { canSchedulePosts } = useSubscription();
  const { userProfile } = useAuth();
  const canSchedule = canSchedulePosts().allowed;

  // Menu dropdown state
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<MenuPosition>({
    top: 0,
    left: 0,
    transformOrigin: "top right",
    placement: "bottom",
  });
  const [isMounted, setIsMounted] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Insights modal state
  const [isInsightsOpen, setIsInsightsOpen] = useState(false);

  // Check if mounted for portal
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Calculate menu position dynamically
  const calculatePosition = useCallback(() => {
    if (!triggerRef.current) return;

    const buttonRect = triggerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const menuWidth = 180;
    const menuHeight = onSchedule ? 96 : 48; // Height based on number of items (2 or 1)
    const padding = 12;

    let top: number;
    let left: number;
    let transformOrigin: string;
    let placement: "bottom" | "top";

    // Calculate horizontal position - align right edge of menu with button
    left = buttonRect.right - menuWidth;

    // If menu would go off-screen left, align left edges instead
    if (left < padding) {
      left = buttonRect.left;
      transformOrigin = "top left";
    } else {
      transformOrigin = "top right";
    }

    // If menu would go off-screen right, clamp it
    if (left + menuWidth > viewportWidth - padding) {
      left = viewportWidth - menuWidth - padding;
    }

    // Calculate vertical position - check available space
    const spaceBelow = viewportHeight - buttonRect.bottom;
    const spaceAbove = buttonRect.top;

    if (spaceBelow >= menuHeight + padding || spaceBelow >= spaceAbove) {
      // Show below
      top = buttonRect.bottom + 4;
      placement = "bottom";
    } else {
      // Show above
      top = buttonRect.top - menuHeight - 4;
      placement = "top";
      transformOrigin = transformOrigin.replace("top", "bottom");
    }

    // Ensure menu stays within viewport vertically
    if (top < padding) {
      top = padding;
    } else if (top + menuHeight > viewportHeight - padding) {
      top = viewportHeight - menuHeight - padding;
    }

    setMenuPosition({ top, left, transformOrigin, placement });
  }, [onSchedule]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      // Delay adding listener to avoid capturing the opening click
      const timer = setTimeout(() => {
        document.addEventListener("mousedown", handleClickOutside);
      }, 10);

      return () => {
        clearTimeout(timer);
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isMenuOpen]);

  // Recalculate position on scroll or resize while menu is open
  useEffect(() => {
    if (!isMenuOpen) return;

    const handleUpdate = () => calculatePosition();

    window.addEventListener("scroll", handleUpdate, true);
    window.addEventListener("resize", handleUpdate);

    return () => {
      window.removeEventListener("scroll", handleUpdate, true);
      window.removeEventListener("resize", handleUpdate);
    };
  }, [isMenuOpen, calculatePosition]);

  // Variant styles - subtle, minimal
  const variantStyles = {
    storytelling: {
      icon: "📖",
      label: "Storytelling",
      color: "text-accent",
    },
    business: {
      icon: "💼",
      label: "Business",
      color: "text-primary",
    },
  };

  const currentVariant = variantStyles[variant];

  const handlePublish = () => {
    triggerHaptic("light");
    onPublishToLinkedIn?.(content);
  };

  const handleSchedule = () => {
    triggerHaptic("light");
    setIsMenuOpen(false);
    onSchedule?.(content);
  };

  const handleInsights = () => {
    triggerHaptic("light");
    setIsMenuOpen(false);
    setIsInsightsOpen(true);
  };

  const toggleMenu = () => {
    if (!isMenuOpen) {
      calculatePosition();
      setIsMenuOpen(true);
    } else {
      setIsMenuOpen(false);
    }
    triggerHaptic("light");
  };

  // Generate insights for this post (with user profile for personalization)
  const insights = generatePostInsights(content, variant, userProfile);

  // Render menu in portal with intelligent positioning
  const renderMenu = () => {
    if (!isMounted) return null;

    return createPortal(
      <AnimatePresence>
        {isMenuOpen && (
          <>
            {/* Invisible backdrop for tap-to-close */}
            <div
              className="fixed inset-0 z-[9998]"
              onClick={() => setIsMenuOpen(false)}
              aria-hidden="true"
            />

            {/* Menu - rendered at body level with intelligent positioning */}
            <motion.div
              ref={menuRef}
              initial={{
                opacity: 0,
                scale: 0.95,
                y: menuPosition.placement === "bottom" ? -8 : 8
              }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{
                opacity: 0,
                scale: 0.95,
                y: menuPosition.placement === "bottom" ? -8 : 8
              }}
              transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
              style={{
                position: "fixed",
                top: menuPosition.top,
                left: menuPosition.left,
                transformOrigin: menuPosition.transformOrigin,
                zIndex: 9999,
              }}
              className="
                min-w-[180px]
                bg-white dark:bg-dark-card
                border border-border-primary
                rounded-lg shadow-xl
                overflow-hidden
                backdrop-blur-xl
              "
              role="menu"
              aria-orientation="vertical"
            >
              {/* Schedule option - AMBER color (planning/tips) */}
              {onSchedule && (
                <motion.button
                  onClick={handleSchedule}
                  disabled={!canSchedule}
                  whileHover={canSchedule ? { x: 2 } : {}}
                  className={`
                    group/schedule w-full flex items-center gap-2.5 px-3 py-2.5
                    text-xs font-medium text-left
                    transition-all duration-150 min-h-[44px]
                    ${canSchedule
                      ? "text-primary hover:bg-[#F8935D]/5 dark:hover:bg-primary/10 active:scale-[0.98]"
                      : "text-text-muted cursor-not-allowed opacity-60"
                    }
                  `}
                  title={canSchedule ? "Programmer ce post" : "Plan Pro requis"}
                  role="menuitem"
                >
                  <svg className={`w-4 h-4 shrink-0 transition-transform ${canSchedule ? "group-hover/schedule:scale-110" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="flex-1">Programmer</span>
                  {!canSchedule && (
                    <span className="px-1.5 py-0.5 text-[9px] font-bold bg-gradient-to-r from-primary to-accent text-white rounded">
                      PRO
                    </span>
                  )}
                </motion.button>
              )}

              {/* Insights option - brand primary */}
              <motion.button
                onClick={handleInsights}
                whileHover={{ x: 2 }}
                className="
                  group/insights w-full flex items-center gap-2.5 px-3 py-2.5
                  text-xs font-medium text-left
                  text-primary
                  hover:bg-[#F8935D]/5 dark:hover:bg-primary/10
                  transition-all duration-150 min-h-[44px]
                  active:scale-[0.98]
                "
                title="Voir les statistiques"
                role="menuitem"
              >
                <svg className="w-4 h-4 shrink-0 group-hover/insights:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span className="flex-1">Insights</span>
              </motion.button>
            </motion.div>
          </>
        )}
      </AnimatePresence>,
      document.body
    );
  };

  return (
    <div className="w-full max-w-3xl">
      {/* Optional variant badge - only for PRO/MAX when explicitly enabled */}
      {showVariantBadge && !!userPlan && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-1.5 mb-2 text-xs font-medium text-text-secondary"
        >
          <span>{currentVariant.icon}</span>
          <span>{currentVariant.label}</span>
        </motion.div>
      )}

      {/* Response content - direct on background, no border/block */}
      <div className="mb-4">
        <div className="whitespace-pre-wrap break-words overflow-wrap-anywhere text-[15px] leading-relaxed text-text-primary">
          {content}
          {isStreaming && (
            <motion.span
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
              className="inline-block w-0.5 h-4 bg-current ml-0.5 align-middle"
            />
          )}
        </div>
      </div>

      {/* Action buttons - modern design with dropdown menu + AUTOSCROLL COLORS */}
      {!isStreaming && content && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex items-center gap-2 mb-6"
        >
          {/* Publish to LinkedIn - Primary action with ORANGE DOMINANT glow */}
          {onPublishToLinkedIn && (
            <motion.button
              onClick={handlePublish}
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.98 }}
              className="
                group/btn relative overflow-hidden
                inline-flex items-center gap-1.5 px-3 py-1.5
                text-xs font-medium rounded-lg
                bg-[#0A66C2]/10 text-[#0A66C2]
                hover:bg-[#0A66C2]/20
                transition-all duration-200
                border border-[#0A66C2]/20
                hover:shadow-[0_4px_16px_rgba(248,147,93,0.2)]
              "
            >
              {/* Shimmer effect on hover - ORANGE DOMINANT */}
              <span
                className="absolute inset-0 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300 pointer-events-none"
                style={{
                  background: "linear-gradient(90deg, transparent 0%, rgba(248,147,93,0.15) 50%, transparent 100%)",
                  backgroundSize: "200% 100%",
                  animation: "shimmer 2s infinite linear",
                }}
              />
              <LinkedInIcon className="w-3.5 h-3.5 relative z-10" />
              <span className="relative z-10">Publier sur LinkedIn</span>
            </motion.button>
          )}

          {/* More actions button - "+ " icon with AUTOSCROLL gradient */}
          <motion.button
            ref={triggerRef}
            onClick={toggleMenu}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`
              group/more relative overflow-hidden
              inline-flex items-center justify-center
              w-8 h-8 rounded-lg
              bg-gradient-to-br from-primary/10 to-primary-hover/10
              hover:from-primary/20 hover:to-primary-hover/20
              border border-primary/20
              active:scale-95
              transition-all duration-200
              ${isMenuOpen ? "from-primary/20 to-primary-hover/20 shadow-[0_0_12px_rgba(248,147,93,0.3)]" : ""}
            `}
            aria-label="Plus d'actions"
            aria-expanded={isMenuOpen}
            aria-haspopup="menu"
            title="Plus d'options"
          >
            {/* Shimmer effect - brand primary */}
            <span
              className="absolute inset-0 opacity-0 group-hover/more:opacity-100 transition-opacity duration-300 pointer-events-none"
              style={{
                background: "linear-gradient(135deg, transparent 0%, rgba(248,147,93,0.2) 50%, transparent 100%)",
                backgroundSize: "200% 200%",
                animation: "shimmer 2s infinite linear",
              }}
            />
            <svg
              className={`w-4 h-4 text-primary transition-transform duration-200 relative z-10 ${isMenuOpen ? "rotate-45" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </motion.button>

          {/* Portal-rendered menu with intelligent positioning */}
          {renderMenu()}
        </motion.div>
      )}

      {/* Insights Modal */}
      <PostInsightsModal
        isOpen={isInsightsOpen}
        onClose={() => setIsInsightsOpen(false)}
        insights={insights}
      />
    </div>
  );
});

export default ModernResponseCard;
