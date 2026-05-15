import { getAuth } from "firebase/auth";

/**
 * Get Authorization headers with Firebase ID token.
 * Use this for streaming requests (SSE) where authFetch() doesn't work.
 *
 * Returns headers object with Authorization: Bearer <token>
 * Returns empty object if user is not authenticated (guest).
 *
 * Pass `forceRefresh: true` after a 401 to bypass the cached token and
 * fetch a freshly minted one from the auth server. Without this, a stale
 * cached token keeps being re-sent and the request keeps failing.
 */
export async function getAuthHeaders(
  forceRefresh = false
): Promise<Record<string, string>> {
  try {
    const auth = getAuth();
    // Wait for Firebase Auth to restore persistence (IndexedDB / localStorage)
    // before deciding "no user". Without this, fetching headers right after a
    // page load returns {} while the user is actually signed in — the API
    // route then sees no Bearer token and replies 401.
    if (typeof auth.authStateReady === "function") {
      await auth.authStateReady();
    }
    const user = auth.currentUser;
    if (!user) return {};
    const token = await user.getIdToken(forceRefresh);
    return { Authorization: `Bearer ${token}` };
  } catch {
    return {};
  }
}

/**
 * Authenticated fetch wrapper.
 * Automatically adds Firebase ID token to requests.
 *
 * Usage:
 * ```ts
 * const response = await authFetch("/api/stripe/checkout", {
 *   method: "POST",
 *   body: JSON.stringify({ plan: "pro" }),
 * });
 * ```
 */
export async function authFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const authHeaders = await getAuthHeaders();

  return fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
      ...(options.headers || {}),
    },
  });
}
