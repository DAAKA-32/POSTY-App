import { auth } from "./firebase";

/**
 * Run a Firestore read and, if it fails with `permission-denied` while a user
 * IS signed in, force-refresh the ID token once and retry.
 *
 * WHY THIS EXISTS — the "blank account after password reset" bug:
 *
 * Firestore reads are authorized by the ID token the SDK currently holds, not
 * by React's `user` state. There are two windows where the held token is stale
 * even though the user is legitimately signed in:
 *
 *   1. Right after login — `onAuthStateChanged` sets `user` and contexts fire
 *      their reads before the SDK has finished attaching the fresh ID token.
 *   2. After a password reset — `confirmPasswordReset` REVOKES every existing
 *      refresh token server-side. Any session still carrying a pre-reset token
 *      (e.g. the same browser, or a freshly-restored session) gets every read
 *      rejected with `permission-denied` until the token is force-refreshed.
 *
 * In both cases the user's data is fully intact in Firestore — it is only
 * momentarily unreadable. Without recovery, each context swallows the error and
 * falls back to null/empty, so the UI paints a "brand-new, empty account"
 * (only the email shows, because email comes from the auth `user` object rather
 * than Firestore). Forcing `getIdToken(true)` mints a non-revoked token and the
 * retry then reads the real data.
 *
 * Zero cost on the happy path (only runs the refresh when a read actually
 * fails). Safe on the server: `auth.currentUser` is undefined there, so the
 * original error is rethrown unchanged.
 *
 * This generalizes the inline recovery that previously lived only in
 * SchedulingContext so every first-paint read is equally resilient.
 */
export async function readWithAuthRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    const code = (err as { code?: string })?.code;
    if (code === "permission-denied" && auth?.currentUser) {
      // Mint a fresh, non-revoked ID token, then retry exactly once.
      await auth.currentUser.getIdToken(true).catch(() => {});
      return await fn();
    }
    throw err;
  }
}
