/**
 * POST /api/strategist/auto-batch
 *
 * Cron-driven entry point for Phase 4 autonomous Strategist. Called by the
 * `weeklyAutonomousStrategist` Cloud Function (one HTTP fetch per opted-in
 * user, fired on the user's chosen `dayOfWeek`).
 *
 * Auth model: NOT user JWT. Caller is a server-to-server cron, so we verify
 * a shared secret in the `x-cron-secret` header against `process.env.CRON_SECRET`.
 * That secret is set in both Vercel (Next.js side) and Firebase Functions
 * config — it must match on both ends for the call to pass.
 *
 * Behavior:
 *   1. Verify the secret.
 *   2. Read the target user's autonomousMode config from Firestore.
 *   3. Build the prompt:
 *        - if customPrompt set → use it verbatim
 *        - else → default template referencing the user's sector + objective
 *   4. Run the same `generateBatchPlan` core that the user-facing route uses.
 *   5. Patch the user doc with `pendingAutoBatchId` (UI banner picks it up)
 *      and bump `autonomousMode.lastTriggeredAt` (dedup guard).
 *
 * Failure isolation: failures here NEVER affect the user-facing UI directly.
 * Cron-side logs are the only feedback channel for now. A retry policy can
 * be added later if real-world flakiness justifies it.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminDb, isAdminInitialized } from "@/lib/db/firebase-admin";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import { isOpenAIConfigured } from "@/lib/openai";
import { generateBatchPlan, tomorrowInTz } from "@/lib/strategist/generate-batch";
import { isStrategistAllowedForEmail } from "@/lib/strategist/access";
import { hasLinkedInConnected } from "@/lib/strategist/access-server";
import type { AutonomousStrategistConfig } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const RequestSchema = z.object({
  userId: z.string().min(1).max(128),
  /** Optional override for testing — normally the cron lets the endpoint
   *  read the config from Firestore. */
  forcePrompt: z.string().min(3).max(2000).optional(),
});

/** Build a default sourcePrompt for users who haven't set a custom one.
 *  Keeps the prompt in the same surface form a real user would type, so
 *  the LLM doesn't see a weird structured request and slip out of voice. */
function defaultPromptFor(opts: {
  count: number;
  sector?: string;
  objective?: string;
  language: "fr" | "en";
}): string {
  const { count, sector, objective, language } = opts;
  if (language === "en") {
    const sectorPart = sector ? ` in ${sector}` : "";
    const objPart = objective ? ` to support: ${objective}` : "";
    return `Prepare a coherent editorial plan of ${count} LinkedIn posts for the week ahead${sectorPart}${objPart}.`;
  }
  const sectorPart = sector ? ` dans le secteur ${sector}` : "";
  const objPart = objective ? ` pour soutenir l'objectif : ${objective}` : "";
  return `Prépare un plan éditorial cohérent de ${count} posts LinkedIn pour la semaine à venir${sectorPart}${objPart}.`;
}

export async function POST(request: NextRequest) {
  // ── Cron secret check ────────────────────────────────────────────────
  const provided = request.headers.get("x-cron-secret");
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    console.error("[auto-batch] CRON_SECRET not configured in env");
    return NextResponse.json({ error: "secret_not_configured" }, { status: 500 });
  }
  if (!provided || provided !== expected) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  if (!isAdminInitialized() || !adminDb) {
    return NextResponse.json({ error: "admin_not_ready" }, { status: 500 });
  }
  if (!isOpenAIConfigured()) {
    return NextResponse.json({ error: "no_openai_key" }, { status: 500 });
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
  const { userId, forcePrompt } = parsed.data;

  // ── Load user + autonomousMode config ────────────────────────────────
  const userRef = adminDb.collection("users").doc(userId);
  const userSnap = await userRef.get();
  if (!userSnap.exists) {
    return NextResponse.json({ error: "user_not_found" }, { status: 404 });
  }
  const userData = userSnap.data() ?? {};
  const cfg = (userData.autonomousMode ?? null) as AutonomousStrategistConfig | null;

  if (!cfg?.enabled && !forcePrompt) {
    return NextResponse.json({ error: "autonomous_mode_disabled" }, { status: 400 });
  }

  // Access re-check — the cron caller may have stale info; refuse if the
  // user's email got removed from the allowlist since they opted in.
  const userEmail: string | undefined = userData.email;
  if (!isStrategistAllowedForEmail(userEmail) && !forcePrompt) {
    return NextResponse.json({ error: "access_denied" }, { status: 403 });
  }

  // LinkedIn re-check — user may have disconnected LinkedIn since opting in.
  // Skip silently (200 with a skip marker) rather than 4xx so the cron logs
  // a clean "nothing to do" instead of an alarming red error.
  if (!(await hasLinkedInConnected(userId)) && !forcePrompt) {
    return NextResponse.json(
      { ok: false, skipped: true, reason: "linkedin_disconnected", userId },
      { status: 200 }
    );
  }

  // Dedup guard — never fire twice in 6 days for the same user.
  const last = cfg?.lastTriggeredAt as Timestamp | undefined;
  if (last && Date.now() - last.toMillis() < 6 * 24 * 60 * 60_000 && !forcePrompt) {
    return NextResponse.json({ error: "already_fired_this_week" }, { status: 200 });
  }

  // ── Resolve prompt + count ───────────────────────────────────────────
  const language: "fr" | "en" = userData.language === "en" ? "en" : "fr";
  const count = cfg?.count ?? 5;
  const timezone: string =
    userData.timezone || userData.profile?.timezone || "Europe/Paris";

  const sector =
    Array.isArray(userData.profile?.sector)
      ? userData.profile.sector.join(", ")
      : userData.profile?.sector;
  const objective =
    Array.isArray(userData.profile?.objective)
      ? userData.profile.objective.join(", ")
      : userData.profile?.objective;

  const sourcePrompt =
    forcePrompt ||
    cfg?.customPrompt?.trim() ||
    defaultPromptFor({ count, sector, objective, language });

  // ── Generate ─────────────────────────────────────────────────────────
  let batchId: string;
  try {
    const result = await generateBatchPlan({
      userId,
      sourcePrompt,
      count: Math.max(1, Math.min(15, count)),
      startDate: tomorrowInTz(timezone),
      timezone,
      language,
    });
    batchId = result.batchId;
  } catch (err) {
    console.error("[auto-batch] generation failed for user", userId, err);
    return NextResponse.json({ error: "generation_failed" }, { status: 500 });
  }

  // ── Patch user: pendingAutoBatchId + lastTriggeredAt ─────────────────
  try {
    await userRef.update({
      pendingAutoBatchId: batchId,
      "autonomousMode.lastTriggeredAt": FieldValue.serverTimestamp(),
    });
  } catch (err) {
    console.error("[auto-batch] user patch failed:", err);
    // The batch is already in Firestore, banner just won't show — non-fatal.
  }

  return NextResponse.json({ ok: true, batchId, userId });
}
