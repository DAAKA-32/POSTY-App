"use client";

import { ReactNode, useEffect, useRef, useId, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useScrollLock } from "@/hooks/useScrollLock";
import Button from "./Button";

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
}

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
}: ModalProps) {
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
              rounded-xl
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
                      transition-all duration-200 ease-out
                      rounded-lg hover:bg-light-hover dark:hover:bg-dark-hover
                      transform-gpu active:scale-[0.92] active:transition-none
                      haptic-feedback ml-auto
                      focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-light-card dark:focus-visible:ring-offset-dark-card
                    "
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
                p-5 pb-6
                ${scrollable ? "overflow-y-auto overscroll-contain gpu-scroll" : "overflow-visible"}
                flex-1 min-h-0
              `}
            >
              {children}
            </div>
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
  confirmText = "Confirmer",
  cancelText = "Annuler",
  variant = "primary",
  isLoading = false,
  loadingText = "En cours...",
}: ConfirmModalProps) {
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
          {cancelText}
        </Button>
        <Button
          variant={variant === "danger" ? "danger" : "primary"}
          onClick={() => {
            onConfirm();
          }}
          isLoading={isLoading}
          loadingText={loadingText}
        >
          {confirmText}
        </Button>
      </div>
    </Modal>
  );
}
