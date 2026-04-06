"use client";

import { useId } from "react";

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  label?: string;
  description?: string;
  id?: string;
  className?: string;
}

/**
 * Toggle Switch Component - Modern SaaS/iOS Style
 *
 * Features:
 * - Uses hidden checkbox for reliable click handling
 * - Pill-shaped track with circular thumb
 * - Smooth CSS transitions
 * - Touch-friendly (44px minimum tap target)
 * - Accessible (ARIA compliant)
 * - Primary color (warm-orange) when checked
 */
export default function Toggle({
  checked,
  onChange,
  disabled = false,
  size = "md",
  label,
  description,
  id: customId,
  className = "",
}: ToggleProps) {
  const generatedId = useId();
  const id = customId || generatedId;

  // Size configurations
  const sizeConfig = {
    sm: {
      track: "w-10 h-6",
      thumb: "h-[18px] w-[18px]",
      thumbTranslate: "translate-x-[18px]",
      thumbStart: "left-[3px]",
    },
    md: {
      track: "w-[46px] h-[26px]",
      thumb: "h-[20px] w-[20px]",
      thumbTranslate: "translate-x-[20px]",
      thumbStart: "left-[3px]",
    },
    lg: {
      track: "w-14 h-8",
      thumb: "h-[24px] w-[24px]",
      thumbTranslate: "translate-x-[24px]",
      thumbStart: "left-[4px]",
    },
  };

  const config = sizeConfig[size];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!disabled) {
      onChange(e.target.checked);
    }
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Toggle Switch - Label wrapping checkbox for full click area */}
      <label
        htmlFor={id}
        className={`
          toggle-switch relative inline-block cursor-pointer
          ${config.track}
          ${disabled ? "opacity-50 cursor-not-allowed" : ""}
        `}
      >
        {/* Hidden checkbox - handles all click/change events */}
        <input
          type="checkbox"
          id={id}
          checked={checked}
          onChange={handleChange}
          disabled={disabled}
          className="sr-only peer"
          aria-label={label}
        />

        {/* Slider track */}
        <span
          className={`
            absolute inset-0 cursor-pointer
            rounded-full
            transition-colors duration-200 ease-out
            ${checked
              ? `bg-primary ${!disabled ? "hover:bg-primary-hover" : ""}`
              : `bg-dark-border ${!disabled ? "hover:bg-dark-hover" : ""}`
            }
            peer-focus-visible:ring-2 peer-focus-visible:ring-primary/50 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-dark-bg
          `}
        />

        {/* Slider thumb (circle) */}
        <span
          className={`
            absolute ${config.thumbStart} top-1/2 -translate-y-1/2
            ${config.thumb}
            bg-white rounded-full
            shadow-md
            transition-transform duration-200 ease-out
            peer-checked:${config.thumbTranslate}
            pointer-events-none
          `}
          style={{
            transform: `translateY(-50%) ${checked ? `translateX(${size === 'sm' ? '18px' : size === 'lg' ? '24px' : '20px'})` : 'translateX(0)'}`,
          }}
        />
      </label>

      {/* Label & Description - separate from toggle for clarity */}
      {(label || description) && (
        <label
          htmlFor={id}
          className={`
            flex flex-col cursor-pointer select-none
            ${disabled ? "opacity-50 cursor-not-allowed" : ""}
          `}
        >
          {label && (
            <span className="text-sm md:text-base font-medium text-white">
              {label}
            </span>
          )}
          {description && (
            <span className="text-xs md:text-sm text-text-muted mt-0.5">
              {description}
            </span>
          )}
        </label>
      )}
    </div>
  );
}

/**
 * ToggleField - Toggle with full-width layout for forms/settings
 *
 * Displays label on the left and toggle on the right
 * Perfect for settings pages
 */
interface ToggleFieldProps extends Omit<ToggleProps, "className"> {
  containerClassName?: string;
}

export function ToggleField({
  label,
  description,
  containerClassName = "",
  ...props
}: ToggleFieldProps) {
  const id = useId();

  const sizeConfig = {
    sm: {
      track: "w-10 h-6",
      thumbSize: 18,
      thumbTravel: 18,
    },
    md: {
      track: "w-[46px] h-[26px]",
      thumbSize: 20,
      thumbTravel: 20,
    },
    lg: {
      track: "w-14 h-8",
      thumbSize: 24,
      thumbTravel: 24,
    },
  };

  const size = props.size || "md";
  const config = sizeConfig[size];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!props.disabled) {
      props.onChange(e.target.checked);
    }
  };

  return (
    <div
      className={`
        flex items-center justify-between
        p-3 md:p-4
        bg-gray-50 dark:bg-dark-bg rounded-xl
        border border-gray-200 dark:border-dark-border
        hover:border-primary/20 transition-colors duration-200
        ${containerClassName}
      `}
    >
      {/* Label section - clicking this also toggles */}
      <label htmlFor={id} className="flex-1 cursor-pointer select-none pr-4">
        {label && (
          <span className="block text-sm md:text-base font-medium text-gray-900 dark:text-white">
            {label}
          </span>
        )}
        {description && (
          <span className="block text-xs md:text-sm text-gray-600 dark:text-text-muted mt-0.5">
            {description}
          </span>
        )}
      </label>

      {/* Toggle Switch */}
      <label
        htmlFor={id}
        className={`
          relative inline-block cursor-pointer shrink-0
          ${config.track}
          ${props.disabled ? "opacity-50 cursor-not-allowed" : ""}
        `}
      >
        {/* Hidden checkbox */}
        <input
          type="checkbox"
          id={id}
          checked={props.checked}
          onChange={handleChange}
          disabled={props.disabled}
          className="sr-only peer"
          aria-label={label}
        />

        {/* Slider track */}
        <span
          className={`
            absolute inset-0 cursor-pointer
            rounded-full
            transition-colors duration-200 ease-out
            ${props.checked
              ? `bg-primary ${!props.disabled ? "hover:bg-primary-hover" : ""}`
              : `bg-gray-300 dark:bg-dark-border ${!props.disabled ? "hover:bg-gray-400 dark:hover:bg-dark-hover" : ""}`
            }
            peer-focus-visible:ring-2 peer-focus-visible:ring-primary/50 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-white dark:peer-focus-visible:ring-offset-dark-bg
          `}
        />

        {/* Slider thumb */}
        <span
          className="absolute top-1/2 bg-white rounded-full shadow-md pointer-events-none transition-transform duration-200 ease-out"
          style={{
            width: `${config.thumbSize}px`,
            height: `${config.thumbSize}px`,
            left: "3px",
            transform: `translateY(-50%) translateX(${props.checked ? config.thumbTravel : 0}px)`,
          }}
        />
      </label>
    </div>
  );
}

