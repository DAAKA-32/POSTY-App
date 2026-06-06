/**
 * Gate for the experimental "visuals on Strategist posts" feature.
 *
 * Founder-only rollout for now (emilien). Client-safe — imported by the
 * BatchPlanCard (to show/hide the button) AND the schedule route (to decide
 * whether to attach a generated image to the published post). Reads
 * NEXT_PUBLIC_STRATEGIST_IMAGES_EMAILS (comma-separated) and always includes
 * the default founder email, so broadening access is a one-line env change.
 */

const DEFAULT_ALLOWED = ["emilien.nepveu@gmail.com"];

function allowedEmails(): Set<string> {
  const env = process.env.NEXT_PUBLIC_STRATEGIST_IMAGES_EMAILS ?? "";
  const extra = env
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return new Set([...DEFAULT_ALLOWED, ...extra]);
}

/** Whether this email may generate + publish visuals on Strategist posts. */
export function isStrategistImagesAllowedForEmail(
  email: string | null | undefined,
): boolean {
  if (!email) return false;
  return allowedEmails().has(email.trim().toLowerCase());
}
