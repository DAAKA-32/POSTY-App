"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import DropdownMenu, { MenuIcons } from "@/components/ui/DropdownMenu";
import { Post } from "@/types";

interface ConversationCardProps {
  post: Post;
  isDeleting?: boolean;
  isExpanded?: boolean;
  onExpand?: () => void;
  onCopy?: (content: string) => void;
  onPublish?: (content: string) => void;
  onDelete?: (post: Post) => void;
}

// Truncate text helper
function truncateText(text: string, maxLength: number = 120): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + "...";
}

export default function ConversationCard({
  post,
  isDeleting = false,
  isExpanded = false,
  onExpand,
  onCopy,
  onPublish,
  onDelete,
}: ConversationCardProps) {
  const [showActions, setShowActions] = useState(false);

  // Get content to display
  const getContent = useCallback((): string => {
    if (post.selectedVersion === "A") return post.responseA;
    if (post.selectedVersion === "B") return post.responseB;
    return post.responseA || post.responseB || "";
  }, [post]);

  const content = getContent();

  // Menu items for dropdown
  const menuItems = [
    {
      id: "copy",
      label: "Copier",
      icon: MenuIcons.copy,
      variant: "default" as const,
      onClick: () => onCopy?.(content),
    },
    {
      id: "linkedin",
      label: "Publier sur LinkedIn",
      icon: MenuIcons.linkedin,
      variant: "default" as const,
      onClick: () => onPublish?.(content),
    },
    {
      id: "delete",
      label: "Supprimer",
      icon: MenuIcons.delete,
      variant: "danger" as const,
      onClick: () => onDelete?.(post),
    },
  ];

  return (
    <AnimatePresence mode="popLayout">
      {!isDeleting && (
        <motion.div
          layout
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{
            opacity: 0,
            x: -100,
            scale: 0.9,
            transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
          }}
          transition={{
            layout: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
            opacity: { duration: 0.2 },
            scale: { duration: 0.2 },
          }}
          className="group relative"
          onMouseEnter={() => setShowActions(true)}
          onMouseLeave={() => setShowActions(false)}
        >
          <div
            className={`
              bg-dark-card border border-dark-border rounded-xl p-4
              hover:border-dark-hover transition-all duration-200
              ${isDeleting ? "opacity-50 pointer-events-none" : ""}
            `}
          >
            {/* Header with prompt and menu */}
            <div className="flex items-start justify-between gap-2 mb-2">
              {/* Prompt */}
              <p className="text-xs text-text-muted flex-1">
                {truncateText(post.prompt, 80)}
              </p>

              {/* 3-dot menu */}
              <div
                className={`
                  transition-opacity duration-200
                  ${showActions ? "opacity-100" : "opacity-0 lg:opacity-0"}
                  opacity-100 lg:group-hover:opacity-100
                `}
              >
                <DropdownMenu items={menuItems} position="right" />
              </div>
            </div>

            {/* Content */}
            <p className="text-white text-sm leading-relaxed whitespace-pre-wrap">
              {isExpanded ? content : truncateText(content, 200)}
            </p>

            {/* Footer with expand button */}
            {content.length > 200 && (
              <div className="mt-3 pt-3 border-t border-dark-border">
                <button
                  onClick={onExpand}
                  className="text-xs text-text-muted hover:text-primary transition-colors"
                >
                  {isExpanded ? "Reduire" : "Voir plus"}
                </button>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Compact version for sidebar
interface ConversationItemProps {
  post: Post;
  isDeleting?: boolean;
  onClick?: () => void;
  onDelete?: (post: Post) => void;
}

export function ConversationItem({
  post,
  isDeleting = false,
  onClick,
  onDelete,
}: ConversationItemProps) {
  const [showMenu, setShowMenu] = useState(false);

  const menuItems = [
    {
      id: "delete",
      label: "Supprimer",
      icon: MenuIcons.delete,
      variant: "danger" as const,
      onClick: () => onDelete?.(post),
    },
  ];

  return (
    <AnimatePresence mode="popLayout">
      {!isDeleting && (
        <motion.div
          layout
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{
            opacity: 0,
            x: -50,
            height: 0,
            marginBottom: 0,
            paddingTop: 0,
            paddingBottom: 0,
            transition: { duration: 0.25, ease: [0.4, 0, 0.2, 1] },
          }}
          transition={{ duration: 0.2 }}
          className="group relative"
          onMouseEnter={() => setShowMenu(true)}
          onMouseLeave={() => setShowMenu(false)}
        >
          <div
            onClick={onClick}
            className={`
              flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer
              text-text-secondary text-sm
              hover:text-white hover:bg-dark-hover
              transition-all duration-200 haptic-feedback
              ${isDeleting ? "opacity-50 pointer-events-none" : ""}
            `}
          >
            {/* Chat icon */}
            <svg
              className="w-4 h-4 shrink-0 text-text-muted group-hover:text-accent transition-colors"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>

            {/* Text */}
            <span className="truncate flex-1">
              {post.prompt.slice(0, 30)}
              {post.prompt.length > 30 ? "..." : ""}
            </span>

            {/* Menu button */}
            <div
              className={`
                transition-opacity duration-200 ml-auto
                ${showMenu ? "opacity-100" : "opacity-0"}
              `}
              onClick={(e) => e.stopPropagation()}
            >
              <DropdownMenu items={menuItems} position="right" />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
