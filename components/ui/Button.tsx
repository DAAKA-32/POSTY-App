"use client";

import { ButtonHTMLAttributes, ReactNode } from "react";
import Loader from "@/components/shared/Loader";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger" | "accent" | "success" | "outline" | "warning" | "info" | "premium";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  loadingText?: string;
  fullWidth?: boolean;
}

export default function Button({
  children,
  variant = "primary",
  size = "md",
  isLoading = false,
  loadingText = "Chargement...",
  fullWidth = false,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  // Premium micro-interactions: shimmer effect, smooth transitions, refined feedback
  const baseStyles = `
    btn-shimmer
    inline-flex items-center justify-center font-medium rounded-lg
    transition-all duration-200 ease-out
    focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background
    disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none
    active:scale-[0.98] active:transition-none
    select-none
  `;

  const variants = {
    // PRIMARY: Orange saumon - Couleur CTA principale (dominante)
    primary: `
      bg-gradient-to-r from-primary to-primary-hover
      text-white shadow-btn-primary
      hover:shadow-btn-primary-hover
    `,
    secondary: `
      bg-light-card dark:bg-dark-card text-text-primary
      border border-light-border dark:border-dark-border
      hover:border-primary/40 hover:bg-light-hover dark:hover:bg-dark-hover
      hover:shadow-md
    `,
    ghost: `
      bg-transparent text-text-primary/80
      hover:bg-light-hover/80 dark:hover:bg-dark-hover/80 hover:text-text-primary
    `,

    // AUTOSCROLL COLORS - Rouge/Rose
    danger: `
      bg-gradient-to-r from-red-500 to-red-600
      text-white
      shadow-[0_4px_14px_rgba(239,68,68,0.35)]
      hover:shadow-[0_6px_20px_rgba(239,68,68,0.45)]
    `,
    accent: `
      bg-gradient-to-r from-accent to-accent-hover
      text-white shadow-glow-accent
      hover:shadow-lg
    `,

    // AUTOSCROLL COLORS - Vert
    success: `
      bg-gradient-to-r from-emerald-500 to-emerald-600
      text-white
      shadow-[0_4px_14px_rgba(16,185,129,0.3)]
      hover:shadow-[0_6px_20px_rgba(16,185,129,0.4)]
    `,

    // AUTOSCROLL COLORS - Jaune/Amber
    warning: `
      bg-gradient-to-r from-amber-500 to-amber-600
      text-white
      shadow-[0_4px_14px_rgba(245,158,11,0.3)]
      hover:shadow-[0_6px_20px_rgba(245,158,11,0.4)]
    `,

    // AUTOSCROLL COLORS - Bleu
    info: `
      bg-gradient-to-r from-blue-500 to-blue-600
      text-white
      shadow-[0_4px_14px_rgba(59,130,246,0.3)]
      hover:shadow-[0_6px_20px_rgba(59,130,246,0.4)]
    `,

    // AUTOSCROLL COLORS - Violet/Premium
    premium: `
      bg-gradient-to-r from-violet-500 to-purple-500
      text-white
      shadow-[0_4px_14px_rgba(139,92,246,0.3)]
      hover:shadow-[0_6px_20px_rgba(139,92,246,0.4)]
    `,

    outline: `
      bg-transparent text-primary
      border-2 border-primary/40
      hover:border-primary hover:bg-primary/8
      hover:shadow-sm
    `,
  };

  // Sizes with mobile-first touch targets (min 44px for WCAG compliance)
  const sizes = {
    sm: "px-3 py-2 text-sm tracking-snug min-h-[40px] md:min-h-0",
    md: "px-4 py-2.5 text-base tracking-snug min-h-[44px] md:min-h-0",
    lg: "px-6 py-3.5 text-lg tracking-snug min-h-[48px] md:min-h-0",
  };

  // Get loader color based on variant
  const getLoaderColor = () => {
    if (variant === "secondary" || variant === "ghost" || variant === "outline") {
      return "primary";
    }
    return "white";
  };

  return (
    <button
      className={`
        ${baseStyles}
        ${variants[variant]}
        ${sizes[size]}
        ${fullWidth ? "w-full" : ""}
        ${isLoading ? "relative overflow-hidden" : ""}
        ${className}
      `}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader
            size="sm"
            color={getLoaderColor()}
            className="mr-2"
          />
          <span>{loadingText}</span>
          {/* Shimmer effect for gradient buttons */}
          {(variant === "primary" || variant === "accent" || variant === "success" || variant === "danger" || variant === "warning" || variant === "info" || variant === "premium") && (
            <span
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer pointer-events-none"
              style={{ backgroundSize: "200% 100%" }}
            />
          )}
        </>
      ) : (
        children
      )}
    </button>
  );
}
