"use client";

import { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PlanType } from "@/lib/plans";
import PromptLimitModal from "./PromptLimitModal";

/**
 * UniversalChatInput - Unified, premium chat input component
 *
 * Features:
 * - Consistent visual design across all contexts
 * - Premium gradient border animation on focus/recording
 * - Voice recording support with visual feedback
 * - Auto-resizing textarea (56px min, 200px max)
 * - Rotating placeholder examples
 * - Loading/disabled states with smooth transitions
 * - Mobile-optimized with keyboard height detection
 * - Dark mode support
 *
 * States:
 * - idle: Default state, subtle styling
 * - focus: Gradient border animation, enhanced shadow
 * - typing: Active input with character feedback
 * - recording: Voice input mode with pulsing animation
 * - sending: Disabled with loading spinner
 * - loading: AI response in progress
 * - disabled: Quota exceeded or permission denied
 */

interface UniversalChatInputProps {
  // Core functionality
  onSubmit: (message: string) => void;
  placeholder?: string | string[]; // Single string or rotating array
  disabled?: boolean;
  isLoading?: boolean;

  // Voice recording
  enableVoiceRecording?: boolean;
  onVoiceRecordingStart?: () => void;
  onVoiceRecordingStop?: () => void;
  isRecording?: boolean;

  // Customization
  showHelperText?: boolean;
  maxHeight?: number; // Default: 128px (4 lines)
  minHeight?: number; // Default: 56px
  className?: string;

  // Mobile optimization
  isMobile?: boolean;
  keyboardHeight?: number;
  browserMode?: {
    isMobileBrowser: boolean;
    inputBottomPadding: number;
  };

  // Context-specific
  context?: "new-chat" | "conversation" | "guest" | "modal";
  trialLimitReached?: boolean;
  quotaLimitReached?: boolean;

  // Character limit validation (plan-based)
  currentPlan?: PlanType;
  maxCharacters?: number;
  showCharacterCount?: boolean;
}

// Rotating placeholder examples for premium feel
const DEFAULT_PLACEHOLDERS = [
  "Décrivez votre post LinkedIn...",
  "Partagez une idée ou une leçon...",
  "Racontez une histoire...",
  "Quelle est votre expertise ?",
];

// Expose focus and value setter methods via ref
export interface UniversalChatInputRef {
  focus: () => void;
  blur: () => void;
  setValue: (value: string) => void;
  /** Append text to current value (for voice transcription) */
  appendValue: (value: string) => void;
  /** Get current value */
  getValue: () => string;
}

const UniversalChatInput = forwardRef<UniversalChatInputRef, UniversalChatInputProps>(({
  onSubmit,
  placeholder,
  disabled = false,
  isLoading = false,
  enableVoiceRecording = true,
  onVoiceRecordingStart,
  onVoiceRecordingStop,
  isRecording = false,
  showHelperText = true,
  maxHeight = 128, // 4 lines max (16px * 1.5 lineHeight * 4 + 32px padding)
  minHeight = 56,
  className = "",
  isMobile = false,
  keyboardHeight = 0,
  browserMode,
  context = "new-chat",
  trialLimitReached = false,
  quotaLimitReached = false,
  // Character limit props
  currentPlan = "free",
  maxCharacters = 100,
  showCharacterCount = true,
}, ref) => {
  const [message, setMessage] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const rotationTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Character limit calculations
  const currentLength = message.length;
  const isOverLimit = currentLength > maxCharacters;
  const isNearLimit = currentLength >= maxCharacters * 0.8;
  const remainingChars = maxCharacters - currentLength;

  // Use consistent minHeight across all devices for unified appearance
  const effectiveMinHeight = minHeight;

  // Expose focus/blur/setValue/appendValue/getValue methods to parent via ref
  useImperativeHandle(ref, () => ({
    focus: () => {
      textareaRef.current?.focus();
    },
    blur: () => {
      textareaRef.current?.blur();
    },
    setValue: (value: string) => {
      setMessage(value);
      // Auto-resize after setting value with intelligent shrinking
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          // Reset to auto to get accurate measurement
          textareaRef.current.style.height = "auto";
          const newHeight = Math.min(
            Math.max(textareaRef.current.scrollHeight, effectiveMinHeight),
            maxHeight
          );
          textareaRef.current.style.height = `${newHeight}px`;
        }
      });
    },
    appendValue: (value: string) => {
      setMessage((prev) => {
        const newValue = prev + (prev ? " " : "") + value;
        // Auto-resize after appending
        requestAnimationFrame(() => {
          if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            const newHeight = Math.min(
              Math.max(textareaRef.current.scrollHeight, effectiveMinHeight),
              maxHeight
            );
            textareaRef.current.style.height = `${newHeight}px`;
          }
        });
        return newValue;
      });
    },
    getValue: () => {
      return textareaRef.current?.value || "";
    },
  }), [effectiveMinHeight, maxHeight]);

  // Determine placeholders (single string or rotating array)
  const placeholders = Array.isArray(placeholder)
    ? placeholder
    : placeholder
    ? [placeholder]
    : DEFAULT_PLACEHOLDERS;

  // Determine placeholder based on state
  const currentPlaceholder = isRecording
    ? "🎤 Parlez maintenant..."
    : quotaLimitReached
    ? "Limite atteinte pour aujourd'hui"
    : trialLimitReached
    ? "Limite d'essai atteinte"
    : placeholders[placeholderIndex % placeholders.length];

  // Rotate placeholder every 3 seconds when not focused
  useEffect(() => {
    if (!isFocused && placeholders.length > 1) {
      rotationTimerRef.current = setInterval(() => {
        setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
      }, 3000);
    } else {
      if (rotationTimerRef.current) {
        clearInterval(rotationTimerRef.current);
        rotationTimerRef.current = null;
      }
    }

    return () => {
      if (rotationTimerRef.current) {
        clearInterval(rotationTimerRef.current);
      }
    };
  }, [isFocused, placeholders.length]);

  // Auto-resize textarea with RAF for smooth updates - intelligent shrinking
  useEffect(() => {
    if (textareaRef.current) {
      // Use requestAnimationFrame to prevent layout thrashing
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          // Store current scroll position to maintain it
          const scrollTop = textareaRef.current.scrollTop;

          // Reset height to "auto" to get accurate scrollHeight measurement
          // This allows the textarea to shrink when content is removed
          textareaRef.current.style.height = "auto";

          // Calculate new height based on actual content
          const newHeight = Math.min(
            Math.max(textareaRef.current.scrollHeight, effectiveMinHeight),
            maxHeight
          );

          // Apply new height with smooth transition
          textareaRef.current.style.height = `${newHeight}px`;

          // Restore scroll position if needed (only when at max height)
          if (scrollTop > 0 && newHeight >= maxHeight) {
            textareaRef.current.scrollTop = scrollTop;
          }
        }
      });
    }
  }, [message, effectiveMinHeight, maxHeight]);

  // Handle submission with character limit validation
  const handleSubmit = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();
      if (message.trim() && !isLoading && !disabled && !trialLimitReached && !quotaLimitReached) {
        // CRITICAL: Intercept submission if over character limit
        if (message.length > maxCharacters) {
          setShowLimitModal(true);
          return; // Block submission - show modal instead
        }

        onSubmit(message.trim());
        setMessage("");
        // Reset textarea height to minimum immediately
        if (textareaRef.current) {
          textareaRef.current.style.height = `${effectiveMinHeight}px`;
        }
      }
    },
    [message, isLoading, disabled, trialLimitReached, quotaLimitReached, onSubmit, effectiveMinHeight, maxCharacters]
  );

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        if (!e.shiftKey) {
          // Submit on Enter
          e.preventDefault();
          handleSubmit();
        } else {
          // Prevent line break on Shift+Enter if message is empty or contains only whitespace
          if (!message.trim()) {
            e.preventDefault();
          }
        }
      }
    },
    [handleSubmit, message]
  );

  // Handle voice recording toggle
  const handleVoiceToggle = useCallback(() => {
    if (isRecording) {
      onVoiceRecordingStop?.();
    } else {
      onVoiceRecordingStart?.();
    }
  }, [isRecording, onVoiceRecordingStart, onVoiceRecordingStop]);

  // Determine if input should show premium effects
  const showPremiumEffects = isFocused || isRecording;

  return (
    <motion.div
      initial={!hasAnimated ? { opacity: 0, y: 30, filter: "blur(10px)" } : false}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      onAnimationComplete={() => setHasAnimated(true)}
      className={`w-full ${className}`}
      style={{ isolation: "isolate" }}
    >
      {/* Main input container - gradient border using outline technique for PWA consistency */}
      <div
        className={`
          relative
          transition-all duration-300 ease-out
          chat-input-wrapper
          ${showPremiumEffects
            ? "chat-input-gradient-active"
            : ""
          }
        `}
        style={{
          // Explicit box-sizing for cross-platform consistency
          boxSizing: "border-box",
          WebkitBoxSizing: "border-box",
          // Unified border-radius across all states
          borderRadius: "24px",
        }}
      >
        {/* Gradient border overlay - renders behind content for PWA/browser consistency */}
        {showPremiumEffects && (
          <div
            className="absolute inset-0 bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_auto] animate-shimmer-slow pointer-events-none"
            style={{
              zIndex: 0,
              margin: "-1px",
              padding: "1px",
              // Unified border-radius - SAME as wrapper
              borderRadius: "24px",
            }}
            aria-hidden="true"
          />
        )}

        {/* Inner container - stable dimensions with elegant glow */}
        <div
          className={`
            relative
            bg-white dark:bg-dark-card
            backdrop-blur-sm
            transition-all duration-300 ease-out
            chat-input-inner
            ${showPremiumEffects
              ? "shadow-glow border border-primary/20"
              : "border border-gray-200 dark:border-dark-border"
            }
          `}
          style={{
            boxSizing: "border-box",
            WebkitBoxSizing: "border-box",
            zIndex: 1,
            // Unified border-radius - SAME as wrapper (critical for hover/focus consistency)
            borderRadius: "24px",
            boxShadow: showPremiumEffects
              ? "0 0 20px rgba(248, 147, 93, 0.25), 0 0 40px rgba(248, 147, 93, 0.1)"
              : undefined,
          }}
        >
          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={currentPlaceholder}
            disabled={disabled || isLoading || trialLimitReached || quotaLimitReached}
            rows={1}
            aria-label="Message input"
            enterKeyHint="send"
            autoComplete="off"
            autoCorrect="on"
            autoCapitalize="sentences"
            spellCheck="true"
            className={`
              w-full resize-none
              text-gray-900 dark:text-white
              placeholder-gray-500 dark:placeholder-gray-400
              bg-transparent
              disabled:opacity-50
              focus:outline-none
              scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent
              hover:scrollbar-thumb-gray-400 dark:hover:scrollbar-thumb-gray-500
              ${enableVoiceRecording ? "text-base py-4 pl-5 pr-28" : "text-base py-4 pl-5 pr-16"}
              ${isMobile ? "[&::placeholder]:whitespace-nowrap [&::placeholder]:overflow-hidden [&::placeholder]:text-ellipsis [&::placeholder]:block" : ""}
            `}
            style={{
              minHeight: `${effectiveMinHeight}px`,
              maxHeight: `${maxHeight}px`,
              overflowY: "auto",
              lineHeight: "1.5",
              transition: "height 0.1s ease-out",
              // Cross-platform consistency fixes
              boxSizing: "border-box",
              WebkitBoxSizing: "border-box",
              // Prevent iOS zoom on focus (font-size >= 16px)
              fontSize: "max(16px, 1rem)",
              // Fix Safari textarea rendering
              WebkitAppearance: "none",
              appearance: "none",
              // Prevent touch highlight issues
              WebkitTapHighlightColor: "transparent",
            }}
          />

          {/* Action buttons - absolute positioned on right */}
          <div className="absolute flex items-center right-3 bottom-3 gap-2">
            {/* Voice recording button */}
            {enableVoiceRecording && (
              <AnimatePresence>
                <motion.button
                  type="button"
                  onClick={handleVoiceToggle}
                  disabled={disabled || isLoading || trialLimitReached || quotaLimitReached}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  whileTap={{ scale: 0.92 }}
                  className={`
                    w-11 h-11 rounded-full
                    flex items-center justify-center
                    transition-all duration-300
                    disabled:opacity-40 disabled:cursor-not-allowed
                    ${isRecording
                      ? "bg-primary text-white animate-pulse shadow-[0_0_0_0_rgba(248,147,93,0.7)] animate-glow-pulse"
                      : "bg-gray-100 dark:bg-dark-elevated text-text-muted"
                    }
                  `}
                >
                  {isRecording ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <rect x="6" y="6" width="8" height="8" rx="1" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  )}
                </motion.button>
              </AnimatePresence>
            )}

            {/* Submit button */}
            <motion.button
              type="button"
              onClick={handleSubmit}
              disabled={!message.trim() || isLoading || disabled || trialLimitReached || quotaLimitReached}
              whileTap={{ scale: message.trim() && !isLoading && !disabled ? 0.95 : 1 }}
              className={`
                w-11 h-11 rounded-full
                flex items-center justify-center
                transition-all duration-300
                ${message.trim() && !isLoading && !disabled && !trialLimitReached && !quotaLimitReached
                  ? "bg-gradient-to-r from-primary to-accent text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                }
              `}
            >
              {isLoading ? (
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              )}
            </motion.button>
          </div>
        </div>
      </div>

      {/* Character counter and helper text */}
      <div className="flex items-center justify-between mt-2 px-1">
        {/* Helper text - Desktop only */}
        {showHelperText && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="hidden sm:block text-xs text-gray-500 dark:text-gray-400"
          >
            {quotaLimitReached
              ? "Votre limite quotidienne est atteinte. Revenez demain ou passez à un plan supérieur."
              : trialLimitReached
              ? "Limite d'essai atteinte. Inscrivez-vous pour continuer."
              : "Entrée pour envoyer • Shift+Entrée pour saut de ligne"}
          </motion.p>
        )}

        {/* Character counter - always visible when showCharacterCount is true */}
        {showCharacterCount && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className={`
              text-xs font-medium ml-auto
              transition-colors duration-200
              ${isOverLimit
                ? "text-red-500"
                : isNearLimit
                ? "text-amber-500"
                : "text-gray-400 dark:text-gray-500"
              }
            `}
          >
            <span className={isOverLimit ? "font-bold" : ""}>
              {currentLength.toLocaleString("fr-FR")}
            </span>
            <span className="text-gray-400 dark:text-gray-500">
              /{maxCharacters.toLocaleString("fr-FR")}
            </span>
            {isOverLimit && (
              <span className="ml-1.5 text-red-500">
                (+{(currentLength - maxCharacters).toLocaleString("fr-FR")})
              </span>
            )}
          </motion.div>
        )}
      </div>

      {/* Prompt Limit Modal */}
      <PromptLimitModal
        isOpen={showLimitModal}
        onClose={() => setShowLimitModal(false)}
        currentPlan={currentPlan}
        currentLength={currentLength}
        maxLength={maxCharacters}
      />
    </motion.div>
  );
});

UniversalChatInput.displayName = "UniversalChatInput";

export default UniversalChatInput;
