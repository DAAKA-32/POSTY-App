"use client";

/**
 * useStrategistEligibility — single source of truth for "can this user open
 * and use the Strategist right now?".
 *
 * Combines TWO gates:
 *   1. Email allowlist  (enterprise access — set in env var)
 *   2. LinkedIn connected (the Strategist plans LinkedIn posts and the
 *      schedule step writes to the LinkedIn publishing pipeline — useless
 *      without a connected account)
 *
 * Returns a discriminated union so callers can branch the UI on the exact
 * reason for refusal:
 *   - `loading`     → auth or LinkedIn state still hydrating
 *   - `no-access`   → email not in allowlist (enterprise-only invite needed)
 *   - `no-linkedin` → access granted but no LinkedIn account connected yet
 *   - `ok`          → cleared on both fronts, render the Strategist
 *
 * For the simple boolean "can use it now?" case, callers can read
 * `eligibility.reason === "ok"` (also exposed as `eligibility.ok` for ergonomics).
 */

import { useAuth } from "@/contexts/AuthContext";
import { useLinkedIn } from "@/contexts/LinkedInContext";
import { isStrategistAllowedForEmail } from "@/lib/strategist/access";

export type StrategistEligibility =
  | { reason: "loading"; ok: false }
  | { reason: "no-access"; ok: false }
  | { reason: "no-linkedin"; ok: false }
  | { reason: "ok"; ok: true };

export function useStrategistEligibility(): StrategistEligibility {
  const { user, loading: authLoading } = useAuth();
  const { isConnected, isTokenValid, isLoading: linkedinLoading } = useLinkedIn();

  if (authLoading || !user) return { reason: "loading", ok: false };
  if (linkedinLoading) return { reason: "loading", ok: false };

  // Access check first — if the user isn't on the allowlist, we don't even
  // hint that connecting LinkedIn would help. Enterprise gate is upstream.
  if (!isStrategistAllowedForEmail(user.email)) {
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
