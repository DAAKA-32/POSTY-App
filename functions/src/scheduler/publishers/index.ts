import type { SchedulerPlatform } from "../types";
import { publishToFacebook } from "./facebook";
import { publishToLinkedIn } from "./linkedin";
import { publishToThreads } from "./threads";
import type { Publisher } from "./types";
import { publishViaZernioPlatform } from "./zernio";

/**
 * Single source of truth for what the scheduler can publish. Bluesky,
 * Mastodon and Discord are publishable immediately from the app but have no
 * scheduled adapter — the app refuses to schedule them (see
 * lib/scheduling/platforms.ts) and so does firestore.rules.
 */
export const PUBLISHERS: Record<SchedulerPlatform, Publisher> = {
  linkedin: publishToLinkedIn,
  facebook: publishToFacebook,
  threads: publishToThreads,
  x: publishViaZernioPlatform,
  twitter: publishViaZernioPlatform,
  instagram: publishViaZernioPlatform,
  reddit: publishViaZernioPlatform,
  threadsz: publishViaZernioPlatform,
};
