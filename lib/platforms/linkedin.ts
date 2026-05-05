import { getAuthHeaders } from "@/lib/api/client";
import { TOKEN_EXPIRY_BUFFER_MS } from "@/lib/config/platform-constants";

// LinkedIn OAuth 2.0 Configuration and API utilities

const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || "https://postyapp.ai").trim();

// Only the base scopes are requested at OAuth: openid/profile/email for identity,
// w_member_social to publish on the user's personal profile. Org scopes
// (r_organization_social, w_organization_social, rw_organization_admin) require
// Marketing Developer Platform approval and would cause LinkedIn to reject the
// whole request if they're not enabled on the app.
const BASE_SCOPES = ["openid", "profile", "email", "w_member_social"];

export const LINKEDIN_CONFIG = {
  clientId: process.env.NEXT_PUBLIC_LINKEDIN_CLIENT_ID || "",
  redirectUri: `${baseUrl}/api/auth/linkedin/callback`,
  scope: BASE_SCOPES.join(" "),
  authorizationUrl: "https://www.linkedin.com/oauth/v2/authorization",
};

// Kept as a constant so dependent modules (organizations.ts, hasOrganizationAccess)
// can detect that org scopes are never granted and skip cleanly. Add these back
// to LINKEDIN_CONFIG.scope above if Marketing Developer Platform gets approved.
const ORG_SCOPES = ["r_organization_social", "w_organization_social", "rw_organization_admin"];
export const LINKEDIN_ORG_SCOPES = ORG_SCOPES;

/** Check whether a list of granted scopes unlocks organization features */
export function hasOrganizationAccess(grantedScopes: string[] | undefined | null): boolean {
  if (!grantedScopes || grantedScopes.length === 0) return false;
  return ORG_SCOPES.every((s) => grantedScopes.includes(s));
}

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
  postId?: string,
  organizationUrn?: string
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
        organizationUrn: organizationUrn || undefined,
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
  postId?: string,
  organizationUrn?: string
): Promise<LinkedInPostResult> {
  try {
    const authHeaders = await getAuthHeaders();

    const formData = new FormData();
    formData.append("userId", userId);
    formData.append("content", content);
    formData.append("visibility", visibility);
    if (postId) formData.append("postId", postId);
    if (organizationUrn) formData.append("organizationUrn", organizationUrn);
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

/**
 * Publie du contenu avec une vidéo sur LinkedIn via FormData
 *
 * La vidéo est streamée vers LinkedIn puis détruite — aucun stockage permanent.
 */
export async function postToLinkedInWithVideo(
  userId: string,
  content: string,
  visibility: "PUBLIC" | "CONNECTIONS" = "PUBLIC",
  video: File,
  postId?: string,
  organizationUrn?: string
): Promise<LinkedInPostResult> {
  try {
    const authHeaders = await getAuthHeaders();

    const formData = new FormData();
    formData.append("userId", userId);
    formData.append("content", content);
    formData.append("visibility", visibility);
    if (postId) formData.append("postId", postId);
    if (organizationUrn) formData.append("organizationUrn", organizationUrn);
    formData.append("video", video);

    const response = await fetch("/api/linkedin/publish-with-video", {
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
  return expiresAt <= new Date(now.getTime() + TOKEN_EXPIRY_BUFFER_MS);
}

// Generate a random state for OAuth security
export function generateOAuthState(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
