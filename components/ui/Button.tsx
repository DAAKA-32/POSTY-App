"use client";

import { ButtonHTMLAttributes, ReactNode } from "react";
import Loader from "@/components/shared/Loader";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger" | "accent";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  fullWidth?: boolean;
}

export default function Button({
  children,
  variant = "primary",
  size = "md",
  isLoading = false,
  fullWidth = false,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles = `
    inline-flex items-center justify-center font-medium rounded-xl
    transition-all duration-200 ease-smooth
    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background
    disabled:opacity-50 disabled:cursor-not-allowed
    active:scale-[0.98] haptic-feedback
  `;

  const variants = {
    primary: `
      bg-gradient-to-r from-primary to-primary-hover
      hover:from-primary-hover hover:to-primary
      text-white shadow-glow hover:shadow-lg
      focus:ring-primary
    `,
    secondary: `
      bg-dark-elevated text-white
      border border-dark-border hover:border-primary/30
      hover:bg-dark-hover
      focus:ring-dark-border
    `,
    ghost: `
      bg-transparent text-text-secondary
      hover:bg-dark-hover hover:text-white
      focus:ring-dark-border
    `,
    danger: `
      bg-error text-white
      hover:bg-error-hover
      focus:ring-error
    `,
    accent: `
      bg-accent text-dark-bg
      hover:bg-accent-hover
      shadow-glow-accent hover:shadow-lg
      focus:ring-accent
    `,
  };

  const sizes = {
    sm: "px-3 py-2 text-sm",
    md: "px-4 py-2.5 text-sm",
    lg: "px-6 py-3 text-base",
  };

  return (
    <button
      className={`
        ${baseStyles}
        ${variants[variant]}
        ${sizes[size]}
        ${fullWidth ? "w-full" : ""}
        ${className}
      `}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader
            size="sm"
            color={variant === "accent" ? "white" : variant === "danger" ? "white" : "white"}
            className="mr-2"
          />
          <span>Chargement...</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
