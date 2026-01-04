"use client";

import { useState, useEffect, useCallback } from "react";

// Animated success checkmark
export function SuccessCheck({ show, size = "md" }: { show: boolean; size?: "sm" | "md" | "lg" }) {
  const sizes = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  if (!show) return null;

  return (
    <div className={`${sizes[size]} text-accent animate-scale-bounce`}>
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={3}
          d="M5 13l4 4L19 7"
          className="success-check"
        />
      </svg>
    </div>
  );
}

// Animated copy button with feedback
export function CopyButton({
  text,
  className = "",
  size = "md",
}: {
  text: string;
  className?: string;
  size?: "sm" | "md";
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);

      // Haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate(10);
      }

      setTimeout(() => setCopied(false), 2000);
    } catch {
      console.error("Failed to copy");
    }
  }, [text]);

  const iconSize = size === "sm" ? "w-4 h-4" : "w-5 h-5";
  const padding = size === "sm" ? "p-1.5" : "p-2";

  return (
    <button
      onClick={handleCopy}
      className={`
        ${padding} rounded-lg
        text-text-secondary hover:text-white
        hover:bg-dark-hover
        transition-all duration-200
        touch-feedback
        ${className}
      `}
      title={copied ? "Copie !" : "Copier"}
    >
      {copied ? (
        <svg className={`${iconSize} text-accent`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className={iconSize} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
        </svg>
      )}
    </button>
  );
}

// Animated like/heart button
export function LikeButton({
  liked,
  onToggle,
  count,
  className = "",
}: {
  liked: boolean;
  onToggle: () => void;
  count?: number;
  className?: string;
}) {
  const handleClick = () => {
    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(liked ? 10 : 25);
    }
    onToggle();
  };

  return (
    <button
      onClick={handleClick}
      className={`
        flex items-center gap-1.5 p-2 rounded-lg
        transition-all duration-200 touch-feedback
        ${liked
          ? "text-error"
          : "text-text-secondary hover:text-error/70 hover:bg-dark-hover"
        }
        ${className}
      `}
    >
      <svg
        className={`w-5 h-5 ${liked ? "animate-heartbeat" : ""}`}
        fill={liked ? "currentColor" : "none"}
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
        />
      </svg>
      {count !== undefined && (
        <span className="text-sm font-medium">{count}</span>
      )}
    </button>
  );
}

// Animated share button
export function ShareButton({
  onShare,
  className = "",
}: {
  onShare: () => void;
  className?: string;
}) {
  const [shared, setShared] = useState(false);

  const handleShare = () => {
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
    onShare();
    setShared(true);
    setTimeout(() => setShared(false), 2000);
  };

  return (
    <button
      onClick={handleShare}
      className={`
        p-2 rounded-lg
        text-text-secondary hover:text-primary hover:bg-dark-hover
        transition-all duration-200 touch-feedback
        ${shared ? "text-primary" : ""}
        ${className}
      `}
      title="Partager"
    >
      <svg
        className={`w-5 h-5 ${shared ? "animate-bounce" : ""}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
        />
      </svg>
    </button>
  );
}

// Loading dots animation
export function LoadingDots({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce"
          style={{
            animationDelay: `${i * 150}ms`,
            animationDuration: "600ms",
          }}
        />
      ))}
    </div>
  );
}

// Pulse ring animation for active elements
export function PulseRing({
  show,
  color = "primary",
  className = "",
}: {
  show: boolean;
  color?: "primary" | "accent" | "error";
  className?: string;
}) {
  const colors = {
    primary: "bg-primary",
    accent: "bg-accent",
    error: "bg-error",
  };

  if (!show) return null;

  return (
    <span className={`absolute inset-0 ${className}`}>
      <span
        className={`
          absolute inset-0 rounded-full ${colors[color]} opacity-75
          animate-ping
        `}
      />
    </span>
  );
}

// Toast notification component
interface ToastProps {
  message: string;
  type?: "success" | "error" | "info";
  show: boolean;
  onClose: () => void;
}

export function Toast({ message, type = "info", show, onClose }: ToastProps) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(onClose, 3000);
      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  if (!show) return null;

  const colors = {
    success: "bg-accent/20 border-accent/30 text-accent",
    error: "bg-error/20 border-error/30 text-error",
    info: "bg-primary/20 border-primary/30 text-primary",
  };

  const icons = {
    success: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
    error: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
    info: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  };

  return (
    <div
      className={`
        fixed bottom-24 left-1/2 -translate-x-1/2 z-50
        px-4 py-3 rounded-xl border
        flex items-center gap-3
        animate-slide-up
        ${colors[type]}
      `}
    >
      {icons[type]}
      <span className="text-sm font-medium">{message}</span>
    </div>
  );
}

// Progress bar with animation
export function ProgressBar({
  progress,
  className = "",
  showLabel = false,
}: {
  progress: number;
  className?: string;
  showLabel?: boolean;
}) {
  return (
    <div className={`w-full ${className}`}>
      {showLabel && (
        <div className="flex justify-between text-xs text-text-muted mb-1">
          <span>Progression</span>
          <span>{Math.round(progress)}%</span>
        </div>
      )}
      <div className="h-1.5 bg-dark-border rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-500 ease-out progress-fill"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

// Skeleton loader for content
export function Skeleton({
  width = "100%",
  height = "1rem",
  className = "",
  rounded = "md",
}: {
  width?: string;
  height?: string;
  className?: string;
  rounded?: "sm" | "md" | "lg" | "full";
}) {
  const roundedClasses = {
    sm: "rounded-sm",
    md: "rounded-md",
    lg: "rounded-lg",
    full: "rounded-full",
  };

  return (
    <div
      className={`skeleton ${roundedClasses[rounded]} ${className}`}
      style={{ width, height }}
    />
  );
}

// Animated counter for stats
export function AnimatedNumber({
  value,
  duration = 1000,
  className = "",
}: {
  value: number;
  duration?: number;
  className?: string;
}) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    const startValue = displayValue;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);

      // Easing function
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(startValue + (value - startValue) * eased));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [value, duration]);

  return (
    <span className={`count-up ${className}`}>
      {displayValue.toLocaleString()}
    </span>
  );
}
