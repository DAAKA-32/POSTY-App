"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { usePageHelp } from "@/hooks/ui/usePageHelp";
import HelpPopover from "./HelpPopover";

const smoothEase = [0.25, 0.1, 0.25, 1] as const;

export default function HelpFloatingButton() {
  const { hasHelp, isRead, config, markAsRead } = usePageHelp();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const hasAutoOpened = useRef(false);

  // Auto-open on first visit (when help hasn't been read yet)
  useEffect(() => {
    if (!hasHelp || isRead || hasAutoOpened.current) return;
    hasAutoOpened.current = true;
    const timer = setTimeout(() => setIsPopoverOpen(true), 600);
    return () => clearTimeout(timer);
  }, [hasHelp, isRead]);

  // Once dismissed ("Compris !"), never show again for this page
  if (!hasHelp || !config || isRead) return null;

  return (
    <>
      <motion.button
        ref={buttonRef}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, delay: 0.5, ease: smoothEase }}
        onClick={() => setIsPopoverOpen((prev) => !prev)}
        className="fixed top-20 lg:top-4 right-4 z-50 w-9 h-9 rounded-full bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border shadow-lg hover:shadow-xl flex items-center justify-center text-text-muted hover:text-text-primary transition-all duration-200 hover:scale-105 active:scale-95"
        aria-label="Aide pour cette page"
        aria-expanded={isPopoverOpen}
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
            d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </motion.button>

      <HelpPopover
        isOpen={isPopoverOpen}
        onClose={() => setIsPopoverOpen(false)}
        onMarkRead={markAsRead}
        config={config}
        anchorRef={buttonRef}
      />
    </>
  );
}
