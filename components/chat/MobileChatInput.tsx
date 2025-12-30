"use client";

import { useState, useRef, useEffect } from "react";

interface MobileChatInputProps {
  onSubmit: (message: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  disabled?: boolean;
}

export default function MobileChatInput({
  onSubmit,
  isLoading = false,
  placeholder = "Ecrivez votre idee...",
  disabled = false,
}: MobileChatInputProps) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        120
      )}px`;
    }
  }, [message]);

  const handleSubmit = () => {
    if (message.trim() && !isLoading && !disabled) {
      onSubmit(message.trim());
      setMessage("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="fixed bottom-16 left-0 right-0 z-40 bg-dark-bg input-shadow border-t border-dark-border">
      <div className="max-w-2xl mx-auto p-3">
        <div className="flex items-end gap-2 bg-dark-card border border-dark-border rounded-2xl p-2">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || isLoading}
            rows={1}
            className="
              flex-1
              bg-transparent
              text-white text-base
              placeholder-gray-500
              resize-none
              focus:outline-none
              disabled:opacity-50
              min-h-[24px]
              max-h-[120px]
              py-2 px-2
            "
          />
          <button
            onClick={handleSubmit}
            disabled={!message.trim() || isLoading || disabled}
            className={`
              w-10 h-10 rounded-xl
              flex items-center justify-center
              transition-smooth
              ${message.trim() && !isLoading && !disabled
                ? "bg-primary text-white"
                : "bg-dark-border text-gray-500"
              }
              disabled:opacity-50
            `}
          >
            {isLoading ? (
              <svg
                className="w-5 h-5 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            ) : (
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            )}
          </button>
        </div>
      </div>
      {/* Safe area spacer */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </div>
  );
}
