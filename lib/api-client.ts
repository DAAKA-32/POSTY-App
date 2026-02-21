import { getAuth } from "firebase/auth";

/**
 * Get Authorization headers with Firebase ID token.
 * Use this for streaming requests (SSE) where authFetch() doesn't work.
 *
 * Returns headers object with Authorization: Bearer <token>
 * Returns empty object if user is not authenticated (guest).
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return {};
    const token = await user.getIdToken();
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
