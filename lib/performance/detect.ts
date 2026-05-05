/**
 * Performance-mode detection.
 *
 * Heuristics combine multiple signals so we don't punish a strong mobile or
 * over-reward a weak desktop:
 *
 *   - prefers-reduced-motion (system intent → always treat as low)
 *   - Save-Data header / `connection.saveData`
 *   - `navigator.hardwareConcurrency` (cores)
 *   - `navigator.deviceMemory` (GB, when exposed)
 *   - `connection.effectiveType` (network is a decent proxy for class of device)
 *   - viewport / pointer (mobile?)
 *
 * All detection is one-shot at hydration; we don't run continuous FPS
 * sampling because that itself burns CPU and can produce ironic regressions
 * on the very devices we're trying to protect. The provider listens for
 * `prefers-reduced-motion` changes (the only signal that flips at runtime).
 */

export type PerformanceMode = "low" | "medium" | "high";

export interface PerformanceState {
  mode: PerformanceMode;
  reduced: boolean;
  isMobile: boolean;
  cores: number | null;
  memoryGb: number | null;
  saveData: boolean;
  /** True after first client-side detection; useful to gate heavy effects. */
  hydrated: boolean;
}

export const SSR_DEFAULT: PerformanceState = {
  // SSR fallback: mid-tier so the first paint isn't a worst-case scenario
  // and isn't a best-case scenario either. Hydrated detection refines it.
  mode: "medium",
  reduced: false,
  isMobile: false,
  cores: null,
  memoryGb: null,
  saveData: false,
  hydrated: false,
};

interface NavigatorConnection {
  saveData?: boolean;
  effectiveType?: "slow-2g" | "2g" | "3g" | "4g";
}

interface ExtendedNavigator extends Navigator {
  deviceMemory?: number;
  connection?: NavigatorConnection;
  mozConnection?: NavigatorConnection;
  webkitConnection?: NavigatorConnection;
}

export function detectPerformance(): Omit<PerformanceState, "hydrated"> {
  if (typeof window === "undefined") {
    const { mode, reduced, isMobile, cores, memoryGb, saveData } = SSR_DEFAULT;
    return { mode, reduced, isMobile, cores, memoryGb, saveData };
  }

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isMobile =
    window.matchMedia("(max-width: 767px)").matches ||
    window.matchMedia("(pointer: coarse) and (max-width: 1024px)").matches;

  const nav = navigator as ExtendedNavigator;
  const cores = typeof nav.hardwareConcurrency === "number" ? nav.hardwareConcurrency : null;
  const memoryGb = typeof nav.deviceMemory === "number" ? nav.deviceMemory : null;
  const conn = nav.connection ?? nav.mozConnection ?? nav.webkitConnection;
  const saveData = !!conn?.saveData;
  const slowConn =
    conn?.effectiveType === "slow-2g" ||
    conn?.effectiveType === "2g" ||
    conn?.effectiveType === "3g";

  let mode: PerformanceMode;

  // 1) Hard low-mode triggers — overrides everything else
  if (reduced || saveData) {
    mode = "low";
  } else if (cores !== null && cores <= 2) {
    mode = "low";
  } else if (memoryGb !== null && memoryGb <= 2) {
    mode = "low";
  } else if (slowConn && isMobile) {
    mode = "low";
  } else if (isMobile) {
    // 2) Mobile baseline = medium. Even high-end phones cap here so we never
    //    ship the heaviest desktop effects to a touch device.
    mode = "medium";
  } else {
    // 3) Desktop. Promote to "high" if hardware is decent.
    if (cores !== null && cores >= 4 && (memoryGb === null || memoryGb >= 4)) {
      mode = "high";
    } else {
      mode = "medium";
    }
  }

  return { mode, reduced, isMobile, cores, memoryGb, saveData };
}
