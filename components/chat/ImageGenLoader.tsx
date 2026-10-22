"use client";

/**
 * ImageGenLoader — the card shown WHILE a visual is being generated.
 *
 * It sits in the chat stream at the exact spot the final image card will
 * occupy, with the same aspect-square + footer layout, so the conversation
 * never jumps when the image arrives (the page cross-fades loader → result).
 *
 * Honesty rules (the backend sends no progress events, see
 * hooks/image/useGenerationProgress.ts):
 *   - the bar is INDICATIVE: it shows no number and is capped, so it can never
 *     look finished before the result exists;
 *   - the messages are waiting messages chosen from elapsed time, not claims
 *     about what the server is doing;
 *   - if it takes unusually long, say so instead of looping the same text.
 */

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useReducedMotion } from "@/hooks/ui/useReducedMotion";
import { useRevealOnMount, COMPOSER_CLEARANCE_PX } from "@/hooks/ui/useRevealOnMount";
import { useGenerationProgress, type GenerationStage } from "@/hooks/image/useGenerationProgress";

interface Props {
  prompt: string;
}

export default function ImageGenLoader({ prompt }: Props) {
  const { t } = useLanguage();
  const reduced = useReducedMotion();
  const { fraction, stage } = useGenerationProgress(true);
  const revealRef = useRevealOnMount<HTMLDivElement>();

  const stageText: Record<GenerationStage, string> = {
    prepare: t.chat.imageLoaderStepPrepare,
    create: t.chat.imageLoaderStepCreate,
    wait: t.chat.imageLoaderStepWait,
    slow: t.chat.imageLoaderSlow,
  };

  return (
    <motion.div
      ref={revealRef}
      style={{ scrollMarginBottom: COMPOSER_CLEARANCE_PX }}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      className="
        w-full max-w-[320px] sm:max-w-sm
        rounded-2xl overflow-hidden
        bg-white dark:bg-dark-card
        border border-gray-200 dark:border-dark-border
        shadow-sm
      "
    >
      {/* Image placeholder — square 1:1, matches the final card */}
      <div className="relative w-full aspect-square overflow-hidden bg-gradient-to-br from-iris-50 via-amber-50 to-coral-50 dark:from-[#1A1F2E] dark:via-[#1F1B2E] dark:to-[#2E1F26]">
        {/* Slow diagonal shimmer: reads as "scanning", not a flashing pulse. */}
        {!reduced && (
          <motion.div
            aria-hidden
            className="absolute inset-0"
            style={{
              backgroundImage:
                "linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.55) 50%, transparent 70%)",
              backgroundSize: "240% 100%",
            }}
            animate={{ backgroundPositionX: ["0%", "200%"] }}
            transition={{ duration: 2.2, ease: "linear", repeat: Infinity }}
          />
        )}

        {/* Focal emblem */}
        <div className="absolute inset-0 flex items-center justify-center pb-10">
          <motion.div
            aria-hidden
            className="
              flex items-center justify-center
              w-14 h-14 rounded-xl
              bg-white/70 dark:bg-white/10 backdrop-blur-sm
              shadow-[0_8px_24px_-8px_rgba(90,79,207,0.35)]
            "
            animate={reduced ? undefined : { scale: [1, 1.06, 1] }}
            transition={{ duration: 2.4, ease: "easeInOut", repeat: Infinity }}
          >
            <Sparkles className="w-6 h-6 text-iris-500" />
          </motion.div>
        </div>

        {/* Title + waiting message + indicative bar */}
        <div className="absolute inset-x-0 bottom-0 px-5 pb-5 pt-10 bg-gradient-to-t from-white/85 via-white/50 to-transparent dark:from-black/60 dark:via-black/30">
          <p className="text-[13px] font-semibold text-text-primary text-center">{t.chat.imageLoaderTitle}</p>
          {/* Only the message changes (a few times), so a polite live region is enough. */}
          <p role="status" aria-live="polite" className="mt-0.5 min-h-[2.25rem] text-[12px] leading-snug text-text-secondary text-center">
            {stageText[stage]}
          </p>
          <div
            role="progressbar"
            aria-label={t.chat.imageLoaderTitle}
            aria-valuetext={stageText[stage]}
            aria-busy="true"
            className="mt-2 h-1.5 w-full rounded-full bg-black/10 dark:bg-white/15 overflow-hidden"
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#F89E85] to-[#F76B54] transition-[width] duration-500 ease-out"
              style={{ width: `${Math.round(fraction * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Footer — keeps layout parity with the final image card */}
      <div className="px-4 py-3 border-t border-gray-100 dark:border-dark-border">
        <p className="text-[12px] text-text-secondary truncate">{prompt}</p>
      </div>
    </motion.div>
  );
}
