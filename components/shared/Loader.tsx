"use client";

import { motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface LoaderProps {
  size?: "sm" | "md" | "lg" | "xl";
  color?: "primary" | "white" | "muted";
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
  white: "border-white border-t-transparent",
  muted: "border-text-muted border-t-transparent",
};

/**
 * Base reusable loader component
 * Modern circular spinner with smooth animations
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
 * Loader with pulsing dots animation
 */
export function LoaderDots({
  size = "md",
  color = "primary",
  className = "",
}: LoaderProps) {
  const prefersReducedMotion = useReducedMotion();

  const dotSize = {
    sm: "w-1.5 h-1.5",
    md: "w-2 h-2",
    lg: "w-2.5 h-2.5",
    xl: "w-3 h-3",
  };

  const dotColor = {
    primary: "bg-primary",
    white: "bg-white",
    muted: "bg-text-muted",
  };

  return (
    <div className={`flex gap-1.5 ${className}`}>
      {[0, 1, 2].map((index) => (
        <motion.div
          key={index}
          className={`${dotSize[size]} ${dotColor[color]} rounded-full`}
          animate={{
            scale: prefersReducedMotion ? 1 : [1, 1.3, 1],
            opacity: prefersReducedMotion ? 1 : [0.4, 1, 0.4],
          }}
          transition={{
            duration: prefersReducedMotion ? 0 : 1.2,
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
 * Loader with text message
 */
export function LoaderWithText({
  text = "Chargement...",
  size = "md",
  color = "primary",
  className = "",
}: LoaderProps & { text?: string }) {
  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      <Loader size={size} color={color} />
      {text && (
        <p className="text-text-secondary text-sm font-medium animate-pulse">
          {text}
        </p>
      )}
    </div>
  );
}
