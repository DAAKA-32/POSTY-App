/**
 * Shared platform constants for token management and API timing.
 */

/** Buffer time before token expiry to consider it expired (5 minutes) */
export const TOKEN_EXPIRY_BUFFER_MS = 5 * 60 * 1000;

/** Threshold for proactive Twitter token refresh (30 minutes before expiry) */
export const TWITTER_REFRESH_THRESHOLD_MS = 30 * 60 * 1000;

/** Delay waiting for Threads container to be ready after creation */
export const THREADS_PUBLISH_DELAY_MS = 2000;

/** Default Threads token expiration in seconds (60 days) */
export const THREADS_DEFAULT_TOKEN_EXPIRY_SECONDS = 5184000;

/** Seconds in a day */
export const SECONDS_PER_DAY = 86400;

/** Maximum number of scheduled posts to process per scheduler run */
export const SCHEDULER_BATCH_SIZE = 50;
