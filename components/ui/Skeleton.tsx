"use client";

// ============== SKELETON LOADER ==============

interface SkeletonProps {
  className?: string;
  variant?: "text" | "circular" | "rectangular" | "rounded";
  width?: string | number;
  height?: string | number;
  animation?: "shimmer" | "pulse" | "none";
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

  const animationStyles = {
    shimmer: "bg-gradient-to-r from-dark-card via-dark-elevated to-dark-card bg-[length:200%_100%] animate-shimmer",
    pulse: "bg-dark-elevated animate-skeleton-pulse",
    none: "bg-dark-elevated",
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
}

export function Spinner({ size = "md", className = "" }: SpinnerProps) {
  const sizeStyles = {
    sm: "w-4 h-4 border-2",
    md: "w-8 h-8 border-3",
    lg: "w-12 h-12 border-4",
  };

  return (
    <div
      className={`
        ${sizeStyles[size]}
        border-dark-border
        border-t-primary
        rounded-full
        animate-spin
        ${className}
      `}
    />
  );
}

// ============== LOADING DOTS ==============

export function LoadingDots({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <span className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
      <span className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
      <span className="w-2 h-2 bg-primary rounded-full animate-bounce" />
    </div>
  );
}

// ============== TYPING INDICATOR ==============

export function TypingIndicator({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 px-4 py-3 bg-dark-elevated rounded-2xl w-fit ${className}`}>
      <div className="flex gap-1">
        <span className="w-2 h-2 bg-text-secondary rounded-full animate-bounce [animation-delay:-0.3s]" />
        <span className="w-2 h-2 bg-text-secondary rounded-full animate-bounce [animation-delay:-0.15s]" />
        <span className="w-2 h-2 bg-text-secondary rounded-full animate-bounce" />
      </div>
    </div>
  );
}

// ============== PAGE LOADER ==============

interface PageLoaderProps {
  message?: string;
}

export function PageLoader({ message = "Chargement..." }: PageLoaderProps) {
  return (
    <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
      <div className="flex flex-col items-center gap-4 animate-fade-in">
        {/* Logo animation */}
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent animate-pulse-soft" />
          <div className="absolute inset-0 w-16 h-16 rounded-2xl border-2 border-primary/30 animate-ping" />
        </div>

        {/* Text */}
        <p className="text-text-secondary text-sm">{message}</p>

        {/* Progress bar */}
        <div className="w-48 h-1 bg-dark-border rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-primary to-accent rounded-full animate-shimmer bg-[length:200%_100%]" />
        </div>
      </div>
    </div>
  );
}
