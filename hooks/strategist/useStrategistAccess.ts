"use client";

/**
 * useStrategistAccess — single source of truth for client-side Strategist
 * gating. Reads the current user's email and checks it against the env-var
 * allowlist (`NEXT_PUBLIC_STRATEGIST_ALLOWED_EMAILS`).
 *
 * Returns false until the auth state is known so we don't briefly flash the
 * Strategist FAB / dropdown row to logged-out visitors.
 */

import { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { isStrategistAllowedForEmail } from "@/lib/strategist/access";

export function useStrategistAccess(): boolean {
  const { user } = useAuth();
  return useMemo(() => isStrategistAllowedForEmail(user?.email), [user?.email]);
}
