"use client";

import { motion, useScroll, useTransform, useInView, useSpring, useReducedMotion } from "framer-motion";
import { useRef, ReactNode, useState, useEffect, useMemo } from "react";

// ============================================
// MOBILE-FIRST ANIMATION CONFIG
// ============================================

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(true); // Default to mobile for SSR

  useEffect(() => {
    if (typeof window === "undefined") return;

    const checkMobile = () => {
      const hasTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
      const isNarrow = window.innerWidth < 1024;
      const hasCoarsePointer = window.matchMedia("(pointer: coarse)").matches;
      setIsMobile((hasTouch && isNarrow) || hasCoarsePointer);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return isMobile;
}

// Get optimized animation values based on device
function useAnimConfig() {
  const isMobile = useIsMobile();
  const prefersReducedMotion = useReducedMotion();

  return useMemo(() => {
    if (prefersReducedMotion) {
      return {
        duration: { fast: 0.1, normal: 0.15, slow: 0.2 },
        delay: { stagger: 0 },
        distance: { small: 0, normal: 0, large: 0 },
        ease: [0, 0, 1, 1] as [number, number, number, number],
      };
    }

    if (isMobile) {
      // iOS-like snappy animations
      return {
        duration: { fast: 0.15, normal: 0.25, slow: 0.35 },
        delay: { stagger: 0.04 },
        distance: { small: 10, normal: 20, large: 30 },
        ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
      };
    }

    // Desktop - slightly more elegant
    return {
      duration: { fast: 0.25, normal: 0.4, slow: 0.6 },
      delay: { stagger: 0.08 },
      distance: { small: 20, normal: 40, large: 60 },
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
    };
  }, [isMobile, prefersReducedMotion]);
}

// ============================================
// FADE IN SECTION
// ============================================

interface FadeInSectionProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  direction?: "up" | "down" | "left" | "right" | "none";
  distance?: number;
  className?: string;
  once?: boolean;
}

export function FadeInSection({
  children,
  delay = 0,
  duration,
  direction = "up",
  distance,
  className = "",
  once = true,
}: FadeInSectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once, margin: "0px 0px 80px 0px" });
  const config = useAnimConfig();

  // Use provided values or device-optimized defaults
  const finalDuration = duration ?? config.duration.normal;
  const finalDistance = distance ?? config.distance.normal;
  // Scale delay for mobile (faster)
  const finalDelay = delay * (config.duration.normal / 0.4);

  const getInitialPosition = () => {
    switch (direction) {
      case "up": return { y: finalDistance };
      case "down": return { y: -finalDistance };
      case "left": return { x: finalDistance };
      case "right": return { x: -finalDistance };
      default: return {};
    }
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, ...getInitialPosition() }}
      animate={isInView ? { opacity: 1, x: 0, y: 0 } : { opacity: 0, ...getInitialPosition() }}
      transition={{ duration: finalDuration, delay: finalDelay, ease: config.ease }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ============================================
// PARALLAX SECTION
// ============================================

interface ParallaxSectionProps {
  children: ReactNode;
  speed?: number;
  className?: string;
}

export function ParallaxSection({
  children,
  speed = 0.5,
  className = "",
}: ParallaxSectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], [100 * speed, -100 * speed]);
  const smoothY = useSpring(y, { stiffness: 100, damping: 30 });

  return (
    <div ref={ref} className={`relative overflow-hidden ${className}`}>
      <motion.div style={{ y: smoothY }}>
        {children}
      </motion.div>
    </div>
  );
}

// ============================================
// SCALE ON SCROLL
// ============================================

interface ScaleOnScrollProps {
  children: ReactNode;
  scaleFrom?: number;
  scaleTo?: number;
  className?: string;
}

export function ScaleOnScroll({
  children,
  scaleFrom = 0.8,
  scaleTo = 1,
  className = "",
}: ScaleOnScrollProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "center center"],
  });

  const scale = useTransform(scrollYProgress, [0, 1], [scaleFrom, scaleTo]);
  const opacity = useTransform(scrollYProgress, [0, 0.3], [0, 1]);

  return (
    <motion.div
      ref={ref}
      style={{ scale, opacity }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ============================================
// SLIDE IN SECTION
// ============================================

interface SlideInSectionProps {
  children: ReactNode;
  direction?: "left" | "right";
  delay?: number;
  className?: string;
  once?: boolean;
}

export function SlideInSection({
  children,
  direction = "left",
  delay = 0,
  className = "",
  once = true,
}: SlideInSectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once, margin: "0px 0px 80px 0px" });
  const config = useAnimConfig();

  const xOffset = direction === "left" ? -config.distance.large : config.distance.large;
  const finalDelay = delay * (config.duration.normal / 0.4);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: xOffset }}
      animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: xOffset }}
      transition={{ duration: config.duration.normal, delay: finalDelay, ease: config.ease }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ============================================
// REVEAL ON SCROLL (Mask effect)
// ============================================

interface RevealOnScrollProps {
  children: ReactNode;
  direction?: "up" | "down";
  delay?: number;
  className?: string;
}

export function RevealOnScroll({
  children,
  direction = "up",
  delay = 0,
  className = "",
}: RevealOnScrollProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "0px 0px 80px 0px" });
  const config = useAnimConfig();
  const finalDelay = delay * (config.duration.normal / 0.4);

  return (
    <div ref={ref} className={`overflow-hidden ${className}`}>
      <motion.div
        initial={{ y: direction === "up" ? "100%" : "-100%" }}
        animate={isInView ? { y: 0 } : { y: direction === "up" ? "100%" : "-100%" }}
        transition={{ duration: config.duration.slow, delay: finalDelay, ease: config.ease }}
      >
        {children}
      </motion.div>
    </div>
  );
}

// ============================================
// STAGGER CHILDREN ON SCROLL
// ============================================

interface StaggerOnScrollProps {
  children: ReactNode[];
  staggerDelay?: number;
  direction?: "up" | "down" | "left" | "right";
  className?: string;
  childClassName?: string;
}

export function StaggerOnScroll({
  children,
  staggerDelay,
  direction = "up",
  className = "",
  childClassName = "",
}: StaggerOnScrollProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "0px 0px 80px 0px" });
  const config = useAnimConfig();

  const finalStaggerDelay = staggerDelay ?? config.delay.stagger;

  const getOffset = () => {
    switch (direction) {
      case "up": return { y: config.distance.small };
      case "down": return { y: -config.distance.small };
      case "left": return { x: config.distance.small };
      case "right": return { x: -config.distance.small };
    }
  };

  return (
    <div ref={ref} className={className}>
      {children.map((child, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, ...getOffset() }}
          animate={isInView ? { opacity: 1, x: 0, y: 0 } : {}}
          transition={{
            duration: config.duration.fast,
            delay: index * finalStaggerDelay,
            ease: config.ease,
          }}
          className={childClassName}
        >
          {child}
        </motion.div>
      ))}
    </div>
  );
}

// ============================================
// BLUR IN SECTION
// ============================================

interface BlurInSectionProps {
  children: ReactNode;
  delay?: number;
  className?: string;
}

export function BlurInSection({
  children,
  delay = 0,
  className = "",
}: BlurInSectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "0px 0px 80px 0px" });
  const config = useAnimConfig();
  const finalDelay = delay * (config.duration.normal / 0.4);

  // Reduce blur amount on mobile for performance
  const blurAmount = config.distance.small > 0 ? "blur(8px)" : "blur(0px)";

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, filter: blurAmount }}
      animate={isInView ? { opacity: 1, filter: "blur(0px)" } : {}}
      transition={{ duration: config.duration.normal, delay: finalDelay, ease: config.ease }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ============================================
// ROTATE IN SECTION
// ============================================

interface RotateInSectionProps {
  children: ReactNode;
  angle?: number;
  delay?: number;
  className?: string;
}

export function RotateInSection({
  children,
  angle = -5,
  delay = 0,
  className = "",
}: RotateInSectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "0px 0px 80px 0px" });
  const config = useAnimConfig();
  const finalDelay = delay * (config.duration.normal / 0.4);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, rotate: angle, y: config.distance.small }}
      animate={isInView ? { opacity: 1, rotate: 0, y: 0 } : {}}
      transition={{ duration: config.duration.normal, delay: finalDelay, ease: config.ease }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ============================================
// PROGRESS BAR ON SCROLL
// ============================================

interface ScrollProgressProps {
  className?: string;
  color?: string;
}

export function ScrollProgress({
  className = "",
  color = "bg-primary",
}: ScrollProgressProps) {
  const [isMounted, setIsMounted] = useState(false);
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Don't render on server to avoid hydration mismatch
  if (!isMounted) {
    return null;
  }

  return (
    <motion.div
      style={{ scaleX }}
      className={`fixed top-0 left-0 right-0 h-1 ${color} origin-left z-50 ${className}`}
    />
  );
}

// ============================================
// ANIMATED SECTION DIVIDER
// ============================================

interface AnimatedDividerProps {
  className?: string;
  color?: string;
}

export function AnimatedDivider({
  className = "",
  color = "bg-gradient-to-r from-transparent via-primary to-transparent",
}: AnimatedDividerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "0px 0px 80px 0px" });
  const config = useAnimConfig();

  return (
    <div ref={ref} className={`w-full flex justify-center ${className}`}>
      <motion.div
        initial={{ scaleX: 0, opacity: 0 }}
        animate={isInView ? { scaleX: 1, opacity: 1 } : {}}
        transition={{ duration: config.duration.slow, ease: config.ease }}
        className={`h-px w-full max-w-md ${color}`}
      />
    </div>
  );
}

// ============================================
// ANIMATED SECTION WRAPPER
// ============================================

interface AnimatedSectionProps {
  children: ReactNode;
  animation?: "fadeUp" | "fadeDown" | "slideLeft" | "slideRight" | "scale" | "blur" | "rotate";
  delay?: number;
  className?: string;
}

export function AnimatedSection({
  children,
  animation = "fadeUp",
  delay = 0,
  className = "",
}: AnimatedSectionProps) {
  switch (animation) {
    case "fadeUp":
      return <FadeInSection direction="up" delay={delay} className={className}>{children}</FadeInSection>;
    case "fadeDown":
      return <FadeInSection direction="down" delay={delay} className={className}>{children}</FadeInSection>;
    case "slideLeft":
      return <SlideInSection direction="left" delay={delay} className={className}>{children}</SlideInSection>;
    case "slideRight":
      return <SlideInSection direction="right" delay={delay} className={className}>{children}</SlideInSection>;
    case "scale":
      return <ScaleOnScroll className={className}>{children}</ScaleOnScroll>;
    case "blur":
      return <BlurInSection delay={delay} className={className}>{children}</BlurInSection>;
    case "rotate":
      return <RotateInSection delay={delay} className={className}>{children}</RotateInSection>;
    default:
      return <FadeInSection delay={delay} className={className}>{children}</FadeInSection>;
  }
}
