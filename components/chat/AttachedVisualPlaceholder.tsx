"use client";

/**
 * AttachedVisualPlaceholder — the skeleton under a post while its visual is
 * still being generated (the intent=both flow and the "add visuals" shortcut).
 *
 * Same footprint as the final hero (max-w-md square) so the layout does not
 * snap when the image lands. Shares the honest, capped progress of
 * <ImageGenLoader>: no percentage, waiting messages that follow elapsed time.
 */

import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { useReducedMotion } from "@/hooks/ui/useReducedMotion";
import { useRevealOnMount, COMPOSER_CLEARANCE_PX } from "@/hooks/ui/useRevealOnMount";
import { useGenerationProgress, type GenerationStage } from "@/hooks/image/useGenerationProgress";

export default function AttachedVisualPlaceholder() {
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
    <div
      ref={revealRef}
      style={{ scrollMarginBottom: COMPOSER_CLEARANCE_PX }}
      className="px-4 pt-3 pb-1 border-t border-gray-100 dark:border-dark-border/30"
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25 }}
        className="
          relative max-w-md mx-auto w-full aspect-square overflow-hidden
          rounded-xl
          bg-gradient-to-br from-gray-100 to-gray-200
          dark:from-dark-elevated dark:to-dark-border
          border border-gray-200 dark:border-dark-border
        "
      >
        {!reduced && (
          <motion.div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 dark:via-white/10 to-transparent"
            animate={{ x: ["-100%", "100%"] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
          />
        )}
        <div className="absolute inset-x-0 bottom-0 px-5 pb-5 pt-10 bg-gradient-to-t from-white/70 to-transparent dark:from-black/50">
          <p className="text-[13px] font-semibold text-text-primary text-center">{t.chat.imageLoaderTitle}</p>
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
      </motion.div>
    </div>
  );
}
