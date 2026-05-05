"use client";

import { ReactNode } from "react";

interface ChatBubbleProps {
  role: "user" | "assistant";
  children?: ReactNode;
  isTyping?: boolean;
}

export default function ChatBubble({
  role,
  children,
  isTyping = false,
}: ChatBubbleProps) {
  const isUser = role === "user";

  return (
    <div
      className={`
        flex w-full animate-fade-in-up
        ${isUser ? "justify-end" : "justify-start"}
      `}
    >
      <div
        className={`
          max-w-[85%] sm:max-w-[75%]
          rounded-2xl px-4 py-3
          shadow-md
          ${isUser
            ? "bg-gray-100 dark:bg-dark-elevated text-gray-900 dark:text-white rounded-br-md"
            : "bg-dark-card border border-dark-border text-text-primary rounded-bl-md shadow-black/30"
          }
        `}
      >
        {isTyping ? (
          <div className="flex items-center gap-1 py-1">
            <span className="w-2 h-2 bg-text-muted rounded-full typing-dot" />
            <span className="w-2 h-2 bg-text-muted rounded-full typing-dot" />
            <span className="w-2 h-2 bg-text-muted rounded-full typing-dot" />
          </div>
        ) : (
          <div className="text-sm leading-relaxed whitespace-pre-wrap break-words overflow-wrap-anywhere">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
