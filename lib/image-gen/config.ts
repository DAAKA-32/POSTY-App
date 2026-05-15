/**
 * Client-safe image-gen feature flags. Lives in its own module so the value
 * can be read both from the API route (server) and from React components
 * (client) without pulling firebase-admin into the bundle.
 */

/**
 * Master switch for the per-day image generation quota.
 *
 * When `false`:
 *   - The backend skips `checkImageQuota` and `incrementImageQuota` — any
 *     authenticated user can generate any number of visuals
 *   - The frontend treats `planLimits.imagesPerDay` as unlimited: the
 *     "Visuel" row is unlocked on every plan, the upgrade banner never
 *     triggers, the daily-count badge in the dropdown disappears
 *
 * Flip back to `true` once we want to enforce per-plan caps again.
 */
export const IMAGE_GEN_QUOTA_ENABLED = false;
