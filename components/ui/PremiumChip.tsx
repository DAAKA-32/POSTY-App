"use client";

import { ReactNode } from "react";

type ChipVariant = "default" | "primary" | "accent" | "success" | "warning" | "pro" | "new" | "beta";
type ChipSize = "xs" | "sm" | "md";

interface PremiumChipProps {
  children: ReactNode;
  variant?: ChipVariant;
  size?: ChipSize;
  icon?: ReactNode;
  glow?: boolean;
  pulse?: boolean;
  className?: string;
}

const variantStyles: Record<ChipVariant, string> = {
  default: "bg-dark-border/50 text-text-secondary border-dark-border",
  primary: "bg-primary/15 text-primary border-primary/30",
  accent: "bg-accent/15 text-accent border-accent/30",
  success: "bg-accent/15 text-accent border-accent/30",
  warning: "bg-warning/15 text-warning border-warning/30",
  pro: "bg-gradient-to-r from-primary/20 to-accent/20 text-white border-primary/40",
  new: "bg-accent/20 text-accent border-accent/40",
  beta: "bg-warning/20 text-warning border-warning/40",
};

const sizeStyles: Record<ChipSize, string> = {
  xs: "text-[10px] px-1.5 py-0.5 gap-1",
  sm: "text-xs px-2 py-0.5 gap-1.5",
  md: "text-sm px-2.5 py-1 gap-2",
};

export default function PremiumChip({
  children,
  variant = "default",
  size = "sm",
  icon,
  glow = false,
  pulse = false,
  className = "",
}: PremiumChipProps) {
  return (
    <span
      className={`
        inline-flex items-center justify-center
        font-medium rounded-full border
        transition-all duration-200
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${glow ? "shadow-[0_0_12px_rgba(232,147,77,0.3)]" : ""}
        ${pulse ? "animate-pulse" : ""}
        hover:scale-105 hover:brightness-110
        ${className}
      `}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </span>
  );
}

// Pre-configured chip variants for common use cases
export function ProChip({ className = "" }: { className?: string }) {
  return (
    <PremiumChip
      variant="pro"
      size="xs"
      glow
      icon={
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
        </svg>
      }
      className={className}
    >
      PRO
    </PremiumChip>
  );
}

export function NewChip({ className = "" }: { className?: string }) {
  return (
    <PremiumChip variant="new" size="xs" className={className}>
      NEW
    </PremiumChip>
  );
}

export function BetaChip({ className = "" }: { className?: string }) {
  return (
    <PremiumChip variant="beta" size="xs" className={className}>
      BETA
    </PremiumChip>
  );
}

export function CountChip({ count, className = "" }: { count: number; className?: string }) {
  return (
    <PremiumChip variant="primary" size="xs" className={className}>
      {count > 99 ? "99+" : count}
    </PremiumChip>
  );
}
