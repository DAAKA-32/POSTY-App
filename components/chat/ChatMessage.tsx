"use client";

import { useState, memo } from "react";
import { motion } from "framer-motion";
import Button from "@/components/ui/Button";
import { LinkedInIcon } from "@/components/linkedin/LinkedInConnectButton";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";
import toast from "react-hot-toast";

// Helper function to format timestamp
function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return "A l'instant";
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
  variant,
  showActions = false,
  onCopy,
  onPublishToLinkedIn,
  index = 0,
  isStreaming = false,
}: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const { trigger: triggerHaptic } = useHapticFeedback();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      triggerHaptic("success");
      toast.success("Copie !");
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
      badge: "bg-purple-500/20 text-purple-400",
      label: "Storytelling",
    },
    business: {
      badge: "bg-blue-500/20 text-blue-400",
      label: "Business",
    },
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.3,
        delay: index * 0.1,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      className={`flex gap-3 gpu-layer ${isUser ? "flex-row-reverse" : "flex-row"}`}
      style={{ willChange: "transform, opacity" }}
    >
      {/* Avatar */}
      <div
        className={`
          w-8 h-8 rounded-lg flex items-center justify-center shrink-0
          ${isUser
            ? "bg-gradient-to-br from-primary/20 to-accent/20"
            : "bg-gradient-to-br from-primary to-accent"
          }
        `}
      >
        {isUser ? (
          <span className="text-primary font-semibold text-sm">
            {userInitial || "U"}
          </span>
        ) : (
          <span className="text-white font-bold text-sm">T</span>
        )}
      </div>

      {/* Message bubble */}
      <div
        className={`
          flex flex-col max-w-[85%] lg:max-w-[70%] group/message
          ${isUser ? "items-end" : "items-start"}
        `}
      >
        {/* Sender name and timestamp */}
        <div className="flex items-center gap-2 mb-1 px-1">
          <span className="text-xs text-text-muted">
            {isUser ? (userName || "Vous") : "POSTY"}
          </span>
          {timestamp && (
            <span className="text-xs text-text-muted/60">
              {formatTimeAgo(timestamp)}
            </span>
          )}
        </div>

        {/* Bubble */}
        <div
          className={`
            relative px-4 py-3 rounded-lg
            ${isUser
              ? "bg-gradient-to-br from-primary to-primary-hover text-white rounded-br-md"
              : "bg-dark-card border border-dark-border text-gray-200 rounded-bl-md"
            }
          `}
        >
          {/* Quick copy button on hover - for AI messages only */}
          {!isUser && !isStreaming && (
            <button
              onClick={handleCopy}
              className={`
                absolute -right-2 -top-2
                w-7 h-7 rounded-lg
                bg-dark-elevated border border-dark-border
                flex items-center justify-center
                opacity-0 group-hover/message:opacity-100
                hover:bg-dark-hover hover:border-primary/50
                transition-all duration-200
                shadow-lg z-10
              `}
              title="Copier"
            >
              {copied ? (
                <svg className="w-3.5 h-3.5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </button>
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
          <div className="whitespace-pre-wrap text-sm leading-relaxed">
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
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
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
                  Copie !
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

// Typing indicator component
export function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex gap-3"
    >
      {/* Avatar */}
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0">
        <span className="text-white font-bold text-sm">T</span>
      </div>

      {/* Typing bubble */}
      <div className="flex flex-col items-start">
        <span className="text-xs text-text-muted mb-1 px-1">POSTY</span>
        <div className="px-4 py-3 bg-dark-card border border-dark-border rounded-lg rounded-bl-md">
          <div className="flex gap-1.5">
            <motion.span
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
              className="w-2 h-2 bg-primary rounded-full"
            />
            <motion.span
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: 0.15 }}
              className="w-2 h-2 bg-primary rounded-full"
            />
            <motion.span
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: 0.3 }}
              className="w-2 h-2 bg-primary rounded-full"
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
