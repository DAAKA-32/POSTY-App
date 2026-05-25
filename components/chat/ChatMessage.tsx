"use client";

import { useState, memo } from "react";
import { motion } from "framer-motion";
import Button from "@/components/ui/Button";
import { LinkedInIcon } from "@/components/linkedin/LinkedInConnectButton";
import { useHapticFeedback } from "@/hooks/ui/useHapticFeedback";
import { useLanguage } from "@/contexts/LanguageContext";
import toast from "@/components/ui/Toast";

// Premium animation easing
const smoothEase = [0.25, 0.1, 0.25, 1] as const;

// Static variant styles (outside component to avoid re-creation)
const variantStyles = {
  storytelling: {
    badge: "bg-accent/20 text-accent",
    label: "Storytelling",
  },
  business: {
    badge: "bg-primary/20 text-primary",
    label: "Business",
  },
};

// Helper function to format timestamp
function formatTimeAgo(date: Date, ui: { justNow: string; minutesAgo: string; hoursAgo: string; daysAgo: string; timeLocale: string }): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return ui.justNow;
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return ui.minutesAgo.replace("{n}", String(diffInMinutes));
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return ui.hoursAgo.replace("{n}", String(diffInHours));
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return ui.daysAgo.replace("{n}", String(diffInDays));
  }

  // For older dates, show the actual date
  return date.toLocaleDateString(ui.timeLocale, { day: 'numeric', month: 'short' });
}

export interface ChatMessageProps {
  type: "user" | "ai";
  content: string;
  timestamp?: Date;
  /** @deprecated No longer displayed */
  userName?: string;
  /** @deprecated No longer displayed */
  userInitial?: string;
  /** @deprecated No longer displayed */
  userPhotoURL?: string;
  variant?: "storytelling" | "business";
  showActions?: boolean;
  onCopy?: () => void;
  onPublishToLinkedIn?: () => void;
  index?: number;
  isStreaming?: boolean;
}

const ChatMessage = memo(function ChatMessage({
  type,
  content,
  timestamp,
  variant,
  showActions = false,
  onCopy,
  onPublishToLinkedIn,
  index = 0,
  isStreaming = false,
}: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const { trigger: triggerHaptic } = useHapticFeedback();
  const { t } = useLanguage();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      triggerHaptic("success");
      toast.success(t.ui.copied);
      setTimeout(() => setCopied(false), 2000);
      onCopy?.();
    } catch {
      triggerHaptic("error");
      toast.error(t.ui.copyMessage);
    }
  };

  const isUser = type === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.25,
        delay: index * 0.05,
        ease: smoothEase,
      }}
      className={`flex ${isUser ? "justify-end" : "flex-row gap-3"}`}
    >
      {/* Posty avatar - AI messages only */}
      {!isUser && (
        <div className="relative group/avatar">
          <div className="absolute -inset-1 bg-gradient-to-br from-primary/40 to-accent/40 rounded-xl opacity-0 group-hover/avatar:opacity-100 blur-md transition-opacity duration-300" />
          <div className="relative w-8 h-8 shrink-0 rounded-xl overflow-hidden shadow-md ring-1 ring-gray-200/50 dark:ring-dark-border/50">
            <img
              src="/logo.png"
              alt="Posty"
              className="w-full h-full object-contain"
            />
          </div>
        </div>
      )}

      {/* Message bubble */}
      <div
        className={`
          flex flex-col max-w-[85%] lg:max-w-[70%] group/message
          ${isUser ? "items-end" : "items-start"}
        `}
      >
        {/* Sender label + timestamp — AI messages only.
            User prompts no longer show "Just now" above them (cleaner). */}
        {!isUser && (
          <div className="flex items-center gap-2 mb-1.5 px-1">
            <span className="text-xs font-bold tracking-wider bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_auto] animate-shimmer-slow bg-clip-text text-transparent">
              POSTY
            </span>
            {timestamp && (
              <span className="text-2xs text-text-muted/60">
                {formatTimeAgo(timestamp, t.ui)}
              </span>
            )}
          </div>
        )}

        {/* Bubble — ChatGPT-style border + soft fill for user prompts */}
        <div
          className={`
            relative px-4 py-3 rounded-2xl transition-all duration-300 w-fit
            ${isUser
              ? "bg-gray-50 dark:bg-dark-elevated/80 border border-gray-200/80 dark:border-dark-border/70 text-gray-900 dark:text-white rounded-br-sm shadow-[0_1px_2px_-1px_rgba(15,23,42,0.06)]"
              : "bg-gradient-to-br from-white to-gray-50 dark:from-dark-card dark:to-dark-elevated border border-gray-200/80 dark:border-dark-border/80 text-text-primary rounded-bl-sm shadow-md hover:shadow-lg dark:shadow-none"
            }
          `}
        >
          {/* Quick copy button on hover - for AI messages only */}
          {!isUser && !isStreaming && (
            <motion.button
              onClick={handleCopy}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className={`
                absolute -right-2 -top-2
                w-7 h-7 rounded-xl
                bg-white dark:bg-dark-elevated
                border border-gray-200 dark:border-dark-border
                flex items-center justify-center
                opacity-0 group-hover/message:opacity-100
                hover:border-primary/50 hover:shadow-glow
                transition-all duration-300
                shadow-md z-10
              `}
              title={t.ui.copy}
            >
              {copied ? (
                <motion.svg
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-3.5 h-3.5 text-success"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </motion.svg>
              ) : (
                <svg className="w-3.5 h-3.5 text-text-muted hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </motion.button>
          )}

          {/* Variant badge for AI messages */}
          {!isUser && variant && (
            <span
              className={`
                inline-block px-2 py-0.5 text-xs font-medium rounded-full mb-2
                ${variantStyles[variant].badge}
              `}
            >
              {variantStyles[variant].label}
            </span>
          )}

          {/* Content — notranslate so Chrome/Google Translate never rewrites
              AI-generated or user-authored message bodies. */}
          <div
            className="notranslate whitespace-pre-wrap break-words overflow-wrap-anywhere text-sm leading-relaxed"
            translate="no"
          >
            {content}
            {isStreaming && (
              <motion.span
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
                className="inline-block w-0.5 h-4 bg-current ml-0.5 align-middle"
              />
            )}
          </div>
        </div>

        {/* Actions for AI messages - hidden while streaming */}
        {!isUser && showActions && !isStreaming && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.2, ease: smoothEase }}
            className="flex gap-2 mt-2"
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="text-xs px-3 py-1.5 h-auto"
            >
              {copied ? (
                <>
                  <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {t.ui.copied}
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  {t.ui.copy}
                </>
              )}
            </Button>
            {onPublishToLinkedIn && (
              <Button
                size="sm"
                onClick={onPublishToLinkedIn}
                className="text-xs px-3 py-1.5 h-auto bg-[#0A66C2] hover:bg-[#004182] border-none"
              >
                <LinkedInIcon className="w-3.5 h-3.5 mr-1" />
                {t.ui.publish}
              </Button>
            )}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
});

export default ChatMessage;

// Typing indicator component - Premium version
export function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.3, ease: smoothEase }}
      className="flex gap-3"
    >
      {/* Posty Avatar - with premium glow */}
      <div className="relative">
        <motion.div
          className="absolute -inset-1 bg-gradient-to-br from-primary/30 to-accent/30 rounded-xl blur-md"
          animate={{ opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="relative w-8 h-8 shrink-0 rounded-xl overflow-hidden shadow-md ring-1 ring-gray-200/50 dark:ring-dark-border/50">
          <img
            src="/logo.png"
            alt="Posty"
            className="w-full h-full object-contain"
          />
        </div>
      </div>

      {/* Typing bubble */}
      <div className="flex flex-col items-start">
        <span className="text-xs font-bold tracking-wider text-gray-900 dark:text-gray-100 mb-1.5 px-1">
          POSTY
        </span>
        <motion.div
          className="px-5 py-3 bg-gradient-to-br from-white to-gray-50 dark:from-dark-card dark:to-dark-elevated border border-gray-200/80 dark:border-dark-border/80 rounded-2xl rounded-bl-sm shadow-md"
          animate={{ boxShadow: ["0 4px 6px rgba(248, 147, 93, 0.1)", "0 4px 12px rgba(248, 147, 93, 0.2)", "0 4px 6px rgba(248, 147, 93, 0.1)"] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="flex gap-2 items-center">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                animate={{
                  y: [0, -6, 0],
                  scale: [1, 1.2, 1],
                  opacity: [0.4, 1, 0.4],
                }}
                transition={{
                  duration: 0.8,
                  repeat: Infinity,
                  delay: i * 0.15,
                  ease: "easeInOut",
                }}
                className="w-2 h-2 bg-gradient-to-br from-primary to-accent rounded-full shadow-sm"
              />
            ))}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

/* ── Phase icon map ────────────────────────────────────────────────── */
const PHASE_ICONS: Record<string, React.ReactNode> = {
  analyzing: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  ),
  searching: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  preparing: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
    </svg>
  ),
  writing: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
  ),
};

/**
 * GenerationLoader — Multi-step animated loader that shows the current generation phase.
 * Replaces TypingIndicator when phase info is available from the server.
 */
export function GenerationLoader({ phase, message }: { phase: string; message: string }) {
  const icon = PHASE_ICONS[phase] || PHASE_ICONS.analyzing;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.3, ease: smoothEase }}
      className="flex gap-3"
    >
      {/* Posty Avatar - with premium glow */}
      <div className="relative">
        <motion.div
          className="absolute -inset-1 bg-gradient-to-br from-primary/30 to-accent/30 rounded-xl blur-md"
          animate={{ opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="relative w-8 h-8 shrink-0 rounded-xl overflow-hidden shadow-md ring-1 ring-gray-200/50 dark:ring-dark-border/50">
          <img src="/logo.png" alt="Posty" className="w-full h-full object-contain" />
        </div>
      </div>

      {/* Phase indicator */}
      <div className="flex flex-col items-start">
        <span className="text-xs font-bold tracking-wider text-gray-900 dark:text-gray-100 mb-1.5 px-1">
          POSTY
        </span>
        <motion.div
          className="px-4 py-2.5 bg-gradient-to-br from-white to-gray-50 dark:from-dark-card dark:to-dark-elevated border border-gray-200/80 dark:border-dark-border/80 rounded-2xl rounded-bl-sm shadow-md"
          animate={{ boxShadow: ["0 4px 6px rgba(248, 147, 93, 0.1)", "0 4px 12px rgba(248, 147, 93, 0.2)", "0 4px 6px rgba(248, 147, 93, 0.1)"] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="flex items-center gap-2.5">
            {/* Animated icon */}
            <motion.div
              className="text-primary"
              animate={{ rotate: phase === "searching" ? [0, 360] : 0, scale: [1, 1.1, 1] }}
              transition={{
                rotate: { duration: 2, repeat: Infinity, ease: "linear" },
                scale: { duration: 1.2, repeat: Infinity, ease: "easeInOut" },
              }}
            >
              {icon}
            </motion.div>

            {/* Phase text */}
            <motion.span
              key={message}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-xs font-medium text-gray-600 dark:text-gray-300"
            >
              {message}
            </motion.span>

            {/* Animated dots */}
            <div className="flex gap-1 ml-0.5">
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1, repeat: Infinity, delay: i * 0.2, ease: "easeInOut" }}
                  className="w-1 h-1 bg-primary/60 rounded-full"
                />
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
