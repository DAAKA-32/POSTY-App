"use client";

/**
 * StrategistMessageBubble — one conversation turn.
 *
 *   - User: neutral bubble, right-aligned.
 *   - Assistant: bare markdown in the column (reads like a document).
 *   - Waiting: three dots (static under reduced motion) + sr-only label.
 *   - Actions on the latest answer: Copy, Regenerate and "Turn into a plan"
 *     (the bridge from advice to an actual plan) — 40px targets, translated.
 */

import { motion, useReducedMotion } from "framer-motion";
import { useState } from "react";
import { Check, Copy, RotateCw, CalendarPlus } from "lucide-react";
import { useStrategistCopy } from "@/lib/strategist/copy";
import StrategistMarkdown from "./StrategistMarkdown";
import { Button } from "./ui";

interface Props {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
  showActions?: boolean;
  onRegenerate?: () => void;
  onTurnIntoPlan?: () => void;
}

export default function StrategistMessageBubble({
  role,
  content,
  isStreaming = false,
  showActions = false,
  onRegenerate,
  onTurnIntoPlan,
}: Props) {
  const reduced = useReducedMotion();
  const { c } = useStrategistCopy();
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

  if (role === "user") {
    return (
      <div className="flex justify-end px-5">
        <div className="max-w-[85%] rounded-2xl rounded-tr-md bg-gray-100 dark:bg-dark-elevated text-gray-900 dark:text-gray-100 px-4 py-2.5 text-[14px] leading-[1.55] whitespace-pre-wrap break-words">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="px-5">
      {isStreaming && content.length === 0 ? (
        <span className="inline-flex gap-1 items-center py-2" role="status">
          <span className="sr-only">…</span>
          {[0, 0.2, 0.4].map((delay) => (
            <motion.span
              key={delay}
              aria-hidden
              className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500"
              animate={reduced ? undefined : { opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut", delay }}
            />
          ))}
        </span>
      ) : (
        <StrategistMarkdown content={content} />
      )}

      {showActions && content.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1 -ml-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            icon={copied ? <Check aria-hidden className="w-4 h-4" /> : <Copy aria-hidden className="w-4 h-4" />}
          >
            {copied ? c.thread.copied : c.thread.copy}
          </Button>
          {onRegenerate && (
            <Button variant="ghost" size="sm" onClick={onRegenerate} icon={<RotateCw aria-hidden className="w-4 h-4" />}>
              {c.thread.regenerate}
            </Button>
          )}
          {onTurnIntoPlan && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onTurnIntoPlan}
              icon={<CalendarPlus aria-hidden className="w-4 h-4 text-amber-700 dark:text-amber-400" />}
            >
              {c.thread.turnIntoPlan}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
