// LinkedIn OAuth 2.0 Configuration and API utilities

export const LINKEDIN_CONFIG = {
  clientId: process.env.NEXT_PUBLIC_LINKEDIN_CLIENT_ID || "",
  redirectUri: process.env.NEXT_PUBLIC_LINKEDIN_REDIRECT_URI || "",
  scope: "openid profile email w_member_social",
  authorizationUrl: "https://www.linkedin.com/oauth/v2/authorization",
  // Firebase Cloud Functions URLs
  callbackFunctionUrl: process.env.NEXT_PUBLIC_LINKEDIN_CALLBACK_FUNCTION_URL || "",
  postFunctionUrl: process.env.NEXT_PUBLIC_LINKEDIN_POST_FUNCTION_URL || "",
};

// Generate LinkedIn OAuth authorization URL
export function getLinkedInAuthUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: LINKEDIN_CONFIG.clientId,
    redirect_uri: LINKEDIN_CONFIG.redirectUri,
    state,
    scope: LINKEDIN_CONFIG.scope,
  });

  return `${LINKEDIN_CONFIG.authorizationUrl}?${params.toString()}`;
}

// LinkedIn token response type
export interface LinkedInTokenResponse {
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
  id_token?: string;
}

// LinkedIn profile response type
export interface LinkedInProfile {
  sub: string; // LinkedIn member ID
  name: string;
  given_name: string;
  family_name: string;
  picture?: string;
  email?: string;
  email_verified?: boolean;
}

// LinkedIn connection data stored in Firestore
export interface LinkedInConnection {
  userId: string;
  linkedInId: string;
  accessToken: string;
  expiresAt: Date;
  profileName: string;
  profilePicture?: string;
  email?: string;
  connectedAt: Date;
  lastUsedAt?: Date;
}

// LinkedIn post result
export interface LinkedInPostResult {
  id: string;
  success: boolean;
  postUrl?: string;
  error?: string;
}

// Published post record for Firestore
export interface LinkedInPostRecord {
  id: string;
  userId: string;
  linkedInId: string;
  postId: string;
  content: string;
  publishedAt: Date;
  postUrl?: string;
  success: boolean;
  error?: string;
}

// Exchange authorization code for access token via Cloud Function
export async function exchangeCodeForToken(
  code: string
): Promise<{
  success: boolean;
  accessToken?: string;
  expiresAt?: string;
  linkedInId?: string;
  profileName?: string;
  profilePicture?: string;
  email?: string;
  error?: string;
}> {
  const response = await fetch(LINKEDIN_CONFIG.callbackFunctionUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      code,
      redirectUri: LINKEDIN_CONFIG.redirectUri,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    return { success: false, error: error.error || "Failed to exchange code" };
  }

  return response.json();
}

// Post content to LinkedIn via Cloud Function
export async function postToLinkedIn(
  accessToken: string,
  linkedInId: string,
  content: string,
  expiresAt: string
): Promise<LinkedInPostResult> {
  const response = await fetch(LINKEDIN_CONFIG.postFunctionUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      accessToken,
      linkedInId,
      content,
      expiresAt,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    return {
      id: "",
      success: false,
      error: error.error || "Failed to post to LinkedIn",
    };
  }

  const result = await response.json();
  return {
    id: result.postId || "",
    success: result.success,
    postUrl: result.postUrl,
    error: result.error,
  };
}

// Check if token is expired or about to expire (within 5 minutes)
export function isTokenExpired(expiresAt: Date): boolean {
  const now = new Date();
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);
  return expiresAt <= fiveMinutesFromNow;
}

// Generate a random state for OAuth security
export function generateOAuthState(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
