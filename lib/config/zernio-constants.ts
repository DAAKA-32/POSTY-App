// Zernio aggregator integration — shared constants.
//
// Kept in a tiny module so both Next.js (lib/integrations/zernio.ts) and
// Cloud Functions (functions/src/zernio.ts copy) can reference the same
// base URL and env var name without duplicating them inline.

export const ZERNIO_API_BASE = "https://zernio.com/api/v1";
export const ZERNIO_API_KEY_ENV = "ZERNIO_API_KEY" as const;

/** Platforms Posty publishes via Zernio (vs. its own native adapters). */
export const ZERNIO_PLATFORMS = ["twitter", "instagram", "reddit"] as const;
export type ZernioPlatformName = (typeof ZERNIO_PLATFORMS)[number];

/** Maps Posty's internal platform key to Zernio's platform string. */
export const POSTY_TO_ZERNIO_PLATFORM: Record<string, ZernioPlatformName> = {
  x: "twitter",
  twitter: "twitter",
  instagram: "instagram",
  reddit: "reddit",
};
