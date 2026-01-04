"use client";

import { ReactNode, useEffect, useRef, useId } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import Button from "./Button";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  showCloseButton?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
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

  // Focus trap for accessibility
  const focusTrapRef = useFocusTrap<HTMLDivElement>({
    enabled: isOpen,
    initialFocus: "first",
    returnFocus: true,
  });

  // Close on escape key and handle body scroll lock
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      // Save scroll position before locking
      scrollPosRef.current = window.scrollY;

      document.addEventListener("keydown", handleEscape);

      // Lock body scroll while preserving position
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollPosRef.current}px`;
      document.body.style.left = "0";
      document.body.style.right = "0";
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);

      // Restore scroll position
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      document.body.style.overflow = "";

      // Restore scroll position
      if (scrollPosRef.current > 0) {
        window.scrollTo(0, scrollPosRef.current);
      }
    };
  }, [isOpen, onClose]);

  const sizes = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
          role="presentation"
        >
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm gpu-accelerated"
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
            className={`
              relative ${sizes[size]} w-full
              bg-dark-card
              border border-dark-border
              rounded-xl
              shadow-elevated
              my-auto
              max-h-[90vh]
              flex flex-col
              gpu-layer
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
              <div className="flex items-center justify-between p-5 border-b border-dark-border flex-shrink-0">
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
                    className="min-w-[44px] min-h-[44px] flex items-center justify-center text-text-secondary hover:text-white transition-all duration-200 rounded-lg hover:bg-dark-hover haptic-feedback ml-auto"
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

            {/* Body - scrollable if content overflows */}
            <div
              className={`
                p-5
                ${scrollable ? "overflow-y-auto overscroll-contain gpu-scroll" : "overflow-visible"}
                flex-1 min-h-0
              `}
            >
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
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
        <Button variant="ghost" onClick={onClose}>
          {cancelText}
        </Button>
        <Button
          variant={variant === "danger" ? "danger" : "primary"}
          onClick={() => {
            onConfirm();
            onClose();
          }}
        >
          {confirmText}
        </Button>
      </div>
    </Modal>
  );
}
