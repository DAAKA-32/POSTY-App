/**
 * POST /api/image/generate
 *
 * Pipeline:
 *   1. Auth (Firebase token)
 *   2. Per-day image quota check (Pro=3, Max=5, Free=0)
 *   3. AI fills the DSL via OpenAI JSON mode
 *   4. Zod validates the response
 *   5. Satori → resvg renders to PNG
 *   6. PNG uploaded to Firebase Storage
 *   7. Quota incremented atomically
 *   8. Returns { url, dsl, quota } JSON
 *
 * Anything before step 7 short-circuits with a structured error. The quota
 * is only consumed after a successful render+upload so a 5xx mid-pipeline
 * doesn't burn the user's daily budget.
 */

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";
import { verifyAuth } from "@/lib/auth";
import { ImageDSLSchema } from "@/lib/image-gen/dsl";
import { buildSystemPrompt, buildUserPrompt, buildRetryPrompt } from "@/lib/image-gen/prompt";
import { renderDSL } from "@/lib/image-gen/render";
import { uploadGeneratedImage } from "@/lib/image-gen/storage";
import { checkImageQuota, incrementImageQuota } from "@/lib/image-gen/quota";
import { IMAGE_GEN_QUOTA_ENABLED } from "@/lib/image-gen/config";

export const runtime = "nodejs";
// Satori font fetch + render typically takes 800-2000ms end-to-end.
export const maxDuration = 30;

const RequestSchema = z.object({
  brief: z.string().min(3).max(800),
  postContext: z.string().max(2000).optional(),
  language: z.enum(["fr", "en"]).default("fr"),
});

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (auth.error) return auth.error;
  const { uid, email } = auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsedReq = RequestSchema.safeParse(body);
  if (!parsedReq.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsedReq.error.flatten() },
      { status: 400 }
    );
  }
  const { brief, postContext, language } = parsedReq.data;

  // ── Quota ────────────────────────────────────────────────────────────────
  // When the master flag is off, skip both the check AND the increment so
  // we don't pollute `users/{uid}.imageGenUsage` with throwaway data during
  // the open-beta window. The `quota` object returned to the client is then
  // synthetic — "max" plan, effectively unlimited.
  const quota = IMAGE_GEN_QUOTA_ENABLED
    ? await checkImageQuota(uid, email)
    : { allowed: true, plan: "max" as const, limit: -1, used: 0, remaining: -1 };
  if (IMAGE_GEN_QUOTA_ENABLED && !quota.allowed) {
    return NextResponse.json(
      {
        error: "quota_exceeded",
        message: quota.reason || "Quota atteint.",
        quota: {
          plan: quota.plan,
          limit: quota.limit,
          used: quota.used,
          remaining: quota.remaining,
        },
      },
      { status: 403 }
    );
  }

  // ── AI → DSL ─────────────────────────────────────────────────────────────
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Service indisponible", message: "OpenAI non configuré." },
      { status: 503 }
    );
  }
  // 20s ceiling on every OpenAI call — without this the SDK retries with
  // exponential backoff for up to 10 minutes when the API stalls, and the
  // user sees a "loading…" placeholder forever. 20s is plenty for a 600-token
  // JSON completion (median ≈ 1-2s, p95 ≈ 4-6s).
  const openai = new OpenAI({ apiKey, timeout: 20_000, maxRetries: 1 });

  const systemPrompt = buildSystemPrompt(language);
  const userPrompt = buildUserPrompt(brief, postContext);

  // gpt-4o-mini frequently mislabels fields (palette/label) or overshoots
  // char caps. We accept up to one repair pass: feed the broken output back
  // with the Zod error list so the model can correct in place.
  const callOpenAI = async (
    messages: { role: "system" | "user" | "assistant"; content: string }[]
  ) =>
    openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 600,
      messages,
    });

  const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  let dsl;
  let lastRaw: string | null = null;
  let lastErrors: Record<string, string[] | undefined> | null = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    let raw: string | null = null;
    try {
      const completion = await callOpenAI(messages);
      raw = completion.choices[0]?.message?.content ?? null;
    } catch (err) {
      console.error("[image/generate] OpenAI error", err);
      return NextResponse.json(
        { error: "ai_error", message: "L'IA n'a pas pu produire le visuel. Réessayez." },
        { status: 502 }
      );
    }
    if (!raw) {
      return NextResponse.json(
        { error: "ai_empty", message: "Réponse IA vide." },
        { status: 502 }
      );
    }
    lastRaw = raw;

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        { error: "ai_invalid_json", message: "Réponse IA non-JSON." },
        { status: 502 }
      );
    }

    const check = ImageDSLSchema.safeParse(parsed);
    if (check.success) {
      dsl = check.data;
      break;
    }

    lastErrors = check.error.flatten().fieldErrors as Record<string, string[] | undefined>;
    console.warn("[image/generate] DSL validation failed (attempt", attempt + 1, ")", lastErrors);

    if (attempt === 0) {
      messages.push({ role: "assistant", content: raw });
      messages.push({ role: "user", content: buildRetryPrompt(raw, lastErrors, language) });
    }
  }

  if (!dsl) {
    return NextResponse.json(
      {
        error: "ai_invalid_dsl",
        message: "L'IA a produit un schéma invalide. Réessayez.",
        details: { fieldErrors: lastErrors, raw: lastRaw?.slice(0, 500) },
      },
      { status: 502 }
    );
  }

  // ── Render + upload ──────────────────────────────────────────────────────
  let pngBuffer: Buffer;
  let attribution: Awaited<ReturnType<typeof renderDSL>>["attribution"];
  try {
    const result = await renderDSL(dsl);
    pngBuffer = result.png;
    attribution = result.attribution;
  } catch (err) {
    console.error("[image/generate] Satori/resvg render failed", err);
    return NextResponse.json(
      { error: "render_failed", message: "Le rendu visuel a échoué." },
      { status: 500 }
    );
  }

  let uploaded;
  try {
    uploaded = await uploadGeneratedImage(uid, pngBuffer);
  } catch (err) {
    console.error("[image/generate] Storage upload failed", err);
    return NextResponse.json(
      { error: "upload_failed", message: "Sauvegarde impossible." },
      { status: 500 }
    );
  }

  // ── Consume quota only on success (when enabled) ─────────────────────────
  if (IMAGE_GEN_QUOTA_ENABLED) {
    try {
      await incrementImageQuota(uid);
    } catch (err) {
      // Quota increment failure must NOT void a successful render — but we log
      // for observability so a runaway free generation doesn't slip past.
      console.error("[image/generate] Quota increment failed (image still served)", err);
    }
  }

  return NextResponse.json({
    url: uploaded.url,
    imageId: uploaded.imageId,
    dsl,
    attribution, // present only on photo-hero with a real photo
    quota: IMAGE_GEN_QUOTA_ENABLED
      ? {
          plan: quota.plan,
          limit: quota.limit,
          used: quota.used + 1,
          remaining: Math.max(0, quota.remaining - 1),
        }
      : { plan: quota.plan, limit: -1, used: 0, remaining: -1 },
  });
}
