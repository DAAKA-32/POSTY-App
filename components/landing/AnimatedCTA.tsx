"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";

interface AnimatedCTAProps {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
  size?: "sm" | "md" | "lg";
  className?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
}

/**
 * AnimatedCTA - Premium animated call-to-action button
 *
 * Features:
 * - Animated gradient background
 * - Shimmer effect on hover
 * - Scale micro-interaction
 * - Glow pulse effect
 * - Arrow animation on hover
 */
export default function AnimatedCTA({
  href,
  children,
  variant = "primary",
  size = "md",
  className = "",
  icon,
  onClick,
}: AnimatedCTAProps) {
  const [isHovered, setIsHovered] = useState(false);

  // Size configurations
  const sizeConfig = {
    sm: "px-4 py-2.5 text-sm",
    md: "px-6 py-3.5 text-base",
    lg: "px-8 py-4 text-lg",
  };

  // Variant configurations
  const variantConfig = {
    primary: {
      base: "bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_100%] text-white",
      glow: "bg-primary/40",
      shadow: "shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40",
    },
    secondary: {
      base: "bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 bg-[length:200%_100%] text-white dark:from-white dark:via-gray-100 dark:to-white dark:text-gray-900",
      glow: "bg-gray-500/30 dark:bg-white/30",
      shadow: "shadow-lg shadow-gray-500/20 hover:shadow-xl hover:shadow-gray-500/30",
    },
  };

  const config = variantConfig[variant];

  return (
    <Link
      href={href}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative inline-flex items-center justify-center gap-2 ${sizeConfig[size]} ${className}`}
    >
      {/* Animated glow effect */}
      <motion.div
        className={`absolute inset-0 rounded-xl ${config.glow} blur-xl`}
        animate={{
          opacity: isHovered ? [0.5, 0.8, 0.5] : 0.3,
          scale: isHovered ? [1, 1.05, 1] : 1,
        }}
        transition={{
          duration: 1.5,
          repeat: isHovered ? Infinity : 0,
          ease: "easeInOut",
        }}
      />

      {/* Button container */}
      <motion.div
        className={`
          relative ${config.base} ${config.shadow}
          rounded-xl font-semibold
          transition-all duration-300
          overflow-hidden
          flex items-center justify-center gap-2
          ${sizeConfig[size]}
        `}
        animate={{
          backgroundPosition: isHovered ? "100% 0" : "0% 0",
        }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={{
          backgroundPosition: { duration: 0.5, ease: "easeInOut" },
          scale: { type: "spring", stiffness: 400, damping: 25 },
        }}
      >
        {/* Shimmer effect */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent"
          initial={{ x: "-100%" }}
          animate={isHovered ? { x: "100%" } : { x: "-100%" }}
          transition={{
            duration: 0.75,
            ease: "easeInOut",
            repeat: isHovered ? Infinity : 0,
            repeatDelay: 0.5,
          }}
        />

        {/* Content */}
        <span className="relative z-10 flex items-center gap-2">
          {children}

          {/* Default arrow icon or custom icon */}
          {icon || (
            <motion.svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              animate={{
                x: isHovered ? 4 : 0,
              }}
              transition={{
                type: "spring",
                stiffness: 400,
                damping: 25,
              }}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </motion.svg>
          )}
        </span>
      </motion.div>
    </Link>
  );
}

/**
 * AnimatedCTAButton - Same as AnimatedCTA but as a button element
 */
export function AnimatedCTAButton({
  children,
  variant = "primary",
  size = "md",
  className = "",
  icon,
  onClick,
  disabled = false,
  type = "button",
}: Omit<AnimatedCTAProps, "href"> & {
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
}) {
  const [isHovered, setIsHovered] = useState(false);

  const sizeConfig = {
    sm: "px-4 py-2.5 text-sm",
    md: "px-6 py-3.5 text-base",
    lg: "px-8 py-4 text-lg",
  };

  const variantConfig = {
    primary: {
      base: "bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_100%] text-white",
      glow: "bg-primary/40",
      shadow: "shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40",
    },
    secondary: {
      base: "bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 bg-[length:200%_100%] text-white dark:from-white dark:via-gray-100 dark:to-white dark:text-gray-900",
      glow: "bg-gray-500/30 dark:bg-white/30",
      shadow: "shadow-lg shadow-gray-500/20 hover:shadow-xl hover:shadow-gray-500/30",
    },
  };

  const config = variantConfig[variant];

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative inline-flex items-center justify-center gap-2 ${className} ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      {/* Animated glow effect */}
      <motion.div
        className={`absolute inset-0 rounded-xl ${config.glow} blur-xl`}
        animate={{
          opacity: isHovered && !disabled ? [0.5, 0.8, 0.5] : 0.3,
          scale: isHovered && !disabled ? [1, 1.05, 1] : 1,
        }}
        transition={{
          duration: 1.5,
          repeat: isHovered && !disabled ? Infinity : 0,
          ease: "easeInOut",
        }}
      />

      {/* Button container */}
      <motion.div
        className={`
          relative ${config.base} ${config.shadow}
          rounded-xl font-semibold
          transition-all duration-300
          overflow-hidden
          flex items-center justify-center gap-2
          ${sizeConfig[size]}
        `}
        animate={{
          backgroundPosition: isHovered && !disabled ? "100% 0" : "0% 0",
        }}
        whileHover={disabled ? {} : { scale: 1.02 }}
        whileTap={disabled ? {} : { scale: 0.98 }}
        transition={{
          backgroundPosition: { duration: 0.5, ease: "easeInOut" },
          scale: { type: "spring", stiffness: 400, damping: 25 },
        }}
      >
        {/* Shimmer effect */}
        {!disabled && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent"
            initial={{ x: "-100%" }}
            animate={isHovered ? { x: "100%" } : { x: "-100%" }}
            transition={{
              duration: 0.75,
              ease: "easeInOut",
              repeat: isHovered ? Infinity : 0,
              repeatDelay: 0.5,
            }}
          />
        )}

        {/* Content */}
        <span className="relative z-10 flex items-center gap-2">
          {children}

          {icon || (
            <motion.svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              animate={{
                x: isHovered && !disabled ? 4 : 0,
              }}
              transition={{
                type: "spring",
                stiffness: 400,
                damping: 25,
              }}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </motion.svg>
          )}
        </span>
      </motion.div>
    </button>
  );
}
