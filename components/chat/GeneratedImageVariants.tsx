"use client";

/**
 * GeneratedImageVariants — shows 2-3 variants of a visual side-by-side and
 * lets the user pick which ones to publish (multi-select). Used when
 * /api/image/generate returns multiple variants of the same brief
 * (intent=image or intent=both with multi-variant enabled). For single-
 * variant payloads, the parent falls back to the simpler GeneratedImageCard.
 *
 * Selection state is owned by the parent so the choices survive across
 * re-renders and can be threaded into the publish-modal pre-fill. The order
 * inside `selectedIndices` is the publish order (first click = position 1).
 */

import { motion, AnimatePresence } from "framer-motion";
import { Download, ExternalLink, RefreshCw, X } from "lucide-react";
import toast from "@/components/ui/Toast";
import type { GeneratedImage } from "@/hooks/image/useImageGeneration";

interface Props {
  prompt: string;
  variants: GeneratedImage[];
  /** Indices of selected variants, in click order. Length 0..variants.length. */
  selectedIndices: number[];
  /** Toggle a variant in/out of the selection. The first click adds it at
   *  the next position; a click on an already-selected variant removes it. */
  onToggle: (index: number) => void;
  onRegenerate?: () => void;
  isRegenerating?: boolean;
}

export default function GeneratedImageVariants({
  prompt,
  variants,
  selectedIndices,
  onToggle,
  onRegenerate,
  isRegenerating,
}: Props) {
  const isMulti = variants.length > 1;
  // Sanitize: only keep indices that actually point to a variant, preserving
  // click order. Guards against stale state if the variant list shrinks.
  const safeSelected = selectedIndices.filter((i) => i >= 0 && i < variants.length);
  // The "primary" variant — what we show as the hero when only one is picked
  // or nothing is picked yet. Falls back to variants[0] so the surface never
  // renders a blank box.
  const heroVariant = variants[safeSelected[0] ?? 0];
  const allPicked = safeSelected.length === variants.length;
  const nonePicked = safeSelected.length === 0;

  const handleDownload = async (image: GeneratedImage) => {
    try {
      const res = await fetch(image.url);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `posty-visuel-${image.imageId}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Téléchargement impossible.");
    }
  };

  const handleSelectAll = () => {
    if (allPicked) {
      // Deselect all
      safeSelected.forEach((i) => onToggle(i));
    } else {
      // Add every missing index in render order
      variants.forEach((_, i) => {
        if (!safeSelected.includes(i)) onToggle(i);
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      className="
        notranslate
        w-full max-w-md
        rounded-2xl overflow-hidden
        bg-white dark:bg-dark-card
        border border-gray-200 dark:border-dark-border
        shadow-sm
      "
      translate="no"
    >
      {/* Hero — primary variant (first selected, or variants[0] when nothing
          is picked yet). Stays present so the surface never collapses. */}
      <div className="relative w-full aspect-square bg-gray-50 dark:bg-dark-elevated">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={heroVariant.url}
          alt={heroVariant.prompt}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        {isRegenerating && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm">
            <RefreshCw className="w-6 h-6 text-white animate-spin" />
          </div>
        )}
      </div>

      {/* Variant picker — only when there's more than one. Multi-select with
          numbered order badge + X-on-hover to deselect inline. */}
      {isMulti && (
        <div className="px-3 py-3 border-t border-gray-100 dark:border-dark-border">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] uppercase tracking-wider text-text-secondary font-medium">
              Sélectionne 1 à {variants.length} visuels
            </p>
            <button
              type="button"
              onClick={handleSelectAll}
              className="
                text-[10.5px] font-medium uppercase tracking-wider
                text-[#F8935D] hover:text-[#F76B54]
                transition-colors
              "
            >
              {allPicked ? "Tout retirer" : "Tout sélectionner"}
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {variants.map((v, i) => {
              const order = safeSelected.indexOf(i);
              const isSelected = order >= 0;
              return (
                <button
                  key={v.imageId}
                  type="button"
                  onClick={() => onToggle(i)}
                  aria-pressed={isSelected}
                  aria-label={
                    isSelected
                      ? `Variante ${i + 1} — sélectionnée en position ${order + 1}. Cliquer pour retirer.`
                      : `Variante ${i + 1} — cliquer pour ajouter.`
                  }
                  className={`
                    group/thumb relative aspect-square rounded-lg overflow-hidden
                    border-2 transition-all duration-200
                    ${
                      isSelected
                        ? "border-[#F8935D] ring-2 ring-[#F8935D]/30 shadow-[0_0_0_4px_rgba(248,147,93,0.10)]"
                        : "border-transparent hover:border-gray-300 dark:hover:border-dark-border"
                    }
                  `}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={v.url}
                    alt={`Variante ${i + 1}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <AnimatePresence>
                    {isSelected && (
                      <motion.div
                        key="selected-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="absolute inset-0 bg-[#F8935D]/10 pointer-events-none"
                      />
                    )}
                  </AnimatePresence>

                  {/* Numbered order badge top-left (publish position) */}
                  <AnimatePresence>
                    {isSelected && (
                      <motion.div
                        key="badge"
                        initial={{ scale: 0.6, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.6, opacity: 0 }}
                        transition={{
                          duration: 0.22,
                          ease: [0.22, 1, 0.36, 1],
                        }}
                        className="
                          absolute top-1.5 left-1.5
                          bg-[#F8935D] text-white
                          rounded-full w-6 h-6
                          flex items-center justify-center
                          text-[11px] font-bold
                          shadow-sm shadow-[#F8935D]/40
                          pointer-events-none
                        "
                      >
                        {order + 1}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* X (deselect) top-right — visible only on hover of an
                      already-selected thumbnail. Always-on a touchscreen
                      via the always-visible variant on small viewports. */}
                  {isSelected && (
                    <span
                      role="presentation"
                      className="
                        absolute top-1.5 right-1.5
                        w-5 h-5 rounded-full
                        flex items-center justify-center
                        bg-white/95 dark:bg-dark-card/95
                        text-gray-700 dark:text-text-primary
                        shadow-sm shadow-black/10
                        opacity-0 group-hover/thumb:opacity-100
                        md:opacity-0 md:group-hover/thumb:opacity-100
                        transition-opacity duration-150
                        pointer-events-none
                      "
                      aria-hidden="true"
                    >
                      <X className="w-3 h-3" strokeWidth={3} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Live selection counter — gives the user a clear, persistent
              read of what will ship without forcing them to count badges. */}
          <p className="mt-2 text-[11px] text-text-secondary">
            {nonePicked
              ? "Aucun visuel ne sera publié."
              : `${safeSelected.length} visuel${safeSelected.length > 1 ? "s" : ""} sera${safeSelected.length > 1 ? "" : ""} publié${safeSelected.length > 1 ? "s" : ""} avec ce post.`}
          </p>
        </div>
      )}

      {/* Footer — prompt + per-variant actions (target = primary selected). */}
      <div className="px-4 py-3 flex items-center gap-2 border-t border-gray-100 dark:border-dark-border">
        <p className="flex-1 min-w-0 text-[12px] text-text-secondary truncate">
          {prompt}
        </p>
        <div className="flex items-center gap-1 flex-shrink-0">
          <IconButton
            icon={Download}
            label="Télécharger"
            onClick={() => handleDownload(heroVariant)}
          />
          <IconButton
            icon={ExternalLink}
            label="Ouvrir"
            onClick={() => window.open(heroVariant.url, "_blank", "noopener,noreferrer")}
          />
          {onRegenerate && (
            <IconButton
              icon={RefreshCw}
              label="Régénérer"
              onClick={onRegenerate}
              disabled={isRegenerating}
            />
          )}
        </div>
      </div>
    </motion.div>
  );
}

function IconButton({
  icon: Icon,
  label,
  onClick,
  disabled,
}: {
  icon: typeof Download;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="
        w-8 h-8 rounded-lg
        flex items-center justify-center
        text-text-secondary hover:text-text-primary
        hover:bg-gray-100 dark:hover:bg-dark-hover
        disabled:opacity-40 disabled:cursor-not-allowed
        transition-colors
      "
    >
      <Icon className="w-3.5 h-3.5" />
    </button>
  );
}
