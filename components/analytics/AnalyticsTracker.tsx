"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  captureLanding,
  onConsentChange,
  trackPageview,
} from "@/lib/analytics/tracker";

/**
 * Mounted once globally in the root layout. Fires a page_view on initial load
 * and on every client-side route change — but only once the visitor has
 * accepted analytics in the cookie banner (enforced inside the tracker).
 *
 * When consent is granted mid-visit, the current page is reported right away
 * so the landing page and its referrer/UTM are not lost.
 *
 * `/admin` and `/api` paths are ignored so the dashboard doesn't pollute the
 * data it displays.
 */
export default function AnalyticsTracker() {
  const pathname = usePathname();
  const [consentTick, setConsentTick] = useState(0);

  // Snapshot referrer + campaign params in memory as early as possible.
  useEffect(() => {
    captureLanding();
  }, []);

  useEffect(() => onConsentChange(() => setConsentTick((n) => n + 1)), []);

  useEffect(() => {
    if (!pathname) return;
    void trackPageview(pathname);
  }, [pathname, consentTick]);

  return null;
}
