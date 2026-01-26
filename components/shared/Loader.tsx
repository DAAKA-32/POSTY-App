"use client";

import { motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface LoaderProps {
  size?: "sm" | "md" | "lg" | "xl";
  color?: "primary" | "white" | "muted" | "accent" | "gradient";
  className?: string;
}

const sizeClasses = {
  sm: "w-4 h-4 border-2",
  md: "w-6 h-6 border-2",
  lg: "w-8 h-8 border-[3px]",
  xl: "w-12 h-12 border-[3px]",
};

const colorClasses = {
  primary: "border-primary border-t-transparent",
  accent: "border-accent border-t-transparent",
  white: "border-white border-t-transparent",
  muted: "border-text-muted border-t-transparent",
  gradient: "border-primary border-t-accent border-r-transparent",
};

/**
 * Base reusable loader component
 * Modern circular spinner with smooth animations - Orange/Salmon palette
 */
export default function Loader({
  size = "md",
  color = "primary",
  className = "",
}: LoaderProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      className={`
        ${sizeClasses[size]}
        ${colorClasses[color]}
        rounded-full
        ${className}
      `}
      animate={{ rotate: prefersReducedMotion ? 0 : 360 }}
      transition={{
        duration: prefersReducedMotion ? 0 : 0.8,
        repeat: prefersReducedMotion ? 0 : Infinity,
        ease: "linear",
      }}
      style={{
        borderStyle: "solid",
      }}
    />
  );
}

/**
 * Premium gradient spinner with glow effect
 */
export function GradientLoader({
  size = "md",
  className = "",
}: Omit<LoaderProps, "color">) {
  const prefersReducedMotion = useReducedMotion();

  const sizeValues = {
    sm: { width: 16, border: 2 },
    md: { width: 24, border: 2 },
    lg: { width: 32, border: 3 },
    xl: { width: 48, border: 3 },
  };

  const { width, border } = sizeValues[size];

  return (
    <div className={`relative ${className}`} style={{ width, height: width }}>
      {/* Glow effect */}
      <motion.div
        className="absolute inset-0 rounded-full bg-gradient-to-r from-primary to-accent opacity-30 blur-md"
        animate={prefersReducedMotion ? {} : { scale: [1, 1.2, 1] }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      {/* Spinner */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background: `conic-gradient(from 0deg, transparent 0%, var(--primary) 25%, var(--accent) 50%, transparent 75%)`,
          mask: `radial-gradient(farthest-side, transparent calc(100% - ${border}px), black calc(100% - ${border}px))`,
          WebkitMask: `radial-gradient(farthest-side, transparent calc(100% - ${border}px), black calc(100% - ${border}px))`,
        }}
        animate={{ rotate: prefersReducedMotion ? 0 : 360 }}
        transition={{
          duration: prefersReducedMotion ? 0 : 1,
          repeat: prefersReducedMotion ? 0 : Infinity,
          ease: "linear",
        }}
      />
    </div>
  );
}

/**
 * Loader with pulsing dots animation - Orange/Salmon gradient
 */
export function LoaderDots({
  size = "md",
  color = "primary",
  className = "",
  variant = "bounce",
}: LoaderProps & { variant?: "bounce" | "pulse" | "wave" }) {
  const prefersReducedMotion = useReducedMotion();

  const dotSize = {
    sm: "w-1.5 h-1.5",
    md: "w-2 h-2",
    lg: "w-2.5 h-2.5",
    xl: "w-3 h-3",
  };

  const dotColor = {
    primary: "bg-primary",
    accent: "bg-accent",
    white: "bg-white",
    muted: "bg-text-muted",
    gradient: "bg-gradient-to-r from-primary to-accent",
  };

  // Different animation variants
  const animations = {
    bounce: {
      y: prefersReducedMotion ? 0 : [0, -8, 0],
      scale: 1,
      opacity: 1,
    },
    pulse: {
      scale: prefersReducedMotion ? 1 : [1, 1.3, 1],
      opacity: prefersReducedMotion ? 1 : [0.4, 1, 0.4],
    },
    wave: {
      scaleY: prefersReducedMotion ? 1 : [1, 1.8, 1],
      opacity: 1,
    },
  };

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      {[0, 1, 2].map((index) => (
        <motion.div
          key={index}
          className={`${dotSize[size]} ${dotColor[color as keyof typeof dotColor] || dotColor.primary} rounded-full`}
          animate={animations[variant]}
          transition={{
            duration: prefersReducedMotion ? 0 : 0.6,
            repeat: prefersReducedMotion ? 0 : Infinity,
            delay: prefersReducedMotion ? 0 : index * 0.15,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

/**
 * Premium gradient dots loader
 */
export function GradientDots({
  size = "md",
  className = "",
}: Omit<LoaderProps, "color">) {
  const prefersReducedMotion = useReducedMotion();

  const dotSizeValues = {
    sm: 6,
    md: 8,
    lg: 10,
    xl: 12,
  };

  const dotWidth = dotSizeValues[size];

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      {[0, 1, 2].map((index) => (
        <motion.div
          key={index}
          className="rounded-full"
          style={{
            width: dotWidth,
            height: dotWidth,
            background: `linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)`,
            boxShadow: "0 0 8px rgba(232, 147, 77, 0.4)",
          }}
          animate={{
            y: prefersReducedMotion ? 0 : [0, -8, 0],
            opacity: prefersReducedMotion ? 1 : [0.6, 1, 0.6],
          }}
          transition={{
            duration: prefersReducedMotion ? 0 : 0.6,
            repeat: prefersReducedMotion ? 0 : Infinity,
            delay: prefersReducedMotion ? 0 : index * 0.12,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

/**
 * Loader with text message - Premium version
 */
export function LoaderWithText({
  text = "Chargement...",
  size = "md",
  color = "primary",
  className = "",
  variant = "spinner",
}: LoaderProps & { text?: string; variant?: "spinner" | "dots" | "gradient" }) {
  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      {variant === "spinner" && <Loader size={size} color={color} />}
      {variant === "dots" && <GradientDots size={size} />}
      {variant === "gradient" && <GradientLoader size={size} />}
      {text && (
        <p className="text-text-secondary text-sm font-medium">
          {text}
        </p>
      )}
    </div>
  );
}

/**
 * Premium progress bar with orange/salmon gradient
 */
export function ProgressBar({
  progress = 0,
  showPercentage = false,
  size = "md",
  className = "",
  animated = true,
}: {
  progress: number;
  showPercentage?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
  animated?: boolean;
}) {
  const prefersReducedMotion = useReducedMotion();

  const sizeClasses = {
    sm: "h-1",
    md: "h-1.5",
    lg: "h-2",
  };

  return (
    <div className={`w-full ${className}`}>
      <div className={`${sizeClasses[size]} loader-track rounded-full overflow-hidden`}>
        <motion.div
          className="h-full bg-gradient-to-r from-primary via-accent to-primary rounded-full relative"
          initial={{ width: "0%" }}
          animate={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          transition={{
            duration: prefersReducedMotion ? 0 : 0.4,
            ease: [0.25, 0.1, 0.25, 1],
          }}
        >
          {/* Shimmer effect */}
          {animated && !prefersReducedMotion && (
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
              animate={{ x: ["-100%", "100%"] }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "linear",
              }}
            />
          )}
        </motion.div>
      </div>
      {showPercentage && (
        <p className="text-text-muted text-xs text-right mt-1">
          {Math.round(progress)}%
        </p>
      )}
    </div>
  );
}

/**
 * Indeterminate progress bar
 */
export function IndeterminateProgress({
  size = "md",
  className = "",
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const prefersReducedMotion = useReducedMotion();

  const sizeClasses = {
    sm: "h-1",
    md: "h-1.5",
    lg: "h-2",
  };

  return (
    <div className={`w-full ${sizeClasses[size]} loader-track rounded-full overflow-hidden ${className}`}>
      <motion.div
        className="h-full w-1/3 bg-gradient-to-r from-primary via-accent to-primary rounded-full"
        animate={{
          x: prefersReducedMotion ? 0 : ["0%", "200%"],
        }}
        transition={{
          duration: prefersReducedMotion ? 0 : 1.2,
          repeat: prefersReducedMotion ? 0 : Infinity,
          ease: "easeInOut",
        }}
      />
    </div>
  );
}
