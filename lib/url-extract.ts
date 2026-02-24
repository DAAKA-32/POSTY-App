/**
 * URL Content Extraction Service
 *
 * Server-side only utility for detecting URLs in user prompts,
 * fetching page content, and extracting meaningful text.
 *
 * Security: SSRF protection, size limits, timeout, HTTPS-only.
 * Used by: /api/generate route for URL-based post generation.
 */

import * as cheerio from "cheerio";

// ============================================
// CONSTANTS
// ============================================

/** Maximum content length injected into LLM prompt (characters) */
export const URL_CONTENT_MAX_LENGTH = 8000;

/** Fetch timeout in milliseconds */
const FETCH_TIMEOUT_MS = 10_000;

/** Maximum response body size in bytes (1MB) */
const MAX_RESPONSE_SIZE = 1 * 1024 * 1024;

/** User-Agent header for fetching */
const USER_AGENT = "PostyBot/1.0 (+https://posty.fr/bot)";

/** Blocked hostname patterns for SSRF protection */
const BLOCKED_HOSTNAME_PATTERNS = [
  /^localhost$/i,
  /^127\.\d+\.\d+\.\d+$/,
  /^10\.\d+\.\d+\.\d+$/,
  /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/,
  /^192\.168\.\d+\.\d+$/,
  /^0\.0\.0\.0$/,
  /^\[::1\]$/,
  /^169\.254\.\d+\.\d+$/,
  /\.internal$/i,
  /\.local$/i,
  /\.localhost$/i,
];

// ============================================
// TYPES
// ============================================

export interface ExtractedUrlContent {
  url: string;
  title: string;
  description: string;
  textContent: string;
  originalLength: number;
  wasTruncated: boolean;
}

export interface UrlExtractionError {
  url: string;
  error: "blocked" | "timeout" | "fetch_failed" | "empty_content" | "invalid_url" | "too_large" | "not_html";
  message: string;
}

export type UrlExtractionResult =
  | { success: true; data: ExtractedUrlContent }
  | { success: false; error: UrlExtractionError };

// ============================================
// URL DETECTION
// ============================================

/**
 * Detect the first HTTPS URL in a text string.
 * Only matches HTTPS URLs. Returns the first match only.
 */
export function detectUrl(text: string): string | null {
  const urlRegex = /https:\/\/[^\s<>"{}|\\^`\[\]]+/gi;
  const match = text.match(urlRegex);

  if (!match || match.length === 0) return null;

  // Clean trailing punctuation that's likely not part of the URL
  let url = match[0].replace(/[.,;:!?)'"]+$/, "");

  try {
    new URL(url);
    return url;
  } catch {
    return null;
  }
}

/**
 * Remove the detected URL from the prompt text.
 */
export function removeUrlFromPrompt(prompt: string, url: string): string {
  return prompt.replace(url, "").replace(/\s{2,}/g, " ").trim();
}

// ============================================
// SSRF PROTECTION
// ============================================

function isHostnameSafe(hostname: string): boolean {
  for (const pattern of BLOCKED_HOSTNAME_PATTERNS) {
    if (pattern.test(hostname)) return false;
  }
  return true;
}

// ============================================
// FETCHING
// ============================================

/**
 * Fetch URL content with security protections.
 * HTTPS only, SSRF blocking, timeout, size limit.
 */
async function fetchUrlSafe(url: string): Promise<{ html: string; finalUrl: string } | UrlExtractionError> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return { url, error: "invalid_url", message: "URL invalide." };
  }

  if (parsedUrl.protocol !== "https:") {
    return { url, error: "invalid_url", message: "Seules les URLs HTTPS sont acceptées." };
  }

  if (!isHostnameSafe(parsedUrl.hostname)) {
    return { url, error: "blocked", message: "Cette URL ne peut pas être analysée." };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": USER_AGENT,
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "fr,en;q=0.9",
      },
      redirect: "follow",
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        url,
        error: "fetch_failed",
        message: `Impossible d'accéder à cette page (HTTP ${response.status}).`,
      };
    }

    // Verify content-type is HTML
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
      return { url, error: "not_html", message: "Cette URL ne pointe pas vers une page web." };
    }

    // Check content-length if available
    const contentLength = response.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > MAX_RESPONSE_SIZE) {
      return { url, error: "too_large", message: "La page est trop volumineuse pour être analysée." };
    }

    // Read body with size limit
    const reader = response.body?.getReader();
    if (!reader) {
      return { url, error: "fetch_failed", message: "Impossible de lire la page." };
    }

    const chunks: Uint8Array[] = [];
    let totalSize = 0;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      totalSize += value.byteLength;
      if (totalSize > MAX_RESPONSE_SIZE) {
        reader.cancel();
        return { url, error: "too_large", message: "La page est trop volumineuse pour être analysée." };
      }

      chunks.push(value);
    }

    const decoder = new TextDecoder("utf-8", { fatal: false });
    const html = decoder.decode(Buffer.concat(chunks));

    return { html, finalUrl: response.url };
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      return { url, error: "timeout", message: "La page a mis trop de temps à répondre." };
    }
    return { url, error: "fetch_failed", message: "Impossible d'accéder à cette page." };
  }
}

// ============================================
// HTML PARSING & CONTENT EXTRACTION
// ============================================

/**
 * Extract meaningful content from HTML using cheerio.
 * Removes scripts, styles, nav, footer, ads, etc.
 */
function extractContent(html: string, url: string): ExtractedUrlContent | null {
  const $ = cheerio.load(html);

  // Extract title (prefer Open Graph)
  const title =
    $("meta[property='og:title']").attr("content") ||
    $("title").first().text() ||
    "";

  // Extract description (prefer Open Graph)
  const description =
    $("meta[property='og:description']").attr("content") ||
    $("meta[name='description']").attr("content") ||
    "";

  // Remove non-content elements
  $("script, style, noscript, iframe, svg, img, video, audio, canvas").remove();
  $("nav, footer, header, aside, [role='navigation'], [role='banner'], [role='contentinfo']").remove();
  $(".nav, .navbar, .footer, .sidebar, .menu, .ad, .ads, .advertisement, .cookie, .popup, .modal").remove();
  $("[class*='cookie'], [class*='consent'], [class*='banner'], [id*='cookie'], [id*='consent']").remove();
  $("form, button, input, select, textarea").remove();

  // Try to find main content area
  let contentElement = $(
    "article, [role='main'], main, .article-content, .post-content, .entry-content, #content, .content"
  ).first();

  // Fallback to body
  if (!contentElement.length) {
    contentElement = $("body");
  }

  // Extract text, clean whitespace
  let textContent = contentElement
    .text()
    .replace(/\s+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();

  // If main content area too sparse, try body
  if (textContent.length < 50) {
    textContent = $("body")
      .text()
      .replace(/\s+/g, " ")
      .replace(/\n\s*\n+/g, "\n")
      .trim();
  }

  if (!textContent || textContent.length < 50) {
    return null;
  }

  const originalLength = textContent.length;
  const wasTruncated = originalLength > URL_CONTENT_MAX_LENGTH;

  if (wasTruncated) {
    textContent = textContent.substring(0, URL_CONTENT_MAX_LENGTH);
    const lastSpace = textContent.lastIndexOf(" ");
    if (lastSpace > URL_CONTENT_MAX_LENGTH * 0.8) {
      textContent = textContent.substring(0, lastSpace) + "...";
    }
  }

  return {
    url,
    title: title.trim().substring(0, 200),
    description: description.trim().substring(0, 500),
    textContent,
    originalLength,
    wasTruncated,
  };
}

// ============================================
// MAIN PUBLIC FUNCTION
// ============================================

/**
 * Extract content from a URL.
 * Full pipeline: validate → SSRF check → fetch → parse → clean → truncate.
 */
export async function extractUrlContent(url: string): Promise<UrlExtractionResult> {
  const fetchResult = await fetchUrlSafe(url);

  if ("error" in fetchResult) {
    return { success: false, error: fetchResult };
  }

  const content = extractContent(fetchResult.html, fetchResult.finalUrl);

  if (!content) {
    return {
      success: false,
      error: {
        url,
        error: "empty_content",
        message: "Impossible d'extraire du contenu de cette page.",
      },
    };
  }

  return { success: true, data: content };
}
