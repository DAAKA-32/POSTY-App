// Medium API Configuration and utilities
// Uses Integration Tokens (user-provided, no OAuth flow needed)

export const MEDIUM_CONFIG = {
  apiUrl: "https://api.medium.com/v1",
};

// Medium user profile response
export interface MediumProfile {
  id: string;
  username: string;
  name: string;
  url: string;
  imageUrl?: string;
}

// Medium API response wrapper
export interface MediumApiResponse<T> {
  data: T;
}

// Medium connection data stored in Firestore
export interface MediumConnection {
  userId: string;
  mediumId: string;
  username: string;
  integrationToken: string;
  profileName: string;
  profilePicture?: string;
  profileUrl?: string;
  connectedAt: Date;
  lastUsedAt?: Date;
}

// Medium publish status options
export type MediumPublishStatus = "draft" | "public" | "unlisted";

// Medium post result
export interface MediumPostResult {
  id: string;
  success: boolean;
  articleUrl?: string;
  error?: string;
}

// Medium create post request
export interface MediumCreatePostRequest {
  title: string;
  contentFormat: "html" | "markdown";
  content: string;
  publishStatus: MediumPublishStatus;
  tags?: string[];
  canonicalUrl?: string;
}

// Medium post response
export interface MediumPost {
  id: string;
  title: string;
  authorId: string;
  url: string;
  canonicalUrl?: string;
  publishStatus: MediumPublishStatus;
  publishedAt?: number;
  license: string;
  licenseUrl: string;
  tags: string[];
}

// Published article record for Firestore
export interface MediumPostRecord {
  id: string;
  userId: string;
  mediumId: string;
  articleId: string;
  title: string;
  content: string;
  articleUrl?: string;
  publishStatus: MediumPublishStatus;
  publishedAt: Date;
  success: boolean;
  error?: string;
}

/**
 * Validate Medium integration token by fetching user profile
 * This is called client-side when user enters their token
 *
 * @param token - Medium integration token
 * @returns User profile if valid, null if invalid
 */
export async function validateMediumToken(token: string): Promise<MediumProfile | null> {
  try {
    const response = await fetch(`${MEDIUM_CONFIG.apiUrl}/me`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return null;
    }

    const result: MediumApiResponse<MediumProfile> = await response.json();
    return result.data;
  } catch {
    return null;
  }
}

/**
 * Publish content to Medium via Next.js API route
 *
 * @param userId - POSTY user ID
 * @param title - Article title
 * @param content - Article content (HTML or Markdown)
 * @param publishStatus - draft, public, or unlisted
 * @param postId - POSTY post ID (optional)
 * @returns Publish result
 */
export async function postToMedium(
  userId: string,
  title: string,
  content: string,
  publishStatus: MediumPublishStatus = "draft",
  postId?: string
): Promise<MediumPostResult> {
  try {
    // Validate inputs
    if (!title || title.trim().length === 0) {
      return {
        id: "",
        success: false,
        error: "Le titre est requis pour publier sur Medium",
      };
    }

    if (!content || content.trim().length === 0) {
      return {
        id: "",
        success: false,
        error: "Le contenu est requis pour publier sur Medium",
      };
    }

    const response = await fetch("/api/medium/publish", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId,
        title,
        content,
        publishStatus,
        postId,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        id: "",
        success: false,
        error: result.message || result.error || "Echec de la publication",
      };
    }

    return {
      id: result.articleId || "",
      success: true,
      articleUrl: result.articleUrl,
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
 * Format content for Medium (convert plain text to HTML paragraphs)
 */
export function formatContentForMedium(content: string): string {
  // Split by double newlines for paragraphs
  const paragraphs = content.split(/\n\n+/);

  // Wrap each paragraph in <p> tags
  const htmlParagraphs = paragraphs.map((p) => {
    // Replace single newlines with <br>
    const withBreaks = p.replace(/\n/g, "<br>");
    return `<p>${withBreaks}</p>`;
  });

  return htmlParagraphs.join("\n");
}

/**
 * Generate a title from content (first line or first N characters)
 */
export function generateTitleFromContent(content: string, maxLength: number = 60): string {
  // Get first line
  const firstLine = content.split("\n")[0].trim();

  // If first line is short enough, use it
  if (firstLine.length <= maxLength) {
    return firstLine;
  }

  // Otherwise, truncate at word boundary
  const truncated = firstLine.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");

  if (lastSpace > maxLength * 0.5) {
    return truncated.substring(0, lastSpace) + "...";
  }

  return truncated + "...";
}

/**
 * Get Medium article URL format
 */
export function getMediumArticleUrl(username: string, articleId: string): string {
  return `https://medium.com/@${username}/${articleId}`;
}

/**
 * Get publish status label in French
 */
export function getPublishStatusLabel(status: MediumPublishStatus): string {
  const labels: Record<MediumPublishStatus, string> = {
    draft: "Brouillon",
    public: "Public",
    unlisted: "Non liste",
  };
  return labels[status];
}

/**
 * Get publish status description in French
 */
export function getPublishStatusDescription(status: MediumPublishStatus): string {
  const descriptions: Record<MediumPublishStatus, string> = {
    draft: "Sauvegarde comme brouillon, non visible",
    public: "Publie et visible par tous",
    unlisted: "Publie mais non visible dans votre profil",
  };
  return descriptions[status];
}
