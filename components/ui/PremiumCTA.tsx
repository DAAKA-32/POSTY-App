"use client";

import { ReactNode } from "react";

interface PremiumCTAProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: "gradient" | "glass" | "outline";
  size?: "sm" | "md" | "lg";
  icon?: ReactNode;
  fullWidth?: boolean;
  disabled?: boolean;
  className?: string;
}

export default function PremiumCTA({
  children,
  onClick,
  variant = "gradient",
  size = "md",
  icon,
  fullWidth = false,
  disabled = false,
  className = "",
}: PremiumCTAProps) {
  const variantStyles = {
    gradient: `
      bg-gradient-to-r from-primary via-primary to-accent
      text-white font-semibold
      shadow-[0_4px_20px_rgba(47,128,237,0.35)]
      hover:shadow-[0_6px_30px_rgba(47,128,237,0.5)]
      hover:brightness-110
      active:scale-[0.98]
    `,
    glass: `
      bg-white/5 backdrop-blur-md
      border border-white/10
      text-white font-medium
      hover:bg-white/10 hover:border-white/20
      active:scale-[0.98]
    `,
    outline: `
      bg-transparent
      border-2 border-primary/50
      text-primary font-semibold
      hover:bg-primary/10 hover:border-primary
      active:scale-[0.98]
    `,
  };

  const sizeStyles = {
    sm: "px-4 py-2 text-sm gap-2 rounded-lg",
    md: "px-5 py-3 text-base gap-2.5 rounded-xl",
    lg: "px-6 py-4 text-lg gap-3 rounded-2xl",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        relative inline-flex items-center justify-center
        transition-all duration-300 ease-out
        overflow-hidden group
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${fullWidth ? "w-full" : ""}
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
        ${className}
      `}
    >
      {/* Shimmer effect for gradient variant */}
      {variant === "gradient" && !disabled && (
        <span
          className="
            absolute inset-0 -translate-x-full
            bg-gradient-to-r from-transparent via-white/20 to-transparent
            group-hover:translate-x-full transition-transform duration-700
          "
        />
      )}

      {/* Icon */}
      {icon && (
        <span className="shrink-0 transition-transform duration-200 group-hover:scale-110">
          {icon}
        </span>
      )}

      {/* Label */}
      <span className="relative z-10">{children}</span>
    </button>
  );
}

// Upgrade to Pro CTA card
export function UpgradeProCTA({
  onUpgrade,
  compact = false,
  className = "",
}: {
  onUpgrade?: () => void;
  compact?: boolean;
  className?: string;
}) {
  if (compact) {
    return (
      <button
        onClick={onUpgrade}
        className={`
          flex items-center gap-2 px-3 py-2
          bg-gradient-to-r from-primary/20 to-accent/20
          border border-primary/30 rounded-xl
          text-sm text-white font-medium
          transition-all duration-200
          hover:border-primary/50 hover:shadow-[0_0_15px_rgba(47,128,237,0.2)]
          group
          ${className}
        `}
      >
        <span className="w-5 h-5 text-primary group-hover:scale-110 transition-transform">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
        </span>
        <span>Passer Pro</span>
      </button>
    );
  }

  return (
    <div
      className={`
        p-4 rounded-2xl
        bg-gradient-to-br from-primary/10 via-dark-card to-accent/10
        border border-primary/20
        ${className}
      `}
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-[0_0_20px_rgba(47,128,237,0.3)]">
          <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
        </div>
        <div className="flex-1">
          <h4 className="text-white font-semibold text-sm">Passez a POSTY Pro</h4>
          <p className="text-text-muted text-xs mt-0.5">Publications illimitees</p>
        </div>
      </div>
      <PremiumCTA onClick={onUpgrade} size="sm" fullWidth>
        Debloquer Pro
      </PremiumCTA>
    </div>
  );
}
