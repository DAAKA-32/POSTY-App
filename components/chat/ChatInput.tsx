"use client";

import { useState, useRef, useEffect } from "react";
import Button from "@/components/ui/Button";

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
      <div className="relative flex items-end gap-2 p-4 bg-dark-card border border-dark-border rounded-xl">
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
            text-white
            placeholder-gray-500
            resize-none
            focus:outline-none
            disabled:opacity-50
            min-h-[24px]
            max-h-[200px]
          "
        />
        <Button
          type="submit"
          disabled={!message.trim() || isLoading || disabled}
          isLoading={isLoading}
          size="sm"
          className="shrink-0"
        >
          {isLoading ? (
            "Génération..."
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
        </Button>
      </div>
      <p className="text-xs text-gray-500 mt-2 text-center">
        Appuyez sur Entrée pour envoyer, Shift+Entrée pour un saut de ligne
      </p>
    </form>
  );
}
