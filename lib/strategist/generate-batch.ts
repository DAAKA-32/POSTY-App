/**
 * Shared batch-plan generator — used by both the user-facing route
 * (`/api/strategist/batch-plan`) and the autonomous cron endpoint
 * (`/api/strategist/auto-batch`).
 *
 * Split in two:
 *   - planBatch()          pure planning (prompt + LLM call + validation +
 *                          normalisation). No Firestore — also used by
 *                          scripts/strategist-eval.ts to test real generations.
 *   - generateBatchPlan()  loads the user context, calls planBatch, persists.
 *
 * Server-side only — depends on the OpenAI SDK (and firebase-admin for persist).
 */

import OpenAI from "openai";
import { adminDb } from "@/lib/db/firebase-admin";
import {
  buildBatchPlanPrompt,
  BatchPlanResponseSchema,
  buildSourceAnalysisBlock,
  wrapRealtimeBlockForPlanner,
} from "@/lib/ai/batch-plan-prompt";
import {
  normalizeFormat,
  normalizeGoal,
  normalizeLength,
  objectiveFromProfile,
  pickFormatMix,
} from "@/lib/ai/post-formats";
import { buildRealtimeContextBlock } from "@/lib/services/realtime-context";
import { buildBriefRepairMessages, flagBriefs } from "@/lib/ai/plan-quality";
import { fetchRealtimeContextCached } from "@/lib/strategist/realtime-cache";
import { planNeedsNews } from "@/lib/strategist/news-gate";
import { detectUrlLoose } from "@/lib/utils/url-extract";
import { extractUrlContentCached } from "@/lib/strategist/url-cache";
import { PRIMARY_MODEL } from "@/lib/openai";
import { trackAIUsage, readUsageFromResponse } from "@/lib/ai-cost/tracker";
import type {
  PostBrief,
  StrategyBatch,
  StrategyBatchStrategy,
  StrategistAdvancedParams,
} from "@/types";

export interface UserContext {
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

export type PlanPeriod = "day" | "week" | "month" | "none";

export interface GenerateBatchInput {
  userId: string;
  sourcePrompt: string;
  count: number;            // already clamped to 1..15 by caller
  startDate: string;        // YYYY-MM-DD (user TZ)
  timezone: string;         // e.g. "Europe/Paris"
  language: "fr" | "en";
  /** Period the user asked for. "month" widens the publication window to 4
   *  weeks; everything else plans a single editorial week. */
  period?: PlanPeriod;
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
 *  string for the prompt. */
function normalizeField(v: unknown): string | undefined {
  if (!v) return undefined;
  if (Array.isArray(v)) return v.filter(Boolean).join(", ") || undefined;
  if (typeof v === "string") return v.trim() || undefined;
  return undefined;
}

/** Firestore (admin) rejects `undefined` values — drop them, shallowly. */
function stripUndefined<T extends object>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined),
  ) as T;
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
        return text ? text.slice(0, 160).replace(/\s+/g, " ") : "";
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
 *  over-length value doesn't fail validation for the entire batch. Length-only:
 *  structural errors (missing field, bad date) still fail as before. */
function clampBriefLengths(parsed: unknown): unknown {
  if (!parsed || typeof parsed !== "object") return parsed;
  const obj = parsed as Record<string, unknown>;
  const clamp = (v: unknown, n: number) => (typeof v === "string" ? v.slice(0, n) : v);
  if (typeof obj.theme === "string") obj.theme = obj.theme.slice(0, 160);
  if (obj.strategy && typeof obj.strategy === "object") {
    const s = obj.strategy as Record<string, unknown>;
    obj.strategy = {
      summary: clamp(s.summary, 400),
      audience: clamp(s.audience, 200),
      objective: clamp(s.objective, 200),
      tone: clamp(s.tone, 160),
      edge: clamp(s.edge, 400),
      pains: Array.isArray(s.pains)
        ? s.pains.filter((p) => typeof p === "string").slice(0, 5).map((p) => (p as string).slice(0, 200))
        : undefined,
    };
  }
  if (Array.isArray(obj.posts)) {
    obj.posts = obj.posts.map((p) => {
      if (!p || typeof p !== "object") return p;
      const b = p as Record<string, unknown>;
      return {
        ...b,
        id: clamp(b.id, 40),
        hook: clamp(b.hook, 300),
        angle: clamp(b.angle, 400),
        format: clamp(b.format, 40),
        rationale: clamp(b.rationale, 300),
        goal: clamp(b.goal, 40),
        audience: clamp(b.audience, 160),
        tone: clamp(b.tone, 120),
      };
    });
  }
  return obj;
}

export interface PlanBatchInput {
  openai: OpenAI;
  userId: string;
  sourcePrompt: string;
  count: number;
  startDate: string;
  timezone: string;
  language: "fr" | "en";
  period?: PlanPeriod;
  ctx: UserContext;
  snippets: string[];
  advanced?: StrategistAdvancedParams;
  source?: "batch-plan" | "auto-batch" | "eval";
  /** Skip URL fetch / web search (eval script, offline runs). */
  skipGrounding?: boolean;
}

export interface PlanBatchOutput {
  theme: string;
  strategy?: StrategyBatchStrategy;
  posts: PostBrief[];
  /** The assembled system prompt — returned for the eval script only. */
  systemPrompt: string;
}

/**
 * Pure planning step: prompt → gpt-4o (JSON) → validation → normalisation.
 * Throws on hard failures so callers can map to their own response format.
 */
export async function planBatch(input: PlanBatchInput): Promise<PlanBatchOutput> {
  const { openai, userId, sourcePrompt, count, startDate, timezone, language, ctx, snippets, advanced } = input;

  // Format + length mix decided in code so a batch can't collapse into five
  // variations of the same post. 1-2 posts: the model picks what fits the topic.
  const formatMix =
    count >= 3
      ? pickFormatMix(count, {
          objective: advanced?.objective ?? objectiveFromProfile(ctx.objective),
          orientation: advanced?.orientation,
          hookStyle: advanced?.hookStyle,
        })
      : [];

  let systemPrompt = buildBatchPlanPrompt({
    language,
    count,
    startDate,
    timezone,
    windowDays: input.period === "month" ? 28 : 7,
    userContext: ctx,
    recentPostSnippets: snippets,
    advanced,
    formatMix,
  });

  // ── Grounding: AT MOST ONE expensive op per batch (cost guard) ───────
  // A referenced URL wins (cheaper, more relevant); otherwise ONE cached web
  // search, only when the author explicitly asks for something current. Both
  // are non-blocking: any failure leaves the prompt untouched.
  if (!input.skipGrounding) {
    const sourceUrl = detectUrlLoose(sourcePrompt);
    if (sourceUrl) {
      const extracted = await extractUrlContentCached(sourceUrl);
      if (extracted) systemPrompt += buildSourceAnalysisBlock(extracted, language);
    } else if (planNeedsNews(sourcePrompt)) {
      const rt = await fetchRealtimeContextCached(openai, sourcePrompt, language, userId);
      if (rt) {
        systemPrompt += wrapRealtimeBlockForPlanner(buildRealtimeContextBlock(rt, language), language);
      }
    }
  }

  const completion = await openai.chat.completions.create({
    model: PRIMARY_MODEL,
    response_format: { type: "json_object" },
    temperature: 0.7,
    // ~330 output tokens per brief with the richer schema; scale with count so
    // a 15-brief plan never truncates mid-JSON. Billed only when used.
    max_tokens: Math.min(5000, 800 + 360 * count),
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: sourcePrompt },
    ],
  });

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
  const check = BatchPlanResponseSchema.safeParse(clampBriefLengths(parsedJson));
  if (!check.success) {
    console.warn("[generate-batch] schema mismatch:", JSON.stringify(check.error.issues).slice(0, 800));
    throw new Error("schema_mismatch");
  }
  const plan = check.data;

  const seenIds = new Set<string>();
  const posts: PostBrief[] = plan.posts.slice(0, count).map((p, i) => {
    const format = normalizeFormat(p.format);
    let id = (p.id || `p${i + 1}`).trim();
    if (seenIds.has(id)) id = `${id}-${i + 1}`.slice(0, 40);
    seenIds.add(id);
    return stripUndefined({
      id,
      hook: p.hook.trim(),
      angle: p.angle.trim(),
      format,
      length: normalizeLength(p.length, format),
      goal: normalizeGoal(p.goal),
      audience: p.audience?.trim() || undefined,
      tone: p.tone?.trim() || undefined,
      suggestedDate: p.suggestedDate,
      suggestedTime: p.suggestedTime,
      rationale: p.rationale.trim(),
    }) as PostBrief;
  });
  // Chronological order — the card reads like a calendar.
  posts.sort((a, b) =>
    `${a.suggestedDate}T${a.suggestedTime}`.localeCompare(`${b.suggestedDate}T${b.suggestedTime}`),
  );

  const strategy = plan.strategy ? stripUndefined(plan.strategy) : undefined;

  // ── Quality gate: title-style hooks + invented figures → ONE targeted fix ─
  const knownFacts = [
    sourcePrompt,
    advanced?.context ?? "",
    ...Object.values(ctx).filter((v): v is string => typeof v === "string"),
    ...snippets,
  ].join("\n");
  const flags = flagBriefs(posts, knownFacts, language);
  if (flags.length > 0) {
    try {
      const { system, user } = buildBriefRepairMessages(flags, language, strategy?.edge);
      const fix = await openai.chat.completions.create({
        model: PRIMARY_MODEL,
        response_format: { type: "json_object" },
        temperature: 0.6,
        max_tokens: Math.min(2500, 300 + 220 * flags.length),
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      });
      const fixUsage = readUsageFromResponse(fix);
      void trackAIUsage({
        userId,
        route: `strategist.${input.source ?? "batch-plan"}.hook-fix`,
        model: PRIMARY_MODEL,
        inputTokens: fixUsage.inputTokens,
        outputTokens: fixUsage.outputTokens,
        cachedInputTokens: fixUsage.cachedInputTokens,
        metadata: { flagged: flags.length },
      });
      const fixed = JSON.parse(fix.choices[0]?.message?.content ?? "{}") as {
        posts?: Array<{ id?: string; hook?: string; angle?: string }>;
      };
      for (const f of fixed.posts ?? []) {
        const target = posts.find((p) => p.id === f.id);
        if (!target) continue;
        if (typeof f.hook === "string" && f.hook.trim().length >= 8) target.hook = f.hook.trim().slice(0, 300);
        if (typeof f.angle === "string" && f.angle.trim().length >= 8) target.angle = f.angle.trim().slice(0, 400);
      }
    } catch (err) {
      // Non-blocking: the writer still gets an "unverified figures" warning.
      console.warn("[generate-batch] hook fix failed (non-blocking):", err);
    }
  }
  return {
    theme: plan.theme.trim(),
    strategy: strategy && Object.keys(strategy).length > 0 ? strategy : undefined,
    posts,
    systemPrompt,
  };
}

/**
 * Core: load context, plan, persist as a strategyBatches doc, return the
 * persisted shape. Throws on hard failures so callers (route or cron) can map
 * to their own response format.
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

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: 50_000,
    maxRetries: 1,
  });

  const { theme, strategy, posts } = await planBatch({
    openai,
    userId,
    sourcePrompt,
    count,
    startDate,
    timezone,
    language,
    period: input.period,
    ctx,
    snippets,
    advanced,
    source: input.source,
  });

  // Persist the steering actually used, so the writing step (materialize)
  // applies the same tone / CTA / emotion as the plan.
  const direction = advanced ? stripUndefined({ ...advanced }) : undefined;

  const batchId = `batch_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const docRef = adminDb.collection("strategyBatches").doc(batchId);
  const now = new Date();
  await docRef.set(
    stripUndefined({
      userId,
      sourcePrompt,
      theme,
      strategy,
      direction: direction && Object.keys(direction).length > 0 ? direction : undefined,
      posts,
      status: "draft",
      timezone,
      createdAt: now,
      updatedAt: now,
    }),
  );

  return {
    batchId,
    batch: stripUndefined({
      id: batchId,
      userId,
      sourcePrompt,
      theme,
      strategy,
      direction: direction && Object.keys(direction).length > 0 ? direction : undefined,
      posts,
      status: "draft" as const,
      timezone,
      createdAt: now.getTime(),
    }),
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
