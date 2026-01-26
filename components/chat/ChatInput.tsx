"use client";

import { useState, useRef, useEffect } from "react";

interface ChatInputProps {
  onSubmit: (message: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  disabled?: boolean;
}

export default function ChatInput({
  onSubmit,
  isLoading = false,
  placeholder = "Décrivez le post LinkedIn que vous souhaitez créer...",
  disabled = false,
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        200
      )}px`;
    }
  }, [message]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isLoading && !disabled) {
      onSubmit(message.trim());
      setMessage("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          disabled={disabled || isLoading}
          rows={1}
          className={`
            w-full
            bg-white dark:bg-dark-card
            text-gray-900 dark:text-white text-base
            placeholder-gray-500 dark:placeholder-gray-400
            resize-none
            border-2 rounded-[28px]
            transition-all duration-200 ease-out
            disabled:opacity-50
            min-h-[56px]
            max-h-[200px]
            py-4 pl-5 pr-16
            leading-6
            focus:outline-none
            [&::placeholder]:whitespace-nowrap [&::placeholder]:overflow-hidden [&::placeholder]:text-ellipsis [&::placeholder]:block
            ${isFocused
              ? "border-gray-900 dark:border-white"
              : "border-gray-900 dark:border-gray-700 hover:border-black dark:hover:border-gray-500"
            }
          `}
        />
        <button
          type="submit"
          disabled={!message.trim() || isLoading || disabled}
          className={`
            absolute right-3 bottom-3
            w-10 h-10 rounded-full
            flex items-center justify-center
            transition-all duration-200
            ${message.trim() && !isLoading && !disabled
              ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-black dark:hover:bg-gray-100"
              : "bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500"
            }
            disabled:cursor-not-allowed
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
        </button>
      </div>
      <p className="hidden sm:block text-xs text-gray-500 dark:text-gray-400 mt-2.5 text-center">
        Appuyez sur Entrée pour envoyer, Shift+Entrée pour un saut de ligne
      </p>
    </form>
  );
}
