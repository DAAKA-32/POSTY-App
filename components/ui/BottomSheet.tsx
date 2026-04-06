"use client";

import { ReactNode, useEffect, useRef, useState, useId, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, PanInfo, useAnimation, useMotionValue, useTransform } from "framer-motion";
import { useFocusTrap } from "@/hooks/input/useFocusTrap";
import { useHapticFeedback } from "@/hooks/ui/useHapticFeedback";
import { useScrollLock } from "@/hooks/ui/useScrollLock";
import { useLanguage } from "@/contexts/LanguageContext";

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  /** Fixed footer rendered outside the scrollable area — always visible at bottom */
  footer?: ReactNode;
  showCloseButton?: boolean;
  /** Height: "auto" | "full" | "half" | number (percentage) */
  height?: "auto" | "full" | "half" | number;
  /** Allow dismiss by swiping down */
  swipeToDismiss?: boolean;
  /** ARIA description for accessibility */
  description?: string;
  /** Snap points as percentages (e.g., [0.5, 1] for half and full) */
  snapPoints?: number[];
}

// iOS-native spring animation - slightly bouncy feel
const springConfig = {
  type: "spring" as const,
  damping: 28,
  stiffness: 380,
  mass: 0.8,
};

// Faster spring for snap-back
const snapBackSpring = {
  type: "spring" as const,
  damping: 32,
  stiffness: 450,
  mass: 0.6,
};

// Exit animation - smooth and fast
const exitSpring = {
  type: "spring" as const,
  damping: 35,
  stiffness: 400,
  mass: 0.8,
};

// Threshold constants for smart snap behavior
const VELOCITY_THRESHOLD = 800; // px/s - high velocity = immediate action
const SMALL_DRAG_THRESHOLD = 0.25; // 25% of sheet height
const LARGE_DRAG_THRESHOLD = 0.45; // 45% of sheet height

export default function BottomSheet({
  isOpen,
  onClose,
  title,
  children,
  footer,
  showCloseButton = true,
  height = "auto",
  swipeToDismiss = true,
  description,
}: BottomSheetProps) {
  const { t } = useLanguage();
  const controls = useAnimation();
  const sheetRef = useRef<HTMLDivElement>(null);
  const [sheetHeight, setSheetHeight] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const titleId = useId();
  const descriptionId = useId();
  const { trigger: triggerHaptic } = useHapticFeedback();

  // Motion value for tracking drag position
  const dragY = useMotionValue(0);

  // Transform drag progress to backdrop opacity (1 at rest, fades as dragged)
  const backdropOpacity = useTransform(
    dragY,
    [0, sheetHeight * 0.5],
    [1, 0.3]
  );

  // Transform drag progress to sheet scale (subtle scale down when dragging)
  const sheetScale = useTransform(
    dragY,
    [0, sheetHeight * 0.3],
    [1, 0.98]
  );

  // Check if we're in browser for portal
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Focus trap for accessibility
  const focusTrapRef = useFocusTrap<HTMLDivElement>({
    enabled: isOpen,
    initialFocus: "first",
    returnFocus: true,
  });

  // Centralized scroll lock - uses CSS class system
  useScrollLock(isOpen);

  // Handle escape key, haptic feedback, and iOS touch prevention
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    // Prevent touch move on background (iOS scroll lock)
    const preventTouchMove = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      // Allow scrolling inside bottom sheet content, textareas, and full-screen editors
      if (
        target.closest('[data-bottomsheet-content]') ||
        target.closest('textarea') ||
        target.closest('[data-scrollable]') ||
        target.tagName === 'TEXTAREA'
      ) {
        return;
      }
      e.preventDefault();
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.documentElement.classList.add("bottomsheet-open");

      // iOS touch prevention (mobile only)
      document.addEventListener("touchmove", preventTouchMove, { passive: false });

      // Haptic feedback when sheet opens
      triggerHaptic("light");
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.removeEventListener("touchmove", preventTouchMove);
      document.documentElement.classList.remove("bottomsheet-open");
    };
  }, [isOpen, onClose, triggerHaptic]);

  // Update sheet height for swipe calculations
  useEffect(() => {
    if (sheetRef.current && isOpen) {
      // Small delay to ensure DOM is ready
      requestAnimationFrame(() => {
        if (sheetRef.current) {
          setSheetHeight(sheetRef.current.offsetHeight);
        }
      });
    }
  }, [isOpen]);

  // Smart drag end handler with iOS-like snap behavior
  const handleDragEnd = useCallback((_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (!swipeToDismiss) {
      controls.start({ y: 0 }, snapBackSpring);
      return;
    }

    const velocity = info.velocity.y;
    const offset = info.offset.y;
    const dragPercent = offset / sheetHeight;

    // High velocity swipe - immediate action based on direction
    if (Math.abs(velocity) > VELOCITY_THRESHOLD) {
      if (velocity > 0) {
        // Fast swipe down - close
        triggerHaptic("medium");
        onClose();
      } else {
        // Fast swipe up - snap back with bounce
        triggerHaptic("light");
        controls.start({ y: 0 }, snapBackSpring);
      }
      return;
    }

    // Position-based decision for slower drags
    if (dragPercent > LARGE_DRAG_THRESHOLD) {
      // Dragged past 45% - close
      triggerHaptic("medium");
      onClose();
    } else if (dragPercent > SMALL_DRAG_THRESHOLD) {
      // Between 25-45% - use velocity to decide
      if (velocity > 200) {
        // Moving down with some velocity - close
        triggerHaptic("medium");
        onClose();
      } else {
        // Moving up or slow - snap back
        triggerHaptic("light");
        controls.start({ y: 0 }, snapBackSpring);
      }
    } else {
      // Small drag (< 25%) - always snap back
      controls.start({ y: 0 }, snapBackSpring);
    }
  }, [swipeToDismiss, sheetHeight, triggerHaptic, onClose, controls]);

  // Handle drag start
  const handleDragStart = useCallback(() => {
    setIsDragging(true);
  }, []);

  // Handle drag (update motion value for visual feedback)
  const handleDrag = useCallback((_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    dragY.set(Math.max(0, info.offset.y));
  }, [dragY]);

  // Reset drag state
  useEffect(() => {
    if (!isOpen) {
      setIsDragging(false);
      dragY.set(0);
    }
  }, [isOpen, dragY]);

  const getHeightStyle = () => {
    if (height === "auto") return {};
    if (height === "full") return { height: "90vh" };
    if (height === "half") return { height: "50vh" };
    if (typeof height === "number") return { height: `${height}vh` };
    return {};
  };

  // Combine refs for both focus trap and sheet height
  const setRefs = (node: HTMLDivElement | null) => {
    sheetRef.current = node;
    if (focusTrapRef && typeof focusTrapRef === "object") {
      (focusTrapRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
    }
  };

  // Don't render on server
  if (!isMounted) return null;

  return createPortal(
    <AnimatePresence mode="wait">
      {isOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center md:hidden ios-bottomsheet-container"
          role="presentation"
          style={{
            // Ensure full viewport coverage on iOS
            minHeight: "100dvh",
            height: "100%",
          }}
        >
          {/* Backdrop - covers entire screen including sidebar */}
          {/* Use bg-black/80 as fallback for iOS which has issues with backdrop-blur */}
          <motion.div
            className="absolute inset-0 bg-black/80 ios-backdrop-blur"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ opacity: isDragging ? backdropOpacity : undefined }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Bottom Sheet */}
          <motion.div
            ref={setRefs}
            data-bottomsheet-content
            className={`
              relative w-full bg-white dark:bg-dark-card border-t border-gray-200 dark:border-dark-border
              rounded-t-3xl shadow-elevated overflow-hidden
              ios-bottomsheet-content will-change-transform
              ${isDragging ? 'cursor-grabbing' : ''}
            `}
            style={{
              ...getHeightStyle(),
              scale: isDragging ? sheetScale : 1,
              // dvh updates dynamically when virtual keyboard opens/closes
              maxHeight: 'min(90dvh, 90vh)',
              // Safe area handled via content padding — sheet itself needs no bottom padding
            }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%", transition: exitSpring }}
            transition={springConfig}
            drag={swipeToDismiss ? "y" : false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.05, bottom: 0.6 }}
            onDragStart={handleDragStart}
            onDrag={handleDrag}
            onDragEnd={(e, info) => {
              setIsDragging(false);
              handleDragEnd(e, info);
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            aria-describedby={description ? descriptionId : undefined}
            tabIndex={-1}
          >
            {/* Hidden description for screen readers */}
            {description && (
              <span id={descriptionId} className="sr-only">
                {description}
              </span>
            )}

            {/* Drag handle - iOS style pill */}
            {swipeToDismiss && (
              <div
                className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing touch-none"
                aria-hidden="true"
              >
                <div
                  className="w-9 h-[5px] bg-gray-400/50 dark:bg-gray-500/50 rounded-full transition-transform duration-150 hover:scale-110 active:scale-95"
                />
              </div>
            )}

            {/* Header */}
            {(title || showCloseButton) && (
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-dark-border">
                {title && (
                  <h2
                    id={titleId}
                    className="text-lg font-semibold text-gray-900 dark:text-white"
                  >
                    {title}
                  </h2>
                )}
                {showCloseButton && (
                  <button
                    onClick={onClose}
                    className="min-w-[44px] min-h-[44px] flex items-center justify-center text-text-secondary hover:text-text-primary transition-all duration-200 rounded-xl hover:bg-gray-100 dark:hover:bg-dark-hover haptic-feedback active:scale-95"
                    aria-label={t.ui.closeWindow}
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 6L18 18M6 18L18 6"
                      />
                    </svg>
                  </button>
                )}
              </div>
            )}

            {/* Content - scrollable area.
                paddingBottom accounts for iOS home indicator (safe-area-inset-bottom)
                so action buttons at the bottom are never hidden behind it.
                max-height uses dvh for proper keyboard handling. */}
            <div
              className="overflow-y-auto gpu-scroll overscroll-contain scrollbar-none"
              style={{
                padding: '20px',
                // Extra bottom clearance = 20px standard + safe area (home indicator)
                paddingBottom: footer ? '20px' : 'max(24px, calc(16px + env(safe-area-inset-bottom, 0px)))',
                // 90dvh - drag handle (~22px) - header (~58px) - footer (~80px if present)
                maxHeight: footer
                  ? 'calc(min(90dvh, 90vh) - 160px)'
                  : 'calc(min(90dvh, 90vh) - 80px)',
                WebkitOverflowScrolling: 'touch',
                scrollbarWidth: 'none',
              }}
            >
              {children}
            </div>

            {/* Fixed footer — always visible at bottom, outside scroll */}
            {footer && (
              <div
                className="border-t border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card shadow-[0_-2px_8px_rgba(0,0,0,0.05)] dark:shadow-[0_-2px_8px_rgba(0,0,0,0.15)]"
                style={{
                  padding: '14px 20px',
                  paddingBottom: 'max(16px, calc(12px + env(safe-area-inset-bottom, 0px)))',
                }}
              >
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

/**
 * Action item for bottom sheet action lists
 * Provides consistent styling and haptic feedback
 */
interface BottomSheetActionProps {
  icon?: ReactNode;
  label: string;
  description?: string;
  onClick: () => void;
  variant?: "default" | "danger" | "primary";
  disabled?: boolean;
}

export function BottomSheetAction({
  icon,
  label,
  description,
  onClick,
  variant = "default",
  disabled = false,
}: BottomSheetActionProps) {
  const { trigger: triggerHaptic } = useHapticFeedback();

  const handleClick = () => {
    if (disabled) return;
    triggerHaptic("light");
    onClick();
  };

  const variantStyles = {
    default: "text-text-primary hover:bg-gray-100 dark:hover:bg-dark-hover active:bg-gray-200 dark:active:bg-dark-active",
    danger: "text-error hover:bg-error/10 active:bg-error/20",
    primary: "text-primary hover:bg-primary/10 active:bg-primary/20",
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`
        w-full flex items-center gap-4 px-4 py-3.5
        rounded-xl transition-all duration-200
        touch-feedback min-h-[52px]
        ${variantStyles[variant]}
        ${disabled ? "opacity-50 cursor-not-allowed" : "active:scale-[0.98]"}
      `}
    >
      {icon && (
        <span className="w-6 h-6 flex items-center justify-center shrink-0">
          {icon}
        </span>
      )}
      <div className="flex-1 text-left min-w-0">
        <span className="block font-medium truncate">{label}</span>
        {description && (
          <span className="block text-sm text-text-muted mt-0.5 truncate">
            {description}
          </span>
        )}
      </div>
      <svg
        className="w-5 h-5 text-text-muted shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 5l7 7-7 7"
        />
      </svg>
    </button>
  );
}

/**
 * Divider for bottom sheet sections
 */
export function BottomSheetDivider() {
  return <div className="h-px bg-gray-200 dark:bg-dark-border my-2 mx-4" />;
}

/**
 * Cancel button for bottom sheet (iOS style)
 */
export function BottomSheetCancel({ onClose }: { onClose: () => void }) {
  const { trigger: triggerHaptic } = useHapticFeedback();
  const { t } = useLanguage();

  const handleClick = () => {
    triggerHaptic("light");
    onClose();
  };

  return (
    <button
      onClick={handleClick}
      className="
        w-full py-4 mt-2
        bg-gray-50 dark:bg-dark-elevated hover:bg-gray-100 dark:hover:bg-dark-hover active:bg-gray-200 dark:active:bg-dark-active
        rounded-xl font-semibold text-primary
        transition-all duration-200
        touch-feedback active:scale-[0.98]
        min-h-[52px]
      "
      style={{
        paddingBottom: 'max(16px, calc(12px + env(safe-area-inset-bottom, 0px)))',
      }}
    >
      {t.common.cancel}
    </button>
  );
}
