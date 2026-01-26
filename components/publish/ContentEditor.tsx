"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";

interface ContentEditorProps {
  initialContent: string;
  onChange: (content: string) => void;
  maxLength?: number;
  minHeight?: number;
  maxHeight?: number;
}

export default function ContentEditor({
  initialContent,
  onChange,
  maxLength = 3000,
  minHeight = 150,
  maxHeight = 400,
}: ContentEditorProps) {
  const [content, setContent] = useState(initialContent);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const scrollHeight = textareaRef.current.scrollHeight;
      const newHeight = Math.max(minHeight, Math.min(scrollHeight, maxHeight));
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, [content, minHeight, maxHeight]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    if (newContent.length <= maxLength) {
      setContent(newContent);
      onChange(newContent);
    }
  };

  // Count hashtags and mentions
  const hashtagCount = (content.match(/#[\w]+/g) || []).length;
  const mentionCount = (content.match(/@[\w]+/g) || []).length;

  // Warnings
  const isNearLimit = content.length > maxLength * 0.9;
  const isTooLong = content.length > maxLength;
  const tooManyHashtags = hashtagCount > 10;

  return (
    <div className="space-y-3">
      {/* Label */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-white flex items-center gap-2">
          <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Éditez votre message
        </label>
        <div className="flex items-center gap-2 text-xs">
          {hashtagCount > 0 && (
            <span className={`${tooManyHashtags ? 'text-warning' : 'text-text-muted'}`}>
              #{hashtagCount}
            </span>
          )}
          {mentionCount > 0 && (
            <span className="text-text-muted">
              @{mentionCount}
            </span>
          )}
        </div>
      </div>

      {/* Textarea */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          placeholder="Écrivez votre contenu LinkedIn..."
          className={`
            w-full px-4 py-3 bg-dark-bg border rounded-xl
            text-white placeholder-text-muted resize-none
            focus:outline-none transition-all duration-200
            ${isTooLong
              ? 'border-error focus:border-error'
              : isNearLimit
                ? 'border-warning focus:border-warning'
                : 'border-dark-border focus:border-primary/50'
            }
          `}
          style={{ minHeight: `${minHeight}px`, maxHeight: `${maxHeight}px` }}
        />
      </div>

      {/* Footer with counter and tips */}
      <div className="flex items-start justify-between gap-4">
        {/* Tips */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex-1"
        >
          <div className="text-xs text-text-muted space-y-1">
            <div className="flex items-center gap-1.5">
              <svg className="w-3 h-3 text-accent" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <span>Ajoutez des line breaks et emojis pour plus d'engagement</span>
            </div>
            {tooManyHashtags && (
              <div className="flex items-center gap-1.5 text-warning">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span>LinkedIn recommande max 5 hashtags</span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Character counter */}
        <div className={`
          text-xs font-medium tabular-nums whitespace-nowrap
          ${isTooLong
            ? 'text-error'
            : isNearLimit
              ? 'text-warning'
              : 'text-text-muted'
          }
        `}>
          {content.length} / {maxLength}
        </div>
      </div>

      {/* Error message if too long */}
      {isTooLong && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 p-3 bg-error/10 border border-error/30 rounded-lg text-error text-sm"
        >
          <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <span>Votre message dépasse la limite LinkedIn de {maxLength} caractères</span>
        </motion.div>
      )}
    </div>
  );
}
