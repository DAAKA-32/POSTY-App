"use client";

import { useEffect, useState } from "react";

/**
 * Indicative progress for a visual that is being generated.
 *
 * /api/image/generate is ONE request that answers once with the final images:
 * it emits no progress events, so there is no real percentage to show. Instead
 * of faking a number, this reports an INDICATIVE fraction that only drives the
 * bar's length: it rises quickly at first, slows down, and is hard-capped
 * (PROGRESS_CAP) so the bar can never claim "done" before the result exists.
 * The loader itself is unmounted when the real result arrives — that, not this
 * curve, is what "100 %" means.
 *
 * The stage is a WAITING message chosen from the elapsed time, not a claim
 * about what the backend is doing right now.
 */

export type GenerationStage = "prepare" | "create" | "wait" | "slow";

/** The bar never goes past this fraction while the request is still pending. */
export const PROGRESS_CAP = 0.92;
/** Time constant of the curve, in seconds (≈63 % of the cap after this long). */
const TAU_SECONDS = 10;

/** Elapsed-time thresholds (seconds) at which the waiting message changes. */
const STAGE_AT = { create: 4, wait: 15, slow: 35 } as const;

export function progressFor(elapsedMs: number): { fraction: number; stage: GenerationStage } {
  const s = Math.max(0, elapsedMs) / 1000;
  const fraction = PROGRESS_CAP * (1 - Math.exp(-s / TAU_SECONDS));
  const stage: GenerationStage =
    s < STAGE_AT.create ? "prepare" : s < STAGE_AT.wait ? "create" : s < STAGE_AT.slow ? "wait" : "slow";
  return { fraction, stage };
}

/** Ticks while `active`, resets when it turns false. */
export function useGenerationProgress(active = true) {
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    if (!active) {
      setElapsedMs(0);
      return;
    }
    const start = Date.now();
    const id = setInterval(() => setElapsedMs(Date.now() - start), 250);
    return () => clearInterval(id);
  }, [active]);

  return { elapsedMs, ...progressFor(elapsedMs) };
}
