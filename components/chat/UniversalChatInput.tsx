"use client";

import { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PlanType } from "@/lib/plans";
import { FileAttachment, FILE_ATTACHMENT_LIMITS, AttachmentMimeType } from "@/types";
import { InlineVoiceWaveform } from "./VoiceWaveform";
import PromptLimitModal from "./PromptLimitModal";
import { useQuota } from "@/contexts/QuotaContext";
import { useLanguage } from "@/contexts/LanguageContext";

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
  onSubmit: (message: string, file?: FileAttachment | null) => void;
  placeholder?: string | string[]; // Single string or rotating array
  disabled?: boolean;
  isLoading?: boolean;

  // Voice recording
  enableVoiceRecording?: boolean;
  onVoiceRecordingStart?: () => void;
  onVoiceRecordingStop?: () => void;
  isRecording?: boolean;
  interimText?: string;
  isVoiceProcessing?: boolean;
  autoSendCountdown?: number;
  onCancelAutoSend?: () => void;

  // File attachment (Max plan only)
  enableFileAttachment?: boolean;
  fileAttachmentAllowed?: boolean; // true = plan Max, false = disabled with tooltip

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
  currentPlan?: PlanType | null;
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
  interimText = "",
  isVoiceProcessing = false,
  autoSendCountdown = 0,
  onCancelAutoSend,
  enableFileAttachment = false,
  fileAttachmentAllowed = false,
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
  currentPlan = null,
  maxCharacters = 100,
  showCharacterCount = true,
}, ref) => {
  const [message, setMessage] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [attachedFile, setAttachedFile] = useState<FileAttachment | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  // Quota modal trigger
  const { openQuotaModal, isFreePlan: isFreePlanQuota } = useQuota();
  const { t } = useLanguage();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
    : isVoiceProcessing
    ? "Traitement de votre message..."
    : quotaLimitReached
    ? (isFreePlanQuota ? "Quota mensuel atteint" : "Quota quotidien atteint")
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

  // === File attachment handlers ===
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    if (!(FILE_ATTACHMENT_LIMITS.ALLOWED_TYPES as readonly string[]).includes(file.type)) {
      setFileError("Format non supporté. Acceptés : JPEG, PNG, GIF, WebP, PDF");
      return;
    }

    // Validate size
    if (file.size > FILE_ATTACHMENT_LIMITS.MAX_FILE_SIZE) {
      setFileError("Fichier trop volumineux (max 5 Mo)");
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1];
      setAttachedFile({
        name: file.name,
        type: file.type as AttachmentMimeType,
        size: file.size,
        base64,
      });
    };
    reader.onerror = () => setFileError(t.ui.fileReadFailed);
    reader.readAsDataURL(file);

    // Reset input for re-selecting same file
    e.target.value = "";
  }, []);

  const handleRemoveFile = useCallback(() => {
    setAttachedFile(null);
    setFileError(null);
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  };

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

        onSubmit(message.trim(), attachedFile);
        setMessage("");
        setAttachedFile(null);
        setFileError(null);
        // Reset textarea height to minimum immediately
        if (textareaRef.current) {
          textareaRef.current.style.height = `${effectiveMinHeight}px`;
        }
      }
    },
    [message, isLoading, disabled, trialLimitReached, quotaLimitReached, onSubmit, effectiveMinHeight, maxCharacters, attachedFile]
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
    if (isVoiceProcessing) return; // Don't toggle during processing
    if (isRecording) {
      onVoiceRecordingStop?.();
    } else {
      onVoiceRecordingStart?.();
    }
  }, [isRecording, isVoiceProcessing, onVoiceRecordingStart, onVoiceRecordingStop]);

  // Determine if input should show premium effects
  const showPremiumEffects = isFocused || isRecording || isVoiceProcessing;

  return (
    <motion.div
      initial={!hasAnimated ? { opacity: 0, y: 20 } : false}
      animate={{ opacity: 1, y: 0 }}
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
            overflow-hidden rounded-3xl
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
            onChange={(e) => {
              setMessage(e.target.value);
              if (autoSendCountdown > 0 && onCancelAutoSend) onCancelAutoSend();
            }}
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
              ${enableFileAttachment ? "pl-14" : "pl-5"}
              ${enableVoiceRecording ? "text-base py-4 pr-28" : "text-base py-4 pr-16"}
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

          {/* File attachment button — absolute positioned on left */}
          {enableFileAttachment && (
            <div className="absolute left-3 bottom-3 z-10 group/attach">
              <motion.button
                type="button"
                onClick={() => {
                  if (fileAttachmentAllowed && !attachedFile) {
                    fileInputRef.current?.click();
                  }
                }}
                disabled={disabled || isLoading || !fileAttachmentAllowed || !!attachedFile}
                whileTap={fileAttachmentAllowed && !attachedFile ? { scale: 0.92 } : undefined}
                className={`
                  w-11 h-11 rounded-full flex items-center justify-center
                  transition-all duration-300
                  ${!fileAttachmentAllowed
                    ? "bg-gray-100 dark:bg-dark-elevated text-gray-300 dark:text-gray-600 cursor-not-allowed"
                    : attachedFile
                      ? "bg-primary/10 text-primary cursor-default"
                      : "bg-gray-100 dark:bg-dark-elevated text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 hover:text-gray-700 dark:hover:text-gray-300"
                  }
                `}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              </motion.button>

              {/* Tooltip for non-Max users */}
              {!fileAttachmentAllowed && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5
                  bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded-lg
                  whitespace-nowrap opacity-0 group-hover/attach:opacity-100 pointer-events-none
                  transition-opacity duration-200 shadow-lg z-50">
                  Disponible avec le plan Max
                  <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1
                    border-4 border-transparent border-t-gray-900 dark:border-t-gray-100" />
                </div>
              )}

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
                onChange={handleFileSelect}
                className="hidden"
                aria-hidden="true"
              />
            </div>
          )}

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
                      ? "bg-primary text-white shadow-[0_0_15px_rgba(248,147,93,0.5)] animate-glow-pulse"
                      : isVoiceProcessing
                        ? "bg-primary/80 text-white"
                        : "bg-gray-100 dark:bg-dark-elevated text-text-muted hover:bg-gray-200 dark:hover:bg-gray-600 hover:text-gray-700 dark:hover:text-gray-300"
                    }
                  `}
                  title={isRecording ? "Arrêter l'enregistrement" : isVoiceProcessing ? "Traitement en cours..." : "Enregistrement vocal"}
                >
                  {isRecording ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <rect x="6" y="6" width="8" height="8" rx="1" />
                    </svg>
                  ) : isVoiceProcessing ? (
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
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
              onClick={quotaLimitReached ? openQuotaModal : handleSubmit}
              disabled={!message.trim() || isLoading || disabled || trialLimitReached}
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

      {/* Voice status bar — recording / processing / auto-send countdown */}
      <AnimatePresence>
        {(isRecording || isVoiceProcessing || autoSendCountdown > 0) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-2 px-1"
          >
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-primary/5 dark:bg-primary/10 border border-primary/10 dark:border-primary/20">
              {isRecording && (
                <>
                  <InlineVoiceWaveform isRecording={true} />
                  <span className="text-sm text-primary font-medium">Écoute en cours...</span>
                  {interimText && (
                    <span className="text-xs text-gray-400 dark:text-gray-500 truncate ml-auto italic max-w-[50%]">
                      {interimText}
                    </span>
                  )}
                </>
              )}
              {isVoiceProcessing && !isRecording && (
                <>
                  <InlineVoiceWaveform isRecording={false} isProcessing={true} />
                  <span className="text-sm text-primary font-medium">Traitement...</span>
                </>
              )}
              {autoSendCountdown > 0 && !isRecording && !isVoiceProcessing && (
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-primary font-medium">Envoi dans {autoSendCountdown}s...</span>
                    <button
                      type="button"
                      onClick={onCancelAutoSend}
                      className="text-xs text-gray-500 dark:text-gray-400 hover:text-primary transition-colors font-medium px-2 py-0.5 rounded-lg hover:bg-primary/5"
                    >
                      {t.templates.cancel}
                    </button>
                  </div>
                  <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
                      initial={{ width: "100%" }}
                      animate={{ width: "0%" }}
                      transition={{ duration: 3, ease: "linear" }}
                    />
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* File preview bar */}
      <AnimatePresence>
        {attachedFile && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-2 px-1"
          >
            <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 dark:bg-primary/10
              border border-primary/20 rounded-xl">
              {/* File type icon */}
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                {attachedFile.type === "application/pdf" ? (
                  <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              {/* File info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                  {attachedFile.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formatFileSize(attachedFile.size)}
                </p>
              </div>
              {/* Remove button */}
              <motion.button
                type="button"
                onClick={handleRemoveFile}
                whileTap={{ scale: 0.9 }}
                className="flex-shrink-0 w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700
                  flex items-center justify-center text-gray-500 dark:text-gray-400
                  hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-500
                  transition-colors duration-200"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* File error message */}
      <AnimatePresence>
        {fileError && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="mt-1 px-3 text-xs text-red-500"
          >
            {fileError}
          </motion.p>
        )}
      </AnimatePresence>

      {/* URL detection indicator */}
      <AnimatePresence>
        {/https:\/\/[^\s]+/.test(message) && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="mt-1 px-3 flex items-center gap-1.5 text-xs text-primary"
          >
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.172 13.828a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.102 1.101" />
            </svg>
            <span>Le contenu du lien sera analysé</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Helper text + character counter below input */}
      <div className="relative flex items-center justify-center mt-2 px-1">
        {/* Centered instruction or limit message */}
        {showHelperText && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {quotaLimitReached ? (
              <button
                type="button"
                onClick={openQuotaModal}
                className="text-xs text-gray-500 dark:text-gray-400 hover:text-primary transition-colors cursor-pointer"
              >
                {isFreePlanQuota ? "Quota mensuel atteint." : "Quota quotidien atteint."}{" "}
                <span className="text-primary font-medium underline">En savoir plus</span>
              </button>
            ) : trialLimitReached ? (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Limite d&apos;essai atteinte. Inscrivez-vous pour continuer.
              </p>
            ) : (
              <span className="hidden sm:flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
                <kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-dark-elevated text-gray-500 dark:text-gray-400 font-mono text-[11px] border border-gray-200 dark:border-dark-border">Entrée</kbd>
                <span>envoyer</span>
                <span className="mx-1 text-gray-300 dark:text-gray-600">·</span>
                <kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-dark-elevated text-gray-500 dark:text-gray-400 font-mono text-[11px] border border-gray-200 dark:border-dark-border">Shift</kbd>
                <span>+</span>
                <kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-dark-elevated text-gray-500 dark:text-gray-400 font-mono text-[11px] border border-gray-200 dark:border-dark-border">Entrée</kbd>
                <span>nouvelle ligne</span>
              </span>
            )}
          </motion.div>
        )}

        {/* Character counter - absolute right so it doesn't push the centered text */}
        {showCharacterCount && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className={`
              absolute right-1 text-xs font-medium
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
