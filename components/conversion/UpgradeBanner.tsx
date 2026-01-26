"use client";

import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";

interface UpgradeBannerProps {
  variant?: "subtle" | "standard" | "prominent";
  context?: "quota" | "feature" | "general";
  className?: string;
  onDismiss?: () => void;
  showDismiss?: boolean;
}

/**
 * UpgradeBanner - Conversion-optimized upgrade prompt
 * Follows brand voice: value-focused, not pushy
 */
export default function UpgradeBanner({
  variant = "standard",
  context = "general",
  className = "",
  onDismiss,
  showDismiss = false,
}: UpgradeBannerProps) {
  const { t } = useLanguage();

  // Get context-specific messaging
  const getMessage = () => {
    switch (context) {
      case "quota":
        return {
          title: t.conversion?.quotaUsed || "Vous avez utilise vos 3 posts cette semaine",
          subtitle: t.conversion?.unlockUnlimitedDesc || "Creez sans compter avec Pro",
          cta: t.conversion?.unlockUnlimited || "Passez en illimite",
        };
      case "feature":
        return {
          title: t.conversion?.upgradeTitle || "Debloquez tout le potentiel de POSTY",
          subtitle: t.conversion?.upgradeSubtitle || "Generations illimitees, support prioritaire",
          cta: t.conversion?.upgradeCta || "Decouvrir Pro",
        };
      default:
        return {
          title: t.conversion?.upgradeValueProp1 || "Publiez autant que vous voulez",
          subtitle: t.conversion?.upgradeNoCommitment || "Sans engagement, annulez quand vous voulez",
          cta: t.conversion?.ctaViewPlans || "Voir les offres",
        };
    }
  };

  const message = getMessage();

  // Variant styles
  const variantStyles = {
    subtle: "bg-dark-elevated border border-dark-border",
    standard: "bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20",
    prominent: "bg-gradient-to-r from-primary to-accent",
  };

  const textStyles = {
    subtle: "text-text-secondary",
    standard: "text-white",
    prominent: "text-white",
  };

  const ctaStyles = {
    subtle: "bg-dark-hover hover:bg-primary/20 text-primary",
    standard: "bg-primary hover:bg-primary-hover text-white",
    prominent: "bg-white hover:bg-white/90 text-primary",
  };

  return (
    <div
      className={`
        rounded-xl p-4 relative
        ${variantStyles[variant]}
        ${className}
      `}
    >
      {/* Dismiss button - perfectly centered with matching background */}
      {showDismiss && onDismiss && (
        <button
          onClick={onDismiss}
          className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-full text-text-muted hover:text-white bg-dark-elevated/60 hover:bg-dark-hover/80 backdrop-blur-sm transition-all duration-200"
          aria-label="Fermer"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 6L18 18M6 18L18 6" />
          </svg>
        </button>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* Content */}
        <div className="flex-1">
          <p className={`font-medium text-sm ${textStyles[variant]}`}>
            {message.title}
          </p>
          <p className={`text-xs mt-0.5 ${variant === "prominent" ? "text-white/80" : "text-text-muted"}`}>
            {message.subtitle}
          </p>
        </div>

        {/* CTA */}
        <Link
          href="/subscription"
          className={`
            px-4 py-2 rounded-lg text-sm font-medium
            transition-colors duration-200
            whitespace-nowrap text-center
            ${ctaStyles[variant]}
          `}
        >
          {message.cta}
        </Link>
      </div>
    </div>
  );
}

/**
 * QuotaIndicator - Shows remaining posts with upgrade hint
 * Non-intrusive, informative
 */
export function QuotaIndicator({
  remaining,
  total,
  isPro = false,
}: {
  remaining: number;
  total: number;
  isPro?: boolean;
}) {
  const { t } = useLanguage();

  if (isPro) {
    return (
      <div className="flex items-center gap-2 text-xs text-accent">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
        <span>{t.conversion?.proUserBenefit || "Generations illimitees actives"}</span>
      </div>
    );
  }

  const isLow = remaining <= 1;
  const isEmpty = remaining === 0;

  return (
    <div className={`flex items-center gap-2 text-xs ${isEmpty ? "text-warning" : isLow ? "text-text-muted" : "text-text-secondary"}`}>
      {/* Progress dots */}
      <div className="flex gap-1">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={`w-2 h-2 rounded-full ${
              i < remaining ? "bg-primary" : "bg-dark-border"
            }`}
          />
        ))}
      </div>

      {/* Text */}
      <span>
        {isEmpty ? (
          t.conversion?.quotaUsed || "Quota utilise"
        ) : (
          <>
            {remaining} {remaining === 1
              ? (t.conversion?.quotaRemaining || "post restant")
              : (t.conversion?.quotaRemainingPlural || "posts restants")
            }
          </>
        )}
      </span>

      {/* Upgrade hint for low quota */}
      {isLow && !isEmpty && (
        <Link
          href="/subscription"
          className="text-primary hover:text-primary-hover transition-colors ml-1"
        >
          {t.conversion?.unlockUnlimited || "Passez en illimite"}
        </Link>
      )}
    </div>
  );
}

/**
 * SuccessToast - Branded success message
 * Subtle celebration
 */
export function getSuccessMessage(type: "generated" | "copied" | "published" | "saved", t: any) {
  const messages = {
    generated: {
      title: t.conversion?.postGenerated || "Post genere",
      subtitle: t.conversion?.postGeneratedDesc || "Pret a publier",
    },
    copied: {
      title: t.conversion?.postCopied || "Copie",
      subtitle: null,
    },
    published: {
      title: t.conversion?.postPublished || "Publie sur LinkedIn",
      subtitle: null,
    },
    saved: {
      title: t.conversion?.postSaved || "Post enregistre",
      subtitle: null,
    },
  };

  return messages[type];
}
