"use client";

import { useEffect, useState } from "react";

// Contextual messages that show what POSTY is doing
export const TYPING_CONTEXTS = {
  default: "POSTY réfléchit",
  analyzing: "J'analyse ton idée",
  creating: "Je crée deux versions pour toi",
  storytelling: "Je travaille sur la version storytelling",
  business: "Je travaille sur la version business",
  improving: "J'améliore ton post",
  adapting: "J'adapte pour cette plateforme",
  thinking: "Je réfléchis à la meilleure approche",
  finalizing: "Je peaufine les détails",
} as const;

export type TypingContext = keyof typeof TYPING_CONTEXTS;

interface TypingIndicatorProps {
  isTyping: boolean;
  variant?: "dots" | "pulse" | "wave";
  className?: string;
  label?: string;
  /** Contextual message key for intelligent feedback */
  context?: TypingContext;
  /** Override with custom message */
  customMessage?: string;
}

export default function TypingIndicator({
  isTyping,
  variant = "dots",
  className = "",
  label,
  context = "default",
  customMessage,
}: TypingIndicatorProps) {
  // Use custom message, or context message, or label as fallback
  const displayLabel = customMessage || TYPING_CONTEXTS[context] || label || TYPING_CONTEXTS.default;
  const [visible, setVisible] = useState(false);

  // Smooth appear/disappear
  useEffect(() => {
    if (isTyping) {
      setVisible(true);
    } else {
      const timer = setTimeout(() => setVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isTyping]);

  if (!visible) return null;

  return (
    <div
      className={`
        flex items-center gap-2 px-4 py-3
        bg-dark-elevated dark:bg-dark-elevated border border-dark-border rounded-2xl rounded-bl-md
        transition-all duration-300 ease-out
        ${isTyping ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}
        ${className}
      `}
    >
      {/* Avatar */}
      <div className="w-6 h-6 rounded-md overflow-hidden flex items-center justify-center shrink-0">
        <img
          src="/logo.jpg"
          alt="Posty Logo"
          className="w-full h-full object-contain"
        />
      </div>

      {/* Label - contextual message */}
      <span className="text-text-muted text-sm">{displayLabel}</span>

      {/* Dots animation - Premium gradient */}
      {variant === "dots" && (
        <div className="flex items-center gap-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full animate-bounce"
              style={{
                background: "linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)",
                boxShadow: "0 0 6px rgba(232, 147, 77, 0.4)",
                animationDelay: `${i * 150}ms`,
                animationDuration: "600ms",
              }}
            />
          ))}
        </div>
      )}

      {/* Pulse animation - Premium gradient */}
      {variant === "pulse" && (
        <div className="flex items-center gap-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-2 h-2 rounded-full animate-pulse"
              style={{
                background: "linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)",
                boxShadow: "0 0 8px rgba(232, 147, 77, 0.4)",
                animationDelay: `${i * 200}ms`,
              }}
            />
          ))}
        </div>
      )}

      {/* Wave animation - Premium gradient */}
      {variant === "wave" && (
        <div className="flex items-end gap-0.5 h-4">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className="w-1 rounded-full animate-wave"
              style={{
                background: "linear-gradient(180deg, var(--primary) 0%, var(--accent) 100%)",
                animationDelay: `${i * 100}ms`,
                height: "4px",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Inline typing indicator for chat bubbles
export function InlineTyping({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1 h-1 bg-current rounded-full animate-bounce opacity-60"
          style={{
            animationDelay: `${i * 150}ms`,
            animationDuration: "600ms",
          }}
        />
      ))}
    </span>
  );
}

// Skeleton loader for chat messages
export function MessageSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="flex gap-3 animate-pulse">
      <div className="w-8 h-8 bg-dark-border rounded-lg shrink-0" />
      <div className="flex-1 space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className="h-3 bg-dark-border rounded"
            style={{ width: `${Math.max(40, 100 - i * 20)}%` }}
          />
        ))}
      </div>
    </div>
  );
}
