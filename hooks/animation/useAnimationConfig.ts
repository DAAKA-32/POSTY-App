"use client";

import { useReducedMotion } from "framer-motion";
import { useEffect, useState, useMemo } from "react";

/**
 * Animation duration presets optimized for device type
 * Mobile (iOS first): Ultra-fast, snappy animations
 * Desktop: Slightly longer, more elegant animations
 */
export interface AnimationDurations {
  instant: number;    // Micro-interactions (buttons, toggles)
  fast: number;       // Quick transitions (modals appearing)
  normal: number;     // Standard animations (fade in)
  slow: number;       // Emphasized animations (hero sections)
}

export interface AnimationDelays {
  none: number;
  short: number;
  stagger: number;    // Between staggered items
}

export interface AnimationConfig {
  durations: AnimationDurations;
  delays: AnimationDelays;
  distance: {
    small: number;    // Subtle movement
    normal: number;   // Standard movement
    large: number;    // Emphasized movement
  };
  spring: {
    snappy: { stiffness: number; damping: number };
    smooth: { stiffness: number; damping: number };
    bouncy: { stiffness: number; damping: number };
  };
  ease: number[];     // Cubic bezier
  isMobile: boolean;
  prefersReducedMotion: boolean;
}

// Mobile-optimized durations (iOS-like snappy feel)
const MOBILE_DURATIONS: AnimationDurations = {
  instant: 0.1,
  fast: 0.15,
  normal: 0.25,
  slow: 0.35,
};

// Desktop durations (slightly more elegant)
const DESKTOP_DURATIONS: AnimationDurations = {
  instant: 0.15,
  fast: 0.25,
  normal: 0.4,
  slow: 0.6,
};

// Reduced motion durations (minimal animation)
const REDUCED_DURATIONS: AnimationDurations = {
  instant: 0,
  fast: 0.1,
  normal: 0.15,
  slow: 0.2,
};

// Mobile delays (minimal waiting)
const MOBILE_DELAYS: AnimationDelays = {
  none: 0,
  short: 0.03,
  stagger: 0.04,
};

// Desktop delays
const DESKTOP_DELAYS: AnimationDelays = {
  none: 0,
  short: 0.1,
  stagger: 0.08,
};

/**
 * Hook to detect if device is mobile/touch
 * Prioritizes touch detection for iOS-like experience
 */
function useIsMobileDevice(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const checkMobile = () => {
      // Check for touch capability
      const hasTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;

      // Check viewport width
      const isNarrowViewport = window.innerWidth < 1024;

      // Check for coarse pointer (finger vs mouse)
      const hasCoarsePointer = window.matchMedia("(pointer: coarse)").matches;

      // Check user agent for iOS/Android
      const isMobileUA = /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );

      // Consider mobile if:
      // - Has touch AND narrow viewport, OR
      // - Has coarse pointer, OR
      // - Mobile user agent detected
      setIsMobile((hasTouch && isNarrowViewport) || hasCoarsePointer || isMobileUA);
    };

    checkMobile();

    // Re-check on resize (tablet rotation, etc.)
    const handleResize = () => {
      requestAnimationFrame(checkMobile);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return isMobile;
}

/**
 * Main hook for animation configuration
 * Returns device-optimized animation values
 */
export function useAnimationConfig(): AnimationConfig {
  const isMobile = useIsMobileDevice();
  const prefersReducedMotion = useReducedMotion() ?? false;

  const config = useMemo<AnimationConfig>(() => {
    // Reduced motion takes priority
    if (prefersReducedMotion) {
      return {
        durations: REDUCED_DURATIONS,
        delays: { none: 0, short: 0, stagger: 0 },
        distance: { small: 0, normal: 0, large: 0 },
        spring: {
          snappy: { stiffness: 500, damping: 40 },
          smooth: { stiffness: 300, damping: 30 },
          bouncy: { stiffness: 400, damping: 25 },
        },
        ease: [0, 0, 1, 1], // Linear for reduced motion
        isMobile,
        prefersReducedMotion: true,
      };
    }

    // Mobile-optimized config
    if (isMobile) {
      return {
        durations: MOBILE_DURATIONS,
        delays: MOBILE_DELAYS,
        distance: {
          small: 8,
          normal: 16,
          large: 24,
        },
        spring: {
          snappy: { stiffness: 600, damping: 35 },
          smooth: { stiffness: 400, damping: 30 },
          bouncy: { stiffness: 500, damping: 20 },
        },
        ease: [0.25, 0.1, 0.25, 1], // Faster ease for mobile
        isMobile: true,
        prefersReducedMotion: false,
      };
    }

    // Desktop config
    return {
      durations: DESKTOP_DURATIONS,
      delays: DESKTOP_DELAYS,
      distance: {
        small: 15,
        normal: 30,
        large: 50,
      },
      spring: {
        snappy: { stiffness: 500, damping: 30 },
        smooth: { stiffness: 300, damping: 25 },
        bouncy: { stiffness: 400, damping: 15 },
      },
      ease: [0.22, 1, 0.36, 1], // Smooth ease for desktop
      isMobile: false,
      prefersReducedMotion: false,
    };
  }, [isMobile, prefersReducedMotion]);

  return config;
}

/**
 * Quick helper to get optimized animation values
 * Use this for simple fade/slide animations
 */
export function useOptimizedAnimation() {
  const config = useAnimationConfig();

  return useMemo(() => ({
    // Fade in from bottom (most common)
    fadeUp: {
      initial: { opacity: 0, y: config.distance.normal },
      animate: { opacity: 1, y: 0 },
      transition: { duration: config.durations.normal, ease: config.ease },
    },

    // Fade in from top
    fadeDown: {
      initial: { opacity: 0, y: -config.distance.normal },
      animate: { opacity: 1, y: 0 },
      transition: { duration: config.durations.normal, ease: config.ease },
    },

    // Simple fade
    fade: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      transition: { duration: config.durations.fast, ease: config.ease },
    },

    // Scale in
    scale: {
      initial: { opacity: 0, scale: 0.95 },
      animate: { opacity: 1, scale: 1 },
      transition: { duration: config.durations.fast, ease: config.ease },
    },

    // Slide from left
    slideLeft: {
      initial: { opacity: 0, x: -config.distance.normal },
      animate: { opacity: 1, x: 0 },
      transition: { duration: config.durations.normal, ease: config.ease },
    },

    // Slide from right
    slideRight: {
      initial: { opacity: 0, x: config.distance.normal },
      animate: { opacity: 1, x: 0 },
      transition: { duration: config.durations.normal, ease: config.ease },
    },

    // Blur in (premium effect)
    blurIn: {
      initial: { opacity: 0, filter: "blur(8px)" },
      animate: { opacity: 1, filter: "blur(0px)" },
      transition: { duration: config.durations.normal, ease: config.ease },
    },

    // Stagger container
    staggerContainer: {
      animate: { transition: { staggerChildren: config.delays.stagger } },
    },

    // Stagger item
    staggerItem: {
      initial: { opacity: 0, y: config.distance.small },
      animate: { opacity: 1, y: 0 },
      transition: { duration: config.durations.fast, ease: config.ease },
    },

    // Config access
    config,
  }), [config]);
}

/**
 * Get animation duration multiplier based on device
 * Useful when you need to scale existing animations
 */
export function useAnimationMultiplier(): number {
  const { isMobile, prefersReducedMotion } = useAnimationConfig();

  if (prefersReducedMotion) return 0.25;
  if (isMobile) return 0.5;
  return 1;
}

export default useAnimationConfig;
