"use client";

import { useEffect, useState } from "react";

interface TypingIndicatorProps {
  isTyping: boolean;
  variant?: "dots" | "pulse" | "wave";
  className?: string;
  label?: string;
}

export default function TypingIndicator({
  isTyping,
  variant = "dots",
  className = "",
  label = "POSTY ecrit",
}: TypingIndicatorProps) {
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
        bg-dark-elevated border border-dark-border rounded-2xl rounded-bl-md
        transition-all duration-300 ease-out
        ${isTyping ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}
        ${className}
      `}
    >
      {/* Avatar */}
      <div className="w-6 h-6 bg-gradient-to-br from-primary to-accent rounded-md flex items-center justify-center shrink-0">
        <span className="text-white font-bold text-xs">P</span>
      </div>

      {/* Label */}
      <span className="text-text-muted text-sm">{label}</span>

      {/* Dots animation */}
      {variant === "dots" && (
        <div className="flex items-center gap-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce"
              style={{
                animationDelay: `${i * 150}ms`,
                animationDuration: "600ms",
              }}
            />
          ))}
        </div>
      )}

      {/* Pulse animation */}
      {variant === "pulse" && (
        <div className="flex items-center gap-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-2 h-2 bg-primary rounded-full animate-pulse"
              style={{
                animationDelay: `${i * 200}ms`,
              }}
            />
          ))}
        </div>
      )}

      {/* Wave animation */}
      {variant === "wave" && (
        <div className="flex items-end gap-0.5 h-4">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className="w-1 bg-primary rounded-full animate-wave"
              style={{
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
