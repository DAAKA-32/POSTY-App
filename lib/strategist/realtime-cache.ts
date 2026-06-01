/**
 * Strategist real-time context cache (server-only).
 *
 * Thin Firestore-backed cache around `fetchRealtimeContext`. The Strategist
 * grounds a batch plan in current events, but two costs must be controlled:
 *   1. The zero-API `isTopicTimeSensitive()` gate (applied by the caller) means
 *      we only ever reach here for genuinely time-moving topics.
 *   2. This cache means a user who regenerates the same batch, or two users
 *      asking about the same trend within the TTL window, share ONE web-search
 *      call instead of paying per request.
 *
 * Best-effort by design: any cache read/write failure silently falls back to a
 * live fetch. Never throws. Writes go through the admin SDK (bypasses rules);
 * the client never touches `realtimeContextCache`.
 */

import { createHash } from "crypto";
import type OpenAI from "openai";
import { adminDb } from "@/lib/db/firebase-admin";
import {
  fetchRealtimeContext,
  type RealtimeContext,
  type RealtimeSource,
} from "@/lib/services/realtime-context";

const CACHE_COLLECTION = "realtimeContextCache";
/** 12h: long enough to dedupe a planning session / a day's regenerations,
 *  short enough that "this week's trend" stays fresh. */
const TTL_MS = 12 * 60 * 60 * 1000;

/** Stable key from (language, normalized topic) so trivial whitespace/case
 *  differences hit the same cache entry. Capped before hashing. */
function cacheKey(topic: string, language: "fr" | "en"): string {
  const norm = topic.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 300);
  return createHash("sha1").update(`${language}:${norm}`).digest("hex");
}

/**
 * Return a dated factual brief for `topic`, served from cache when fresh,
 * otherwise fetched live and cached. Returns null exactly when the underlying
 * `fetchRealtimeContext` would (no recent info, timeout, error).
 */
export async function fetchRealtimeContextCached(
  client: OpenAI,
  topic: string,
  language: "fr" | "en",
  userId: string,
): Promise<RealtimeContext | null> {
  const key = cacheKey(topic, language);

  // ── Cache read ───────────────────────────────────────────────────────
  if (adminDb) {
    try {
      const snap = await adminDb.collection(CACHE_COLLECTION).doc(key).get();
      if (snap.exists) {
        const d = snap.data() as
          | { brief?: string; sources?: RealtimeSource[]; currentDate?: string; createdAt?: number }
          | undefined;
        if (d?.brief && typeof d.createdAt === "number" && Date.now() - d.createdAt < TTL_MS) {
          return {
            brief: d.brief,
            sources: Array.isArray(d.sources) ? d.sources : [],
            currentDate: d.currentDate || "",
          };
        }
      }
    } catch (err) {
      console.warn("[realtime-cache] read failed (non-blocking):", err);
    }
  }

  // ── Miss → live fetch ────────────────────────────────────────────────
  const ctx = await fetchRealtimeContext(client, topic, language, userId);

  // ── Cache write (only on a real hit) ─────────────────────────────────
  if (ctx && adminDb) {
    try {
      await adminDb
        .collection(CACHE_COLLECTION)
        .doc(key)
        .set({
          brief: ctx.brief,
          sources: ctx.sources,
          currentDate: ctx.currentDate,
          createdAt: Date.now(),
          // For an optional Firestore TTL policy on `expiresAt`.
          expiresAt: new Date(Date.now() + TTL_MS),
        });
    } catch (err) {
      console.warn("[realtime-cache] write failed (non-blocking):", err);
    }
  }

  return ctx;
}
