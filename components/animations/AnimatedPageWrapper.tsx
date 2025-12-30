"use client";

import { motion, Variants } from "framer-motion";
import { ReactNode } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface AnimatedPageWrapperProps {
  children: ReactNode;
  delay?: number;
  className?: string;
}

/**
 * Wrapper component for page-level entrance animations
 * Provides smooth fade-in and slide-up effects with accessibility support
 */
export function AnimatedPageWrapper({
  children,
  delay = 0,
  className = "",
}: AnimatedPageWrapperProps) {
  const prefersReducedMotion = useReducedMotion();

  const variants: Variants = {
    hidden: {
      opacity: 0,
      y: prefersReducedMotion ? 0 : 20,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: prefersReducedMotion ? 0 : 0.4,
        delay: prefersReducedMotion ? 0 : delay,
        ease: [0.25, 0.1, 0.25, 1], // Custom easeOut curve
      },
    },
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={variants}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Staggered container for animating multiple children with delay
 */
export function AnimatedStaggerContainer({
  children,
  staggerDelay = 0.1,
  className = "",
}: {
  children: ReactNode;
  staggerDelay?: number;
  className?: string;
}) {
  const prefersReducedMotion = useReducedMotion();

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: prefersReducedMotion ? 0 : staggerDelay,
        delayChildren: prefersReducedMotion ? 0 : 0.1,
      },
    },
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Individual staggered item
 */
export function AnimatedStaggerItem({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const prefersReducedMotion = useReducedMotion();

  const itemVariants: Variants = {
    hidden: {
      opacity: 0,
      y: prefersReducedMotion ? 0 : 15,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: prefersReducedMotion ? 0 : 0.35,
        ease: [0.25, 0.1, 0.25, 1],
      },
    },
  };

  return (
    <motion.div variants={itemVariants} className={className}>
      {children}
    </motion.div>
  );
}

/**
 * Slide-in animation for sidebar/menu elements
 */
export function AnimatedSlideIn({
  children,
  direction = "left",
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  direction?: "left" | "right" | "top" | "bottom";
  delay?: number;
  className?: string;
}) {
  const prefersReducedMotion = useReducedMotion();

  const directionOffset = {
    left: { x: -30, y: 0 },
    right: { x: 30, y: 0 },
    top: { x: 0, y: -30 },
    bottom: { x: 0, y: 30 },
  };

  const variants: Variants = {
    hidden: {
      opacity: 0,
      ...directionOffset[direction],
    },
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      transition: {
        duration: prefersReducedMotion ? 0 : 0.38,
        delay: prefersReducedMotion ? 0 : delay,
        ease: [0.22, 1, 0.36, 1], // Anticipate easing
      },
    },
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={variants}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Scale and fade animation for important elements
 */
export function AnimatedScaleFade({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const prefersReducedMotion = useReducedMotion();

  const variants: Variants = {
    hidden: {
      opacity: 0,
      scale: prefersReducedMotion ? 1 : 0.95,
    },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: prefersReducedMotion ? 0 : 0.42,
        delay: prefersReducedMotion ? 0 : delay,
        ease: [0.25, 0.1, 0.25, 1],
      },
    },
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={variants}
      className={className}
    >
      {children}
    </motion.div>
  );
}
