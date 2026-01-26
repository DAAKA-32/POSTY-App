"use client";

import { motion, useInView } from "framer-motion";
import { useRef, ReactNode } from "react";

// ============================================
// FLOATING BADGE
// ============================================

interface FloatingBadgeProps {
  children: ReactNode;
  amplitude?: number;
  duration?: number;
  delay?: number;
  className?: string;
}

export function FloatingBadge({
  children,
  amplitude = 8,
  duration = 3,
  delay = 0,
  className = "",
}: FloatingBadgeProps) {
  return (
    <motion.div
      animate={{
        y: [-amplitude, amplitude, -amplitude],
      }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ============================================
// BOUNCE BADGE
// ============================================

interface BounceBadgeProps {
  children: ReactNode;
  scale?: number;
  duration?: number;
  delay?: number;
  className?: string;
}

export function BounceBadge({
  children,
  scale = 1.1,
  duration = 2,
  delay = 0,
  className = "",
}: BounceBadgeProps) {
  return (
    <motion.div
      animate={{
        scale: [1, scale, 1],
      }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ============================================
// PULSE BADGE
// ============================================

interface PulseBadgeProps {
  children: ReactNode;
  color?: string;
  duration?: number;
  className?: string;
}

export function PulseBadge({
  children,
  color = "rgba(232, 147, 77, 0.5)",
  duration = 2,
  className = "",
}: PulseBadgeProps) {
  return (
    <div className={`relative ${className}`}>
      <motion.div
        className="absolute inset-0 rounded-full"
        animate={{
          boxShadow: [
            `0 0 0 0 ${color}`,
            `0 0 0 10px transparent`,
            `0 0 0 0 ${color}`,
          ],
        }}
        transition={{
          duration,
          repeat: Infinity,
          ease: "easeOut",
        }}
      />
      {children}
    </div>
  );
}

// ============================================
// ROTATE BADGE
// ============================================

interface RotateBadgeProps {
  children: ReactNode;
  duration?: number;
  direction?: "cw" | "ccw";
  className?: string;
}

export function RotateBadge({
  children,
  duration = 8,
  direction = "cw",
  className = "",
}: RotateBadgeProps) {
  return (
    <motion.div
      animate={{
        rotate: direction === "cw" ? 360 : -360,
      }}
      transition={{
        duration,
        repeat: Infinity,
        ease: "linear",
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ============================================
// SHAKE BADGE (Attention grabber)
// ============================================

interface ShakeBadgeProps {
  children: ReactNode;
  intensity?: "subtle" | "medium" | "strong";
  interval?: number;
  className?: string;
}

export function ShakeBadge({
  children,
  intensity = "subtle",
  interval = 5,
  className = "",
}: ShakeBadgeProps) {
  const intensityMap = {
    subtle: [-2, 2, -2, 2, 0],
    medium: [-4, 4, -4, 4, 0],
    strong: [-6, 6, -6, 6, 0],
  };

  return (
    <motion.div
      animate={{
        x: intensityMap[intensity],
      }}
      transition={{
        duration: 0.4,
        repeat: Infinity,
        repeatDelay: interval,
        ease: "easeInOut",
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ============================================
// HOVER SCALE BADGE
// ============================================

interface HoverScaleBadgeProps {
  children: ReactNode;
  scale?: number;
  className?: string;
}

export function HoverScaleBadge({
  children,
  scale = 1.1,
  className = "",
}: HoverScaleBadgeProps) {
  return (
    <motion.div
      whileHover={{ scale }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ============================================
// HOVER GLOW BADGE
// ============================================

interface HoverGlowBadgeProps {
  children: ReactNode;
  glowColor?: string;
  className?: string;
}

export function HoverGlowBadge({
  children,
  glowColor = "rgba(232, 147, 77, 0.5)",
  className = "",
}: HoverGlowBadgeProps) {
  return (
    <motion.div
      whileHover={{
        boxShadow: `0 0 20px ${glowColor}, 0 0 40px ${glowColor}`,
      }}
      transition={{ duration: 0.3 }}
      className={`rounded-full ${className}`}
    >
      {children}
    </motion.div>
  );
}

// ============================================
// STAGGERED BADGES CONTAINER
// ============================================

interface StaggeredBadgesProps {
  children: ReactNode[];
  staggerDelay?: number;
  className?: string;
}

export function StaggeredBadges({
  children,
  staggerDelay = 0.1,
  className = "",
}: StaggeredBadgesProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <div ref={ref} className={className}>
      {children.map((child, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, scale: 0.5, y: 20 }}
          animate={isInView ? { opacity: 1, scale: 1, y: 0 } : {}}
          transition={{
            duration: 0.5,
            delay: index * staggerDelay,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          {child}
        </motion.div>
      ))}
    </div>
  );
}

// ============================================
// ICON SPIN ON HOVER
// ============================================

interface SpinOnHoverProps {
  children: ReactNode;
  className?: string;
}

export function SpinOnHover({
  children,
  className = "",
}: SpinOnHoverProps) {
  return (
    <motion.div
      whileHover={{ rotate: 360 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ============================================
// ICON BOUNCE ON HOVER
// ============================================

interface BounceOnHoverProps {
  children: ReactNode;
  className?: string;
}

export function BounceOnHover({
  children,
  className = "",
}: BounceOnHoverProps) {
  return (
    <motion.div
      whileHover={{
        y: [0, -8, 0],
        transition: {
          duration: 0.4,
          times: [0, 0.5, 1],
          ease: "easeOut",
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ============================================
// ANIMATED ICON (SVG draw effect)
// ============================================

interface AnimatedIconProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
}

export function AnimatedIcon({
  children,
  delay = 0,
  duration = 1,
  className = "",
}: AnimatedIconProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0 }}
      animate={isInView ? { opacity: 1, scale: 1 } : {}}
      transition={{
        duration,
        delay,
        type: "spring",
        stiffness: 200,
        damping: 15,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ============================================
// FEATURE CARD WITH ICON ANIMATION
// ============================================

interface AnimatedFeatureIconProps {
  icon: ReactNode;
  animation?: "float" | "bounce" | "pulse" | "rotate" | "none";
  color?: string;
  className?: string;
}

export function AnimatedFeatureIcon({
  icon,
  animation = "float",
  color = "primary",
  className = "",
}: AnimatedFeatureIconProps) {
  const colorClasses: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    accent: "bg-accent/10 text-accent",
    warning: "bg-warning/10 text-warning",
    white: "bg-white/10 text-white",
  };

  const iconWrapper = (
    <div
      className={`
        w-12 h-12 rounded-xl flex items-center justify-center
        ${colorClasses[color] || colorClasses.primary}
        ${className}
      `}
    >
      {icon}
    </div>
  );

  switch (animation) {
    case "float":
      return <FloatingBadge amplitude={4} duration={2.5}>{iconWrapper}</FloatingBadge>;
    case "bounce":
      return <BounceBadge scale={1.05} duration={1.5}>{iconWrapper}</BounceBadge>;
    case "pulse":
      return <PulseBadge>{iconWrapper}</PulseBadge>;
    case "rotate":
      return <RotateBadge duration={10}>{iconWrapper}</RotateBadge>;
    default:
      return iconWrapper;
  }
}
