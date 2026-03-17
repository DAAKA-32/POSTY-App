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
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Sync local content when opening
  useEffect(() => {
    if (isOpen) {
      setLocalContent(content);
    }
  }, [isOpen, content]);

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
      }
    }, 100);

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

  const handleDone = useCallback(() => {
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
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[200] flex flex-col bg-white dark:bg-dark-bg"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card safe-area-top">
            <button
              onClick={() => {
                // Discard changes
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

          {/* Editor area — fills remaining space */}
          <div className="flex-1 overflow-hidden flex flex-col">
            <textarea
              ref={textareaRef}
              value={localContent}
              onChange={(e) => setLocalContent(e.target.value)}
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
              }}
              autoCapitalize="sentences"
              autoCorrect="on"
              spellCheck
            />

            {/* Character counts — fixed at bottom */}
            <div className="px-4 py-2 border-t border-gray-100 dark:border-dark-border bg-gray-50 dark:bg-dark-card flex items-center justify-between safe-area-bottom">
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
