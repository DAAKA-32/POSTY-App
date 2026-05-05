"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Toast as HotToast, toast as hotToast, Toaster, useToasterStore } from "react-hot-toast";
import { triggerHaptic } from "@/hooks/ui/useHapticFeedback";

// ============================================================
// POSTY PREMIUM TOAST SYSTEM
// Discret, élégant, mobile-first
// ============================================================

// Anti-duplicate system: track recent toasts to prevent spam
// Uses "claim first" pattern to prevent race conditions with simultaneous calls
const recentToasts = new Map<string, number>();
const DEDUPE_WINDOW_MS = 2000; // Prevent same toast within 2 seconds
const MIN_INTERVAL_MS = 100; // Minimum interval between same messages (prevents rapid-fire)

function isDuplicate(message: string): boolean {
  const now = Date.now();

  // CRITICAL: Get previous timestamp and immediately claim the slot
  // This prevents race conditions where two simultaneous calls both pass through
  const previousTimestamp = recentToasts.get(message);
  recentToasts.set(message, now); // Claim immediately

  // Clean up old entries (non-blocking, runs after claim)
  for (const [key, timestamp] of recentToasts.entries()) {
    if (now - timestamp > DEDUPE_WINDOW_MS && key !== message) {
      recentToasts.delete(key);
    }
  }

  // If there was a previous toast within the window, it's a duplicate
  if (previousTimestamp && now - previousTimestamp < DEDUPE_WINDOW_MS) {
    return true;
  }

  return false;
}

// Premium smooth easing (Linear/Notion style)
const smoothEase = [0.25, 0.1, 0.25, 1] as const;

// Toast variant configurations - minimal and professional
const toastVariants = {
  success: {
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 16A8 8 0 108 0a8 8 0 000 16zm3.78-9.72a.75.75 0 00-1.06-1.06L6.75 9.19 5.28 7.72a.75.75 0 00-1.06 1.06l2 2a.75.75 0 001.06 0l4.5-4.5z" />
      </svg>
    ),
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
  },
  error: {
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 16A8 8 0 108 0a8 8 0 000 16zM6.25 5.19a.75.75 0 00-1.06 1.06L6.94 8 5.19 9.75a.75.75 0 101.06 1.06L8 9.06l1.75 1.75a.75.75 0 101.06-1.06L9.06 8l1.75-1.75a.75.75 0 10-1.06-1.06L8 6.94 6.25 5.19z" />
      </svg>
    ),
    color: "text-red-500",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
  },
  warning: {
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
        <path d="M6.457 1.047c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0114.082 15H1.918a1.75 1.75 0 01-1.543-2.575L6.457 1.047zM8 5a.75.75 0 00-.75.75v2.5a.75.75 0 001.5 0v-2.5A.75.75 0 008 5zm1 6a1 1 0 11-2 0 1 1 0 012 0z" />
      </svg>
    ),
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
  },
  info: {
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 16A8 8 0 108 0a8 8 0 000 16zm.93-9.412l-1 4.705c-.07.34.029.533.304.533.194 0 .487-.07.686-.246l-.088.416c-.287.346-.92.598-1.465.598-.703 0-1.002-.422-.808-1.319l.738-3.468c.064-.293.006-.399-.287-.47l-.451-.081.082-.381 2.29-.287zM8 5.5a1 1 0 110-2 1 1 0 010 2z" />
      </svg>
    ),
    color: "text-primary",
    bg: "bg-primary/10",
    border: "border-primary/20",
  },
  loading: {
    icon: (
      <svg className="w-4 h-4 animate-spin" viewBox="0 0 16 16" fill="none">
        <circle className="opacity-25" cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" />
        <path className="opacity-75" fill="currentColor" d="M8 2a6 6 0 00-6 6h2a4 4 0 014-4V2z" />
      </svg>
    ),
    color: "text-text-muted",
    bg: "bg-dark-elevated",
    border: "border-dark-border",
  },
};

type ToastType = keyof typeof toastVariants;

interface CustomToastProps {
  t: HotToast;
  type: ToastType;
  message: string;
}

interface ActionToastProps extends CustomToastProps {
  action: {
    label: string;
    onClick: () => void;
  };
}

// Toast with Action Button - for undo functionality
function ActionToast({ t, type, message, action }: ActionToastProps) {
  const variant = toastVariants[type];
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const animationVariants = {
    initial: isMobile
      ? { opacity: 0, y: -50, scale: 0.95 }
      : { opacity: 0, x: 50, scale: 0.95 },
    animate: { opacity: 1, y: 0, x: 0, scale: 1 },
    exit: isMobile
      ? { opacity: 0, y: -20, scale: 0.95 }
      : { opacity: 0, x: 20, scale: 0.95 },
  };

  return (
    <motion.div
      initial={animationVariants.initial}
      animate={animationVariants.animate}
      exit={animationVariants.exit}
      transition={{ duration: 0.2, ease: smoothEase }}
      className={`
        flex items-start gap-3 px-4 py-2.5
        bg-background/95 backdrop-blur-lg
        border ${variant.border}
        rounded-2xl shadow-lg shadow-black/10
        max-w-[calc(100vw-32px)] sm:max-w-md
      `}
      role="alert"
      aria-live="polite"
    >
      {/* Icon */}
      <span className={`flex-shrink-0 mt-0.5 ${variant.color}`}>
        {variant.icon}
      </span>

      {/* Message */}
      <span className="flex-1 text-sm font-medium text-text-primary whitespace-normal break-words">
        {message}
      </span>

      {/* Action Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          action.onClick();
          hotToast.dismiss(t.id);
        }}
        className="flex-shrink-0 px-2.5 py-1 text-xs font-semibold text-primary hover:text-primary-hover bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors"
      >
        {action.label}
      </button>
    </motion.div>
  );
}

// Minimal Toast Component - compact and professional
function MinimalToast({ t, type, message }: CustomToastProps) {
  const variant = toastVariants[type];
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Animation variants based on position
  const animationVariants = {
    initial: isMobile
      ? { opacity: 0, y: -50, scale: 0.95 }
      : { opacity: 0, x: 50, scale: 0.95 },
    animate: { opacity: 1, y: 0, x: 0, scale: 1 },
    exit: isMobile
      ? { opacity: 0, y: -20, scale: 0.95 }
      : { opacity: 0, x: 20, scale: 0.95 },
  };

  return (
    <motion.div
      initial={animationVariants.initial}
      animate={animationVariants.animate}
      exit={animationVariants.exit}
      transition={{ duration: 0.2, ease: smoothEase }}
      onClick={() => hotToast.dismiss(t.id)}
      className={`
        flex items-start gap-2.5 px-4 py-2.5
        bg-background/95 backdrop-blur-lg
        border ${variant.border}
        rounded-2xl shadow-lg shadow-black/10
        cursor-pointer select-none
        transition-all duration-150
        hover:bg-dark-elevated/80
        active:scale-[0.98]
        max-w-[calc(100vw-32px)] sm:max-w-md
      `}
      role="alert"
      aria-live="polite"
    >
      {/* Icon */}
      <span className={`flex-shrink-0 mt-0.5 ${variant.color}`}>
        {variant.icon}
      </span>

      {/* Message — wraps freely, never truncated */}
      <span className="flex-1 text-sm font-medium text-text-primary whitespace-normal break-words">
        {message}
      </span>
    </motion.div>
  );
}

// Toast limiter hook - max 3 toasts at once
function useToastLimit(limit: number = 3) {
  const { toasts } = useToasterStore();

  useEffect(() => {
    toasts
      .filter((t) => t.visible)
      .slice(limit)
      .forEach((t) => hotToast.dismiss(t.id));
  }, [toasts, limit]);
}

// Premium Toaster Configuration - Mobile-first positioning
export function PremiumToaster() {
  useToastLimit(3);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return (
    <Toaster
      position={isMobile ? "top-center" : "top-right"}
      containerStyle={{
        // Mobile: top with safe area (avoids overlap with inputs and keyboard)
        ...(isMobile ? {
          top: "calc(max(env(safe-area-inset-top, 0px), 12px) + 4px)",
          left: 0,
          right: 0,
          padding: "0 16px",
        } : {
          top: 16,
          right: 16,
        }),
      }}
      toastOptions={{
        // Hide default rendering
        style: {
          background: "transparent",
          boxShadow: "none",
          padding: 0,
          opacity: 0,
          pointerEvents: "none",
        },
        className: "hidden-toast",
      }}
      gutter={8}
    />
  );
}

// ============================================================
// TOAST API - Simple and clean
// ============================================================

// Default durations (shorter for better UX)
const DURATIONS = {
  success: 2500,  // Quick feedback
  error: 3500,    // More time to read errors
  warning: 3000,
  info: 2500,
  loading: Infinity,
};

export const toast = {
  /**
   * Success toast - quick positive feedback
   * Automatically triggers success haptic feedback on mobile
   */
  success: (message: string, options?: { duration?: number; skipDedupe?: boolean; haptic?: boolean }) => {
    if (!options?.skipDedupe && isDuplicate(message)) return "";

    // Trigger haptic feedback (enabled by default, can be disabled with haptic: false)
    if (options?.haptic !== false) {
      triggerHaptic("success");
    }

    return hotToast.custom(
      (t) => <MinimalToast t={t} type="success" message={message} />,
      { duration: options?.duration || DURATIONS.success }
    );
  },

  /**
   * Error toast - for errors and failures
   * Automatically triggers error haptic feedback on mobile
   */
  error: (message: string, options?: {
    duration?: number;
    skipDedupe?: boolean;
    haptic?: boolean;
    action?: { label: string; onClick: () => void };
  }) => {
    if (!options?.skipDedupe && isDuplicate(message)) return "";

    // Trigger haptic feedback (enabled by default, can be disabled with haptic: false)
    if (options?.haptic !== false) {
      triggerHaptic("error");
    }

    // Use ActionToast when an action is provided (e.g. "Reconnect LinkedIn"
    // for a session-expired error). Renders the same error styling but with
    // a recovery button alongside.
    if (options?.action) {
      return hotToast.custom(
        (t) => <ActionToast t={t} type="error" message={message} action={options.action!} />,
        { duration: options?.duration || 6000 }
      );
    }

    return hotToast.custom(
      (t) => <MinimalToast t={t} type="error" message={message} />,
      { duration: options?.duration || DURATIONS.error }
    );
  },

  /**
   * Warning toast - for cautions
   * Automatically triggers warning haptic feedback on mobile
   */
  warning: (message: string, options?: { duration?: number; skipDedupe?: boolean; haptic?: boolean }) => {
    if (!options?.skipDedupe && isDuplicate(message)) return "";

    // Trigger haptic feedback (enabled by default, can be disabled with haptic: false)
    if (options?.haptic !== false) {
      triggerHaptic("warning");
    }

    return hotToast.custom(
      (t) => <MinimalToast t={t} type="warning" message={message} />,
      { duration: options?.duration || DURATIONS.warning }
    );
  },

  /**
   * Info toast - neutral information (supports action button for undo)
   * Triggers light haptic feedback on mobile
   */
  info: (message: string, options?: {
    duration?: number;
    skipDedupe?: boolean;
    haptic?: boolean;
    action?: { label: string; onClick: () => void };
  }) => {
    if (!options?.skipDedupe && isDuplicate(message)) return "";

    // Trigger light haptic feedback for info (enabled by default)
    if (options?.haptic !== false) {
      triggerHaptic("light");
    }

    // Use ActionToast if action is provided
    if (options?.action) {
      return hotToast.custom(
        (t) => <ActionToast t={t} type="info" message={message} action={options.action!} />,
        { duration: options?.duration || 5000 } // Longer for actions
      );
    }

    return hotToast.custom(
      (t) => <MinimalToast t={t} type="info" message={message} />,
      { duration: options?.duration || DURATIONS.info }
    );
  },

  /**
   * Loading toast - for async operations
   */
  loading: (message: string) => {
    return hotToast.custom(
      (t) => <MinimalToast t={t} type="loading" message={message} />,
      { duration: DURATIONS.loading }
    );
  },

  /**
   * Promise toast - handles async operations elegantly
   */
  promise: <T,>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((err: Error) => string);
    }
  ) => {
    const id = toast.loading(messages.loading);

    promise
      .then((data) => {
        hotToast.dismiss(id);
        const msg = typeof messages.success === "function"
          ? messages.success(data)
          : messages.success;
        toast.success(msg, { skipDedupe: true });
        return data;
      })
      .catch((err) => {
        hotToast.dismiss(id);
        const msg = typeof messages.error === "function"
          ? messages.error(err)
          : messages.error;
        toast.error(msg, { skipDedupe: true });
      });

    return promise;
  },

  /**
   * Dismiss toast(s)
   */
  dismiss: (id?: string) => {
    if (id) {
      hotToast.dismiss(id);
    } else {
      hotToast.dismiss();
    }
  },
};

export default toast;
