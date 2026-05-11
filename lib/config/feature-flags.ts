/**
 * Environment-driven feature flags for staged rollouts.
 *
 * Pattern: each flag defaults to OFF (production-safe). Set the corresponding
 * `NEXT_PUBLIC_ENABLE_*` env var to `"true"` in `.env.local` (dev) or in the
 * Vercel project settings (prod) to enable. NEXT_PUBLIC_ vars are inlined at
 * build time and work identically on client + server.
 *
 * Why centralize here:
 *   - Single source of truth — every consumer reads through one function so
 *     enabling a feature is a one-line change in env vars, no code edits.
 *   - Discoverability — new contributors can scan this file to see what's
 *     gated and why, without grep'ing for `NEXT_PUBLIC_` strings.
 *   - The trial-gate flag stays in plans.ts because it's tightly coupled to
 *     trial-resolution helpers; flags here are unrelated rollout switches.
 */

/**
 * Marketing Strategist drawer + FAB + /strategist route.
 *
 * Why gated: feature is shipped in the codebase but not yet announced; we
 * don't want production users to discover it via the bottom-right FAB before
 * the launch comms go out.
 */
export function isStrategistEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_STRATEGIST === "true";
}

/**
 * Ready-to-publish posts carousel on the /app welcome screen
 * (the chip row: Storytelling, Lesson Learned, Engagement, …).
 *
 * Enabled by default in all environments now that the template catalog has
 * shipped. Setting `NEXT_PUBLIC_ENABLE_READY_POSTS=false` still hides it as
 * a kill-switch if we need to pull it post-deploy.
 */
export function isReadyPostsEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_READY_POSTS !== "false";
}
