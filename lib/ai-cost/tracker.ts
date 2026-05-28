/**
 * AI usage tracker — single entry point for logging an LLM/image call.
 *
 * Architecture (hybrid events + rollups, decided 2026-05-28):
 *   1. `ai_events/{auto}`                  — 1 doc per call, audit trail (TTL ~30j via field).
 *   2. `users/{uid}.aiUsage.*`             — lifetime aggregates on the user doc.
 *   3. `users/{uid}/usage_daily/{YYYY-MM-DD}` — daily rollups for charts.
 *
 * All writes are fire-and-forget from the caller's perspective. The function
 * never throws — tracking failures must NEVER break a user-facing AI request.
 * Errors are logged to console for ops triage.
 */

import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb, isAdminInitialized } from "@/lib/db/firebase-admin";
import {
  estimateCostUSD,
  estimateImageCostUSD,
  getPricing,
} from "./pricing";

export interface TrackAIUsageInput {
  userId: string;
  /** Logical route name, e.g. "chat", "generate", "image.generate", "intent". */
  route: string;
  /** Exact model id passed to the provider (e.g. "gpt-4o", "gpt-4o-mini"). */
  model: string;
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens?: number;
  /** Pre-computed cost in USD. If omitted, computed from model + tokens. */
  costUSD?: number;
  /** Optional free-form metadata (intent, plan, etc.). Kept small. */
  metadata?: Record<string, string | number | boolean | null>;
}

export interface TrackImageUsageInput {
  userId: string;
  route: string;
  /** Number of image variants actually returned to the user. */
  variants: number;
  /** Optional override of the per-variant cost when the provider changes. */
  costUSD?: number;
  metadata?: Record<string, string | number | boolean | null>;
}

/** YYYY-MM-DD in UTC for daily rollup keys. */
function utcDayKey(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

/** Round to 6 decimals for storage (sub-cent precision, no float drift). */
function round6(n: number): number {
  return Math.round(n * 1_000_000) / 1_000_000;
}

/**
 * Track a single LLM call. Safe to await OR fire-and-forget.
 * Returns the computed cost so callers can log it if they want.
 */
export async function trackAIUsage(input: TrackAIUsageInput): Promise<number> {
  const {
    userId,
    route,
    model,
    inputTokens,
    outputTokens,
    cachedInputTokens = 0,
    metadata = {},
  } = input;

  if (!userId || !isAdminInitialized() || !adminDb) {
    return 0;
  }
  if (inputTokens <= 0 && outputTokens <= 0) {
    return 0;
  }

  const costUSD =
    typeof input.costUSD === "number"
      ? input.costUSD
      : estimateCostUSD(model, inputTokens, outputTokens, cachedInputTokens);
  const safeCost = round6(Math.max(0, costUSD));
  const pricing = getPricing(model);
  const now = Timestamp.now();
  const dayKey = utcDayKey(now.toDate());

  const eventDoc = {
    userId,
    route,
    model,
    provider: pricing.provider,
    inputTokens,
    outputTokens,
    cachedInputTokens,
    costUSD: safeCost,
    metadata,
    createdAt: now,
    /** Retention marker — TTL policy can be configured in Firestore console to expire events past this date. */
    expiresAt: Timestamp.fromMillis(now.toMillis() + 30 * 24 * 60 * 60 * 1000),
  };

  const userRef = adminDb.collection("users").doc(userId);
  const dailyRef = userRef.collection("usage_daily").doc(dayKey);
  const eventRef = adminDb.collection("ai_events").doc();

  try {
    await Promise.all([
      eventRef.set(eventDoc),
      userRef.set(
        {
          aiUsage: {
            totalInputTokens: FieldValue.increment(inputTokens),
            totalOutputTokens: FieldValue.increment(outputTokens),
            totalCostUSD: FieldValue.increment(safeCost),
            callsCount: FieldValue.increment(1),
            lastCallAt: now,
            byModel: {
              [model]: {
                inputTokens: FieldValue.increment(inputTokens),
                outputTokens: FieldValue.increment(outputTokens),
                costUSD: FieldValue.increment(safeCost),
                calls: FieldValue.increment(1),
              },
            },
            byRoute: {
              [route]: {
                inputTokens: FieldValue.increment(inputTokens),
                outputTokens: FieldValue.increment(outputTokens),
                costUSD: FieldValue.increment(safeCost),
                calls: FieldValue.increment(1),
              },
            },
          },
        },
        { merge: true }
      ),
      dailyRef.set(
        {
          day: dayKey,
          inputTokens: FieldValue.increment(inputTokens),
          outputTokens: FieldValue.increment(outputTokens),
          costUSD: FieldValue.increment(safeCost),
          calls: FieldValue.increment(1),
          updatedAt: now,
        },
        { merge: true }
      ),
    ]);
  } catch (err) {
    console.error("[ai-cost] trackAIUsage failed", { userId, route, model, err });
  }

  return safeCost;
}

/**
 * Track an image generation call. Same shape as `trackAIUsage` but counts
 * "imageCount" instead of tokens.
 */
export async function trackImageUsage(
  input: TrackImageUsageInput
): Promise<number> {
  const { userId, route, variants, metadata = {} } = input;
  if (!userId || !isAdminInitialized() || !adminDb) return 0;
  if (variants <= 0) return 0;

  const costUSD =
    typeof input.costUSD === "number"
      ? input.costUSD
      : estimateImageCostUSD(variants);
  const safeCost = round6(Math.max(0, costUSD));
  const now = Timestamp.now();
  const dayKey = utcDayKey(now.toDate());

  const eventDoc = {
    userId,
    route,
    model: "image",
    provider: "openai",
    inputTokens: 0,
    outputTokens: 0,
    cachedInputTokens: 0,
    imageCount: variants,
    costUSD: safeCost,
    metadata,
    createdAt: now,
    expiresAt: Timestamp.fromMillis(now.toMillis() + 30 * 24 * 60 * 60 * 1000),
  };

  const userRef = adminDb.collection("users").doc(userId);
  const dailyRef = userRef.collection("usage_daily").doc(dayKey);
  const eventRef = adminDb.collection("ai_events").doc();

  try {
    await Promise.all([
      eventRef.set(eventDoc),
      userRef.set(
        {
          aiUsage: {
            totalCostUSD: FieldValue.increment(safeCost),
            totalImagesGenerated: FieldValue.increment(variants),
            callsCount: FieldValue.increment(1),
            lastCallAt: now,
            byRoute: {
              [route]: {
                costUSD: FieldValue.increment(safeCost),
                imageCount: FieldValue.increment(variants),
                calls: FieldValue.increment(1),
              },
            },
          },
        },
        { merge: true }
      ),
      dailyRef.set(
        {
          day: dayKey,
          costUSD: FieldValue.increment(safeCost),
          imageCount: FieldValue.increment(variants),
          calls: FieldValue.increment(1),
          updatedAt: now,
        },
        { merge: true }
      ),
    ]);
  } catch (err) {
    console.error("[ai-cost] trackImageUsage failed", { userId, route, err });
  }

  return safeCost;
}

/**
 * Helper for OpenAI streaming calls: pass it as the iterator and it will
 * detect the final `usage` chunk emitted when `stream_options.include_usage`
 * is enabled. Returns the captured usage (or zeros).
 */
export interface CapturedUsage {
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens: number;
}

export function emptyUsage(): CapturedUsage {
  return { inputTokens: 0, outputTokens: 0, cachedInputTokens: 0 };
}

/**
 * Reads an OpenAI `chunk.usage` payload (only present in the final chunk when
 * stream_options.include_usage = true) and folds it into a CapturedUsage.
 */
export function readUsageFromChunk(
  chunk: { usage?: { prompt_tokens?: number; completion_tokens?: number; prompt_tokens_details?: { cached_tokens?: number } } | null }
): CapturedUsage | null {
  const u = chunk.usage;
  if (!u) return null;
  return {
    inputTokens: u.prompt_tokens ?? 0,
    outputTokens: u.completion_tokens ?? 0,
    cachedInputTokens: u.prompt_tokens_details?.cached_tokens ?? 0,
  };
}

/** Reads usage from a non-streaming OpenAI response.usage object. */
export function readUsageFromResponse(
  response: { usage?: { prompt_tokens?: number; completion_tokens?: number; prompt_tokens_details?: { cached_tokens?: number } } | null }
): CapturedUsage {
  const u = response.usage;
  if (!u) return emptyUsage();
  return {
    inputTokens: u.prompt_tokens ?? 0,
    outputTokens: u.completion_tokens ?? 0,
    cachedInputTokens: u.prompt_tokens_details?.cached_tokens ?? 0,
  };
}
