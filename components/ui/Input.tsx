"use client";

import { InputHTMLAttributes, forwardRef, useState, useEffect, useId } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  success?: boolean;
  helperText?: string;
  showPasswordToggle?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, success, helperText, className = "", type, showPasswordToggle, value, id: externalId, ...props }, ref) => {
    const generatedId = useId();
    const inputId = externalId || `input-${generatedId}`;
    const errorId = `${inputId}-error`;
    const helperTextId = `${inputId}-helper`;
    const [isFocused, setIsFocused] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(true);

    // Listen to theme changes
    useEffect(() => {
      const checkTheme = () => {
        setIsDarkMode(document.documentElement.classList.contains("dark"));
      };

      checkTheme();

      // Observe theme changes
      const observer = new MutationObserver(checkTheme);
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["class"],
      });

      return () => observer.disconnect();
    }, []);

    const hasValue = value !== undefined && value !== "";
    const isFloating = isFocused || hasValue;
    const isPassword = type === "password";
    const inputType = isPassword && showPassword ? "text" : type;

    return (
      <div className="w-full">
        <div className="relative">
          {/* Floating Label */}
          {label && (
            <label
              htmlFor={inputId}
              className={`
                absolute left-4 z-10 transition-all duration-200 ease-out pointer-events-none
                ${isFloating
                  ? "top-1 text-xs font-medium"
                  : "top-1/2 -translate-y-1/2 text-base text-text-muted"
                }
                ${error ? "text-error" : success ? "text-success" : isFloating ? "text-primary" : ""}
              `}
            >
              {label}
            </label>
          )}

          <input
            ref={ref}
            id={inputId}
            type={inputType}
            value={value}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : helperText ? helperTextId : undefined}
            onFocus={(e) => {
              setIsFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              props.onBlur?.(e);
            }}
            className={`
              w-full px-4 pt-5 pb-2
              bg-light-card dark:bg-dark-card
              border-2 ${error ? "border-error" : success ? "border-success" : isFocused ? "border-primary" : "border-light-border dark:border-dark-border"}
              rounded-lg
              text-text-primary text-base
              placeholder-text-muted/50
              focus:outline-none focus:ring-2 ${error ? "focus:ring-error/30" : success ? "focus:ring-success/30" : "focus:ring-primary/30"} focus:ring-offset-1 focus:ring-offset-light-bg dark:focus:ring-offset-dark-bg
              transition-all duration-200 ease-out
              transform-gpu
              ${isFocused ? "scale-[1.01] shadow-sm" : ""}
              disabled:bg-light-hover dark:disabled:bg-dark-hover disabled:opacity-60 disabled:cursor-not-allowed
              min-h-[56px]
              caret-primary
              autofill:bg-light-card dark:autofill:bg-dark-card autofill:text-text-primary
              ${isPassword && showPasswordToggle !== false ? "pr-12" : ""}
              ${className}
            `}
            style={{
              colorScheme: isDarkMode ? "dark" : "light",
              WebkitTextFillColor: value
                ? isDarkMode
                  ? "#FFFFFF"
                  : "#111827"
                : undefined,
            }}
            {...props}
          />

          {/* Password Toggle Button */}
          {isPassword && showPasswordToggle !== false && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="
                absolute right-2 top-1/2 -translate-y-1/2
                min-w-[44px] min-h-[44px] flex items-center justify-center
                rounded-lg
                text-text-muted hover:text-text-primary
                hover:bg-light-hover dark:hover:bg-dark-hover
                transition-all duration-200 ease-out
                transform-gpu active:scale-[0.92] active:transition-none
                focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-light-card dark:focus-visible:ring-offset-dark-card
              "
              aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
            >
              {showPassword ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          )}
        </div>

        {/* Error message with animation */}
        {error && (
          <p id={errorId} role="alert" className="mt-2 text-sm text-error flex items-center gap-1.5 animate-fade-in">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </p>
        )}

        {/* Success indicator */}
        {success && !error && (
          <p className="mt-2 text-sm text-success flex items-center gap-1.5 animate-fade-in">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Valide
          </p>
        )}

        {/* Helper text */}
        {helperText && !error && !success && (
          <p id={helperTextId} className="mt-2 text-sm text-text-muted">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export default Input;
