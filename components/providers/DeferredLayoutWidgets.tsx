"use client";

/**
 * Client-side wrappers for the deferred layout widgets.
 *
 * Next.js 16+ forbids `dynamic(..., { ssr: false })` in Server Components, and
 * `app/layout.tsx` is a Server Component by default (keeping it that way lets
 * the layout participate in static metadata, JSON-LD, hreflang, etc.). So we
 * declare each `dynamic` here, inside a Client Component module, then re-export
 * the resulting components for the layout to render directly.
 *
 * Each underlying widget already carries its own `"use client"` and is
 * post-mount UX (overlays, listeners, analytics) — none need SSR.
 */
import dynamic from "next/dynamic";

export const StrategistDrawer = dynamic(
  () => import("@/components/strategist/StrategistDrawer"),
  { ssr: false },
);

export const AutonomousBatchBanner = dynamic(
  () => import("@/components/strategist/AutonomousBatchBanner"),
  { ssr: false },
);

export const WhatsNewModal = dynamic(
  () => import("@/components/onboarding/WhatsNewModal"),
  { ssr: false },
);

export const GlobalCommandPalette = dynamic(
  () => import("@/components/providers/GlobalCommandPalette"),
  { ssr: false },
);

export const CookieBanner = dynamic(
  () => import("@/components/ui/CookieBanner"),
  { ssr: false },
);

export const LegalUpdateNotification = dynamic(
  () => import("@/components/ui/LegalUpdateNotification"),
  { ssr: false },
);

export const LandscapeBlocker = dynamic(
  () => import("@/components/ui/LandscapeBlocker"),
  { ssr: false },
);

export const AnalyticsTracker = dynamic(
  () => import("@/components/analytics/AnalyticsTracker"),
  { ssr: false },
);
