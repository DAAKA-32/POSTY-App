"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { PageHelpConfig } from "@/lib/ui/help-content";

const smoothEase = [0.25, 0.1, 0.25, 1] as const;

interface HelpPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  onMarkRead: () => void;
  config: PageHelpConfig;
  anchorRef: React.RefObject<HTMLElement | null>;
  mobileMode?: boolean;
}

export default function HelpPopover({
  isOpen,
  onClose,
  onMarkRead,
  config,
  anchorRef,
  mobileMode = false,
}: HelpPopoverProps) {
  const { t } = useLanguage();
  const popoverRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const calculatePosition = useCallback(() => {
    if (!anchorRef.current || mobileMode) return;
    const rect = anchorRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const popoverWidth = 320;
    const popoverHeight = 300;

    let top = rect.top;
    let left = rect.right + 12;

    if (left + popoverWidth > viewportWidth - 16) {
      left = rect.left - popoverWidth - 12;
    }
    if (top + popoverHeight > viewportHeight - 16) {
      top = viewportHeight - popoverHeight - 16;
    }
    if (top < 16) top = 16;

    setPosition({ top, left });
  }, [anchorRef, mobileMode]);

  useEffect(() => {
    if (isOpen) calculatePosition();
  }, [isOpen, calculatePosition]);

  useEffect(() => {
    if (!isOpen) return;
    window.addEventListener("scroll", calculatePosition, true);
    window.addEventListener("resize", calculatePosition);
    return () => {
      window.removeEventListener("scroll", calculatePosition, true);
      window.removeEventListener("resize", calculatePosition);
    };
  }, [isOpen, calculatePosition]);

  // Any dismissal (button, click outside, Escape) marks help as read
  const handleDismiss = useCallback(() => {
    onMarkRead();
    onClose();
  }, [onMarkRead, onClose]);

  // Close on Escape — also marks as read
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleDismiss();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, handleDismiss]);

  // Close on click outside — also marks as read
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        handleDismiss();
      }
    };
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handler);
    }, 10);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handler);
    };
  }, [isOpen, handleDismiss]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const helpPages = (t as any).help?.pages;
  const helpPage = helpPages?.[config.translationKey];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gotItText = (t as any).help?.gotIt || "Compris !";

  if (!isMounted || !helpPage) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={popoverRef}
          initial={{ opacity: 0, scale: 0.95, y: -8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -8 }}
          transition={{ duration: 0.2, ease: smoothEase }}
          style={
            mobileMode
              ? {
                  position: "fixed",
                  bottom: 80,
                  left: 16,
                  right: 16,
                  zIndex: 9999,
                }
              : {
                  position: "fixed",
                  top: position.top,
                  left: position.left,
                  zIndex: 9999,
                  width: 320,
                }
          }
          className="bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-xl shadow-2xl shadow-black/15 dark:shadow-black/40 overflow-hidden"
          role="tooltip"
          aria-label={helpPage.title}
        >
          {/* Accent top border */}
          <div
            className="h-1 w-full"
            style={{ backgroundColor: config.accentColor }}
          />

          <div className="p-4">
            {/* Title */}
            <h3 className="text-base font-semibold text-text-primary mb-1.5 flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: config.accentColor }}
              />
              {helpPage.title}
            </h3>

            {/* Description */}
            <p className="text-sm text-text-secondary mb-3 leading-relaxed">
              {helpPage.description}
            </p>

            {/* Feature list */}
            <ul className="space-y-1.5 mb-4">
              {helpPage.features.map((feature: string, i: number) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-text-secondary"
                >
                  <svg
                    className="w-4 h-4 mt-0.5 shrink-0"
                    style={{ color: config.accentColor }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>

            {/* Got it button */}
            <button
              onClick={handleDismiss}
              className="w-full py-2 px-4 rounded-lg text-sm font-semibold text-white transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
              style={{ backgroundColor: config.accentColor }}
            >
              {gotItText}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
