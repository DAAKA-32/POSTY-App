"use client";

/**
 * Strategist UI atoms — one button vocabulary for the whole drawer.
 *
 *   primary   amber fill + dark ink  (≈10:1 contrast — white on amber was ~2:1)
 *   secondary bordered neutral
 *   ghost     text-only neutral
 *   danger    red text, red fill once armed (white text: `text-white/100`,
 *             because light mode force-darkens bare `text-white`)
 *
 * Every control is ≥ 40px tall (44px for icon buttons) with a visible
 * keyboard focus ring.
 */

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-dark-card";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "dangerSolid";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-amber-400 hover:bg-amber-300 active:bg-amber-500 text-gray-900 font-semibold shadow-sm",
  secondary:
    "border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card hover:bg-gray-50 dark:hover:bg-dark-hover text-gray-800 dark:text-gray-100 font-medium",
  ghost:
    "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-dark-hover font-medium",
  danger:
    "text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 font-medium",
  dangerSolid: "bg-red-600 hover:bg-red-700 text-white/100 font-semibold shadow-sm",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "md" | "sm";
  icon?: ReactNode;
  block?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", icon, block, className = "", children, type = "button", ...rest },
  ref,
) {
  const sizing = size === "md" ? "h-11 px-4 text-[14px] gap-2" : "h-10 px-3 text-[13px] gap-1.5";
  return (
    <button
      ref={ref}
      type={type}
      className={`inline-flex items-center justify-center rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${sizing} ${VARIANTS[variant]} ${FOCUS} ${block ? "w-full" : ""} ${className}`}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
});

export function IconButton({
  label,
  children,
  className = "",
  pressed,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; pressed?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      className={`inline-flex items-center justify-center w-11 h-11 rounded-xl text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors disabled:opacity-40 ${FOCUS} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export const focusRing = FOCUS;
