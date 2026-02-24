import { getAuthHeaders } from "@/lib/api-client";

// LinkedIn OAuth 2.0 Configuration and API utilities

const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || "https://postyapp.ai").trim();

export const LINKEDIN_CONFIG = {
  clientId: process.env.NEXT_PUBLIC_LINKEDIN_CLIENT_ID || "",
  redirectUri: `${baseUrl}/api/auth/linkedin/callback`,
  scope: "openid profile email w_member_social",
  authorizationUrl: "https://www.linkedin.com/oauth/v2/authorization",
};

/**
 * Génère l'URL d'autorisation LinkedIn OAuth 2.0
 * @param userId - L'ID de l'utilisateur (passé comme state pour le callback)
 * @returns URL de redirection vers LinkedIn
 */
export function getLinkedInAuthUrl(userId: string): string {
  const randomState = generateOAuthState();
  const state = `${userId}:${randomState}`;

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

/**
 * Publie du contenu sur LinkedIn via l'API Next.js
 *
 * Cette fonction appelle notre route API Next.js qui gère:
 * - La vérification du token
 * - La publication via l'API LinkedIn
 * - L'enregistrement dans Firestore
 *
 * @param userId - ID de l'utilisateur POSTY
 * @param content - Contenu du post à publier
 * @param visibility - Visibilité du post (PUBLIC ou CONNECTIONS)
 * @param postId - ID du post POSTY (optionnel)
 * @returns Résultat de la publication
 */
export async function postToLinkedIn(
  userId: string,
  content: string,
  visibility: "PUBLIC" | "CONNECTIONS" = "PUBLIC",
  postId?: string
): Promise<LinkedInPostResult> {
  try {
    const authHeaders = await getAuthHeaders();
    const response = await fetch("/api/linkedin/publish", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
      },
      body: JSON.stringify({
        userId,
        content,
        visibility,
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
      id: result.shareId || "",
      success: true,
      postUrl: result.shareUrl,
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
 * Publie du contenu avec images sur LinkedIn via FormData
 *
 * Les images sont streamées vers LinkedIn puis détruites — aucun stockage permanent.
 */
export async function postToLinkedInWithMedia(
  userId: string,
  content: string,
  visibility: "PUBLIC" | "CONNECTIONS" = "PUBLIC",
  images: File[],
  postId?: string
): Promise<LinkedInPostResult> {
  try {
    const authHeaders = await getAuthHeaders();

    const formData = new FormData();
    formData.append("userId", userId);
    formData.append("content", content);
    formData.append("visibility", visibility);
    if (postId) formData.append("postId", postId);
    images.forEach((image) => formData.append("images", image));

    // Do NOT set Content-Type — browser sets multipart boundary automatically
    const response = await fetch("/api/linkedin/publish-with-media", {
      method: "POST",
      headers: { ...authHeaders },
      body: formData,
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
      id: result.shareId || "",
      success: true,
      postUrl: result.shareUrl,
    };
  } catch (error) {
    return {
      id: "",
      success: false,
      error: error instanceof Error ? error.message : "Erreur inattendue",
    };
  }
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
