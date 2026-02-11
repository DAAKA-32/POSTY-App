"use client";

import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import { motion } from "framer-motion";

type CTAVariant = "primary" | "secondary" | "ghost" | "upgrade";
type CTASize = "sm" | "md" | "lg";

interface ConversionCTAProps {
  variant?: CTAVariant;
  size?: CTASize;
  href?: string;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
}

/**
 * ConversionCTA - Brand-aligned call-to-action button
 * Natural, value-focused, never aggressive
 */
export default function ConversionCTA({
  variant = "primary",
  size = "md",
  href,
  onClick,
  children,
  className = "",
  icon,
  loading = false,
  disabled = false,
  fullWidth = false,
}: ConversionCTAProps) {
  // Size styles
  const sizeStyles = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  };

  // Variant styles
  const variantStyles = {
    primary: "bg-primary hover:bg-primary-hover text-white",
    secondary: "bg-dark-elevated hover:bg-dark-hover text-white border border-dark-border",
    ghost: "bg-transparent hover:bg-dark-hover text-text-secondary hover:text-white",
    upgrade: "bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white",
  };

  const baseStyles = `
    inline-flex items-center justify-center gap-2
    font-medium rounded-xl
    transition-all duration-200
    disabled:opacity-50 disabled:cursor-not-allowed
    ${sizeStyles[size]}
    ${variantStyles[variant]}
    ${fullWidth ? "w-full" : ""}
    ${className}
  `;

  const content = (
    <>
      {loading ? (
        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      ) : icon ? (
        icon
      ) : null}
      {children}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={baseStyles}>
        {content}
      </Link>
    );
  }

  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      onClick={onClick}
      disabled={disabled || loading}
      className={baseStyles}
    >
      {content}
    </motion.button>
  );
}

/**
 * Pre-built CTA components for common use cases
 */

export function StartFreeCTA({ className = "" }: { className?: string }) {
  const { t } = useLanguage();
  return (
    <ConversionCTA href="/signup" variant="primary" size="lg" className={className}>
      {t.conversion?.ctaStartFree || "Essayer gratuitement"}
    </ConversionCTA>
  );
}

export function DiscoverCTA({ className = "" }: { className?: string }) {
  const { t } = useLanguage();
  return (
    <ConversionCTA href="/" variant="secondary" size="md" className={className}>
      {t.conversion?.ctaDiscover || "Découvrir Posty"}
    </ConversionCTA>
  );
}

export function CreatePostCTA({ onClick, className = "" }: { onClick?: () => void; className?: string }) {
  const { t } = useLanguage();
  return (
    <ConversionCTA onClick={onClick} variant="primary" size="md" className={className}>
      {t.conversion?.ctaCreatePost || "Créer un post"}
    </ConversionCTA>
  );
}

export function ViewPlansCTA({ className = "" }: { className?: string }) {
  const { t } = useLanguage();
  return (
    <ConversionCTA href="/pricing" variant="ghost" size="md" className={className}>
      {t.conversion?.ctaViewPlans || "Voir les offres"}
    </ConversionCTA>
  );
}

export function UpgradeProCTA({ className = "" }: { className?: string }) {
  const { t } = useLanguage();
  return (
    <ConversionCTA href="/subscription" variant="upgrade" size="md" className={className}>
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
      {t.conversion?.ctaUpgradePro || "Passer en Pro"}
    </ConversionCTA>
  );
}

export function LearnMoreCTA({ href, className = "" }: { href: string; className?: string }) {
  const { t } = useLanguage();
  return (
    <ConversionCTA href={href} variant="ghost" size="sm" className={className}>
      {t.conversion?.ctaLearnMore || "En savoir plus"}
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </ConversionCTA>
  );
}

/**
 * ValueProposition - Subtle value reminder near CTAs
 */
export function ValueProposition({
  type = "time",
}: {
  type?: "time" | "visibility" | "credibility" | "consistency";
}) {
  const { t } = useLanguage();

  const props = {
    time: {
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      text: t.conversion?.saveTimeHook || "Gagnez 2h par semaine",
    },
    visibility: {
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      ),
      text: t.conversion?.visibilityHook || "Améliorez votre visibilité",
    },
    credibility: {
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      text: t.conversion?.credibilityHook || "Renforcez votre crédibilité",
    },
    consistency: {
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      ),
      text: t.conversion?.consistencyHook || "Publiez régulièrement",
    },
  };

  const prop = props[type];

  return (
    <div className="flex items-center gap-2 text-xs text-text-muted">
      <span className="text-primary">{prop.icon}</span>
      <span>{prop.text}</span>
    </div>
  );
}
