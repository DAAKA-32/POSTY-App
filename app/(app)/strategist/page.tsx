"use client";

/**
 * /strategist — legacy compat redirect.
 *
 * The Strategist is now a full workspace at /app/strategist (it used to be a
 * drawer opened from /app). Any existing link or bookmark that pointed at
 * /strategist keeps working: it goes straight to the workspace, or back to the
 * post studio when the Strategist is gated off.
 *
 * No UI is rendered on purpose — a blank intermediate page would just flash.
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isStrategistEnabled } from "@/lib/config/feature-flags";

export default function StrategistRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Replace so the back button doesn't return to this dead route.
    router.replace(isStrategistEnabled() ? "/app/strategist" : "/app");
  }, [router]);

  return null;
}
