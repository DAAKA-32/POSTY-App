/**
 * Client call to the planner (/api/strategist/batch-plan), shared by the
 * conversation (`send()` in StrategistSession) and the guided journey, so both
 * paths send the same request shape and read errors the same way.
 */

import { getAuthHeaders } from "@/lib/api/client";
import type { StrategistAdvancedParams, StrategyBatch } from "@/types";

export interface PlanRequest {
  sourcePrompt: string;
  count: number;
  period: "day" | "week" | "month" | "none";
  language: "fr" | "en";
  advanced?: StrategistAdvancedParams;
  signal?: AbortSignal;
}

export type PlanResult =
  | { ok: true; batch: StrategyBatch }
  /** `message` is the server's user-facing text when it sent one. */
  | { ok: false; status: number; message?: string };

export const browserTimezone = () =>
  (typeof Intl !== "undefined" && Intl.DateTimeFormat().resolvedOptions().timeZone) || "UTC";

/**
 * Throws only for network failures and aborts (AbortError) — HTTP errors and
 * empty plans come back as `{ ok: false }`.
 */
export async function requestBatchPlan(req: PlanRequest): Promise<PlanResult> {
  const headers = await getAuthHeaders();
  const advanced = req.advanced && Object.keys(req.advanced).length ? req.advanced : undefined;
  const res = await fetch("/api/strategist/batch-plan", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({
      sourcePrompt: req.sourcePrompt.slice(0, 2000),
      count: req.count,
      period: req.period,
      timezone: browserTimezone(),
      language: req.language,
      ...(advanced ? { advanced } : {}),
    }),
    signal: req.signal,
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    return { ok: false, status: res.status, message: body.message };
  }
  const data = (await res.json().catch(() => null)) as { batch?: StrategyBatch } | null;
  const batch = data?.batch;
  if (!batch || !Array.isArray(batch.posts) || batch.posts.length === 0) {
    return { ok: false, status: 502 };
  }
  return { ok: true, batch };
}
