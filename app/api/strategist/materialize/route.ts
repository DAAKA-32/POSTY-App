/**
 * POST /api/strategist/materialize
 *
 * Strategist Phase 2 — turns every brief in an approved batch into a finished
 * LinkedIn post. One LLM call per brief (gpt-4o-mini by default — see
 * MATERIALIZE_MODEL), parallelized with a concurrency cap so we don't fan-out
 * 15 simultaneous OpenAI calls and trip a rate limit.
 *
 * Two modes:
 *   - All briefs (default): pass { batchId } only
 *   - Single brief regen:   pass { batchId, briefIds: [id] }
 *
 * Persists each materialized post back onto the brief in Firestore so a page
 * reload still shows the generated copy. Batch status transitions:
 *   approved → materialized (when every brief has materialized.content)
 *
 * Failure semantics: per-brief — if 4/5 succeed and 1 fails, the 4 are
 * persisted, the 5th comes back with `ok: false` so the UI can retry only
 * that row.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import OpenAI from "openai";
import { verifyAuth } from "@/lib/auth";
import { isAdminInitialized, adminDb } from "@/lib/db/firebase-admin";
import { checkHourlyQuotaAdmin, incrementUserQuotaAdmin } from "@/lib/db/firestore-admin";
import {
  buildMaterializeSystemPrompt,
  buildMaterializeUserMessage,
  mapFormatToPostType,
} from "@/lib/ai/materialize-post-prompt";
import {
  getGenerationTemperature,
  sanitizeProfileField,
  type ProfileFields,
  type PostType,
} from "@/lib/services/prompt-builder";
import { normalizeHashtagsInText } from "@/lib/hashtags/normalize";
import { isStrategistAllowedForEmail } from "@/lib/strategist/access";
import { hasLinkedInConnected } from "@/lib/strategist/access-server";
import { isOpenAIConfigured, MINI_MODEL } from "@/lib/openai";
import { trackAIUsage, readUsageFromResponse } from "@/lib/ai-cost/tracker";
import type { PostBrief, MaterializedPost } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 min — 15 briefs * ~5s headroom

/** Max simultaneous gpt-4o calls. Chosen to stay well below the default
 *  OpenAI tier-1 rate limit (3 req/s per model) with safety margin for
 *  retries. Increase carefully — quota is per-org, not per-route. */
const CONCURRENCY = 4;

const RequestSchema = z.object({
  batchId: z.string().min(1).max(80),
  /** When omitted: regenerate every brief that lacks `materialized`.
   *  When provided: regenerate exactly these (used for per-row retry). */
  briefIds: z.array(z.string().min(1).max(40)).optional(),
  /** Force regen for briefs that already have `materialized` (per-row "Régénérer"
   *  button). Without this flag, already-materialized rows are skipped. */
  force: z.boolean().optional().default(false),
  language: z.enum(["fr", "en"]).default("fr"),
});

async function loadUserContextAndPosts(uid: string): Promise<{
  profile: ProfileFields;
  snippets: string[];
  businessContext?: string;
}> {
  if (!isAdminInitialized() || !adminDb) return { profile: {}, snippets: [] };
  try {
    const [userSnap, postsSnap] = await Promise.all([
      adminDb.collection("users").doc(uid).get(),
      adminDb
        .collection("posts")
        .where("userId", "==", uid)
        .orderBy("createdAt", "desc")
        .limit(4)
        .get(),
    ]);
    const data = userSnap.exists ? userSnap.data() ?? {} : {};
    const p = data.profile ?? {};
    const branding = data.branding ?? {};
    // Raw profile fields (arrays preserved so the voice engine's exact-key
    // lookups — tone/sector/profileType maps — still match).
    const profile: ProfileFields = {
      displayName: data.displayName || data.name || undefined,
      profileType: p.profileType,
      sector: p.sector ?? data.sector,
      role: p.role ?? data.role,
      objective: p.objective,
      targetAudience: p.targetAudience,
      communicationTone: p.communicationTone,
      linkedinStyle: p.linkedinStyle,
    };
    // Same business grounding Phase-1 (generate-batch) was given — restores
    // parity so the prose step is as grounded as the brief that shaped it.
    // Sanitized via sanitizeProfileField (free-text user input → strips
    // prompt-injection phrases + zero-width/bidi chars and caps length, same
    // contract as every other profile field).
    const bio = typeof data.bio === "string" ? sanitizeProfileField(data.bio) : "";
    const tagline =
      typeof branding.tagline === "string" ? sanitizeProfileField(branding.tagline) : "";
    const website =
      typeof branding.socialLinks?.website === "string"
        ? sanitizeProfileField(branding.socialLinks.website)
        : "";
    const businessContext =
      [
        bio && `${bio}`,
        tagline && `Tagline: ${tagline}`,
        website && `Site: ${website}`,
      ]
        .filter(Boolean)
        .join("\n") || undefined;
    const snippets = postsSnap.docs
      .map((d) => {
        const post = d.data();
        const picked =
          post.selectedVersion === "B" ? post.responseB : post.responseA || post.responseB;
        const text = (picked ?? "").toString().trim();
        return text ? text.slice(0, 220).replace(/\s+/g, " ") : "";
      })
      .filter(Boolean);
    return { profile, snippets, businessContext };
  } catch (err) {
    console.error("[materialize] loadUserContextAndPosts error:", err);
    return { profile: {}, snippets: [] };
  }
}

/** Run an async fn over items with bounded concurrency. We avoid a 3rd-party
 *  dep (p-limit) since this is the only place we need it. */
async function pMap<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, idx: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const i = cursor++;
      if (i >= items.length) return;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}

/**
 * Materialize model — gpt-4o-mini by default (Tier-2 cost optimization).
 *
 * A blind A/B (same brief, same full Plan-Max prompt, same temperature) showed
 * gpt-4o-mini produces posts COMPARABLE to gpt-4o here — because Phase 1
 * (batch-plan, still gpt-4o) already did the strategic reasoning, so Phase 2 is
 * "just" prose expansion of a fixed brief, which mini handles well. At ~16.7×
 * cheaper on the biggest per-action cost. Override with the
 * STRATEGIST_MATERIALIZE_MODEL env var (e.g. set it to "gpt-4o" to revert
 * instantly, no code change) if a quality drop is ever noticed.
 */
const MATERIALIZE_MODEL = process.env.STRATEGIST_MATERIALIZE_MODEL || MINI_MODEL;

/**
 * One brief → one post LinkedIn call.
 *
 * Uses the SAME system prompt (buildOptimizedPrompt via buildMaterializeSystemPrompt)
 * + plan-aware temperature + hashtag-normalization final pass as the main chat.
 * Only the MODEL differs (mini by default — see MATERIALIZE_MODEL). The brief's
 * format → PostType drives the base prompt + temperature. max_tokens 1800 (up
 * from 900, which truncated long posts) gives the 1300-2000 char target + signature
 * + hashtags ample room — ~500-650 tokens of prose, so no truncation. System
 * prompt is built ONCE per PostType and reused across briefs of that type →
 * OpenAI prompt caching cuts the shared prefix ~50% from the 2nd same-type call.
 */
async function materializeOne(
  openai: OpenAI,
  brief: PostBrief,
  language: "fr" | "en",
  systemPrompt: string,
  postType: PostType,
  userId: string
): Promise<{ ok: true; post: MaterializedPost } | { ok: false; error: string }> {
  try {
    const completion = await openai.chat.completions.create({
      model: MATERIALIZE_MODEL,
      temperature: getGenerationTemperature(postType, "max"),
      // Parity with the chat path: 900 truncated long posts mid-sentence (no
      // repair pass here). 1800 gives the 1300-2000 char target full room.
      max_tokens: 1800,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: buildMaterializeUserMessage({ language, brief }),
        },
      ],
    });
    const usage = readUsageFromResponse(completion);
    void trackAIUsage({
      userId,
      route: "strategist.materialize",
      model: MATERIALIZE_MODEL,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      cachedInputTokens: usage.cachedInputTokens,
      metadata: { briefId: brief.id, language },
    });
    const raw = completion.choices[0]?.message?.content?.trim() ?? "";
    if (!raw) return { ok: false, error: "empty_response" };
    // Same final pass as the chat: normalize hashtag casing (#POSTY → #posty,
    // PascalCase → camelCase, brand tag → #posty).
    const content = normalizeHashtagsInText(raw);
    return {
      ok: true,
      post: {
        content,
        generatedAt: Date.now(),
        model: MATERIALIZE_MODEL,
      },
    };
  } catch (err) {
    console.error(`[materialize] brief ${brief.id} failed:`, err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "llm_failed",
    };
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (auth.error) return auth.error;
  const userId = auth.uid;
  if (!userId || userId === "__dev_bypass__") {
    return NextResponse.json({ error: "auth_required" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { batchId, briefIds, force, language } = parsed.data;

  // ── Access gate — enterprise email allowlist ─────────────────────────
  if (!isStrategistAllowedForEmail(auth.email)) {
    return NextResponse.json(
      {
        error: "access_denied",
        message:
          language === "fr"
            ? "Le Stratège est réservé aux entreprises. Contacte-nous pour activer ton compte."
            : "The Strategist is reserved for enterprise accounts. Contact us to enable yours.",
      },
      { status: 403 }
    );
  }

  // ── LinkedIn required ────────────────────────────────────────────────
  if (!(await hasLinkedInConnected(userId))) {
    return NextResponse.json(
      {
        error: "linkedin_required",
        message:
          language === "fr"
            ? "Connecte ton compte LinkedIn pour utiliser le Stratège."
            : "Connect your LinkedIn account to use the Strategist.",
      },
      { status: 428 }
    );
  }

  if (isAdminInitialized()) {
    try {
      const quota = await checkHourlyQuotaAdmin(userId, auth.email);
      if (!quota.canGenerate) {
        return NextResponse.json(
          {
            error: "rate_limited",
            message:
              language === "fr"
                ? "Limite temporaire atteinte. Réessaye dans quelques minutes."
                : "Rate limit reached. Try again in a few minutes.",
          },
          { status: 429 }
        );
      }
    } catch (err) {
      console.error("[materialize] quota check failed:", err);
      if (process.env.NODE_ENV === "production") {
        return NextResponse.json({ error: "service_unavailable" }, { status: 503 });
      }
    }
  }

  if (!isOpenAIConfigured() || !isAdminInitialized() || !adminDb) {
    return NextResponse.json({ error: "service_not_ready" }, { status: 500 });
  }

  // ── Load batch + verify ownership ────────────────────────────────────
  const batchRef = adminDb.collection("strategyBatches").doc(batchId);
  const batchSnap = await batchRef.get();
  if (!batchSnap.exists) {
    return NextResponse.json({ error: "batch_not_found" }, { status: 404 });
  }
  const batchData = batchSnap.data();
  if (!batchData || batchData.userId !== userId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const allPosts: PostBrief[] = Array.isArray(batchData.posts) ? batchData.posts : [];
  if (allPosts.length === 0) {
    return NextResponse.json({ error: "no_briefs" }, { status: 400 });
  }

  // ── Pick the set to materialize ──────────────────────────────────────
  const targets = allPosts.filter((p) => {
    if (briefIds && briefIds.length > 0) return briefIds.includes(p.id);
    // No briefIds → materialize all that lack `materialized` (or every one
    // if `force` is set).
    return force || !p.materialized;
  });

  if (targets.length === 0) {
    // Nothing to do — caller probably hit "Generate" twice. Idempotent OK.
    return NextResponse.json({
      batchId,
      results: [],
      status: batchData.status,
    });
  }

  // ── Load user context once, share across all calls ───────────────────
  const { profile, snippets, businessContext } = await loadUserContextAndPosts(userId);

  // Build ONE Plan-Max system prompt per PostType present in the batch and
  // reuse it across briefs of that type. buildOptimizedPrompt injects a random
  // variation seed, so building per-type (not per-brief) is what keeps OpenAI's
  // prompt cache alive: same-type briefs share identical bytes → the 2nd+ call
  // of that type pays ~50% on the (large) shared prefix. The Strategist is
  // Max-tier → plan "max".
  const promptByType = new Map<PostType, string>();
  for (const t of new Set(targets.map((b) => mapFormatToPostType(b.format)))) {
    promptByType.set(
      t,
      buildMaterializeSystemPrompt({
        language,
        profile,
        plan: "max",
        postType: t,
        recentPostSnippets: snippets,
        businessContext,
      })
    );
  }

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!,
    timeout: 60_000,
    maxRetries: 1,
  });

  // ── Materialize in parallel, bounded ─────────────────────────────────
  const results = await pMap(targets, CONCURRENCY, async (brief) => {
    const postType = mapFormatToPostType(brief.format);
    const systemPrompt = promptByType.get(postType)!;
    const r = await materializeOne(openai, brief, language, systemPrompt, postType, userId);
    return { briefId: brief.id, result: r };
  });

  // ── Merge results back into the batch posts and persist ──────────────
  const successById = new Map<string, MaterializedPost>();
  for (const r of results) {
    if (r.result.ok) successById.set(r.briefId, r.result.post);
  }

  const updatedPosts: PostBrief[] = allPosts.map((p) => {
    const mat = successById.get(p.id);
    return mat ? { ...p, materialized: mat } : p;
  });

  const allMaterialized = updatedPosts.every((p) => p.materialized?.content);
  const newStatus = allMaterialized ? "materialized" : batchData.status;

  try {
    await batchRef.update({
      posts: updatedPosts,
      status: newStatus,
      updatedAt: new Date(),
    });
  } catch (err) {
    console.error("[materialize] persist failed:", err);
    return NextResponse.json({ error: "persist_failed" }, { status: 500 });
  }

  // Bump the user quota once per materialize call (cheap heuristic — we
  // don't track per-brief quota costs to keep the counters readable).
  try {
    await incrementUserQuotaAdmin(userId);
  } catch {
    /* non-blocking */
  }

  return NextResponse.json({
    batchId,
    status: newStatus,
    results: results.map((r) => ({
      briefId: r.briefId,
      ok: r.result.ok,
      ...(r.result.ok ? { content: r.result.post.content } : { error: r.result.error }),
    })),
  });
}
