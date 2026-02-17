"use client";

import { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ============== SKELETON LOADER ==============

interface SkeletonProps {
  className?: string;
  variant?: "text" | "circular" | "rectangular" | "rounded";
  width?: string | number;
  height?: string | number;
  animation?: "shimmer" | "pulse" | "none" | "premium";
}

export function Skeleton({
  className = "",
  variant = "rectangular",
  width,
  height,
  animation = "shimmer",
}: SkeletonProps) {
  const variantStyles = {
    text: "rounded",
    circular: "rounded-full",
    rectangular: "",
    rounded: "rounded-xl",
  };

  // Updated animation styles with orange/salmon tints for premium feel
  const animationStyles = {
    shimmer: "skeleton-shimmer",
    pulse: "skeleton-pulse",
    none: "bg-dark-elevated dark:bg-dark-elevated",
    premium: "skeleton-premium",
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === "number" ? `${width}px` : width;
  if (height) style.height = typeof height === "number" ? `${height}px` : height;

  return (
    <div
      className={`
        ${variantStyles[variant]}
        ${animationStyles[animation]}
        ${className}
      `}
      style={style}
    />
  );
}

// ============== SKELETON WRAPPER WITH FADE TRANSITION ==============

interface SkeletonWrapperProps {
  isLoading: boolean;
  skeleton: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * Wrapper component that handles smooth transitions between skeleton and content
 *
 * Usage:
 * ```tsx
 * <SkeletonWrapper
 *   isLoading={isLoading}
 *   skeleton={<SkeletonCard />}
 * >
 *   <ActualContent />
 * </SkeletonWrapper>
 * ```
 */
export function SkeletonWrapper({
  isLoading,
  skeleton,
  children,
  className = "",
}: SkeletonWrapperProps) {
  return (
    <div className={className}>
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="skeleton"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            {skeleton}
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============== SKELETON PRESETS ==============

export function SkeletonText({ lines = 3, className = "" }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant="text"
          height={16}
          width={i === lines - 1 ? "70%" : "100%"}
        />
      ))}
    </div>
  );
}

export function SkeletonAvatar({ size = 48, className = "" }: { size?: number; className?: string }) {
  return (
    <Skeleton
      variant="circular"
      width={size}
      height={size}
      className={className}
    />
  );
}

export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div className={`bg-dark-card border border-dark-border rounded-xl p-4 ${className}`}>
      <div className="flex items-center gap-3 mb-4">
        <SkeletonAvatar size={40} />
        <div className="flex-1">
          <Skeleton variant="text" height={14} width="60%" className="mb-2" />
          <Skeleton variant="text" height={12} width="40%" />
        </div>
      </div>
      <SkeletonText lines={3} />
    </div>
  );
}

export function SkeletonButton({ className = "" }: { className?: string }) {
  return (
    <Skeleton
      variant="rounded"
      height={44}
      width="100%"
      className={className}
    />
  );
}

export function SkeletonInput({ className = "" }: { className?: string }) {
  return (
    <Skeleton
      variant="rounded"
      height={48}
      width="100%"
      className={className}
    />
  );
}

// ============== CHAT SKELETON ==============

export function SkeletonChatMessage({ isUser = false }: { isUser?: boolean }) {
  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <SkeletonAvatar size={36} />
      <div className={`flex-1 max-w-[80%] ${isUser ? "flex flex-col items-end" : ""}`}>
        <Skeleton
          variant="rounded"
          height={60}
          width={isUser ? "60%" : "80%"}
          className="mb-2"
        />
        <Skeleton variant="text" height={10} width="20%" />
      </div>
    </div>
  );
}

export function SkeletonChatList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonChatMessage key={i} isUser={i % 2 === 1} />
      ))}
    </div>
  );
}

// ============== PROFILE SKELETON ==============

export function SkeletonProfile() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <SkeletonAvatar size={80} />
        <div className="flex-1">
          <Skeleton variant="text" height={24} width="50%" className="mb-2" />
          <Skeleton variant="text" height={16} width="70%" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} variant="rounded" height={80} />
        ))}
      </div>

      {/* Content sections */}
      <div className="space-y-4">
        <Skeleton variant="rounded" height={120} />
        <Skeleton variant="rounded" height={100} />
      </div>
    </div>
  );
}

// ============== POST SKELETON ==============

export function SkeletonPost() {
  return (
    <div className="bg-dark-card border border-dark-border rounded-xl p-5">
      <div className="flex items-start gap-3 mb-4">
        <SkeletonAvatar size={44} />
        <div className="flex-1">
          <Skeleton variant="text" height={16} width="40%" className="mb-1" />
          <Skeleton variant="text" height={12} width="25%" />
        </div>
      </div>
      <SkeletonText lines={4} className="mb-4" />
      <div className="flex gap-3">
        <Skeleton variant="rounded" height={36} width={100} />
        <Skeleton variant="rounded" height={36} width={100} />
      </div>
    </div>
  );
}

// ============== SIDEBAR SKELETON ==============

export function SkeletonSidebar() {
  return (
    <div className="space-y-4 p-4">
      {/* Search */}
      <SkeletonInput />

      {/* Section title */}
      <Skeleton variant="text" height={12} width="30%" className="mt-6" />

      {/* Items */}
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} variant="rounded" height={44} />
        ))}
      </div>

      {/* Another section */}
      <Skeleton variant="text" height={12} width="40%" className="mt-6" />
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} variant="rounded" height={44} />
        ))}
      </div>
    </div>
  );
}

// ============== LOADING SPINNER ==============

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  variant?: "default" | "gradient";
}

export function Spinner({ size = "md", className = "", variant = "default" }: SpinnerProps) {
  const sizeStyles = {
    sm: "w-4 h-4 border-2",
    md: "w-8 h-8 border-3",
    lg: "w-12 h-12 border-4",
  };

  if (variant === "gradient") {
    return (
      <div
        className={`
          ${sizeStyles[size]}
          border-primary
          border-t-accent
          border-r-transparent
          rounded-full
          animate-spin
          ${className}
        `}
        style={{ boxShadow: "0 0 12px rgba(232, 147, 77, 0.3)" }}
      />
    );
  }

  return (
    <div
      className={`
        ${sizeStyles[size]}
        border-dark-border dark:border-dark-border
        border-t-primary
        rounded-full
        animate-spin
        ${className}
      `}
    />
  );
}

// ============== LOADING DOTS - Orange/Salmon ==============

export function LoadingDots({ className = "", variant = "default" }: { className?: string; variant?: "default" | "gradient" }) {
  if (variant === "gradient") {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-2 h-2 rounded-full animate-bounce"
            style={{
              background: "linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)",
              boxShadow: "0 0 6px rgba(232, 147, 77, 0.4)",
              animationDelay: `${-0.3 + i * 0.15}s`,
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <span className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
      <span className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
      <span className="w-2 h-2 bg-primary rounded-full animate-bounce" />
    </div>
  );
}

// ============== TYPING INDICATOR - Premium Orange/Salmon ==============

export function TypingIndicator({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 px-4 py-3 bg-dark-elevated dark:bg-dark-elevated rounded-2xl w-fit ${className}`}>
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-2 h-2 rounded-full animate-bounce"
            style={{
              background: "linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)",
              animationDelay: `${-0.3 + i * 0.15}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ============== PAGE LOADER - Premium Orange/Salmon ==============

interface PageLoaderProps {
  message?: string;
  showProgress?: boolean;
}

export function PageLoader({ message = "Chargement...", showProgress = true }: PageLoaderProps) {
  return (
    <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
      <div className="flex flex-col items-center gap-6 animate-fade-in">
        {/* Logo with premium glow */}
        <div className="relative">
          {/* Glow effect */}
          <div
            className="absolute -inset-4 rounded-3xl blur-2xl animate-pulse"
            style={{
              background: "linear-gradient(135deg, rgba(232, 147, 77, 0.3) 0%, rgba(248, 87, 81, 0.3) 100%)",
            }}
          />
          {/* Logo container */}
          <div className="relative w-16 h-16 lg:w-20 lg:h-20 rounded-2xl overflow-hidden flex items-center justify-center">
            <img
              src="/logo.png"
              alt="Posty Logo"
              className="w-full h-full object-contain"
            />
          </div>
          {/* Ping effect */}
          <div
            className="absolute inset-0 w-16 h-16 lg:w-20 lg:h-20 rounded-2xl animate-ping opacity-30"
            style={{
              border: "2px solid var(--primary)",
            }}
          />
        </div>

        {/* Brand name */}
        <h1 className="text-xl lg:text-2xl font-bold text-white tracking-tight">
          POSTY
        </h1>

        {/* Text */}
        <p className="text-text-secondary text-sm">{message}</p>

        {/* Progress bar */}
        {showProgress && (
          <div className="w-48 h-1.5 bg-dark-border dark:bg-dark-border rounded-full overflow-hidden">
            <div
              className="h-full rounded-full animate-progress-indeterminate"
              style={{
                background: "linear-gradient(90deg, var(--primary) 0%, var(--accent) 50%, var(--primary) 100%)",
                backgroundSize: "200% 100%",
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
