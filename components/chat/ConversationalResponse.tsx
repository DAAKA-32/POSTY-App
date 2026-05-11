"use client";

/**
 * ConversationalResponse — minimalist renderer for AI Q&A replies (Support
 * mode, or any response the server flagged as conversational/assistance).
 *
 * Why a separate component: the regular <ModernResponseCard /> wraps content
 * in a full LinkedIn preview card (author, role, timestamp, reactions row).
 * That framing makes sense for a post deliverable, but turns a help answer
 * into something it isn't — and visually misleads the reader into thinking
 * the chat just produced a publish-ready post.
 *
 * Visual contract: no card, no border, no avatar block. Just clean prose on
 * the conversation background, mirroring the typography of the Strategist
 * drawer for a coherent "AI talking to me" register across the app.
 */

import { motion } from "framer-motion";
import StrategistMarkdown from "@/components/strategist/StrategistMarkdown";

interface Props {
  content: string;
  isStreaming?: boolean;
}

export default function ConversationalResponse({ content, isStreaming }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className="max-w-full"
    >
      <div className="relative">
        <StrategistMarkdown content={content} />

        {/* Blinking cursor while streaming — placed inline at the end of the
            last rendered block. Absolute-positioned to avoid breaking the
            markdown parser's layout. */}
        {isStreaming && content.length === 0 && (
          <motion.span
            animate={{ opacity: [1, 0] }}
            transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
            className="inline-block w-0.5 h-4 bg-current align-middle"
          />
        )}
        {isStreaming && content.length > 0 && (
          <motion.span
            animate={{ opacity: [1, 0] }}
            transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
            className="inline-block w-0.5 h-4 bg-current align-middle ml-0.5"
          />
        )}
      </div>
    </motion.div>
  );
}
