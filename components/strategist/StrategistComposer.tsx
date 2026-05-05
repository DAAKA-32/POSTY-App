"use client";

/**
 * StrategistComposer — sticky bottom composer for the Strategist drawer.
 *
 * Visually mirrors the regular UniversalChatInput so users get one mental
 * model for "talking to AI in Posty", but reskinned with the amber/gold
 * Strategist palette. Same shape (rounded-3xl), same round 44px send button
 * inside the wrapper, same focus glow — just gold instead of primary orange.
 *
 *   - Auto-grow textarea (56px → 200px)
 *   - Premium focus glow (amber ring + outer glow shadow)
 *   - Send button (rounded-full, amber gradient) lives INSIDE the wrapper
 *     bottom-right, like the regular chat
 *   - Streaming: send button morphs into a stop square with a breathing ring
 *   - Clear button (left, inside): visible only when there's at least one msg
 *   - Error alert: rendered above the composer, dismissible
 *   - Cmd+Enter / Enter to submit (Shift+Enter for newline)
 *   - font-size: 16px on textarea to prevent iOS zoom on focus
 */

import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

interface Props {
  onSend: (text: string) => void;
  onStop: () => void;
  onClear: () => void;
  hasMessages: boolean;
  streaming: boolean;
  placeholder: string;
  clearLabel: string;
  sendLabel: string;
  error: string | null;
  onDismissError: () => void;
}

export default function StrategistComposer({
  onSend,
  onStop,
  onClear,
  hasMessages,
  streaming,
  placeholder,
  clearLabel,
  sendLabel,
  error,
  onDismissError,
}: Props) {
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const reduced = useReducedMotion();

  // Auto-grow
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(200, Math.max(56, ta.scrollHeight)) + "px";
  }, [value]);

  const submit = () => {
    const t = value.trim();
    if (!t || streaming) return;
    onSend(t);
    setValue("");
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  // Premium effect = focused OR streaming (mirrors UniversalChatInput logic)
  const showGlow = focused || streaming;
  const canSend = value.trim().length > 0 && !streaming;
  const leftPadding = hasMessages ? "pl-14" : "pl-5";

  return (
    <div
      className="
        bg-background-warm/85 dark:bg-background/85
        backdrop-blur-xl
        border-t border-gray-200/70 dark:border-dark-border/60
      "
    >
      {/* ─── Error alert ─── */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.22 }}
            className="px-4 sm:px-5 pt-3"
          >
            <div
              className="
                flex items-start gap-2.5 px-3.5 py-2.5
                rounded-xl
                bg-red-50/90 dark:bg-red-500/10
                border border-red-200/80 dark:border-red-500/30
                text-[13px] text-red-700 dark:text-red-300
              "
            >
              <svg
                className="flex-shrink-0 w-4 h-4 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <span className="flex-1">{error}</span>
              <button
                onClick={onDismissError}
                aria-label="Dismiss"
                className="flex-shrink-0 text-red-400 hover:text-red-600 dark:hover:text-red-200 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="px-4 sm:px-5 py-3">
        {/* ─── Input wrapper (matches UniversalChatInput shape) ─── */}
        <div
          className={`
            relative
            bg-white dark:bg-dark-card
            backdrop-blur-sm
            transition-all duration-300 ease-out
            overflow-hidden
            ${showGlow
              ? "border border-amber-400/30 dark:border-amber-400/40"
              : "border border-gray-200 dark:border-dark-border"
            }
          `}
          style={{
            borderRadius: "24px",
            boxShadow: showGlow
              ? "0 0 20px rgba(245, 158, 11, 0.22), 0 0 40px rgba(245, 158, 11, 0.08)"
              : undefined,
          }}
        >
          {/* Textarea */}
          <textarea
            ref={taRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={onKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={placeholder}
            disabled={streaming}
            rows={1}
            aria-label="Message Strategist"
            enterKeyHint="send"
            autoComplete="off"
            autoCorrect="on"
            autoCapitalize="sentences"
            spellCheck="true"
            className={`
              w-full resize-none bg-transparent
              text-gray-900 dark:text-white
              placeholder-gray-500 dark:placeholder-gray-400
              focus:outline-none disabled:opacity-50
              py-4 pr-16 ${leftPadding}
              scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent
            `}
            style={{
              minHeight: 56,
              maxHeight: 200,
              overflowY: "auto",
              lineHeight: 1.5,
              boxSizing: "border-box",
              // 16px min font-size prevents iOS Safari from zooming on focus
              fontSize: "max(16px, 1rem)",
              WebkitAppearance: "none",
              appearance: "none",
              WebkitTapHighlightColor: "transparent",
              WebkitOverflowScrolling: "touch",
            }}
          />

          {/* ─── Clear button (inside, left) — only when there's history ─── */}
          {hasMessages && (
            <div className="absolute left-3 bottom-3 z-10">
              <motion.button
                type="button"
                initial={reduced ? false : { opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
                onClick={onClear}
                disabled={streaming}
                title={clearLabel}
                aria-label={clearLabel}
                whileTap={{ scale: 0.92 }}
                className="
                  w-11 h-11 rounded-full flex items-center justify-center
                  bg-gray-100 dark:bg-dark-elevated
                  text-gray-500 dark:text-gray-400
                  hover:bg-gray-200 dark:hover:bg-gray-600
                  hover:text-gray-700 dark:hover:text-gray-300
                  disabled:opacity-40 disabled:cursor-not-allowed
                  transition-all duration-300
                "
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a2 2 0 012-2h2a2 2 0 012 2v3"
                  />
                </svg>
              </motion.button>
            </div>
          )}

          {/* ─── Send / Stop button (inside, right) ─── */}
          <div className="absolute flex items-center right-3 bottom-3 gap-2">
            <AnimatePresence mode="wait" initial={false}>
              {streaming ? (
                <motion.button
                  key="stop-button"
                  type="button"
                  onClick={onStop}
                  aria-label="Stop"
                  title="Stop"
                  initial={reduced ? false : { opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  whileTap={{ scale: 0.92 }}
                  className="
                    w-11 h-11 rounded-full flex items-center justify-center
                    bg-gray-900 dark:bg-white text-white dark:text-gray-900
                    shadow-[0_0_0_4px_rgba(245,158,11,0.16)]
                    transition-all duration-200
                    hover:bg-black dark:hover:bg-gray-100
                  "
                >
                  {/* Stop square + breathing amber ring */}
                  <span className="relative inline-flex">
                    <span
                      aria-hidden
                      className="absolute -inset-2 rounded-full border border-amber-400/40 animate-ping"
                      style={{ animationDuration: "1.6s" }}
                    />
                    <svg className="w-4 h-4 relative" viewBox="0 0 20 20" fill="currentColor">
                      <rect x="5" y="5" width="10" height="10" rx="2" />
                    </svg>
                  </span>
                </motion.button>
              ) : (
                <motion.button
                  key="send-button"
                  type="button"
                  onClick={submit}
                  disabled={!canSend}
                  aria-label={sendLabel}
                  title={sendLabel}
                  initial={reduced ? false : { opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileTap={canSend ? { scale: 0.92 } : undefined}
                  className={`
                    w-11 h-11 rounded-full flex items-center justify-center
                    transition-all duration-200 ease-out
                    ${canSend
                      ? "bg-gradient-to-br from-amber-400 to-yellow-500 text-gray-900 shadow-[0_4px_14px_rgba(245,158,11,0.4)] hover:shadow-[0_6px_18px_rgba(245,158,11,0.55)] hover:brightness-[1.05]"
                      : "bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                    }
                  `}
                >
                  <svg
                    className="w-5 h-5 translate-x-[1px] -translate-y-[0.5px]"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M5 12h14" />
                    <path d="M13 6l6 6-6 6" />
                  </svg>
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
