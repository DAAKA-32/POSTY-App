"use client";

import { motion } from "framer-motion";
import { Crown, X, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";

interface InlineUpgradeBannerProps {
  onClose: () => void;
  reason?: "dual-limit" | "max-feature";
  className?: string;
}

/**
 * Inline upgrade banner that replaces the mode selector zone
 * when a Pro user tries to access a Max-only feature or hits their limit.
 */
export default function InlineUpgradeBanner({
  onClose,
  reason = "max-feature",
  className = "",
}: InlineUpgradeBannerProps) {
  const { t } = useLanguage();
  const message =
    reason === "dual-limit"
      ? t.ui.dualLimitReached
      : t.ui.maxFeatureOnly;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -4 }}
      transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
      className={`relative flex items-center gap-3 px-4 py-2.5 rounded-xl
        bg-gradient-to-r from-primary/10 via-primary-hover/8 to-primary/10
        border border-primary/25 backdrop-blur-sm ${className}`}
    >
      {/* Icon */}
      <div className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center bg-primary/15 text-primary">
        <Crown className="w-4 h-4" />
      </div>

      {/* Message */}
      <p className="flex-1 text-xs sm:text-sm text-text-secondary min-w-0">
        {message}
      </p>

      {/* CTA button */}
      <Link
        href="/subscription"
        className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
          bg-gradient-to-r from-primary to-primary-hover text-white
          hover:from-primary-hover hover:to-primary-dark transition-all duration-200"
      >
        <span className="hidden sm:inline">{t.ui.upgradeToMax}</span>
        <span className="sm:hidden">{t.ui.maxShort}</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </Link>

      {/* Close button */}
      <button
        onClick={onClose}
        className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full
          text-text-muted hover:text-white hover:bg-white/10 transition-colors duration-150"
        aria-label={t.common.close}
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  );
}
