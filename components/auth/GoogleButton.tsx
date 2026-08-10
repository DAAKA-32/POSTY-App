"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

interface GoogleButtonProps {
  onSuccess?: () => void;
  onError?: (message: string) => void;
  onStartAuth?: () => void;
  label?: string;
  /** Consent state from parent. undefined = no consent needed (login), true/false = signup consent state */
  consentGiven?: boolean;
  /** Called when user clicks button without consent */
  onConsentMissing?: () => void;
}

export default function GoogleButton({ onSuccess, onError, onStartAuth, label = "Continuer avec Google", consentGiven, onConsentMissing }: GoogleButtonProps) {
  const { signInWithGoogle } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const needsConsent = consentGiven === false;

  const handleClick = async () => {
    if (needsConsent) {
      onConsentMissing?.();
      return;
    }

    // Clear any existing error state before starting Google auth
    onStartAuth?.();

    setIsLoading(true);
    try {
      await signInWithGoogle();
      onSuccess?.();
    } catch (err) {
      // Only show error if it's a real error (not user cancellation)
      if (err instanceof Error && err.message) {
        onError?.(err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={isLoading || needsConsent}
      aria-busy={isLoading}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="
        group relative flex h-[52px] w-full items-center justify-center gap-3
        overflow-hidden rounded-xl
        border border-gray-200/90 bg-white/90
        px-4 text-[15px] font-medium text-gray-700
        shadow-[0_1px_2px_rgba(15,17,21,0.04)]
        transition-[background-color,border-color,box-shadow] duration-200
        hover:border-gray-300 hover:bg-white hover:shadow-[0_2px_8px_-2px_rgba(15,17,21,0.10)]
        focus:outline-none focus-visible:ring-2 focus-visible:ring-warm-orange/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white
        active:scale-[0.99]
        disabled:cursor-not-allowed disabled:opacity-50
      "
    >
      {/* Hover sheen — a slow, low-opacity pass. Deliberately quieter than a
          "shine": on a login card it should read as material, not as an effect. */}
      <div
        aria-hidden
        className={`
          pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-gray-100/50 to-transparent
          transition-transform duration-700 ease-out
          ${isHovered ? "translate-x-full" : "-translate-x-full"}
        `}
      />

      {isLoading ? (
        <svg
          className="animate-spin h-5 w-5 text-gray-600"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ) : (
        <>
          {/* Google Icon with subtle background */}
          <div className="relative flex h-5 w-5 shrink-0 items-center justify-center">
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
          </div>
          <span className="relative font-medium">{label}</span>
        </>
      )}
    </button>
  );
}
