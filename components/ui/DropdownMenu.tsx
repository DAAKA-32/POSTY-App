"use client";

import { useState, useRef, useEffect, useCallback, ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";

interface MenuItem {
  id: string;
  label: string;
  icon?: ReactNode;
  variant?: "default" | "danger";
  onClick: () => void;
}

interface DropdownMenuProps {
  items: MenuItem[];
  trigger?: ReactNode;
  position?: "left" | "right";
  className?: string;
}

interface MenuPosition {
  top: number;
  left: number;
  transformOrigin: string;
  placement: "bottom" | "top";
}

export default function DropdownMenu({
  items,
  trigger,
  position = "right",
  className = "",
}: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<MenuPosition>({
    top: 0,
    left: 0,
    transformOrigin: "top right",
    placement: "bottom",
  });
  const [isMounted, setIsMounted] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Client-side only — avoids SSR hydration mismatch with portal
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Click-outside via window pointerdown in CAPTURE phase — no backdrop needed.
  // The backdrop pattern causes click-through: mousedown on the backdrop removes
  // it from the DOM, then mouseup/click land on the trigger button, reopening
  // the menu. Capture-phase pointerdown fires before any element's own handler,
  // so we can safely ignore clicks on the trigger (it handles its own toggle).
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setIsOpen(false);
    };

    window.addEventListener("pointerdown", handlePointerDown, { capture: true });
    return () => window.removeEventListener("pointerdown", handlePointerDown, { capture: true });
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  // Calculate menu position dynamically
  const calculatePosition = useCallback(() => {
    if (!triggerRef.current) return;

    const buttonRect = triggerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const menuWidth = 180;
    const menuHeight = items.length * 48 + 16; // Approximate height
    const padding = 12;

    let top: number;
    let left: number;
    let transformOrigin: string;
    let placement: "bottom" | "top";

    // Calculate horizontal position based on position prop
    if (position === "right") {
      left = buttonRect.right - menuWidth;
      transformOrigin = "top right";
    } else {
      left = buttonRect.left;
      transformOrigin = "top left";
    }

    // Clamp horizontal position
    if (left < padding) {
      left = padding;
      transformOrigin = transformOrigin.replace("right", "left");
    }
    if (left + menuWidth > viewportWidth - padding) {
      left = viewportWidth - menuWidth - padding;
      transformOrigin = transformOrigin.replace("left", "right");
    }

    // Calculate vertical position
    const spaceBelow = viewportHeight - buttonRect.bottom;
    const spaceAbove = buttonRect.top;

    if (spaceBelow >= menuHeight + padding || spaceBelow >= spaceAbove) {
      top = buttonRect.bottom + 4;
      placement = "bottom";
    } else {
      top = buttonRect.top - menuHeight - 4;
      placement = "top";
      transformOrigin = transformOrigin.replace("top", "bottom");
    }

    // Clamp vertical position
    if (top < padding) {
      top = padding;
    } else if (top + menuHeight > viewportHeight - padding) {
      top = viewportHeight - menuHeight - padding;
    }

    setMenuPosition({ top, left, transformOrigin, placement });
  }, [items.length, position]);

  // Recalculate position on scroll or resize while open
  useEffect(() => {
    if (!isOpen) return;

    const handleUpdate = () => calculatePosition();

    window.addEventListener("scroll", handleUpdate, true);
    window.addEventListener("resize", handleUpdate);

    return () => {
      window.removeEventListener("scroll", handleUpdate, true);
      window.removeEventListener("resize", handleUpdate);
    };
  }, [isOpen, calculatePosition]);

  const handleItemClick = useCallback((item: MenuItem) => {
    setIsOpen(false);
    item.onClick();
  }, []);

  const toggleMenu = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!isOpen) {
      calculatePosition();
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [isOpen, calculatePosition]);

  // Render menu in portal
  const renderMenu = () => {
    if (!isMounted) return null;

    return createPortal(
      // motion.div is the DIRECT child of AnimatePresence (no Fragment wrapper)
      // so Framer Motion can correctly track mount/unmount for exit animations.
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="dropdown-menu"
            ref={menuRef}
            role="menu"
            aria-orientation="vertical"
            initial={{
              opacity: 0,
              scale: 0.95,
              y: menuPosition.placement === "bottom" ? -8 : 8,
            }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{
              opacity: 0,
              scale: 0.95,
              y: menuPosition.placement === "bottom" ? -8 : 8,
            }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: "fixed",
              top: menuPosition.top,
              left: menuPosition.left,
              transformOrigin: menuPosition.transformOrigin,
              zIndex: 9999,
            }}
            className="
              min-w-[180px] py-2
              bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border
              rounded-xl shadow-2xl shadow-black/20 dark:shadow-black/40
              backdrop-blur-xl
            "
            onClick={(e) => e.stopPropagation()}
          >
            {items.map((item, index) => (
              <button
                key={item.id}
                onClick={() => handleItemClick(item)}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 min-h-[44px] text-sm
                  font-medium transition-all duration-150 ease-out
                  transform-gpu
                  ${
                    item.variant === "danger"
                      ? "text-error hover:text-error hover:bg-error/10 active:bg-error/15"
                      : "text-text-secondary hover:bg-light-hover dark:hover:bg-dark-hover hover:text-text-primary hover:translate-x-0.5"
                  }
                  ${item.variant === "danger" && index > 0 ? "border-t border-light-border dark:border-dark-border mt-1" : ""}
                  active:scale-[0.98] active:transition-none
                  focus-visible:outline-none focus-visible:bg-primary/10
                `}
                role="menuitem"
              >
                {item.icon && (
                  <span className="w-5 h-5 flex items-center justify-center shrink-0 transition-transform duration-150 group-hover:scale-110">
                    {item.icon}
                  </span>
                )}
                <span>{item.label}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>,
      document.body
    );
  };

  return (
    <div className={`relative ${className}`}>
      {/* Trigger button - consistent with ConversationOptionsMenu */}
      <button
        ref={triggerRef}
        onClick={toggleMenu}
        className={`
          flex items-center justify-center
          min-w-[44px] min-h-[44px] w-11 h-11 md:w-9 md:h-9 rounded-lg
          transition-all duration-150 ease-out
          transform-gpu
          text-text-secondary hover:text-text-primary hover:bg-light-hover dark:hover:bg-dark-hover
          active:scale-[0.92] active:transition-none
          focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background
          touch-manipulation
          ${isOpen ? "bg-light-hover dark:bg-dark-hover text-text-primary scale-95" : ""}
        `}
        aria-label="Options"
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        {trigger || (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <circle cx="5" cy="12" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="19" cy="12" r="2" />
          </svg>
        )}
      </button>

      {/* Portal-rendered menu */}
      {renderMenu()}
    </div>
  );
}

// Preset icons for common actions
export const MenuIcons = {
  delete: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  ),
  copy: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
      />
    </svg>
  ),
  linkedin: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  ),
  edit: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
      />
    </svg>
  ),
  pin: (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M16 4a1 1 0 0 1 1 1v3.586l1.707 1.707a1 1 0 0 1 .293.707v2a1 1 0 0 1-1 1h-4v6a1 1 0 0 1-2 0v-6H8a1 1 0 0 1-1-1v-2a1 1 0 0 1 .293-.707L9 8.586V5a1 1 0 0 1 1-1h6z"/>
    </svg>
  ),
  unpin: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path d="M16 4a1 1 0 0 1 1 1v3.586l1.707 1.707a1 1 0 0 1 .293.707v2a1 1 0 0 1-1 1h-4v6a1 1 0 0 1-2 0v-6H8a1 1 0 0 1-1-1v-2a1 1 0 0 1 .293-.707L9 8.586V5a1 1 0 0 1 1-1h6z"/>
      <path strokeLinecap="round" d="M4 4l16 16"/>
    </svg>
  ),
};
