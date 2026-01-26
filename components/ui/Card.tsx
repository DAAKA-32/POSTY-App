"use client";

import { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  hover?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
  variant?: "default" | "elevated" | "highlight" | "ghost";
  interactive?: boolean;
}

export default function Card({
  children,
  className = "",
  onClick,
  hover = false,
  padding = "md",
  variant = "default",
  interactive,
}: CardProps) {
  const paddingStyles = {
    none: "",
    sm: "p-3",
    md: "p-4",
    lg: "p-6",
  };

  // Premium card styles with subtle depth and refined borders
  const variantStyles = {
    default: `
      bg-light-card dark:bg-dark-card
      border border-light-border dark:border-dark-border
      shadow-card
    `,
    elevated: `
      bg-light-elevated dark:bg-dark-elevated
      border border-light-border dark:border-dark-border
      shadow-elevated
    `,
    highlight: `
      bg-light-card dark:bg-dark-card
      border border-primary/30
      shadow-[0_0_15px_rgba(248,147,93,0.1)]
    `,
    ghost: `
      bg-transparent
      border border-transparent
    `,
  };

  // Premium hover effects with subtle shadow glow
  const hoverStyles = {
    default: `
      hover:border-primary/30 hover:shadow-card-hover
    `,
    elevated: `
      hover:border-primary/30
      hover:shadow-[0_12px_35px_-10px_rgba(0,0,0,0.15),0_4px_15px_-5px_rgba(0,0,0,0.08)]
    `,
    highlight: `
      hover:border-primary/50
      hover:shadow-[0_0_25px_rgba(248,147,93,0.15),0_8px_20px_-8px_rgba(0,0,0,0.1)]
    `,
    ghost: `
      hover:bg-light-hover/50 dark:hover:bg-dark-hover/50
      hover:border-light-border/50 dark:hover:border-dark-border/50
    `,
  };

  // Active/press effect for interactive cards
  const activeStyles = "active:scale-[0.98] active:transition-none";

  const isInteractive = interactive ?? (!!onClick || hover);

  return (
    <div
      onClick={onClick}
      tabIndex={isInteractive ? 0 : undefined}
      role={isInteractive ? "button" : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } } : undefined}
      className={`
        ${variantStyles[variant]}
        rounded-xl
        ${paddingStyles[padding]}
        transition-all duration-200 ease-out
        transform-gpu will-change-transform
        ${isInteractive ? hoverStyles[variant] : ""}
        ${isInteractive ? activeStyles : ""}
        ${isInteractive ? "cursor-pointer select-none" : ""}
        ${isInteractive ? "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background" : ""}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

// Header variant for cards with title
interface CardHeaderProps {
  title: string;
  action?: ReactNode;
}

export function CardHeader({ title, action }: CardHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
      {action}
    </div>
  );
}
