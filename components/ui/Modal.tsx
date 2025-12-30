"use client";

import { ReactNode, useEffect } from "react";
import Button from "./Button";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  showCloseButton?: boolean;
  size?: "sm" | "md" | "lg";
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  showCloseButton = true,
  size = "md",
}: ModalProps) {
  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizes = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm modal-backdrop-enter"
        onClick={onClose}
      />

      {/* Modal content */}
      <div
        className={`
          relative ${sizes[size]} w-full
          bg-dark-card
          border border-dark-border
          rounded-2xl
          shadow-elevated
          modal-content-enter
        `}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between p-5 border-b border-dark-border">
            {title && (
              <h3 className="text-lg font-semibold text-white">{title}</h3>
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="p-2 text-text-secondary hover:text-white transition-all duration-200 rounded-xl hover:bg-dark-hover haptic-feedback"
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div className="p-5">{children}</div>
      </div>
    </div>
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
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
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
