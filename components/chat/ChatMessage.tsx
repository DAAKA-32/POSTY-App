"use client";

import { useState, memo } from "react";
import { motion } from "framer-motion";
import Button from "@/components/ui/Button";
import { LinkedInIcon } from "@/components/linkedin/LinkedInConnectButton";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";
import toast from "@/components/ui/Toast";

// Premium animation easing
const smoothEase = [0.25, 0.1, 0.25, 1] as const;

// Helper function to format timestamp
function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return "À l'instant";
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `Il y a ${diffInMinutes} min`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `Il y a ${diffInHours}h`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `Il y a ${diffInDays}j`;
  }

  // For older dates, show the actual date
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export interface ChatMessageProps {
  type: "user" | "ai";
  content: string;
  timestamp?: Date;
  userName?: string;
  userInitial?: string;
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
  userName,
  userInitial,
  userPhotoURL,
  variant,
  showActions = false,
  onCopy,
  onPublishToLinkedIn,
  index = 0,
  isStreaming = false,
}: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const [imageError, setImageError] = useState(false);
  const { trigger: triggerHaptic } = useHapticFeedback();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      triggerHaptic("success");
      toast.success("Copié !");
      setTimeout(() => setCopied(false), 2000);
      onCopy?.();
    } catch {
      triggerHaptic("error");
      toast.error("Erreur lors de la copie");
    }
  };

  const isUser = type === "user";

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

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.25,
        delay: index * 0.05,
        ease: smoothEase,
      }}
      className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      {/* Avatar */}
      {isUser ? (
        // User avatar - photo or initial with premium ring
        userPhotoURL && !imageError ? (
          <div className="relative shrink-0">
            <img
              src={userPhotoURL}
              alt={userName || "User"}
              className="w-8 h-8 rounded-xl object-cover ring-1 ring-primary/20 shadow-sm"
              onError={() => setImageError(true)}
            />
          </div>
        ) : (
          <div className="relative shrink-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary via-primary-hover to-accent flex items-center justify-center shadow-sm ring-1 ring-primary/20">
              <span className="text-white font-bold text-sm">
                {userInitial || "U"}
              </span>
            </div>
          </div>
        )
      ) : (
        // Posty avatar - official logo with premium glow
        <div className="relative group/avatar">
          <div className="absolute -inset-1 bg-gradient-to-br from-primary/40 to-accent/40 rounded-xl opacity-0 group-hover/avatar:opacity-100 blur-md transition-opacity duration-300" />
          <div className="relative w-8 h-8 rounded-xl overflow-hidden shrink-0 shadow-md ring-1 ring-gray-200/50 dark:ring-dark-border/50">
            <img
              src="/logo.jpg"
              alt="Posty"
              className="w-full h-full object-cover"
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
        {/* Sender name and timestamp */}
        <div className="flex items-center gap-2 mb-1.5 px-1">
          {isUser ? (
            <span className="text-xs font-medium text-text-secondary">
              {userName || "Vous"}
            </span>
          ) : (
            <span className="text-xs font-bold tracking-wider bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_auto] animate-shimmer-slow bg-clip-text text-transparent">
              POSTY
            </span>
          )}
          {timestamp && (
            <span className="text-2xs text-text-muted/60">
              {formatTimeAgo(timestamp)}
            </span>
          )}
        </div>

        {/* Bubble */}
        <div
          className={`
            relative px-4 py-3 rounded-2xl transition-all duration-300 w-fit
            ${isUser
              ? "bg-gradient-to-br from-primary via-primary-hover to-accent/80 text-white rounded-br-sm shadow-md shadow-primary/15"
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
              title="Copier"
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

          {/* Content */}
          <div className="whitespace-pre-wrap break-words overflow-wrap-anywhere text-sm leading-relaxed">
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
                  Copié !
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copier
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
                Publier
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
      initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      exit={{ opacity: 0, y: -4, filter: "blur(4px)" }}
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
        <div className="relative w-8 h-8 rounded-xl overflow-hidden shrink-0 shadow-md ring-1 ring-gray-200/50 dark:ring-dark-border/50">
          <img
            src="/logo.jpg"
            alt="Posty"
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* Typing bubble */}
      <div className="flex flex-col items-start">
        <span className="text-xs font-bold tracking-wider bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_auto] animate-shimmer-slow bg-clip-text text-transparent mb-1.5 px-1">
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
