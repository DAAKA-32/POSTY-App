import type { SchedulablePlatform } from "@/types";

/**
 * Platforms users can schedule from the app. Each needs BOTH a scheduled
 * adapter in functions/src/scheduler/publishers AND a connection context in
 * the app. Bluesky, Mastodon and Discord can be published immediately but
 * have no scheduled adapter: scheduling them could only ever fail, so every
 * scheduling entry point (UI, /api/ai/action, firestore.rules) refuses them.
 */
export const SCHEDULABLE_PLATFORMS: readonly SchedulablePlatform[] = ["linkedin", "facebook", "threads"];

export function isSchedulablePlatform(value: unknown): value is SchedulablePlatform {
  return typeof value === "string" && (SCHEDULABLE_PLATFORMS as readonly string[]).includes(value);
}

/** Firestore collection holding the user's OAuth connection per schedulable platform. */
export const SCHEDULABLE_CONNECTION_COLLECTION: Record<SchedulablePlatform, string> = {
  linkedin: "linkedinConnections",
  facebook: "facebookConnections",
  threads: "threadsConnections",
};

const DISPLAY_NAMES: Record<string, string> = {
  linkedin: "LinkedIn",
  facebook: "Facebook",
  threads: "Threads",
  threadsz: "Threads",
  bluesky: "Bluesky",
  mastodon: "Mastodon",
  discord: "Discord",
  x: "X",
  twitter: "X",
  instagram: "Instagram",
  reddit: "Reddit",
};

export function platformDisplayName(platform: string): string {
  return DISPLAY_NAMES[platform] ?? platform;
}
