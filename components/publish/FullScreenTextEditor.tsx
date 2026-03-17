"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";

interface FullScreenTextEditorProps {
  isOpen: boolean;
  onClose: () => void;
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  maxLength?: number;
  platformLimits?: { name: string; limit: number }[];
  title?: string;
}

export default function FullScreenTextEditor({
  isOpen,
  onClose,
  content,
  onChange,
  placeholder = "Write your content...",
  maxLength,
  platformLimits,
  title = "Edit content",
}: FullScreenTextEditorProps) {
  const [localContent, setLocalContent] = useState(content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [viewportHeight, setViewportHeight] = useState(0);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Sync local content when opening
  useEffect(() => {
    if (isOpen) {
      setLocalContent(content);
    }
  }, [isOpen, content]);

  // Track visual viewport to adapt to virtual keyboard
  useEffect(() => {
    if (!isOpen) return;

    const updateHeight = () => {
      // Use visualViewport for accurate height when keyboard is open
      const vh = window.visualViewport?.height ?? window.innerHeight;
      setViewportHeight(vh);
    };

    updateHeight();

    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener("resize", updateHeight);
      vv.addEventListener("scroll", updateHeight, { passive: true });
    }
    // Fallback for browsers without visualViewport
    window.addEventListener("resize", updateHeight);

    return () => {
      if (vv) {
        vv.removeEventListener("resize", updateHeight);
        vv.removeEventListener("scroll", updateHeight);
      }
      window.removeEventListener("resize", updateHeight);
    };
  }, [isOpen]);

  // Focus textarea and lock scroll when opening
  useEffect(() => {
    if (!isOpen) return;

    // Lock body scroll
    const scrollY = window.scrollY;
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.overflow = "hidden";

    // Focus textarea after animation
    const timer = setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        // Place cursor at end
        const len = textareaRef.current.value.length;
        textareaRef.current.setSelectionRange(len, len);
        // Ensure textarea is visible above keyboard
        requestAnimationFrame(() => {
          textareaRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
        });
      }
    }, 150);

    return () => {
      clearTimeout(timer);
      // Restore scroll
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      document.body.style.overflow = "";
      window.scrollTo(0, scrollY);
    };
  }, [isOpen]);

  // Keep textarea scrolled to cursor position on input
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLocalContent(e.target.value);
    // On mobile, ensure caret stays visible within the scrollable textarea
    requestAnimationFrame(() => {
      const ta = textareaRef.current;
      if (!ta) return;
      // If caret is near the bottom, scroll textarea so it's visible
      const lineHeight = parseInt(getComputedStyle(ta).lineHeight) || 24;
      if (ta.scrollHeight > ta.clientHeight) {
        // Scroll to keep caret area visible
        const caretPos = ta.selectionStart;
        const textBeforeCaret = ta.value.substring(0, caretPos);
        const lines = textBeforeCaret.split("\n").length;
        const caretY = lines * lineHeight;
        const scrollBottom = ta.scrollTop + ta.clientHeight;
        if (caretY > scrollBottom - lineHeight) {
          ta.scrollTop = caretY - ta.clientHeight + lineHeight * 2;
        }
      }
    });
  }, []);

  const handleDone = useCallback(() => {
    // Blur textarea first to dismiss keyboard before closing
    textareaRef.current?.blur();
    onChange(localContent);
    onClose();
  }, [localContent, onChange, onClose]);

  const charCount = localContent.length;
  const isOverLimit = maxLength ? charCount > maxLength : false;

  if (!isMounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={containerRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-x-0 top-0 z-[200] flex flex-col bg-white dark:bg-dark-bg"
          style={{
            // Use visualViewport height so the editor shrinks when keyboard opens
            height: viewportHeight > 0 ? `${viewportHeight}px` : "100dvh",
            // Prevent iOS bounce/overscroll on the container itself
            overscrollBehavior: "none",
            touchAction: "none",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card safe-area-top shrink-0">
            <button
              onClick={() => {
                textareaRef.current?.blur();
                onClose();
              }}
              className="text-sm text-gray-500 dark:text-text-muted font-medium min-h-[44px] min-w-[44px] flex items-center"
            >
              <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Cancel
            </button>
            <span className="text-sm font-semibold text-gray-900 dark:text-white truncate mx-4">
              {title}
            </span>
            <button
              onClick={handleDone}
              className="text-sm font-semibold text-primary min-h-[44px] min-w-[44px] flex items-center justify-end"
            >
              Done
            </button>
          </div>

          {/* Editor area — fills remaining space, shrinks with keyboard */}
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <textarea
              ref={textareaRef}
              value={localContent}
              onChange={handleChange}
              placeholder={placeholder}
              className={`
                flex-1 w-full p-4 text-base leading-relaxed
                bg-white dark:bg-dark-bg
                text-gray-900 dark:text-white
                placeholder-gray-400 dark:placeholder-gray-500
                resize-none focus:outline-none
                overflow-y-auto overscroll-contain
                ${isOverLimit ? "border-b-2 border-error" : ""}
              `}
              style={{
                WebkitOverflowScrolling: "touch",
                fontSize: "16px", // Prevents iOS auto-zoom on focus
                // Allow internal scroll but prevent parent interference
                touchAction: "pan-y",
                overscrollBehavior: "contain",
              }}
              autoCapitalize="sentences"
              autoCorrect="on"
              spellCheck
              // Prevent parent scroll capture on touch
              onTouchStart={(e) => e.stopPropagation()}
            />

            {/* Character counts — fixed at bottom, always above keyboard */}
            <div className="px-4 py-2 border-t border-gray-100 dark:border-dark-border bg-gray-50 dark:bg-dark-card flex items-center justify-between shrink-0">
              <span className="text-xs text-gray-400">
                {localContent !== content && (
                  <span className="text-amber-500 font-medium">Modified</span>
                )}
              </span>
              <div className="flex items-center gap-3">
                {platformLimits?.map(({ name, limit }) => (
                  <span
                    key={name}
                    className={`text-xs font-medium ${
                      charCount > limit ? "text-error" : "text-gray-400 dark:text-text-muted"
                    }`}
                  >
                    {name}: {charCount}/{limit}
                  </span>
                ))}
                {!platformLimits?.length && maxLength && (
                  <span className={`text-xs font-medium ${isOverLimit ? "text-error" : "text-gray-400"}`}>
                    {charCount}/{maxLength}
                  </span>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
