"use client";

import { ReactNode, useEffect, useRef, useId, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useFocusTrap } from "@/hooks/input/useFocusTrap";
import { useScrollLock } from "@/hooks/ui/useScrollLock";
import Button from "./Button";
import { useLanguage } from "@/contexts/LanguageContext";

/** Posty signature accent applied as a 1-px gradient bar across the modal's
 *  top edge. Each value maps to one of the onboarding-carousel gradients so
 *  the modal subtly inherits the emotional tone of its context (writing →
 *  `posts`, scheduling → `schedule`, etc.). `none` disables the bar. */
export type ModalAccent = "welcome" | "posts" | "visuals" | "schedule" | "optimize" | "none";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  showCloseButton?: boolean;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  scrollable?: boolean;
  /** ARIA description for accessibility */
  description?: string;
  /**
   * Optional sticky footer rendered outside the scrollable body. Use this
   * for primary modal actions so they're flush with the modal's bottom
   * edge (no gap from body padding, rounded corners follow the modal).
   */
  footer?: ReactNode;
  /** Signature accent bar at the top edge. Defaults to `welcome` (brand). */
  accent?: ModalAccent;
}

const accentClassMap: Record<ModalAccent, string> = {
  welcome: "bg-signature-welcome",
  posts: "bg-signature-posts",
  visuals: "bg-signature-visuals",
  schedule: "bg-signature-schedule",
  optimize: "bg-signature-optimize",
  none: "",
};

// Spring animation config for smooth, natural feel
const springConfig = {
  type: "spring" as const,
  damping: 25,
  stiffness: 300,
  mass: 0.5,
};

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

const modalVariants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
    y: 20,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: springConfig,
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 10,
    transition: { duration: 0.15 },
  },
};

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  showCloseButton = true,
  size = "md",
  scrollable = true,
  description,
  footer,
  accent = "welcome",
}: ModalProps) {
  const { t } = useLanguage();
  const scrollPosRef = useRef(0);
  const titleId = useId();
  const descriptionId = useId();
  const [isMounted, setIsMounted] = useState(false);

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

  // Use centralized scroll lock
  useScrollLock(isOpen);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  const sizes = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    full: "max-w-[calc(100vw-2rem)] sm:max-w-2xl",
  };

  // Don't render on server
  if (!isMounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto ios-modal-container"
          role="presentation"
          style={{
            // Use dvh for iOS Safari dynamic viewport
            minHeight: "100dvh",
          }}
        >
          {/* Backdrop - covers entire screen including sidebar */}
          {/* Use bg-black/80 as fallback for iOS which has issues with backdrop-blur */}
          <motion.div
            className="fixed inset-0 bg-black/80 ios-backdrop-blur cursor-pointer"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.2 }}
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Modal content */}
          <motion.div
            ref={focusTrapRef}
            data-modal-content
            className={`
              relative ${sizes[size]} w-full
              bg-light-card dark:bg-dark-card
              border border-light-border dark:border-dark-border
              rounded-xl overflow-hidden
              shadow-elevated
              my-auto
              max-h-[85vh]
              flex flex-col
              ios-modal-content
            `}
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
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

            {/* Signature accent bar — 1-px gradient stripe at the top edge.
                Uses the Posty signature gradients to give the modal a
                contextual emotional tint (caller picks via `accent` prop). */}
            {accent !== "none" && (
              <span
                aria-hidden="true"
                className={`absolute top-0 left-0 right-0 h-[2px] ${accentClassMap[accent]} pointer-events-none`}
              />
            )}

            {/* Header */}
            {(title || showCloseButton) && (
              <div className="flex items-center justify-between p-5 border-b border-light-border dark:border-dark-border flex-shrink-0">
                {title && (
                  <h2
                    id={titleId}
                    className="text-lg font-semibold text-text-primary"
                  >
                    {title}
                  </h2>
                )}
                {showCloseButton && (
                  <button
                    onClick={onClose}
                    className="
                      min-w-[44px] min-h-[44px] flex items-center justify-center
                      text-text-secondary hover:text-text-primary
                      transition-colors duration-200
                      rounded-lg hover:bg-light-hover dark:hover:bg-dark-hover
                      ml-auto
                      focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-light-card dark:focus-visible:ring-offset-dark-card
                    "
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

            {/* Body - scrollable if content overflows */}
            <div
              className={`
                p-5 ${footer ? "" : "pb-6"}
                ${scrollable ? "overflow-y-auto overscroll-contain gpu-scroll" : "overflow-visible"}
                flex-1 min-h-0
              `}
            >
              {children}
            </div>

            {/* Sticky footer — flush with modal bottom edge */}
            {footer && (
              <div className="flex-shrink-0 px-5 py-4 bg-light-card dark:bg-dark-card border-t border-light-border dark:border-dark-border">
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

// Confirmation Modal variant
interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "primary" | "danger";
  isLoading?: boolean;
  loadingText?: string;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText,
  variant = "primary",
  isLoading = false,
  loadingText,
}: ConfirmModalProps) {
  const { t } = useLanguage();
  const resolvedCancelText = cancelText ?? t.common.cancel;
  const resolvedConfirmText = confirmText ?? t.common.confirm;
  const resolvedLoadingText = loadingText ?? t.common.loading;
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      description={message}
    >
      <p className="text-text-secondary mb-6">{message}</p>
      <div className="flex gap-3 justify-end">
        <Button variant="ghost" onClick={onClose} disabled={isLoading}>
          {resolvedCancelText}
        </Button>
        <Button
          variant={variant === "danger" ? "danger" : "primary"}
          onClick={() => {
            onConfirm();
          }}
          isLoading={isLoading}
          loadingText={resolvedLoadingText}
        >
          {resolvedConfirmText}
        </Button>
      </div>
    </Modal>
  );
}
