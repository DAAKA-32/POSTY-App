"use client";

/**
 * StrategistMessageBubble — minimal Notion-style message rendering.
 *
 *   - User: gray bubble right-aligned (no gradient, no avatar)
 *   - Assistant: bare markdown content in the column (no bubble, no border,
 *     no avatar). The conversation reads like a document, not a chat app.
 *   - Streaming: 3 quiet gray dots
 *   - Actions: tiny gray text buttons (Copy + Regenerate), only on the last
 *     completed assistant message
 */

import { motion, useReducedMotion } from "framer-motion";
import { useState } from "react";
import StrategistMarkdown from "./StrategistMarkdown";

export type Role = "user" | "assistant";

interface Props {
  role: Role;
  content: string;
  isStreaming?: boolean;
  showActions?: boolean;
  onRegenerate?: () => void;
}

export default function StrategistMessageBubble({
  role,
  content,
  isStreaming = false,
  showActions = false,
  onRegenerate,
}: Props) {
  const reduced = useReducedMotion();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable */
    }
  };

  // ── User bubble ──
  if (role === "user") {
    return (
      <motion.div
        initial={reduced ? false : { opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="flex justify-end px-5"
      >
        <div
          className="
            max-w-[85%]
            rounded-2xl rounded-tr-sm
            bg-gray-100 dark:bg-gray-800
            text-gray-900 dark:text-gray-100
            px-3.5 py-2.5
            text-[14px] leading-[1.55]
            whitespace-pre-wrap break-words
          "
        >
          {content}
        </div>
      </motion.div>
    );
  }

  // ── Assistant — no bubble, just markdown content in the column ──
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="px-5"
    >
      {isStreaming && content.length === 0 ? (
        <span className="inline-flex gap-1 items-center py-2">
          <motion.span
            className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut", delay: 0 }}
          />
          <motion.span
            className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
          />
          <motion.span
            className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
          />
        </span>
      ) : (
        <StrategistMarkdown content={content} />
      )}

      {/* Action row — quiet text buttons */}
      {showActions && content.length > 0 && (
        <motion.div
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2, delay: 0.1 }}
          className="mt-3 flex items-center gap-3"
        >
          <button
            type="button"
            onClick={handleCopy}
            className="
              inline-flex items-center gap-1
              text-[11.5px] text-gray-400 dark:text-gray-500
              hover:text-gray-700 dark:hover:text-gray-200
              transition-colors
            "
          >
            {copied ? (
              <>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Copied
              </>
            ) : (
              <>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.6}>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                Copy
              </>
            )}
          </button>
          {onRegenerate && (
            <button
              type="button"
              onClick={onRegenerate}
              className="
                inline-flex items-center gap-1
                text-[11.5px] text-gray-400 dark:text-gray-500
                hover:text-gray-700 dark:hover:text-gray-200
                transition-colors
              "
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.6}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Regenerate
            </button>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
