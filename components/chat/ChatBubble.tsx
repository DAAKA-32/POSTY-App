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
            ? "bg-primary text-white rounded-br-md shadow-primary/20"
            : "bg-dark-card border border-dark-border text-gray-100 rounded-bl-md shadow-black/30"
          }
        `}
      >
        {isTyping ? (
          <div className="flex items-center gap-1 py-1">
            <span className="w-2 h-2 bg-gray-400 rounded-full typing-dot" />
            <span className="w-2 h-2 bg-gray-400 rounded-full typing-dot" />
            <span className="w-2 h-2 bg-gray-400 rounded-full typing-dot" />
          </div>
        ) : (
          <div className="text-sm leading-relaxed whitespace-pre-wrap">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
