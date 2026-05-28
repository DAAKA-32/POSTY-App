/**
 * Helpers that turn raw `aiUsage` data into the business metrics shown in the
 * admin dashboard (revenue, margin, status). Kept separate from the tracker so
 * the cost-write path stays tiny and the admin UI can evolve independently.
 */

import { getPlanConfig, type PlanType } from "@/lib/config/plans";
import type { AIUsageAggregate } from "@/types";

/** EUR → USD rough conversion for revenue↔cost comparison. ECB ~1.08 mid-2026. */
const EUR_TO_USD = 1.08;

export interface RentabilitySummary {
  /** Lifetime spend in USD (mirrors users.aiUsage.totalCostUSD). */
  totalCostUSD: number;
  /** Lifetime AI calls. */
  totalCalls: number;
  /** Sum of input + output tokens. */
  totalTokens: number;
  /** Cost per AI call (USD). 0 if no calls yet. */
  avgCostPerCallUSD: number;
  /** Monthly revenue the user generates (USD, 0 for free/trial). */
  monthlyRevenueUSD: number;
  /** Lifetime cumulative cost vs. ONE month of subscription. */
  marginPctOneMonth: number | null;
  /** Status tag for quick scanning in the table. */
  status: "no-data" | "profitable" | "watch" | "unprofitable" | "free";
}

/**
 * Returns the monthly subscription revenue (USD) for a given plan. Falls back
 * to 0 for free / unknown plans.
 */
export function monthlyRevenueUSD(plan: string | null | undefined): number {
  if (!plan) return 0;
  const normalized = plan.toLowerCase();
  if (normalized === "free") return 0;
  try {
    const cfg = getPlanConfig(normalized as PlanType);
    if (!cfg) return 0;
    return Math.round(cfg.price.monthly * EUR_TO_USD * 100) / 100;
  } catch {
    return 0;
  }
}

/**
 * Compute the per-user rentability summary used by the admin table & detail
 * page. `usage` may be missing entirely (legacy user, no AI calls tracked yet).
 */
export function computeRentability(
  plan: string | null,
  usage: AIUsageAggregate | undefined
): RentabilitySummary {
  const totalCostUSD = Math.max(0, usage?.totalCostUSD ?? 0);
  const totalCalls = Math.max(0, usage?.callsCount ?? 0);
  const totalTokens =
    (usage?.totalInputTokens ?? 0) + (usage?.totalOutputTokens ?? 0);
  const avgCostPerCallUSD =
    totalCalls > 0 ? totalCostUSD / totalCalls : 0;

  const revenue = monthlyRevenueUSD(plan);

  let marginPctOneMonth: number | null = null;
  if (revenue > 0) {
    marginPctOneMonth = ((revenue - totalCostUSD) / revenue) * 100;
  }

  let status: RentabilitySummary["status"];
  if (revenue === 0) {
    status = "free";
  } else if (totalCalls === 0) {
    status = "no-data";
  } else if (totalCostUSD <= revenue * 0.4) {
    status = "profitable";
  } else if (totalCostUSD <= revenue * 0.9) {
    status = "watch";
  } else {
    status = "unprofitable";
  }

  return {
    totalCostUSD: Math.round(totalCostUSD * 1_000_000) / 1_000_000,
    totalCalls,
    totalTokens,
    avgCostPerCallUSD: Math.round(avgCostPerCallUSD * 1_000_000) / 1_000_000,
    monthlyRevenueUSD: revenue,
    marginPctOneMonth:
      marginPctOneMonth === null
        ? null
        : Math.round(marginPctOneMonth * 10) / 10,
    status,
  };
}
