import { getAuthHeaders } from "@/lib/api/client";
import { TOKEN_EXPIRY_BUFFER_MS, TWITTER_REFRESH_THRESHOLD_MS } from "@/lib/config/platform-constants";

// Twitter (X) OAuth 2.0 Configuration and API utilities
// Uses PKCE (Proof Key for Code Exchange) for enhanced security

export const TWITTER_CONFIG = {
  clientId: process.env.NEXT_PUBLIC_TWITTER_CLIENT_ID || "",
  redirectUri: process.env.NEXT_PUBLIC_TWITTER_REDIRECT_URI || "",
  scope: "tweet.read tweet.write users.read offline.access",
  authorizationUrl: "https://twitter.com/i/oauth2/authorize",
  tokenUrl: "https://api.twitter.com/2/oauth2/token",
  apiUrl: "https://api.twitter.com/2",
};

// Character limit for tweets
export const TWITTER_CHAR_LIMIT = 280;

/**
 * Generate a random code verifier for PKCE
 * Must be between 43-128 characters, URL-safe
 */
export function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

/**
 * Generate code challenge from verifier using SHA-256
 */
export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return base64UrlEncode(new Uint8Array(digest));
}

/**
 * Base64 URL encode (no padding, URL-safe characters)
 */
function base64UrlEncode(buffer: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...buffer));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

/**
 * Generate Twitter OAuth 2.0 authorization URL with PKCE
 * @param userId - User ID (passed as state for callback)
 * @param codeChallenge - PKCE code challenge
 * @returns Authorization URL
 */
export function getTwitterAuthUrl(userId: string, codeChallenge: string): string {
  const state = `${userId}:${generateRandomState()}`;

  const params = new URLSearchParams({
    response_type: "code",
    client_id: TWITTER_CONFIG.clientId,
    redirect_uri: TWITTER_CONFIG.redirectUri,
    scope: TWITTER_CONFIG.scope,
    state: state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  return `${TWITTER_CONFIG.authorizationUrl}?${params.toString()}`;
}

/**
 * Generate a random state for OAuth security
 */
function generateRandomState(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

// Twitter token response type
export interface TwitterTokenResponse {
  token_type: string;
  expires_in: number;
  access_token: string;
  scope: string;
  refresh_token?: string;
}

// Twitter user profile response type
export interface TwitterProfile {
  id: string;
  name: string;
  username: string;
  profile_image_url?: string;
}

// Twitter API user response
export interface TwitterUserResponse {
  data: TwitterProfile;
}

// Twitter connection data stored in Firestore
export interface TwitterConnection {
  userId: string;
  twitterId: string;
  username: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
  profileName: string;
  profilePicture?: string;
  connectedAt: Date;
  lastUsedAt?: Date;
}

// Twitter post result
export interface TwitterPostResult {
  id: string;
  success: boolean;
  tweetUrl?: string;
  error?: string;
}

// Published tweet record for Firestore
export interface TwitterPostRecord {
  id: string;
  userId: string;
  twitterId: string;
  tweetId: string;
  content: string;
  publishedAt: Date;
  tweetUrl?: string;
  success: boolean;
  error?: string;
}

/**
 * Publish content to Twitter via Next.js API route
 *
 * @param userId - POSTY user ID
 * @param content - Tweet content (max 280 chars)
 * @param postId - POSTY post ID (optional)
 * @returns Publish result
 */
export async function postToTwitter(
  userId: string,
  content: string,
  postId?: string
): Promise<TwitterPostResult> {
  try {
    // Validate content length
    const validation = validateTweetLength(content);
    if (!validation.isValid) {
      return {
        id: "",
        success: false,
        error: `Tweet trop long (${content.length}/${TWITTER_CHAR_LIMIT} caracteres)`,
      };
    }

    const authHeaders = await getAuthHeaders();
    const response = await fetch("/api/twitter/publish", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
      },
      body: JSON.stringify({
        userId,
        content,
        postId,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        id: "",
        success: false,
        error: result.message || result.error || "Échec de la publication",
      };
    }

    return {
      id: result.tweetId || "",
      success: true,
      tweetUrl: result.tweetUrl,
    };
  } catch (error) {
    return {
      id: "",
      success: false,
      error: error instanceof Error ? error.message : "Erreur inattendue",
    };
  }
}

/**
 * Refresh Twitter access token
 * @param userId - POSTY user ID
 * @returns New expiration time or error
 */
export async function refreshTwitterToken(
  userId: string
): Promise<{ success: boolean; expiresAt?: Date; error?: string }> {
  try {
    const refreshAuthHeaders = await getAuthHeaders();
    const response = await fetch("/api/twitter/refresh", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...refreshAuthHeaders,
      },
      body: JSON.stringify({ userId }),
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: result.message || result.error || "Échec du rafraîchissement",
      };
    }

    return {
      success: true,
      expiresAt: new Date(result.expiresAt),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inattendue",
    };
  }
}

/**
 * Validate tweet content length
 * @param content - Tweet content
 * @returns Validation result with remaining characters
 */
export function validateTweetLength(content: string): {
  isValid: boolean;
  remaining: number;
  percentage: number;
  length: number;
} {
  const length = content.length;
  const remaining = TWITTER_CHAR_LIMIT - length;
  const percentage = Math.min((length / TWITTER_CHAR_LIMIT) * 100, 100);

  return {
    isValid: length <= TWITTER_CHAR_LIMIT && length > 0,
    remaining,
    percentage,
    length,
  };
}

/**
 * Check if token is expired or about to expire (within 5 minutes)
 */
export function isTokenExpired(expiresAt: Date): boolean {
  const now = new Date();
  return expiresAt <= new Date(now.getTime() + TOKEN_EXPIRY_BUFFER_MS);
}

/**
 * Check if token needs refresh (within 30 minutes of expiry)
 * Twitter tokens expire after 2 hours
 */
export function tokenNeedsRefresh(expiresAt: Date): boolean {
  const now = new Date();
  return expiresAt <= new Date(now.getTime() + TWITTER_REFRESH_THRESHOLD_MS);
}

/**
 * Format tweet URL from tweet ID and username
 */
export function getTweetUrl(username: string, tweetId: string): string {
  return `https://twitter.com/${username}/status/${tweetId}`;
}

/**
 * Store code verifier in sessionStorage for PKCE flow
 */
export function storeCodeVerifier(verifier: string): void {
  if (typeof window !== "undefined") {
    sessionStorage.setItem("twitter_code_verifier", verifier);
  }
}

/**
 * Retrieve and clear code verifier from sessionStorage
 */
export function getAndClearCodeVerifier(): string | null {
  if (typeof window !== "undefined") {
    const verifier = sessionStorage.getItem("twitter_code_verifier");
    sessionStorage.removeItem("twitter_code_verifier");
    return verifier;
  }
  return null;
}
