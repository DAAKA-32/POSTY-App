"use client";

/**
 * Strategist UI atoms — one button vocabulary for the whole workspace.
 *
 *   primary   ink fill (near-black / near-white in dark): the everyday action
 *   brand     coral gradient, white text: the ONE decisive action of a view
 *             (Generate my plan, Build my week). Never two on screen.
 *   secondary bordered neutral
 *   ghost     text-only neutral
 *   danger    red text, red fill once armed (white text: `text-white/100`,
 *             because light mode force-darkens bare `text-white`)
 *
 * Colours come from the `--st-*` tokens (globals.css). Every control is
 * 44px tall (40px for `sm`) with a coral keyboard focus ring and a 2%
 * press-down — transform only, so nothing re-lays out.
 */

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--st-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent";

type Variant = "primary" | "brand" | "secondary" | "ghost" | "danger" | "dangerSolid";

const VARIANTS: Record<Variant, string> = {
  primary: "st-btn-primary font-semibold",
  brand: "st-btn-brand font-semibold",
  secondary: "border border-st-field-border bg-st-field text-st-ink hover:border-[color:var(--st-field-border-hover)] font-medium",
  ghost: "text-st-ink-2 hover:text-st-ink hover:bg-st-track font-medium",
  danger: "text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 font-medium",
  dangerSolid: "bg-red-600 hover:bg-red-700 text-white/100 font-semibold shadow-sm",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "md" | "sm";
  icon?: ReactNode;
  block?: boolean;
  /** Shows a spinner in place of the icon and blocks the button. */
  loading?: boolean;
}

export function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-block shrink-0 rounded-full border-2 border-current border-r-transparent opacity-80 animate-spin motion-reduce:animate-none ${className}`}
    />
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", icon, block, loading, className = "", children, type = "button", disabled, ...rest },
  ref,
) {
  const sizing = size === "md" ? "h-11 px-[18px] text-[14.5px] gap-2" : "h-10 px-3.5 text-[13.5px] gap-1.5";
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-xl tracking-[-0.005em] transition-[background-color,border-color,color,filter,transform] duration-150 active:scale-[0.98] disabled:opacity-45 disabled:cursor-not-allowed disabled:active:scale-100 ${sizing} ${VARIANTS[variant]} ${FOCUS} ${block ? "w-full" : ""} ${className}`}
      {...rest}
    >
      {loading ? <Spinner /> : icon}
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
      className={`inline-flex items-center justify-center w-11 h-11 rounded-xl text-st-ink-2 hover:text-st-ink hover:bg-st-track transition-colors active:scale-[0.96] disabled:opacity-40 ${FOCUS} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

/** The shape of a plan being written: one hairline row per post. */
export function PlanSkeleton({ rows }: { rows: number }) {
  return (
    <ul aria-hidden className="border-t border-st-rule">
      {Array.from({ length: Math.max(1, Math.min(rows, 5)) }, (_, k) => (
        <li key={k} className="flex items-center gap-5 border-b border-st-rule py-[var(--st-s2)]">
          <span className="st-shimmer h-2.5 w-14 shrink-0 rounded-full" />
          <span className="st-shimmer h-3 rounded-full" style={{ width: `${[72, 58, 66, 50, 62][k]}%` }} />
        </li>
      ))}
    </ul>
  );
}

/** Inline text action ("Edit", "Set up", "Resume") — coral ink, no surface. */
export const textAction = `rounded-md font-medium text-st-accent-ink underline-offset-[3px] decoration-1 hover:underline ${FOCUS}`;

export const focusRing = FOCUS;
