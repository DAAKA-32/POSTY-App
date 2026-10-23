"use client";

/**
 * useStrategistEligibility — single source of truth for "can this user open
 * and use the Strategist right now?".
 *
 * Combines TWO gates:
 *   1. Plan: Pro / Max (or an allowlisted email) — canUseStrategist
 *   2. LinkedIn connected (the Strategist plans LinkedIn posts and the
 *      schedule step writes to the LinkedIn publishing pipeline — useless
 *      without a connected account)
 *
 * Returns a discriminated union so callers can branch the UI on the exact
 * reason for refusal:
 *   - `loading`     → auth or LinkedIn state still hydrating
 *   - `no-access`   → Free plan and not allowlisted (upgrade invitation)
 *   - `no-linkedin` → access granted but no LinkedIn account connected yet
 *   - `ok`          → cleared on both fronts, render the Strategist
 *
 * For the simple boolean "can use it now?" case, callers can read
 * `eligibility.reason === "ok"` (also exposed as `eligibility.ok` for ergonomics).
 */

import { useAuth } from "@/contexts/AuthContext";
import { useLinkedIn } from "@/contexts/LinkedInContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { canUseStrategist } from "@/lib/strategist/access";

export type StrategistEligibility =
  | { reason: "loading"; ok: false }
  | { reason: "no-access"; ok: false }
  | { reason: "no-linkedin"; ok: false }
  | { reason: "ok"; ok: true };

export function useStrategistEligibility(): StrategistEligibility {
  const { user, userProfile, loading: authLoading } = useAuth();
  const { currentPlan } = useSubscription();
  const { isConnected, isTokenValid, isLoading: linkedinLoading } = useLinkedIn();

  if (authLoading || !user) return { reason: "loading", ok: false };
  if (linkedinLoading) return { reason: "loading", ok: false };
  // The plan comes from the user profile: until it is read, "no plan" would
  // look like Free and flash the upgrade invitation at a paying user.
  if (!userProfile) return { reason: "loading", ok: false };

  // Access check first — on a plan without the Strategist (Free) we don't
  // hint that connecting LinkedIn would help: the invitation is to upgrade.
  if (!canUseStrategist(user.email, currentPlan)) {
    return { reason: "no-access", ok: false };
  }

  // LinkedIn check second — the user CAN use the Strategist conceptually,
  // they just need to connect LinkedIn first. UI surfaces this as a
  // recoverable state with a "Connect LinkedIn" CTA.
  if (!isConnected || !isTokenValid) {
    return { reason: "no-linkedin", ok: false };
  }

  return { reason: "ok", ok: true };
}
