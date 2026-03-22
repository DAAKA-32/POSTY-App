"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useKeyboardHeight } from "@/hooks/input/useKeyboardHeight";

interface PlatformLimit {
  name: string;
  limit: number;
}

interface MobileFullScreenEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (content: string) => void;
  content: string;
  placeholder?: string;
  platformLimits?: PlatformLimit[];
  title?: string;
  cancelLabel?: string;
  saveLabel?: string;
  modifiedLabel?: string;
}

export default function MobileFullScreenEditor({
  isOpen,
  onClose,
  onSave,
  content,
  placeholder = "Write your content...",
  platformLimits,
  title = "Edit content",
  cancelLabel = "Cancel",
  saveLabel = "Done",
  modifiedLabel = "Modified",
}: MobileFullScreenEditorProps) {
  const [localContent, setLocalContent] = useState(content);
  const [isVisible, setIsVisible] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editorWrapperRef = useRef<HTMLDivElement>(null);
  const { keyboardHeight, isKeyboardVisible } = useKeyboardHeight();

  // No useScrollLock needed: this editor is a full-screen portal (fixed inset-0)
  // that already covers the entire viewport. Locking body scroll would prevent
  // the textarea from scrolling on mobile (body becomes position:fixed + overflow:hidden).

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Sync content when opening
  useEffect(() => {
    if (isOpen) {
      setLocalContent(content);
      // Trigger enter animation
      requestAnimationFrame(() => {
        setIsVisible(true);
      });
    } else {
      setIsVisible(false);
    }
  }, [isOpen, content]);

  // Focus textarea when editor opens
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus({ preventScroll: true });
        // Place cursor at end of text
        const len = textareaRef.current.value.length;
        textareaRef.current.setSelectionRange(len, len);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [isOpen]);

  const handleSave = useCallback(() => {
    // Blur first to dismiss keyboard smoothly
    textareaRef.current?.blur();
    // Small delay to let keyboard dismiss before closing
    setTimeout(() => {
      onSave(localContent);
      onClose();
    }, 50);
  }, [localContent, onSave, onClose]);

  const handleCancel = useCallback(() => {
    textareaRef.current?.blur();
    setTimeout(() => {
      onClose();
    }, 50);
  }, [onClose]);

  // Prevent BottomSheet's touchmove blocker from killing scroll in this editor
  useEffect(() => {
    if (!isOpen) return;
    const wrapper = editorWrapperRef.current;
    if (!wrapper) return;

    const allowTouchMove = (e: TouchEvent) => {
      // Stop propagation so the BottomSheet's document-level preventTouchMove
      // never sees touch events originating from inside this editor
      e.stopPropagation();
    };

    wrapper.addEventListener("touchmove", allowTouchMove, { passive: true });
    return () => {
      wrapper.removeEventListener("touchmove", allowTouchMove);
    };
  }, [isOpen]);

  // Handle back button / gesture on mobile
  useEffect(() => {
    if (!isOpen) return;

    const handlePopState = (e: PopStateEvent) => {
      e.preventDefault();
      handleCancel();
    };

    // Push a dummy state so back button closes editor instead of navigating
    window.history.pushState({ mobileEditor: true }, "");
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      // Clean up the dummy history entry if still present
      if (window.history.state?.mobileEditor) {
        window.history.back();
      }
    };
  }, [isOpen, handleCancel]);

  const charCount = localContent.length;
  const isModified = localContent !== content;

  // Compute the main area height: viewport minus keyboard
  const editorBottomPadding = isKeyboardVisible ? keyboardHeight : 0;

  if (!isMounted || !isOpen) return null;

  return createPortal(
    <div
      ref={editorWrapperRef}
      className={`
        fixed inset-0 z-[9999] flex flex-col
        bg-white dark:bg-dark-bg
        transition-opacity duration-200 ease-out
        ${isVisible ? "opacity-100" : "opacity-0"}
      `}
      style={{
        // Full viewport height, adapting to keyboard
        height: "100dvh",
        paddingBottom: editorBottomPadding,
        // Prevent iOS rubber-banding on the container
        overscrollBehavior: "none",
      }}
    >
      {/* ── Header ─────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-4 shrink-0 border-b border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card"
        style={{
          // Safe area for notch/status bar
          paddingTop: "max(12px, env(safe-area-inset-top))",
          paddingBottom: "12px",
        }}
      >
        <button
          type="button"
          onClick={handleCancel}
          className="flex items-center gap-1 text-gray-500 dark:text-text-muted font-medium min-h-[44px] min-w-[44px] active:opacity-60 transition-opacity"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="text-sm">{cancelLabel}</span>
        </button>

        <span className="text-sm font-semibold text-gray-900 dark:text-white truncate mx-4 max-w-[50%]">
          {title}
        </span>

        <button
          type="button"
          onClick={handleSave}
          className="text-sm font-semibold text-primary min-h-[44px] min-w-[44px] flex items-center justify-end active:opacity-60 transition-opacity"
        >
          {saveLabel}
        </button>
      </header>

      {/* ── Editor area ────────────────────────────────────── */}
      <div className="flex-1 min-h-0 flex flex-col">
        <textarea
          ref={textareaRef}
          value={localContent}
          onChange={(e) => setLocalContent(e.target.value)}
          placeholder={placeholder}
          className="
            flex-1 w-full px-5 py-4
            text-base leading-relaxed
            bg-white dark:bg-dark-bg
            text-gray-900 dark:text-white
            placeholder-gray-400 dark:placeholder-gray-500
            resize-none focus:outline-none
            overflow-y-auto overscroll-y-contain
          "
          style={{
            // 16px prevents iOS zoom on focus
            fontSize: "16px",
            lineHeight: "1.7",
            // Allow vertical scroll inside textarea, prevent horizontal
            touchAction: "pan-y",
            // Smooth momentum scroll on iOS
            WebkitOverflowScrolling: "touch",
          }}
          autoCapitalize="sentences"
          autoCorrect="on"
          spellCheck
          enterKeyHint="enter"
        />
      </div>

      {/* ── Footer / Status bar ────────────────────────────── */}
      <footer
        className="shrink-0 px-4 py-2.5 border-t border-gray-100 dark:border-dark-border bg-gray-50/80 dark:bg-dark-card/80 backdrop-blur-sm flex items-center justify-between"
        style={{
          // Safe area for home indicator
          paddingBottom: "max(10px, env(safe-area-inset-bottom))",
        }}
      >
        <div className="flex items-center gap-2">
          {isModified && (
            <span className="text-xs font-medium text-amber-500 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
              {modifiedLabel}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {platformLimits?.map(({ name, limit }) => {
            const isOver = charCount > limit;
            const isNear = charCount > limit * 0.9;
            return (
              <span
                key={name}
                className={`text-xs font-medium tabular-nums ${
                  isOver
                    ? "text-red-500"
                    : isNear
                      ? "text-amber-500"
                      : "text-gray-400 dark:text-text-muted"
                }`}
              >
                {name}: {charCount}/{limit}
              </span>
            );
          })}
          {!platformLimits?.length && (
            <span className="text-xs text-gray-400 dark:text-text-muted tabular-nums">
              {charCount}
            </span>
          )}
        </div>
      </footer>
    </div>,
    document.body
  );
}
