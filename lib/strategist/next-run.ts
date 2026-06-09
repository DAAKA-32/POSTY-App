/**
 * Next autonomous-cron run for a chosen weekday.
 *
 * The `weeklyAutonomousStrategist` cron fires DAILY at 08:00 Europe/Paris and
 * generates a plan for every user whose chosen `dayOfWeek === today`. So the
 * intuitive "next run" is the NEXT upcoming occurrence of that weekday —
 * which INCLUDES today when today IS the chosen day and the 08:00 generation
 * window hasn't passed yet.
 *
 * The previous logic (`((day - today + 7) % 7) || 7`) ALWAYS jumped a full
 * week when today was the chosen day, which read as "you picked Tuesday but
 * the next plan is next Tuesday" — a confusing, artificial one-week delay.
 *
 * Rules (mirror the cron + a human's mental model):
 *   - today is the chosen day, before 08:00      → today
 *   - today is the chosen day, at/after 08:00     → next week (this morning's
 *     run already happened; the dedup guard blocks a same-week re-run)
 *   - a later weekday this week                   → this week
 *   - an earlier weekday in the week              → its next occurrence
 *
 * `dayOfWeek`: 0 = Sunday … 6 = Saturday (JS `Date.getDay()` convention).
 * `now` is injectable so the behavior is unit-testable; defaults to the real
 * clock. Times are interpreted in the runtime-local timezone — which is the
 * user's own clock on the client, matching what they see and intend.
 */

/** Hour (local) at which the autonomous cron generates the plan. */
const GENERATION_HOUR = 8;

/** The Date of the next run, at 08:00 local. Exported for tests + reuse. */
export function nextRunDate(dayOfWeek: number, now: Date = new Date()): Date {
  let days = (dayOfWeek - now.getDay() + 7) % 7; // 0..6, 0 = today
  // Today is the chosen day but this morning's generation window has passed
  // → the next run is a week out (never schedule the run in the past).
  if (days === 0 && now.getHours() >= GENERATION_HOUR) days = 7;
  const d = new Date(now);
  d.setDate(now.getDate() + days);
  d.setHours(GENERATION_HOUR, 0, 0, 0);
  return d;
}

/** Short FR label for the next run, e.g. "vendredi 13 juin, 8h". */
export function nextRunLabel(dayOfWeek: number, now: Date = new Date()): string {
  return (
    nextRunDate(dayOfWeek, now).toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    }) + ", 8h"
  );
}
