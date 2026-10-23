"use client";

/**
 * useStrategistAccess — single source of truth for client-side "may this user
 * use the Strategist?" (nav entry, dashboard card). The rule is canUseStrategist
 * (lib/strategist/access.ts): the EFFECTIVE plan includes the Strategist (Pro,
 * Max, founder / gift accounts) or the email is on the allowlist
 * (`NEXT_PUBLIC_STRATEGIST_ALLOWED_EMAILS`).
 *
 * Returns false until the plan is known (auth + profile loaded), so the entry
 * never flashes to logged-out visitors or while the plan is still loading. The
 * API routes enforce the same rule server-side: this only decides what to show.
 */

import { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { canUseStrategist } from "@/lib/strategist/access";

export function useStrategistAccess(): boolean {
  const { user } = useAuth();
  const { currentPlan } = useSubscription();
  return useMemo(() => canUseStrategist(user?.email, currentPlan), [user?.email, currentPlan]);
}
