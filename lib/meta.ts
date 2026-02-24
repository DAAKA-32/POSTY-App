import { getAuthHeaders } from "@/lib/api-client";

// Meta (Facebook & Threads) OAuth 2.0 Configuration and API utilities
// Facebook and Threads use separate OAuth flows but share the same Meta App credentials

// Shared Meta App credentials (Facebook)
export const META_CONFIG = {
  appId: process.env.NEXT_PUBLIC_META_APP_ID || "",
  appSecret: process.env.META_APP_SECRET || "",
};

// Threads-specific credentials (separate Meta app)
export const THREADS_CREDENTIALS = {
  appId: process.env.NEXT_PUBLIC_THREADS_APP_ID || "",
  appSecret: process.env.THREADS_APP_SECRET || "",
};

const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || "https://postyapp.ai").trim();

// Facebook OAuth Configuration
export const FACEBOOK_CONFIG = {
  authorizationUrl: "https://www.facebook.com/v21.0/dialog/oauth",
  tokenUrl: "https://graph.facebook.com/v21.0/oauth/access_token",
  apiUrl: "https://graph.facebook.com/v21.0",
  redirectUri: `${baseUrl}/api/auth/facebook/callback`,
  scope: "pages_manage_posts,pages_read_engagement,public_profile,email",
};

// Threads OAuth Configuration
export const THREADS_CONFIG = {
  authorizationUrl: "https://threads.net/oauth/authorize",
  tokenUrl: "https://graph.threads.net/oauth/access_token",
  longLivedTokenUrl: "https://graph.threads.net/access_token",
  apiUrl: "https://graph.threads.net/v1.0",
  redirectUri: `${baseUrl}/api/auth/threads/callback`,
  scope: "threads_basic,threads_content_publish",
};

// ============== FACEBOOK AUTH ==============

/**
 * Generate Facebook OAuth 2.0 authorization URL
 */
export function getFacebookAuthUrl(userId: string): string {
  const state = `${userId}:${generateRandomState()}`;

  const params = new URLSearchParams({
    client_id: META_CONFIG.appId,
    redirect_uri: FACEBOOK_CONFIG.redirectUri,
    scope: FACEBOOK_CONFIG.scope,
    response_type: "code",
    state,
  });

  return `${FACEBOOK_CONFIG.authorizationUrl}?${params.toString()}`;
}

// ============== THREADS AUTH ==============

/**
 * Generate Threads OAuth 2.0 authorization URL
 */
export function getThreadsAuthUrl(userId: string): string {
  const state = `${userId}:${generateRandomState()}`;

  const params = new URLSearchParams({
    client_id: THREADS_CREDENTIALS.appId,
    redirect_uri: THREADS_CONFIG.redirectUri,
    scope: THREADS_CONFIG.scope,
    response_type: "code",
    state,
  });

  return `${THREADS_CONFIG.authorizationUrl}?${params.toString()}`;
}

// ============== SHARED UTILITIES ==============

/**
 * Generate a random state for OAuth security (CSRF protection)
 */
function generateRandomState(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * Check if a Meta token is expired or about to expire (within 5 minutes)
 */
export function isMetaTokenExpired(expiresAt: Date): boolean {
  const now = new Date();
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);
  return expiresAt <= fiveMinutesFromNow;
}

// ============== FACEBOOK TYPES ==============

export interface FacebookTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface FacebookProfile {
  id: string;
  name: string;
  email?: string;
  picture?: {
    data: {
      url: string;
    };
  };
}

export interface FacebookPage {
  id: string;
  name: string;
  access_token: string;
  category?: string;
}

export interface FacebookPagesResponse {
  data: FacebookPage[];
}

// ============== THREADS TYPES ==============

export interface ThreadsTokenResponse {
  access_token: string;
  user_id: string;
}

export interface ThreadsLongLivedTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface ThreadsProfile {
  id: string;
  username: string;
  name?: string;
  threads_profile_picture_url?: string;
}

// ============== CLIENT-SIDE API WRAPPERS ==============

export interface FacebookPostResult {
  id: string;
  success: boolean;
  postUrl?: string;
  error?: string;
}

export interface ThreadsPostResult {
  id: string;
  success: boolean;
  permalink?: string;
  error?: string;
}

/**
 * Publish content to Facebook via Next.js API route
 */
export async function postToFacebook(
  userId: string,
  content: string,
  postId?: string
): Promise<FacebookPostResult> {
  try {
    const authHeaders = await getAuthHeaders();
    const response = await fetch("/api/facebook/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify({ userId, content, postId }),
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
      id: result.postId || "",
      success: true,
      postUrl: result.postUrl,
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
 * Publish content to Threads via Next.js API route
 */
export async function postToThreads(
  userId: string,
  content: string,
  postId?: string
): Promise<ThreadsPostResult> {
  try {
    const threadsAuthHeaders = await getAuthHeaders();
    const response = await fetch("/api/threads/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...threadsAuthHeaders },
      body: JSON.stringify({ userId, content, postId }),
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
      id: result.threadId || "",
      success: true,
      permalink: result.permalink,
    };
  } catch (error) {
    return {
      id: "",
      success: false,
      error: error instanceof Error ? error.message : "Erreur inattendue",
    };
  }
}
