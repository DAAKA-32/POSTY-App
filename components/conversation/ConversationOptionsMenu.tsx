"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Post } from "@/types";

interface ConversationOptionsMenuProps {
  post: Post;
  onPin: (postId: string, isPinned: boolean) => void;
  onRename: (postId: string) => void;
  onDelete: (postId: string) => void;
  /** Contrôle la visibilité de l'icône (pour le hover) */
  isVisible?: boolean;
}

export default function ConversationOptionsMenu({
  post,
  onPin,
  onRename,
  onDelete,
  isVisible = true,
}: ConversationOptionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<"bottom" | "top">("bottom");
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Define menu items with useMemo to avoid recreation on each render
  const menuItems = useMemo(() => [
    {
      id: "pin",
      label: post.isPinned ? "Désépingler" : "Épingler",
      icon: post.isPinned ? (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
          />
        </svg>
      ),
      action: () => onPin(post.id, !post.isPinned),
      color: "text-text-secondary hover:text-white",
    },
    {
      id: "rename",
      label: "Renommer",
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
      color: "text-text-secondary hover:text-white",
    },
    {
      id: "delete",
      label: "Supprimer",
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
      color: "text-red-400 hover:text-red-300",
    },
  ], [post.id, post.isPinned, onPin, onRename, onDelete]);

  const handleAction = useCallback((action: () => void) => {
    action();
    setIsOpen(false);
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Close on escape key + keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        buttonRef.current?.focus();
      }

      if (!isOpen) return;

      // Arrow navigation
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
    if (!isOpen) {
      setFocusedIndex(-1);
    }
  }, [isOpen]);

  // Calculate menu position (above or below button)
  const calculatePosition = useCallback(() => {
    if (!buttonRef.current) return;

    const buttonRect = buttonRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const menuHeight = 160; // Estimated menu height

    // If there's not enough space below, show above
    if (buttonRect.bottom + menuHeight > viewportHeight - 20) {
      setMenuPosition("top");
    } else {
      setMenuPosition("bottom");
    }
  }, []);

  const handleToggle = useCallback(() => {
    if (!isOpen) {
      calculatePosition();
    }
    setIsOpen(!isOpen);
  }, [isOpen, calculatePosition]);

  return (
    <div className="relative">
      {/* Three dots button - horizontal style like ChatGPT */}
      <button
        ref={buttonRef}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleToggle();
        }}
        className={`
          flex items-center justify-center
          w-8 h-8 md:w-7 md:h-7 rounded-lg
          transition-all duration-150 ease-out
          text-text-secondary hover:text-white hover:bg-dark-hover
          active:scale-95 active:bg-dark-hover
          touch-manipulation
          ${isOpen ? "bg-dark-hover text-white" : ""}
          opacity-100
        `}
        aria-label="Options de la conversation"
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        {/* Professional horizontal ellipsis icon - ChatGPT style */}
        <svg
          className="w-4 h-4"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <circle cx="5" cy="12" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="19" cy="12" r="2" />
        </svg>
      </button>

      {/* Dropdown menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={menuRef}
            role="menu"
            initial={{ opacity: 0, scale: 0.95, y: menuPosition === "bottom" ? -5 : 5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: menuPosition === "bottom" ? -5 : 5 }}
            transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className={`
              absolute z-[80] right-0
              min-w-[160px] py-1.5
              bg-dark-card border border-dark-border
              rounded-xl shadow-xl shadow-black/30
              backdrop-blur-xl
              ${menuPosition === "bottom" ? "mt-1 top-full" : "mb-1 bottom-full"}
            `}
            onClick={(e) => e.stopPropagation()}
          >
            {menuItems.map((item, index) => (
              <button
                key={item.id}
                role="menuitem"
                onClick={() => handleAction(item.action)}
                onMouseEnter={() => setFocusedIndex(index)}
                className={`
                  w-full flex items-center gap-3 px-4 py-2.5
                  text-sm font-medium transition-colors duration-150
                  ${item.color}
                  ${focusedIndex === index ? "bg-dark-hover" : "hover:bg-dark-hover"}
                  ${index === menuItems.length - 1 ? "border-t border-dark-border mt-1 pt-2.5" : ""}
                `}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
