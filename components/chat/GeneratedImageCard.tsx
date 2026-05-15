"use client";

/**
 * GeneratedImageCard — renders the AI-generated visual inline in the chat
 * stream. Matches the visual rhythm of ModernResponseCard (rounded shell,
 * action footer) so the visual sits naturally between conversational turns.
 *
 * Actions: open full-size, download, regenerate, copy URL. The image itself
 * carries `notranslate` because the visual contains real copy the user is
 * about to publish — browser translation would corrupt the deliverable.
 */

import { motion } from "framer-motion";
import { Download, ExternalLink, RefreshCw, Copy, Check } from "lucide-react";
import { useState } from "react";
import toast from "@/components/ui/Toast";
import type { GeneratedImage } from "@/hooks/image/useImageGeneration";

interface Props {
  image: GeneratedImage;
  onRegenerate?: () => void;
  isRegenerating?: boolean;
}

export default function GeneratedImageCard({ image, onRegenerate, isRegenerating }: Props) {
  const [copied, setCopied] = useState(false);

  const handleDownload = async () => {
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

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(image.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Copie impossible.");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      className="
        notranslate
        w-full max-w-[320px] sm:max-w-sm
        rounded-2xl overflow-hidden
        bg-white dark:bg-dark-card
        border border-gray-200 dark:border-dark-border
        shadow-sm
      "
      translate="no"
    >
      {/* Image — square 1080x1080. width=full keeps it responsive, aspect
          forces the box even before the network image lands. */}
      <div className="relative w-full aspect-square bg-gray-50 dark:bg-dark-elevated">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image.url}
          alt={image.prompt}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        {isRegenerating && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm">
            <RefreshCw className="w-6 h-6 text-white animate-spin" />
          </div>
        )}
      </div>

      {/* Footer — prompt recap + actions */}
      <div className="px-4 py-3 flex items-center gap-2 border-t border-gray-100 dark:border-dark-border">
        <p className="flex-1 min-w-0 text-[12px] text-text-secondary truncate">
          {image.prompt}
        </p>
        <div className="flex items-center gap-1 flex-shrink-0">
          <IconButton
            icon={copied ? Check : Copy}
            label={copied ? "Copié" : "Copier l'URL"}
            onClick={handleCopyUrl}
          />
          <IconButton icon={Download} label="Télécharger" onClick={handleDownload} />
          <IconButton
            icon={ExternalLink}
            label="Ouvrir"
            onClick={() => window.open(image.url, "_blank", "noopener,noreferrer")}
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
