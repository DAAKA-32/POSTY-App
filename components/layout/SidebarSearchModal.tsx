"use client";

/**
 * SidebarSearchModal — ChatGPT-style command-palette search dialog.
 *
 * Triggered by the "Rechercher" sidebar nav row. Opens centered on desktop
 * (max-w-xl) and full-screen-ish on mobile (full width, top sheet). Built
 * around the existing `searchQuery` + `filteredPosts` state in MainLayout
 * so results stay in sync — no duplicated filtering logic.
 *
 * Behavior:
 *   - Auto-focus the input when opened (100ms after mount so the focus
 *     ring doesn't fight the modal's enter animation)
 *   - Esc closes
 *   - Backdrop click closes
 *   - Selecting a result navigates to /app/c/[id] and closes the modal
 *   - Empty state when query is empty OR has zero matches (different copy)
 */

import { useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import type { Post } from "@/types";
import { useLanguage } from "@/contexts/LanguageContext";

const EASE = [0.22, 1, 0.36, 1] as const;

interface Props {
  open: boolean;
  onClose: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  filteredPosts: Post[];
  hasAnyPosts: boolean;
  /**
   * Optional callback fired in addition to `onClose` when the user clicks
   * a result. Use this from the mobile SlideMenu to also close the slide
   * menu after navigation, so the user lands cleanly on the conversation.
   * Esc / backdrop close still calls onClose only — keeping the slide
   * menu open for further browsing.
   */
  onResultClick?: () => void;
}

export default function SidebarSearchModal({
  open,
  onClose,
  searchQuery,
  onSearchChange,
  filteredPosts,
  hasAnyPosts,
  onResultClick,
}: Props) {
  const { t } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus when opened — small delay so the modal's enter animation
  // doesn't interrupt the focus-ring transition.
  useEffect(() => {
    if (open) {
      const id = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(id);
    }
  }, [open]);

  // Esc closes
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey, { capture: true });
    return () => document.removeEventListener("keydown", onKey, { capture: true } as EventListenerOptions);
  }, [open, onClose]);

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Truncate post.prompt cleanly for display
  const displayText = (post: Post) => {
    const raw = post.title || post.prompt || "";
    return raw.length > 100 ? `${raw.slice(0, 100)}…` : raw;
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="search-modal-root"
          className="fixed inset-0 z-[100]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          aria-hidden={!open}
        >
          {/* Backdrop */}
          <motion.div
            onClick={onClose}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />

          {/* Modal container — top-anchored on desktop, full-width on mobile */}
          <div className="absolute inset-0 flex items-end sm:items-start justify-center sm:pt-[12vh] px-0 sm:px-4 pointer-events-none">
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label={t.common.search}
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.97 }}
              transition={{ duration: 0.24, ease: EASE }}
              className="
                pointer-events-auto
                w-full sm:max-w-xl
                bg-white dark:bg-dark-card
                rounded-t-2xl sm:rounded-2xl
                shadow-2xl
                ring-1 ring-gray-200 dark:ring-dark-border
                overflow-hidden
                flex flex-col
                max-h-[85vh] sm:max-h-[70vh]
              "
            >
              {/* Search input row */}
              <div className="relative shrink-0 border-b border-gray-100 dark:border-dark-border">
                <svg
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted pointer-events-none"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  ref={inputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder={t.sidebar.searchShortPlaceholder}
                  className="
                    w-full pl-12 pr-20 py-4
                    bg-transparent
                    text-base text-text-primary
                    placeholder-text-muted
                    focus:outline-none
                  "
                />
                {/* Clear button (right) — appears only when there's a query */}
                {searchQuery && (
                  <button
                    onClick={() => onSearchChange("")}
                    className="absolute right-14 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center text-text-muted hover:text-text-primary rounded-md hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors"
                    aria-label={t.common.close}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 6L18 18M6 18L18 6"
                      />
                    </svg>
                  </button>
                )}
                {/* Esc / Close button (right) */}
                <button
                  onClick={onClose}
                  className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-1 rounded-md border border-gray-200 dark:border-dark-border text-[11px] font-mono text-text-muted hover:text-text-primary hover:border-gray-300 dark:hover:border-gray-600 transition-colors hidden sm:inline-flex"
                  aria-label={t.common.close}
                >
                  Esc
                </button>
                {/* Mobile close icon */}
                <button
                  onClick={onClose}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center text-text-muted hover:text-text-primary rounded-lg hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors sm:hidden"
                  aria-label={t.common.close}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 6L18 18M6 18L18 6"
                    />
                  </svg>
                </button>
              </div>

              {/* Results — scrollable */}
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
                {filteredPosts.length === 0 ? (
                  <div className="px-6 py-14 text-center">
                    <div className="mx-auto mb-3 w-10 h-10 rounded-full bg-gray-100 dark:bg-dark-elevated flex items-center justify-center">
                      <svg
                        className="w-5 h-5 text-text-muted"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                      </svg>
                    </div>
                    <p className="text-sm text-text-primary font-medium mb-1">
                      {searchQuery
                        ? t.common.noResults
                        : !hasAnyPosts
                          ? t.sidebar.noConversations
                          : t.common.search}
                    </p>
                    {!searchQuery && hasAnyPosts && (
                      <p className="text-xs text-text-muted">
                        {t.sidebar.searchPlaceholder}
                      </p>
                    )}
                  </div>
                ) : (
                  <ul className="py-2">
                    {filteredPosts.map((post) => (
                      <li key={post.id}>
                        <Link
                          href={`/app/c/${post.id}`}
                          onClick={() => {
                            onResultClick?.();
                            onClose();
                          }}
                          className="
                            flex items-start gap-3 px-4 py-3
                            hover:bg-gray-50 dark:hover:bg-dark-hover
                            transition-colors
                            group
                          "
                        >
                          <span className="shrink-0 w-8 h-8 rounded-lg bg-[#F8935D]/10 text-[#F8935D] flex items-center justify-center mt-0.5">
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
                                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                              />
                            </svg>
                          </span>
                          <span className="flex-1 min-w-0 text-sm text-text-primary leading-snug line-clamp-2">
                            {displayText(post)}
                          </span>
                          <svg
                            className="shrink-0 w-4 h-4 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity mt-1"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
