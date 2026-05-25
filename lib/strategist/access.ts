/**
 * Strategist access control — email allowlist.
 *
 * The Strategist is granted on a per-enterprise basis. There's no plan gate
 * (Free/Pro/Max users all get the same answer); access is determined by
 * whether the user's email is in `NEXT_PUBLIC_STRATEGIST_ALLOWED_EMAILS`
 * (a comma-separated list).
 *
 * Why an env var (not Firestore):
 *   - The allowlist is short (handful of enterprise contacts)
 *   - One source of truth, no admin UI to build
 *   - Easy to update via Vercel env vars + redeploy
 *   - Future-proof: if it grows, swap this module to read Firestore and the
 *     call-sites don't change.
 *
 * Why NEXT_PUBLIC_ (visible client-side):
 *   - The list is *who has access*, not *secret credentials*. Knowing that
 *     "alice@corp.com" has Strategist access leaks zero security.
 *   - Lets the client hide the FAB / dropdown row without an API round-trip.
 *
 * In `development`, access is always granted so the dev environment isn't
 * blocked by the allowlist (set the env var only in prod / staging).
 */

const ENV_KEY = "NEXT_PUBLIC_STRATEGIST_ALLOWED_EMAILS";

/** Parse the env var once at module load. Lowercased + trimmed for
 *  case-insensitive matching. */
function loadAllowedEmails(): Set<string> {
  const raw = process.env[ENV_KEY] ?? "";
  if (!raw) return new Set();
  return new Set(
    raw
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
  );
}

let _cached: Set<string> | null = null;
function getAllowedEmails(): Set<string> {
  if (_cached === null) _cached = loadAllowedEmails();
  return _cached;
}

/**
 * Check whether an email is allowed to use the Strategist.
 *
 * Allowlist is the SINGLE source of truth across every environment (dev,
 * preview, prod). No NODE_ENV bypass — if you want to test the Strategist
 * locally, put your email in `NEXT_PUBLIC_STRATEGIST_ALLOWED_EMAILS` in
 * `.env.local`. This keeps the dev experience honest: a user logged in
 * with a non-allowlisted account sees exactly what they'd see in prod
 * (no FAB, no dropdown row, no drawer access).
 *
 * `null` / `undefined` / empty strings return false — never grant access to
 * an unauthenticated or anonymized user.
 */
export function isStrategistAllowedForEmail(
  email: string | null | undefined
): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  if (!normalized) return false;
  return getAllowedEmails().has(normalized);
}

/** Total number of allowed emails — useful for diagnostics / debug pages. */
export function strategistAllowlistSize(): number {
  return getAllowedEmails().size;
}

// Server-only check `hasLinkedInConnected` lives in `./access-server.ts` —
// it imports firestore-admin which requires node-only modules. Keeping this
// file client-safe means the browser bundle never tries to resolve them.
