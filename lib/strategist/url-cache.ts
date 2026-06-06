/**
 * Strategist URL-extraction cache (server-only).
 *
 * Thin Firestore cache around `extractUrlContent`. Fetching an external site is
 * free of API cost but slow (up to a 10s timeout) and impolite to repeat, so we
 * cache the parsed content per URL for a day. Same brand/site referenced across
 * regenerations or by several users hits the cache instead of re-crawling.
 *
 * Best-effort: any cache read/write failure falls back to a live extraction and
 * never throws. Admin SDK only (bypasses rules); the client never touches
 * `urlExtractionCache`.
 */

import { createHash } from "crypto";
import { adminDb } from "@/lib/db/firebase-admin";
import {
  extractUrlContent,
  type ExtractedUrlContent,
} from "@/lib/utils/url-extract";

const CACHE_COLLECTION = "urlExtractionCache";
/** 24h: a brand/site's positioning copy rarely changes within a day. */
const TTL_MS = 24 * 60 * 60 * 1000;

function cacheKey(url: string): string {
  return createHash("sha1").update(url.trim()).digest("hex");
}

/**
 * Return parsed content for `url`, served from cache when fresh, otherwise
 * extracted live and cached. Returns null when extraction fails (blocked,
 * timeout, non-HTML, empty) — the caller proceeds without the source.
 */
export async function extractUrlContentCached(
  url: string,
): Promise<ExtractedUrlContent | null> {
  const key = cacheKey(url);

  // ── Cache read ───────────────────────────────────────────────────────
  if (adminDb) {
    try {
      const snap = await adminDb.collection(CACHE_COLLECTION).doc(key).get();
      if (snap.exists) {
        const d = snap.data() as
          | { data?: ExtractedUrlContent; createdAt?: number }
          | undefined;
        if (d?.data?.textContent && typeof d.createdAt === "number" && Date.now() - d.createdAt < TTL_MS) {
          return d.data;
        }
      }
    } catch (err) {
      console.warn("[url-cache] read failed (non-blocking):", err);
    }
  }

  // ── Miss → live extraction ───────────────────────────────────────────
  const result = await extractUrlContent(url);
  if (!result.success) {
    console.warn(`[url-cache] extraction failed for ${url}: ${result.error.error}`);
    return null;
  }

  // ── Cache write ──────────────────────────────────────────────────────
  if (adminDb) {
    try {
      await adminDb
        .collection(CACHE_COLLECTION)
        .doc(key)
        .set({
          data: result.data,
          createdAt: Date.now(),
          expiresAt: new Date(Date.now() + TTL_MS),
        });
    } catch (err) {
      console.warn("[url-cache] write failed (non-blocking):", err);
    }
  }

  return result.data;
}
