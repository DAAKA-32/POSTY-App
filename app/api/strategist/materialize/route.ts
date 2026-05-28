/**
 * POST /api/strategist/materialize
 *
 * Strategist Phase 2 — turns every brief in an approved batch into a finished
 * LinkedIn post. One gpt-4o call per brief, parallelized with a concurrency
 * cap so we don't fan-out 15 simultaneous OpenAI calls and trip a rate limit.
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
} from "@/lib/ai/materialize-post-prompt";
import { isStrategistAllowedForEmail } from "@/lib/strategist/access";
import { hasLinkedInConnected } from "@/lib/strategist/access-server";
import { isOpenAIConfigured } from "@/lib/openai";
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

type UserContext = {
  name?: string;
  sector?: string;
  role?: string;
  objective?: string;
  targetAudience?: string;
  communicationTone?: string;
};

function normalizeField(v: unknown): string | undefined {
  if (!v) return undefined;
  if (Array.isArray(v)) return v.filter(Boolean).join(", ") || undefined;
  if (typeof v === "string") return v.trim() || undefined;
  return undefined;
}

async function loadUserContextAndPosts(uid: string): Promise<{
  ctx: UserContext;
  snippets: string[];
}> {
  if (!isAdminInitialized() || !adminDb) return { ctx: {}, snippets: [] };
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
    const profile = data.profile ?? {};
    const ctx: UserContext = {
      name: data.name || data.displayName || undefined,
      sector: normalizeField(profile.sector ?? data.sector),
      role: profile.role || data.role || undefined,
      objective: normalizeField(profile.objective),
      targetAudience: normalizeField(profile.targetAudience),
      communicationTone: normalizeField(profile.communicationTone),
    };
    const snippets = postsSnap.docs
      .map((d) => {
        const p = d.data();
        const picked =
          p.selectedVersion === "B" ? p.responseB : p.responseA || p.responseB;
        const text = (picked ?? "").toString().trim();
        return text ? text.slice(0, 220).replace(/\s+/g, " ") : "";
      })
      .filter(Boolean);
    return { ctx, snippets };
  } catch (err) {
    console.error("[materialize] loadUserContextAndPosts error:", err);
    return { ctx: {}, snippets: [] };
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
 * One brief → one post LinkedIn call.
 *
 * Cost tuning notes (May 2026):
 *   - Model: gpt-4o-mini (×15 cheaper than gpt-4o on input, ×16 on output).
 *     The strategic thinking happens in P1 (batch plan) where we still run
 *     gpt-4o; here we only expand an already-cadred brief into prose — a
 *     task gpt-4o-mini handles fine.
 *   - System prompt is pre-built ONCE per request (shared across all the
 *     parallel briefs in the batch). Identical bytes → OpenAI prompt cache
 *     kicks in from the 2nd call onward (−50% on the cached input prefix).
 *   - max_tokens: 600 is comfortably above the typical 350-450 token post.
 *     Lower than the old 900 prevents the model from rambling into footers
 *     when it's bored.
 */
const MATERIALIZE_MODEL = "gpt-4o-mini";

async function materializeOne(
  openai: OpenAI,
  brief: PostBrief,
  language: "fr" | "en",
  systemPrompt: string,
  userId: string
): Promise<{ ok: true; post: MaterializedPost } | { ok: false; error: string }> {
  try {
    const completion = await openai.chat.completions.create({
      model: MATERIALIZE_MODEL,
      // Slightly above 0.7 — post body benefits from voice variety, the
      // brief already constrains structure so we can let the model breathe.
      temperature: 0.75,
      max_tokens: 600,
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
    const content = completion.choices[0]?.message?.content?.trim() ?? "";
    if (!content) return { ok: false, error: "empty_response" };
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
  const { ctx, snippets } = await loadUserContextAndPosts(userId);

  // Build the system prompt ONCE — identical bytes across the parallel
  // calls. This is what makes OpenAI's prompt cache kick in: from the 2nd
  // call onward, the (large) shared system prefix is billed at ~50% of
  // the normal input rate. For a batch of 5, that's a ~40% input-cost cut
  // with zero behavioural change.
  const systemPrompt = buildMaterializeSystemPrompt({
    language,
    userContext: ctx,
    recentPostSnippets: snippets,
  });

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!,
    timeout: 60_000,
    maxRetries: 1,
  });

  // ── Materialize in parallel, bounded ─────────────────────────────────
  const results = await pMap(targets, CONCURRENCY, async (brief) => {
    const r = await materializeOne(openai, brief, language, systemPrompt, userId);
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
