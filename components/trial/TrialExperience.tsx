"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useChat } from "@/hooks/useChat";
import { useLanguage } from "@/contexts/LanguageContext";
import AIResponsePair from "@/components/chat/AIResponsePair";
import { TypingIndicator } from "@/components/chat/ChatMessage";
import toast from "@/components/ui/Toast";

const PLACEHOLDER_EXAMPLES = [
  "Un post sur le leadership...",
  "Une astuce productivité...",
  "Mon parcours professionnel...",
  "Une leçon apprise récemment...",
];

interface TrialExperienceProps {
  onGenerationComplete?: () => void;
  className?: string;
}

export default function TrialExperience({
  onGenerationComplete,
  className = "",
}: TrialExperienceProps) {
  const { t } = useLanguage();
  const [inputValue, setInputValue] = useState("");
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    isLoading,
    isStreaming,
    error,
    generate,
    generationCount,
    canGenerate,
  } = useChat({
    isGuest: true,
  });

  // Rotating placeholder
  useEffect(() => {
    if (isFocused || inputValue.length > 0) return;
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % PLACEHOLDER_EXAMPLES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [isFocused, inputValue.length]);

  // Auto-resize textarea
  const resizeTextarea = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const minHeight = 56;
      const maxHeight = 150;
      const scrollHeight = textareaRef.current.scrollHeight;
      const newHeight = Math.max(minHeight, Math.min(scrollHeight, maxHeight));
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, []);

  useEffect(() => {
    resizeTextarea();
  }, [inputValue, resizeTextarea]);

  // Scroll to results when generation starts
  useEffect(() => {
    if (isLoading && resultsRef.current) {
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 300);
    }
  }, [isLoading]);

  // Notify when generation completes
  useEffect(() => {
    if (hasGenerated && !isLoading && !isStreaming && messages.length > 0) {
      onGenerationComplete?.();
    }
  }, [hasGenerated, isLoading, isStreaming, messages.length, onGenerationComplete]);

  const handleSubmit = async () => {
    if (!inputValue.trim() || isLoading || isStreaming) return;
    if (!canGenerate) {
      toast.error("Limite atteinte. Connectez-vous pour continuer !");
      return;
    }
    const prompt = inputValue.trim();
    setInputValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "56px";
    }
    setHasGenerated(true);
    await generate(prompt);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleCopy = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success(t.ui.copied);
    } catch {
      toast.error(t.chat.copyError);
    }
  };

  // Get AI response pairs from messages
  const getResponsePairs = () => {
    const pairs: Array<{
      storytelling: { id: string; content: string; isStreaming?: boolean };
      business: { id: string; content: string; isStreaming?: boolean };
      prompt: string;
    }> = [];

    let i = 0;
    while (i < messages.length) {
      const message = messages[i];
      if (message.type === "user") {
        const prompt = message.content;
        const storytelling = messages[i + 1];
        const business = messages[i + 2];
        if (storytelling?.type === "ai" && business?.type === "ai") {
          pairs.push({
            prompt,
            storytelling: {
              id: storytelling.id,
              content: storytelling.content,
              isStreaming: storytelling.isStreaming,
            },
            business: {
              id: business.id,
              content: business.content,
              isStreaming: business.isStreaming,
            },
          });
          i += 3;
        } else {
          i++;
        }
      } else {
        i++;
      }
    }
    return pairs;
  };

  const responsePairs = getResponsePairs();

  return (
    <div className={`w-full h-full flex flex-col ${className}`}>
      {/* Results area - scrollable */}
      <div ref={resultsRef} className="flex-1 overflow-y-auto pb-4">
        <AnimatePresence mode="popLayout">
          {/* Welcome message when no messages */}
          {messages.length === 0 && !isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-16 text-center"
            >
              <div className="w-16 h-16 mb-6 bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl flex items-center justify-center">
                <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">Créez votre post LinkedIn</h2>
              <p className="text-text-secondary max-w-sm">Décrivez votre idée et recevez 2 versions optimisées en quelques secondes.</p>
            </motion.div>
          )}

          {/* Loading indicator */}
          {isLoading && !isStreaming && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-2xl mx-auto"
            >
              <TypingIndicator />
            </motion.div>
          )}

          {/* Response pairs */}
          {responsePairs.map((pair, index) => (
            <motion.div
              key={pair.storytelling.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="max-w-3xl mx-auto mb-8"
            >
              {/* User prompt */}
              <div className="flex justify-end mb-4">
                <div className="max-w-[80%] px-4 py-3 bg-primary/10 border border-primary/20 rounded-2xl rounded-br-md">
                  <p className="text-white text-sm">{pair.prompt}</p>
                </div>
              </div>

              {/* AI responses */}
              <AIResponsePair
                storytellingResponse={{
                  id: pair.storytelling.id,
                  content: pair.storytelling.content,
                  variant: "storytelling",
                  timestamp: new Date(),
                  isStreaming: pair.storytelling.isStreaming,
                }}
                businessResponse={{
                  id: pair.business.id,
                  content: pair.business.content,
                  variant: "business",
                  timestamp: new Date(),
                  isStreaming: pair.business.isStreaming,
                }}
                onCopy={handleCopy}
                index={index}
              />
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Error message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto p-4 bg-error/10 border border-error/30 rounded-xl text-error text-center text-sm"
          >
            {error}
          </motion.div>
        )}
      </div>

      {/* Input area - fixed at bottom */}
      <div className="shrink-0 pt-4">
        <div
          className={`
            relative bg-dark-card border rounded-2xl shadow-elevated
            transition-all duration-300 ease-out
            ${canGenerate
              ? "border-dark-border focus-within:border-primary/50 focus-within:shadow-glow"
              : "border-error/20 opacity-75"
            }
          `}
        >
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={
              !canGenerate
                ? "Limite atteinte - Connectez-vous pour continuer"
                : PLACEHOLDER_EXAMPLES[placeholderIndex]
            }
            disabled={isLoading || isStreaming || !canGenerate}
            rows={1}
            className="
              w-full bg-transparent text-white text-base
              placeholder-text-muted resize-none focus:outline-none
              disabled:opacity-50 min-h-[56px] max-h-[150px]
              py-[18px] px-5 pr-16 leading-5
            "
          />

          {/* Submit button */}
          <button
            onClick={handleSubmit}
            disabled={!inputValue.trim() || isLoading || isStreaming || !canGenerate}
            className={`
              absolute right-3 bottom-3 w-10 h-10 rounded-xl
              flex items-center justify-center transition-all duration-200
              ${inputValue.trim() && !isLoading && !isStreaming && canGenerate
                ? "bg-gradient-to-r from-primary to-primary-hover text-white shadow-glow hover:shadow-lg"
                : "bg-dark-border text-text-muted"
              }
              disabled:opacity-50 active:scale-95
            `}
          >
            {isLoading || isStreaming ? (
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            )}
          </button>
        </div>

        {/* Quick suggestions */}
        {messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex flex-wrap justify-center gap-2 mt-4"
          >
            {["Leadership", "Productivite", "Carriere", "Innovation"].map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => setInputValue(`Un post sur ${suggestion.toLowerCase()}`)}
                disabled={!canGenerate}
                className="
                  px-3 py-1.5 text-sm bg-dark-elevated hover:bg-dark-hover
                  border border-dark-border hover:border-primary/30
                  text-text-secondary hover:text-white rounded-lg
                  transition-all duration-200 disabled:opacity-50
                "
              >
                {suggestion}
              </button>
            ))}
          </motion.div>
        )}

        {/* Generation counter */}
        {!canGenerate && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-error text-sm mt-3"
          >
            Vous avez utilise vos 2 essais gratuits. Connectez-vous pour continuer !
          </motion.p>
        )}
      </div>
    </div>
  );
}
