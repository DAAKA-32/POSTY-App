"use client";

/**
 * PerformanceProvider — global adaptive-performance context.
 *
 * Mounted at the app root (inside AppProvider). Detects the device class
 * once at hydration and exposes both the raw signals (cores, memory,
 * reduced-motion) and pre-baked animation presets via two hooks:
 *
 *   const { mode, reduced, isMobile } = usePerformance();
 *   const presets = usePerformancePresets();
 *
 * SSR-safe: returns the medium-tier defaults during render, then refines
 * after the first effect tick. Components that conditionally render heavy
 * effects should read `hydrated` so the first paint isn't a heavy version
 * that then snaps off (would defeat the purpose).
 */

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { detectPerformance, SSR_DEFAULT, type PerformanceState } from "./detect";
import { getPresets, type AnimationPresets } from "./presets";

const PerformanceContext = createContext<PerformanceState>(SSR_DEFAULT);

export function PerformanceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PerformanceState>(SSR_DEFAULT);

  useEffect(() => {
    const update = () => {
      const detected = detectPerformance();
      setState({ ...detected, hydrated: true });
    };

    update();

    // The only signal that flips at runtime: prefers-reduced-motion.
    // (Cores/memory don't change; viewport changes are usually irrelevant
    // for performance class.)
    const reducedQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onReducedChange = () => update();
    reducedQuery.addEventListener("change", onReducedChange);

    return () => {
      reducedQuery.removeEventListener("change", onReducedChange);
    };
  }, []);

  return (
    <PerformanceContext.Provider value={state}>
      {children}
    </PerformanceContext.Provider>
  );
}

/** Raw performance state: mode, reduced-motion flag, hardware signals. */
export function usePerformance(): PerformanceState {
  return useContext(PerformanceContext);
}

/** Pre-baked animation presets (durations, ease, toggles) for the active mode. */
export function usePerformancePresets(): AnimationPresets {
  const { mode, reduced } = usePerformance();
  return useMemo(() => getPresets(mode, reduced), [mode, reduced]);
}

/** Convenience: returns true only when the active mode meets the threshold. */
export function useIsPerformanceMode(min: "low" | "medium" | "high"): boolean {
  const { mode } = usePerformance();
  if (min === "low") return true;
  if (min === "medium") return mode === "medium" || mode === "high";
  return mode === "high";
}
