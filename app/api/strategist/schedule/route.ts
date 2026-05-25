/**
 * POST /api/strategist/schedule
 *
 * Strategist Phase 3 — takes a batch in status `materialized` and hands every
 * brief off to the existing publishing pipeline by writing one doc per brief
 * into `scheduledPosts`. The cron `executeScheduledPosts` (runs every minute)
 * then publishes them in order.
 *
 * Smart-scheduler responsibilities:
 *   - convert local YYYY-MM-DD HH:MM (from the brief, in the user's TZ) to
 *     UTC instants ready for Firestore
 *   - rescue past slots (push to next peak)
 *   - snap dead-zone slots back to peak windows
 *   - de-conflict same-batch slots (≥ 60min apart)
 *
 * Per-brief failure isolation: if 4/5 schedule and 1 fails, the 4 are
 * persisted and the 5th comes back with `ok: false` so the UI can retry it.
 *
 * Body:
 *   {
 *     batchId: string,
 *     platform: "linkedin",                    // P3 = LinkedIn only
 *     visibility?: "PUBLIC" | "CONNECTIONS",   // default PUBLIC
 *     organizationUrn?: string,                // optional Org Page URN
 *     language?: "fr" | "en",
 *   }
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyAuth } from "@/lib/auth";
import { isAdminInitialized, adminDb } from "@/lib/db/firebase-admin";
import { checkHourlyQuotaAdmin } from "@/lib/db/firestore-admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { computeScheduleSlots } from "@/lib/strategist/smart-scheduler";
import { isStrategistAllowedForEmail } from "@/lib/strategist/access";
import { hasLinkedInConnected } from "@/lib/strategist/access-server";
import type { PostBrief } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const RequestSchema = z.object({
  batchId: z.string().min(1).max(80),
  platform: z.literal("linkedin").default("linkedin"),
  visibility: z.enum(["PUBLIC", "CONNECTIONS"]).optional().default("PUBLIC"),
  organizationUrn: z.string().min(1).max(200).optional(),
  language: z.enum(["fr", "en"]).default("fr"),
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
  const { batchId, platform, visibility, organizationUrn, language } = parsed.data;

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
  // Schedule endpoint writes to scheduledPosts with platform="linkedin" —
  // the publishing cron will fail at runtime without a connection. Fail
  // fast here instead.
  if (!(await hasLinkedInConnected(userId))) {
    return NextResponse.json(
      {
        error: "linkedin_required",
        message:
          language === "fr"
            ? "Connecte ton compte LinkedIn pour programmer ces posts."
            : "Connect your LinkedIn account to schedule these posts.",
      },
      { status: 428 }
    );
  }

  if (!isAdminInitialized() || !adminDb) {
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

  // Only materialized briefs without an existing scheduledPostId are
  // candidates. Idempotent: re-running this endpoint on an already-scheduled
  // batch is a no-op.
  const targets = allPosts.filter(
    (p) => p.materialized?.content && !p.scheduledPostId
  );

  if (targets.length === 0) {
    return NextResponse.json({
      batchId,
      status: batchData.status,
      results: [],
      message:
        language === "fr"
          ? "Aucun post à programmer (déjà programmés ou non matérialisés)."
          : "Nothing to schedule (already scheduled or not materialized).",
    });
  }

  // ── Smart-resolve all slots BEFORE writing — atomic feel ─────────────
  const timezone: string =
    typeof batchData.timezone === "string" ? batchData.timezone : "Europe/Paris";
  const slots = computeScheduleSlots({
    briefs: targets.map((p) => ({
      id: p.id,
      suggestedDate: p.suggestedDate,
      suggestedTime: p.suggestedTime,
    })),
    timezone,
  });

  // ── Write one scheduledPosts doc per brief ───────────────────────────
  // We do this sequentially (small N, max 15) to keep the order of
  // adminDb.add() calls deterministic — useful if Firestore rules ever rely
  // on createdAt ordering.
  const results: Array<{
    briefId: string;
    ok: boolean;
    scheduledPostId?: string;
    fireAtMs?: number;
    adjusted?: boolean;
    adjustmentReason?: string;
    error?: string;
  }> = [];

  for (const slot of slots) {
    const brief = targets.find((p) => p.id === slot.briefId);
    if (!brief?.materialized?.content) {
      results.push({ briefId: slot.briefId, ok: false, error: "no_content" });
      continue;
    }
    try {
      const docRef = await adminDb.collection("scheduledPosts").add({
        userId,
        content: brief.materialized.content,
        postId: null,
        title: brief.hook.slice(0, 200), // short label for the schedule page
        scheduledAt: Timestamp.fromDate(slot.fireAt),
        timezone,
        status: "pending",
        platform,
        postType: "feed",
        visibility,
        ...(organizationUrn ? { organizationUrn } : {}),
        // Provenance trail — useful for debugging, lets the schedule page
        // link back to the strategy batch that produced this scheduled post.
        sourceBatchId: batchId,
        sourceBriefId: brief.id,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        attemptCount: 0,
        publishedAt: null,
        publishedUrl: null,
        lastAttemptAt: null,
        failureReason: null,
      });
      results.push({
        briefId: slot.briefId,
        ok: true,
        scheduledPostId: docRef.id,
        fireAtMs: slot.fireAtMs,
        adjusted: slot.adjusted,
        adjustmentReason: slot.adjustmentReason,
      });
    } catch (err) {
      console.error(`[strategist/schedule] write failed for brief ${brief.id}:`, err);
      results.push({
        briefId: slot.briefId,
        ok: false,
        error: err instanceof Error ? err.message : "write_failed",
      });
    }
  }

  // ── Patch the batch: attach scheduledPostId + scheduledAt to each brief,
  //    transition status if EVERY brief is now scheduled.
  const successById = new Map(
    results.filter((r) => r.ok).map((r) => [r.briefId, r])
  );
  const updatedPosts: PostBrief[] = allPosts.map((p) => {
    const r = successById.get(p.id);
    if (!r) return p;
    return {
      ...p,
      scheduledPostId: r.scheduledPostId,
      scheduledAt: r.fireAtMs,
    };
  });
  const allScheduled = updatedPosts.every(
    (p) => !p.materialized?.content || p.scheduledPostId
  );
  const newStatus = allScheduled ? "scheduled" : batchData.status;

  try {
    await batchRef.update({
      posts: updatedPosts,
      status: newStatus,
      updatedAt: new Date(),
    });
  } catch (err) {
    console.error("[strategist/schedule] batch update failed:", err);
    // Don't 500 — the scheduledPosts docs are already written, the cron
    // will publish them. Return the results so the UI knows what landed.
  }

  return NextResponse.json({
    batchId,
    status: newStatus,
    results,
  });
}
