/**
 * Adaptive animation presets keyed by performance mode.
 *
 * Use these to keep behaviour consistent across the app without sprinkling
 * mode-checks at every motion site. Components that need raw conditional
 * rendering (e.g. "skip the bar-chart entirely on low-end") should still
 * read `usePerformance().mode` directly.
 */

import type { Transition } from "framer-motion";
import type { PerformanceMode } from "./detect";

export interface AnimationPresets {
  /** Multiply transition durations by this. low: 0.5, med: 0.8, high: 1. */
  durationScale: number;
  /** Multiply staggerChildren by this. low: 0 (no stagger). */
  staggerScale: number;

  /** Toggles for expensive effects */
  enableBlur: boolean;
  enableParallax: boolean;
  enableHoverScale: boolean;
  enableShineSweep: boolean;
  enableInfiniteLoops: boolean;
  enableShadowAnimations: boolean;
  enableBackgroundDecorations: boolean;
  enableLayoutAnimations: boolean;

  /** Density for ambient particle layers (number of dots, etc.) */
  particleDensity: number;

  /** Common transitions */
  fadeIn: Transition;
  slideUp: Transition;
  spring: Transition;
}

const HIGH: AnimationPresets = {
  durationScale: 1,
  staggerScale: 1,
  enableBlur: true,
  enableParallax: true,
  enableHoverScale: true,
  enableShineSweep: true,
  enableInfiniteLoops: true,
  enableShadowAnimations: true,
  enableBackgroundDecorations: true,
  enableLayoutAnimations: true,
  particleDensity: 1,
  fadeIn: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
  slideUp: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
  spring: { type: "spring", stiffness: 320, damping: 28 },
};

const MEDIUM: AnimationPresets = {
  durationScale: 0.8,
  staggerScale: 0.7,
  enableBlur: false, // blur+animate is the #1 mobile FPS killer
  enableParallax: false, // parallax = scroll-driven layout work
  enableHoverScale: true,
  enableShineSweep: true,
  enableInfiniteLoops: true,
  enableShadowAnimations: false, // animating box-shadow is GPU-cheap but composite-heavy
  enableBackgroundDecorations: true,
  enableLayoutAnimations: true,
  particleDensity: 0.5,
  fadeIn: { duration: 0.32, ease: [0.22, 1, 0.36, 1] },
  slideUp: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
  spring: { type: "spring", stiffness: 360, damping: 30 },
};

const LOW: AnimationPresets = {
  durationScale: 0.5,
  staggerScale: 0,
  enableBlur: false,
  enableParallax: false,
  enableHoverScale: false,
  enableShineSweep: false,
  enableInfiniteLoops: false, // no continuous loops on weak devices
  enableShadowAnimations: false,
  enableBackgroundDecorations: false,
  enableLayoutAnimations: false,
  particleDensity: 0,
  fadeIn: { duration: 0.18, ease: "easeOut" },
  slideUp: { duration: 0.2, ease: "easeOut" },
  spring: { duration: 0.2, ease: "easeOut" },
};

/** When prefers-reduced-motion is set, override everything with near-instant. */
const REDUCED: AnimationPresets = {
  ...LOW,
  durationScale: 0,
  fadeIn: { duration: 0 },
  slideUp: { duration: 0 },
  spring: { duration: 0 },
};

export function getPresets(mode: PerformanceMode, reduced: boolean): AnimationPresets {
  if (reduced) return REDUCED;
  if (mode === "high") return HIGH;
  if (mode === "medium") return MEDIUM;
  return LOW;
}

/** Helper: scale a duration by the active mode's `durationScale`. */
export function scaleDuration(base: number, presets: AnimationPresets): number {
  return base * presets.durationScale;
}
