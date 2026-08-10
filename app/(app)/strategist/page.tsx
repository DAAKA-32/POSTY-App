"use client";

/**
 * /strategist — legacy compat redirect.
 *
 * The Strategist used to be a full-page route. It now lives inline in a
 * drawer, mounted once at AppProvider level (see StrategistDrawerProvider).
 * Any existing link, bookmark, or sidebar entry that pointed at /strategist
 * continues to work: this component opens the drawer and immediately routes
 * the user back to their main app surface (/app), so they never see a blank
 * intermediate page.
 *
 * No UI is rendered here on purpose — the drawer is the experience.
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStrategistDrawer } from "@/contexts/StrategistDrawerContext";
import { isStrategistEnabled } from "@/lib/config/feature-flags";

export default function StrategistRedirect() {
  const router = useRouter();
  const { open } = useStrategistDrawer();

  useEffect(() => {
    // When the Strategist is gated off, just redirect to /app without
    // opening the drawer. Direct URL access shouldn't surface a feature
    // we're not yet exposing via the FAB.
    if (isStrategistEnabled()) {
      open();
    }
    // Replace so the back button doesn't return to this dead route.
    router.replace("/app");
  }, [open, router]);

  return null;
}
