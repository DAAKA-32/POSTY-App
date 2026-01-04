"use client";

import { ReactNode, useEffect, useRef, useState, useId } from "react";
import { motion, AnimatePresence, PanInfo, useAnimation } from "framer-motion";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  showCloseButton?: boolean;
  /** Height: "auto" | "full" | "half" | number (percentage) */
  height?: "auto" | "full" | "half" | number;
  /** Allow dismiss by swiping down */
  swipeToDismiss?: boolean;
  /** ARIA description for accessibility */
  description?: string;
}

// Spring animation config
const springConfig = {
  type: "spring" as const,
  damping: 30,
  stiffness: 300,
};

export default function BottomSheet({
  isOpen,
  onClose,
  title,
  children,
  showCloseButton = true,
  height = "auto",
  swipeToDismiss = true,
  description,
}: BottomSheetProps) {
  const controls = useAnimation();
  const sheetRef = useRef<HTMLDivElement>(null);
  const [sheetHeight, setSheetHeight] = useState(0);
  const titleId = useId();
  const descriptionId = useId();
  const { trigger: triggerHaptic } = useHapticFeedback();

  // Focus trap for accessibility
  const focusTrapRef = useFocusTrap<HTMLDivElement>({
    enabled: isOpen,
    initialFocus: "first",
    returnFocus: true,
  });

  // Handle escape key and haptic feedback
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
      // Haptic feedback when sheet opens
      triggerHaptic("light");
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose, triggerHaptic]);

  // Update sheet height for swipe calculations
  useEffect(() => {
    if (sheetRef.current && isOpen) {
      setSheetHeight(sheetRef.current.offsetHeight);
    }
  }, [isOpen]);

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const shouldClose = info.velocity.y > 500 || info.offset.y > sheetHeight * 0.4;
    if (shouldClose && swipeToDismiss) {
      triggerHaptic("light");
      onClose();
    } else {
      controls.start({ y: 0 });
    }
  };

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

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center md:hidden"
          role="presentation"
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm gpu-accelerated"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Bottom Sheet */}
          <motion.div
            ref={setRefs}
            className="relative w-full bg-dark-card border-t border-dark-border rounded-t-3xl shadow-elevated max-h-[90vh] overflow-hidden gpu-layer"
            style={getHeightStyle()}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={springConfig}
            drag={swipeToDismiss ? "y" : false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={handleDragEnd}
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

            {/* Drag handle */}
            {swipeToDismiss && (
              <div
                className="flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing"
                aria-hidden="true"
              >
                <div className="w-10 h-1 bg-dark-border rounded-full" />
              </div>
            )}

            {/* Header */}
            {(title || showCloseButton) && (
              <div className="flex items-center justify-between px-5 py-3 border-b border-dark-border">
                {title && (
                  <h2
                    id={titleId}
                    className="text-lg font-semibold text-white"
                  >
                    {title}
                  </h2>
                )}
                {showCloseButton && (
                  <button
                    onClick={onClose}
                    className="min-w-[44px] min-h-[44px] flex items-center justify-center text-text-secondary hover:text-white transition-all duration-200 rounded-xl hover:bg-dark-hover haptic-feedback"
                    aria-label="Fermer la fenetre"
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
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                )}
              </div>
            )}

            {/* Content */}
            <div className="p-5 overflow-y-auto max-h-[calc(90vh-100px)] gpu-scroll overscroll-contain">
              {children}
            </div>

            {/* Safe area padding for iOS */}
            <div className="h-[env(safe-area-inset-bottom)]" />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
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
    default: "text-white hover:bg-dark-hover active:bg-dark-active",
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
  return <div className="h-px bg-dark-border my-2 mx-4" />;
}

/**
 * Cancel button for bottom sheet (iOS style)
 */
export function BottomSheetCancel({ onClose }: { onClose: () => void }) {
  const { trigger: triggerHaptic } = useHapticFeedback();

  const handleClick = () => {
    triggerHaptic("light");
    onClose();
  };

  return (
    <button
      onClick={handleClick}
      className="
        w-full py-4 mt-2
        bg-dark-elevated hover:bg-dark-hover active:bg-dark-active
        rounded-xl font-semibold text-primary
        transition-all duration-200
        touch-feedback active:scale-[0.98]
        min-h-[52px]
      "
    >
      Annuler
    </button>
  );
}
