"use client";

import { AnimatedLogo } from "./Logo";

interface LoadingScreenProps {
  message?: string;
}

export default function LoadingScreen({
  message = "Chargement...",
}: LoadingScreenProps) {
  return (
    <div className="fixed inset-0 bg-dark-bg/95 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        {/* Animated Logo */}
        <div className="relative">
          {/* Glow effect */}
          <div className="absolute -inset-4 bg-gradient-to-br from-primary/30 to-accent/30 rounded-full blur-2xl animate-pulse" />

          {/* Logo */}
          <div className="relative">
            <AnimatedLogo size="xl" />
          </div>
        </div>

        {/* Loading Text */}
        {message && (
          <div className="flex flex-col items-center gap-2">
            <p className="text-white font-medium text-lg">{message}</p>
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Inline loader for smaller contexts
export function InlineLoader({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  return (
    <div className="flex items-center justify-center">
      <AnimatedLogo size={size === "sm" ? "sm" : size === "lg" ? "md" : "sm"} />
    </div>
  );
}
