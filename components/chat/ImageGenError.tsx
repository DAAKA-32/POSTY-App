"use client";

/**
 * ImageGenError — the card shown when a visual could not be generated.
 *
 * Shared by /app and /app/c/[id] (they used to carry two hard-coded French
 * copies). The message comes from the error CODE, translated: the raw message
 * from the hook / server is French-only and often technical. A retry is always
 * offered — it is the user's decision, never an automatic re-run of a paid
 * generation.
 */

import { motion } from "framer-motion";
import { AlertCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface Props {
  /** Error code from useImageGeneration (timeout, network, render_failed…). */
  code?: string;
  /** Server-provided message — only shown for quota errors, which carry advice. */
  message?: string;
  onRetry: () => void;
  /** Disable the button while a retry is already running (no double submit). */
  retrying?: boolean;
}

export default function ImageGenError({ code, message, onRetry, retrying = false }: Props) {
  const { t } = useLanguage();

  const reason = (() => {
    switch (code) {
      case "timeout":
        return t.chat.imageErrorTimeout;
      case "network":
        return t.chat.imageErrorNetwork;
      case "render_failed":
        return t.chat.imageErrorRender;
      case "ai_invalid_dsl":
      case "ai_invalid_json":
      case "ai_empty":
        return t.chat.imageErrorAi;
      case "upload_failed":
        return t.chat.imageErrorUpload;
      case "unauthorized":
      case "not_signed_in":
        return t.chat.imageErrorAuth;
      case "quota_exceeded":
        return message || t.chat.imageErrorGeneric;
      default:
        return t.chat.imageErrorGeneric;
    }
  })();

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      role="alert"
      className="
        w-full max-w-2xl
        rounded-2xl rounded-bl-md
        border border-error/30 bg-error/5
        px-4 py-3
        flex items-start gap-3
      "
    >
      <AlertCircle aria-hidden className="mt-0.5 w-5 h-5 shrink-0 text-error" />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] text-text-primary font-medium">{t.chat.imageErrorTitle}</p>
        <p className="text-[12px] text-text-secondary mt-0.5">{reason}</p>
        <button
          type="button"
          onClick={onRetry}
          disabled={retrying}
          className="
            mt-2 inline-flex items-center justify-center gap-1.5
            min-h-[36px] px-3 py-1.5 rounded-lg
            bg-error/10 hover:bg-error/15 active:bg-error/20
            text-error text-[12px] font-medium
            transition-colors disabled:opacity-50 disabled:cursor-not-allowed
          "
        >
          {t.chat.imageRetry}
        </button>
      </div>
    </motion.div>
  );
}
