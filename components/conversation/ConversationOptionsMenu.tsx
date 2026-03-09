"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Post } from "@/types";
import { useLanguage } from "@/contexts/LanguageContext";

interface ConversationOptionsMenuProps {
  post: Post;
  onPin: (postId: string, isPinned: boolean) => void;
  onRename: (postId: string) => void;
  onDelete: (postId: string) => void;
  isVisible?: boolean;
}

interface MenuPosition {
  top: number;
  left: number;
  transformOrigin: string;
  placement: "bottom" | "top";
}

export default function ConversationOptionsMenu({
  post,
  onPin,
  onRename,
  onDelete,
}: ConversationOptionsMenuProps) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<MenuPosition>({
    top: 0,
    left: 0,
    transformOrigin: "top right",
    placement: "bottom",
  });
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [isMounted, setIsMounted] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Client-side only — avoids SSR hydration mismatch with portal
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const menuItems = useMemo(() => [
    {
      id: "pin",
      label: post.isPinned ? t.ui.unpin : t.ui.pin,
      icon: post.isPinned ? (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path d="M16 4a1 1 0 0 1 1 1v3.586l1.707 1.707a1 1 0 0 1 .293.707v2a1 1 0 0 1-1 1h-4v6a1 1 0 0 1-2 0v-6H8a1 1 0 0 1-1-1v-2a1 1 0 0 1 .293-.707L9 8.586V5a1 1 0 0 1 1-1h6z"/>
          <path strokeLinecap="round" d="M4 4l16 16"/>
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M16 4a1 1 0 0 1 1 1v3.586l1.707 1.707a1 1 0 0 1 .293.707v2a1 1 0 0 1-1 1h-4v6a1 1 0 0 1-2 0v-6H8a1 1 0 0 1-1-1v-2a1 1 0 0 1 .293-.707L9 8.586V5a1 1 0 0 1 1-1h6z"/>
        </svg>
      ),
      action: () => onPin(post.id, !post.isPinned),
      variant: "default" as const,
    },
    {
      id: "rename",
      label: t.history.rename,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
          />
        </svg>
      ),
      action: () => onRename(post.id),
      variant: "default" as const,
    },
    {
      id: "delete",
      label: t.ui.deletePost,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          />
        </svg>
      ),
      action: () => onDelete(post.id),
      variant: "danger" as const,
    },
  ], [post.id, post.isPinned, onPin, onRename, onDelete, t]);

  const handleAction = useCallback((action: () => void) => {
    setIsOpen(false);
    action();
  }, []);

  // Calculate menu position from the button's bounding rect
  const calculatePosition = useCallback(() => {
    if (!buttonRef.current) return;

    const buttonRect = buttonRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const menuWidth = 180;
    const menuHeight = 160;
    const padding = 12;

    let top: number;
    let left: number;
    let transformOrigin: string;
    let placement: "bottom" | "top";

    // Horizontal: right-align with the button, clamp to viewport
    left = buttonRect.right - menuWidth;
    if (left < padding) {
      left = buttonRect.left;
      transformOrigin = "top left";
    } else {
      transformOrigin = "top right";
    }
    if (left + menuWidth > viewportWidth - padding) {
      left = viewportWidth - menuWidth - padding;
    }

    // Vertical: prefer below, fall back to above
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

    // Clamp vertically
    top = Math.max(padding, Math.min(top, viewportHeight - menuHeight - padding));

    setMenuPosition({ top, left, transformOrigin, placement });
  }, []);

  // ─── Click-outside via window pointerdown in CAPTURE phase ───────────────────
  //
  // WHY NOT A BACKDROP:
  //   A fixed full-screen backdrop at z-9998 sits visually on top of the toggle
  //   button. When the user clicks the button to close the menu, mousedown lands
  //   on the backdrop → React synchronously removes the backdrop → mouseup/click
  //   land on the button → handleToggle() reopens the menu. This is the classic
  //   "click-through" race condition, causing the visible flicker.
  //
  // WHY CAPTURE PHASE:
  //   capture: true means our handler fires BEFORE any element's own handler.
  //   We check if the click target is inside the button or menu and return early,
  //   letting the button's own onClick handle the toggle. Everything else closes.
  //
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      // Button handles its own open/close — don't interfere
      if (buttonRef.current?.contains(target)) return;
      // Clicks inside the menu are valid interactions
      if (menuRef.current?.contains(target)) return;
      // Anything else closes the menu
      setIsOpen(false);
    };

    window.addEventListener("pointerdown", handlePointerDown, { capture: true });
    return () => window.removeEventListener("pointerdown", handlePointerDown, { capture: true });
  }, [isOpen]);

  // Escape + arrow key navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        event.preventDefault();
        setIsOpen(false);
        buttonRef.current?.focus();
        return;
      }

      if (!isOpen) return;

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setFocusedIndex((prev) => (prev + 1) % menuItems.length);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setFocusedIndex((prev) => (prev - 1 + menuItems.length) % menuItems.length);
      } else if (event.key === "Enter" && focusedIndex >= 0) {
        event.preventDefault();
        handleAction(menuItems[focusedIndex].action);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, focusedIndex, menuItems, handleAction]);

  // Reset focused index when menu closes
  useEffect(() => {
    if (!isOpen) setFocusedIndex(-1);
  }, [isOpen]);

  // Recalculate position on scroll or resize while open
  useEffect(() => {
    if (!isOpen) return;

    const handleUpdate = () => calculatePosition();
    window.addEventListener("scroll", handleUpdate, { capture: true });
    window.addEventListener("resize", handleUpdate);
    return () => {
      window.removeEventListener("scroll", handleUpdate, { capture: true });
      window.removeEventListener("resize", handleUpdate);
    };
  }, [isOpen, calculatePosition]);

  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isOpen) {
      calculatePosition();
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [isOpen, calculatePosition]);

  const renderMenu = () => {
    if (!isMounted) return null;

    return createPortal(
      // AnimatePresence with motion.div as DIRECT child (no Fragment wrapper)
      // so Framer Motion can correctly track mount/unmount for exit animations.
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="conversation-options-menu"
            ref={menuRef}
            role="menu"
            initial={{
              opacity: 0,
              scale: 0.95,
              y: menuPosition.placement === "bottom" ? -6 : 6,
            }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{
              opacity: 0,
              scale: 0.95,
              y: menuPosition.placement === "bottom" ? -6 : 6,
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
              min-w-[180px] py-2
              bg-dark-card border border-dark-border
              rounded-xl shadow-2xl shadow-black/40
              backdrop-blur-xl
            "
            onClick={(e) => e.stopPropagation()}
          >
            {menuItems.map((item, index) => (
              <button
                key={item.id}
                role="menuitem"
                onClick={() => handleAction(item.action)}
                onMouseEnter={() => setFocusedIndex(index)}
                className={`
                  w-full flex items-center gap-3 px-4 py-3
                  text-sm font-medium transition-colors duration-150
                  min-h-[44px]
                  ${item.variant === "danger"
                    ? "text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    : "text-text-secondary hover:text-text-primary hover:bg-dark-hover"
                  }
                  ${focusedIndex === index
                    ? item.variant === "danger"
                      ? "bg-red-500/10"
                      : "bg-dark-hover"
                    : ""
                  }
                  ${item.id === "delete" ? "border-t border-dark-border mt-1" : ""}
                `}
              >
                <span className="w-5 h-5 flex items-center justify-center shrink-0">
                  {item.icon}
                </span>
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
    <>
      <button
        ref={buttonRef}
        onClick={handleToggle}
        className={`
          flex items-center justify-center
          w-9 h-9 md:w-8 md:h-8 rounded-lg
          transition-all duration-150 ease-out
          text-text-secondary hover:text-text-primary hover:bg-dark-hover
          active:scale-95 active:bg-dark-hover
          touch-manipulation
          ${isOpen ? "bg-dark-hover text-text-primary" : ""}
        `}
        aria-label={t.ui.openConversation}
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <svg
          className="w-5 h-5"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <circle cx="5" cy="12" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="19" cy="12" r="2" />
        </svg>
      </button>

      {renderMenu()}
    </>
  );
}
