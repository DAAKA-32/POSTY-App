/**
 * Shared batch-plan generator — used by both the user-facing route
 * (`/api/strategist/batch-plan`) and the autonomous cron endpoint
 * (`/api/strategist/auto-batch`).
 *
 * Extracted to keep the LLM call + persist logic in one place. Adding a 3rd
 * caller (e.g. CLI tool, retry worker) is a single function import.
 *
 * Server-side only — depends on firebase-admin and the OpenAI SDK.
 */

import OpenAI from "openai";
import { adminDb } from "@/lib/db/firebase-admin";
import {
  buildBatchPlanPrompt,
  BatchPlanResponseSchema,
  buildSourceAnalysisBlock,
} from "@/lib/ai/batch-plan-prompt";
import {
  isTopicTimeSensitive,
  buildRealtimeContextBlock,
} from "@/lib/services/realtime-context";
import { fetchRealtimeContextCached } from "@/lib/strategist/realtime-cache";
import { detectUrlLoose } from "@/lib/utils/url-extract";
import { extractUrlContentCached } from "@/lib/strategist/url-cache";
import { PRIMARY_MODEL } from "@/lib/openai";
import { trackAIUsage, readUsageFromResponse } from "@/lib/ai-cost/tracker";
import type { PostBrief, StrategyBatch, StrategistAdvancedParams } from "@/types";

interface UserContext {
  name?: string;
  profileType?: string;
  sector?: string;
  role?: string;
  objective?: string;
  targetAudience?: string;
  communicationTone?: string;
  publishingFrequency?: string;
  /** Short professional bio / tagline / website pulled from the profile +
   *  branding so the Strategist knows more than the categorical onboarding
   *  fields. */
  bio?: string;
  tagline?: string;
  website?: string;
}

export interface GenerateBatchInput {
  userId: string;
  sourcePrompt: string;
  count: number;            // already clamped to 1..15 by caller
  startDate: string;        // YYYY-MM-DD (user TZ)
  timezone: string;         // e.g. "Europe/Paris"
  language: "fr" | "en";
  /** Per-batch advanced steering (drawer panel override). When omitted, the
   *  user's saved `strategistParams` defaults are used instead — so the
   *  autonomous cron honors the same direction without passing anything. */
  advanced?: StrategistAdvancedParams;
  /** Which surface triggered this — drives the cost-tracking route label so the
   *  rentability dashboard can tell user-initiated plans apart from the
   *  autonomous cron. Defaults to "batch-plan". */
  source?: "batch-plan" | "auto-batch";
}

export interface GenerateBatchOutput {
  batchId: string;
  batch: Omit<StrategyBatch, "createdAt" | "updatedAt"> & { createdAt: number };
}

/** Cleanly normalize a multi-select field (string | string[]) to a single
 *  string for the prompt. Same helper as the routes use — duplicated here
 *  to keep this module self-contained. */
function normalizeField(v: unknown): string | undefined {
  if (!v) return undefined;
  if (Array.isArray(v)) return v.filter(Boolean).join(", ") || undefined;
  if (typeof v === "string") return v.trim() || undefined;
  return undefined;
}

/** Load the user profile fields + last 5 post snippets used to personalize
 *  the prompt. Returns sensible empty defaults on any failure (the LLM is
 *  resilient to missing context — better than failing the whole call). */
export async function loadUserContextAndPosts(uid: string): Promise<{
  ctx: UserContext;
  snippets: string[];
  savedParams?: StrategistAdvancedParams;
}> {
  if (!adminDb) return { ctx: {}, snippets: [] };
  try {
    const [userSnap, postsSnap] = await Promise.all([
      adminDb.collection("users").doc(uid).get(),
      adminDb
        .collection("posts")
        .where("userId", "==", uid)
        .orderBy("createdAt", "desc")
        .limit(5)
        .get(),
    ]);
    const data = userSnap.exists ? userSnap.data() ?? {} : {};
    const profile = data.profile ?? {};
    const branding = data.branding ?? {};
    const ctx: UserContext = {
      name: data.name || data.displayName || undefined,
      profileType: profile.profileType || undefined,
      sector: normalizeField(profile.sector ?? data.sector),
      role: profile.role || data.role || undefined,
      objective: normalizeField(profile.objective),
      targetAudience: normalizeField(profile.targetAudience),
      communicationTone: normalizeField(profile.communicationTone),
      publishingFrequency: profile.publishingFrequency || undefined,
      bio: (typeof data.bio === "string" && data.bio.trim()) || undefined,
      tagline: (typeof branding.tagline === "string" && branding.tagline.trim()) || undefined,
      website:
        (typeof branding.socialLinks?.website === "string" &&
          branding.socialLinks.website.trim()) ||
        undefined,
    };
    const snippets = postsSnap.docs
      .map((doc) => {
        const p = doc.data();
        const picked =
          p.selectedVersion === "B" ? p.responseB : p.responseA || p.responseB;
        const text = (picked ?? "").toString().trim();
        return text ? text.slice(0, 220).replace(/\s+/g, " ") : "";
      })
      .filter(Boolean);
    const savedParams = (data.strategistParams ?? undefined) as
      | StrategistAdvancedParams
      | undefined;
    return { ctx, snippets, savedParams };
  } catch (err) {
    console.error("[generate-batch] loadUserContextAndPosts error:", err);
    return { ctx: {}, snippets: [] };
  }
}

/** Truncate per-brief string fields to their schema maxima so a slightly
 *  over-length value (typically `format` or `id`) doesn't fail validation for
 *  the entire batch. Length-only: structural errors (missing field, bad date)
 *  still fail as before. Mirrors the limits in `PostBriefSchema`. */
function clampBriefLengths(parsed: unknown): unknown {
  if (!parsed || typeof parsed !== "object") return parsed;
  const obj = parsed as Record<string, unknown>;
  const clamp = (v: unknown, n: number) => (typeof v === "string" ? v.slice(0, n) : v);
  if (typeof obj.theme === "string") obj.theme = obj.theme.slice(0, 160);
  if (Array.isArray(obj.posts)) {
    obj.posts = obj.posts.map((p) => {
      if (!p || typeof p !== "object") return p;
      const b = p as Record<string, unknown>;
      return {
        ...b,
        id: clamp(b.id, 40),
        hook: clamp(b.hook, 280),
        angle: clamp(b.angle, 400),
        format: clamp(b.format, 40),
        rationale: clamp(b.rationale, 280),
      };
    });
  }
  return obj;
}

/**
 * Core: call gpt-4o, validate output, persist as a strategyBatches doc,
 * return the persisted shape. Throws on hard failures so callers (route or
 * cron) can map to their own response format.
 */
export async function generateBatchPlan(
  input: GenerateBatchInput
): Promise<GenerateBatchOutput> {
  if (!adminDb) throw new Error("admin_not_initialized");
  if (!process.env.OPENAI_API_KEY) throw new Error("no_openai_key");

  const { userId, sourcePrompt, count, startDate, timezone, language } = input;

  const { ctx, snippets, savedParams } = await loadUserContextAndPosts(userId);
  // Per-batch override wins; otherwise fall back to the user's saved defaults
  // (this is what lets the autonomous cron honor the same steering for free).
  const advanced = input.advanced ?? savedParams;
  let systemPrompt = buildBatchPlanPrompt({
    language,
    count,
    startDate,
    timezone,
    userContext: ctx,
    recentPostSnippets: snippets,
    advanced,
  });

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: 50_000,
    maxRetries: 1,
  });

  // ── Grounding: AT MOST ONE expensive op per batch (cost guard) ───────
  // A referenced URL and a real-time web search are MUTUALLY EXCLUSIVE:
  //   - URL present  → fetch + analyze the site (Chantier 2). The site is the
  //     better, cheaper (no LLM) grounding, so we do NOT also web-search.
  //   - no URL but a genuinely time-moving topic → ONE cached web search
  //     (Chantier 3).
  // This keeps a single batch request from firing both a fetch AND a search
  // (which bloated the prompt enough to truncate the JSON → 502), and bounds
  // API load to one grounding call. Both are non-blocking: any failure just
  // leaves the prompt untouched and the plan generates normally.
  const sourceUrl = detectUrlLoose(sourcePrompt);
  if (sourceUrl) {
    const extracted = await extractUrlContentCached(sourceUrl);
    if (extracted) systemPrompt += buildSourceAnalysisBlock(extracted, language);
  } else if (isTopicTimeSensitive(sourcePrompt)) {
    const rt = await fetchRealtimeContextCached(openai, sourcePrompt, language, userId);
    if (rt) systemPrompt += buildRealtimeContextBlock(rt, language);
  }

  // Phase-1 strategic reasoning (angle selection, editorial planning) — genuine
  // complex analysis, so it stays on the strong model. Use the PRIMARY_MODEL
  // constant (SSoT) instead of a hardcoded literal so it never drifts.
  const completion = await openai.chat.completions.create({
    model: PRIMARY_MODEL,
    response_format: { type: "json_object" },
    temperature: 0.7,
    // Headroom so a richly-grounded batch (site/web context injected) doesn't
    // truncate the JSON mid-array → invalid_json → 502. Output tokens only
    // bill when actually used, so this is near-free in the common case.
    max_tokens: 2000,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: sourcePrompt },
    ],
  });

  // Cost tracking — this is the priciest single Strategist call and ran fully
  // untracked (esp. the weekly unattended cron), so it silently understated
  // rentability. Route label distinguishes user-initiated from cron.
  const usage = readUsageFromResponse(completion);
  void trackAIUsage({
    userId,
    route: `strategist.${input.source ?? "batch-plan"}`,
    model: PRIMARY_MODEL,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    cachedInputTokens: usage.cachedInputTokens,
    metadata: { count, language },
  });

  const raw = completion.choices[0]?.message?.content ?? "";
  if (!raw) throw new Error("empty_llm_response");

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch {
    throw new Error("invalid_json_from_llm");
  }
  // Defensive clamp: the LLM occasionally returns a field slightly over its
  // schema limit (most often a verbose `format` or an over-long `id` slug —
  // more frequent now that the real-time block makes outputs richer). Truncate
  // to the limits instead of 502-ing the whole batch over a few extra chars.
  const check = BatchPlanResponseSchema.safeParse(clampBriefLengths(parsedJson));
  if (!check.success) {
    console.warn("[generate-batch] schema mismatch:", check.error.flatten());
    throw new Error("schema_mismatch");
  }
  const plan = check.data;
  if (plan.posts.length > count) plan.posts = plan.posts.slice(0, count);

  const posts: PostBrief[] = plan.posts.map((p, i) => ({
    id: p.id || `p${i + 1}-${Date.now().toString(36)}`,
    hook: p.hook,
    angle: p.angle,
    format: p.format,
    suggestedDate: p.suggestedDate,
    suggestedTime: p.suggestedTime,
    rationale: p.rationale,
  }));

  const batchId = `batch_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const docRef = adminDb.collection("strategyBatches").doc(batchId);
  const now = new Date();
  await docRef.set({
    userId,
    sourcePrompt,
    theme: plan.theme,
    posts,
    status: "draft",
    timezone,
    createdAt: now,
    updatedAt: now,
  });

  return {
    batchId,
    batch: {
      id: batchId,
      userId,
      sourcePrompt,
      theme: plan.theme,
      posts,
      status: "draft",
      timezone,
      createdAt: now.getTime(),
    },
  };
}

/** Default startDate = tomorrow in the user's TZ, YYYY-MM-DD. */
export function tomorrowInTz(timezone: string): string {
  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(tomorrow);
  } catch {
    return tomorrow.toISOString().slice(0, 10);
  }
}
