/**
 * POST /api/strategist/batch-plan
 *
 * Strategist Phase 1 endpoint — thin wrapper around `generateBatchPlan` in
 * `lib/strategist/generate-batch.ts`. The route's job is purely to:
 *   - auth + verify the user is on Max
 *   - check the hourly quota
 *   - validate request body
 *   - delegate to the shared lib
 *   - increment quota best-effort
 *
 * The cron-driven autonomous variant lives at /api/strategist/auto-batch
 * and uses the same `generateBatchPlan` core — keep the two routes thin so
 * adding or fixing a behavior touches the shared module only.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyAuth } from "@/lib/auth";
import { isAdminInitialized } from "@/lib/db/firebase-admin";
import { checkHourlyQuotaAdmin, incrementUserQuotaAdmin } from "@/lib/db/firestore-admin";
import { isOpenAIConfigured } from "@/lib/openai";
import { generateBatchPlan, tomorrowInTz } from "@/lib/strategist/generate-batch";
import { isStrategistAllowedForEmail } from "@/lib/strategist/access";
import { hasLinkedInConnected } from "@/lib/strategist/access-server";
import type { StrategistAdvancedParams } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Advanced steering from the drawer panel. Strict + all-optional: an empty
 *  object is valid and produces the legacy behavior. Mirrors
 *  `StrategistAdvancedParams` in types/index.ts. */
const AdvancedSchema = z
  .object({
    objective: z
      .enum(["authority", "engagement", "lead-gen", "conversion", "branding", "storytelling"])
      .optional(),
    tone: z.string().max(60).optional(),
    audience: z.string().max(200).optional(),
    formality: z.number().int().min(1).max(5).optional(),
    ctaIntensity: z.enum(["none", "soft", "assertive"]).optional(),
    hookStyle: z
      .enum(["contrarian", "story", "data", "question", "confession", "auto"])
      .optional(),
    orientation: z.enum(["personal", "professional", "balanced"]).optional(),
    emotion: z.number().int().min(1).max(5).optional(),
  })
  .strict();

const RequestSchema = z.object({
  /** Verbatim user prompt — stored for re-generation later. */
  sourcePrompt: z.string().min(3).max(2000),
  /** How many briefs to produce. */
  count: z.number().int().min(1).max(15),
  /** First eligible publication date YYYY-MM-DD (defaults: tomorrow). */
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD")
    .optional(),
  /** User timezone, e.g. "Europe/Paris". */
  timezone: z.string().min(1).max(64),
  language: z.enum(["fr", "en"]).default("fr"),
  /** Optional advanced steering (drawer panel override). Omit → saved
   *  profile defaults are used by the shared generator. */
  advanced: AdvancedSchema.optional(),
});

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
  const { sourcePrompt, count, timezone, language, advanced } = parsed.data;
  const startDate = parsed.data.startDate ?? tomorrowInTz(timezone);

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
        const resetMin = Math.ceil(quota.resetInSeconds / 60);
        return NextResponse.json(
          {
            error: "rate_limited",
            message:
              language === "fr"
                ? `Limite temporaire atteinte. Réessayez dans ${resetMin} min.`
                : `Rate limit reached. Try again in ${resetMin} min.`,
            resetInSeconds: quota.resetInSeconds,
          },
          { status: 429 }
        );
      }
    } catch (err) {
      console.error("[strategist/batch-plan] quota check failed:", err);
      if (process.env.NODE_ENV === "production") {
        return NextResponse.json({ error: "service_unavailable" }, { status: 503 });
      }
    }
  }

  if (!isOpenAIConfigured()) {
    return NextResponse.json({ error: "no_api_key" }, { status: 500 });
  }

  // ── Delegate to shared lib ───────────────────────────────────────────
  try {
    const { batch } = await generateBatchPlan({
      userId,
      sourcePrompt,
      count,
      startDate,
      timezone,
      language,
      // zod validated formality/emotion as 1..5 ints; cast narrows number →
      // the literal union the type declares.
      advanced: advanced as StrategistAdvancedParams | undefined,
    });

    // Best-effort quota increment (per call, not per brief).
    if (isAdminInitialized()) {
      try {
        await incrementUserQuotaAdmin(userId);
      } catch (err) {
        console.warn("[strategist/batch-plan] quota increment failed:", err);
      }
    }

    return NextResponse.json({ batch }, { status: 200 });
  } catch (err) {
    const code = err instanceof Error ? err.message : "unknown";
    console.error("[strategist/batch-plan] generation failed:", code);
    const status =
      code === "no_openai_key" || code === "admin_not_initialized"
        ? 500
        : code === "schema_mismatch" || code === "invalid_json_from_llm" || code === "empty_llm_response"
          ? 502
          : 500;
    return NextResponse.json({ error: code }, { status });
  }
}
