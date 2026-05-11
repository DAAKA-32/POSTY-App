"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { trackPageview } from "@/lib/analytics/tracker";

/**
 * Mounted once globally in the root layout. Fires a pageview on initial load
 * and on every client-side route change. The actual auth state is resolved
 * inside `trackPageview` (best-effort, server-verified).
 *
 * `/admin` and `/api` paths are ignored inside `trackPageview` so they don't
 * pollute the analytics surface they themselves render.
 */
export default function AnalyticsTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;
    void trackPageview(pathname);
  }, [pathname]);

  return null;
}
