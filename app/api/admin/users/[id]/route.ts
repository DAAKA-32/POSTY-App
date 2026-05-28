import { NextRequest, NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { requireAdmin } from "@/lib/admin";
import { adminDb } from "@/lib/db/firebase-admin";
import { getFounderOverridePlan } from "@/lib/config/plans";
import { computeRentability } from "@/lib/ai-cost/rentability";
import { getPricing } from "@/lib/ai-cost/pricing";
import type { AIUsageAggregate, AIUsageModelBreakdown } from "@/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Window for the daily usage series + recent events. 30 days is enough to
 *  spot a spike without paying for huge Firestore reads on each admin click. */
const SERIES_DAYS = 30;
const RECENT_EVENTS_LIMIT = 50;

function tsToMillis(value: unknown): number | null {
  if (!value) return null;
  if (value instanceof Timestamp) return value.toMillis();
  if (typeof value === "object" && value !== null && "toMillis" in value) {
    try {
      return (value as { toMillis: () => number }).toMillis();
    } catch {
      return null;
    }
  }
  return null;
}

function utcDayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Fill missing days in [start, end] with zeros so the chart doesn't have gaps. */
function fillDailySeries(
  raw: Map<string, { tokens: number; cost: number; calls: number }>,
  days: number
): Array<{ day: string; tokens: number; cost: number; calls: number }> {
  const out: Array<{ day: string; tokens: number; cost: number; calls: number }> = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const key = utcDayKey(d);
    const found = raw.get(key);
    out.push({
      day: key,
      tokens: found?.tokens ?? 0,
      cost: found?.cost ?? 0,
      calls: found?.calls ?? 0,
    });
  }
  return out;
}

/**
 * GET /api/admin/users/[id]
 *
 * Returns the full profile + AI cost breakdown for the detail page.
 * Mirrors /api/admin/users (which is a list) but pulls one user with its
 * 30-day usage series and recent events.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  if (!adminDb) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { id } = await context.params;
  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  try {
    const userRef = adminDb.collection("users").doc(id);
    const sinceTs = Timestamp.fromMillis(
      Date.now() - SERIES_DAYS * 24 * 60 * 60 * 1000
    );

    const [userSnap, dailySnap, recentSnap, postsAgg, sessionsAgg] = await Promise.all([
      userRef.get(),
      userRef
        .collection("usage_daily")
        .where("day", ">=", utcDayKey(sinceTs.toDate()))
        .get(),
      adminDb
        .collection("ai_events")
        .where("userId", "==", id)
        .orderBy("createdAt", "desc")
        .limit(RECENT_EVENTS_LIMIT)
        .get(),
      adminDb.collection("posts").where("userId", "==", id).count().get(),
      adminDb.collection("sessions").where("userId", "==", id).count().get(),
    ]);

    if (!userSnap.exists) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const data = userSnap.data() as Record<string, unknown>;
    const subscription = (data.subscription || {}) as Record<string, unknown>;
    const stats = (data.stats || {}) as Record<string, unknown>;
    const usage = (data.usage || {}) as Record<string, unknown>;
    const aiUsage = (data.aiUsage as AIUsageAggregate | undefined) || undefined;

    const email = typeof data.email === "string" ? (data.email as string) : "";
    const rawPlan =
      typeof subscription.plan === "string" ? (subscription.plan as string) : null;
    const overridePlan = getFounderOverridePlan(email);
    const effectivePlan = overridePlan || rawPlan;
    const rawStatus =
      typeof subscription.status === "string" ? (subscription.status as string) : null;
    const effectiveStatus = overridePlan ? "active" : rawStatus;

    const rentability = computeRentability(effectivePlan, aiUsage);

    // Build the 30-day series from the usage_daily docs
    const rawDaily = new Map<string, { tokens: number; cost: number; calls: number }>();
    for (const doc of dailySnap.docs) {
      const d = doc.data() as Record<string, unknown>;
      const day = typeof d.day === "string" ? (d.day as string) : doc.id;
      rawDaily.set(day, {
        tokens:
          (typeof d.inputTokens === "number" ? d.inputTokens : 0) +
          (typeof d.outputTokens === "number" ? d.outputTokens : 0),
        cost: typeof d.costUSD === "number" ? d.costUSD : 0,
        calls: typeof d.calls === "number" ? d.calls : 0,
      });
    }
    const dailySeries = fillDailySeries(rawDaily, SERIES_DAYS);

    // Flatten the per-model/per-route breakdowns for the UI
    const byModel: Array<{ model: string; label: string } & AIUsageModelBreakdown> =
      Object.entries(aiUsage?.byModel || {}).map(([model, v]) => ({
        model,
        label: getPricing(model).label,
        inputTokens: v.inputTokens ?? 0,
        outputTokens: v.outputTokens ?? 0,
        costUSD: v.costUSD ?? 0,
        calls: v.calls ?? 0,
      }));
    byModel.sort((a, b) => b.costUSD - a.costUSD);

    const byRoute: Array<{ route: string } & AIUsageModelBreakdown> =
      Object.entries(aiUsage?.byRoute || {}).map(([route, v]) => ({
        route,
        inputTokens: v.inputTokens ?? 0,
        outputTokens: v.outputTokens ?? 0,
        costUSD: v.costUSD ?? 0,
        calls: v.calls ?? 0,
      }));
    byRoute.sort((a, b) => b.costUSD - a.costUSD);

    const recentEvents = recentSnap.docs.map((doc) => {
      const d = doc.data() as Record<string, unknown>;
      return {
        id: doc.id,
        route: typeof d.route === "string" ? d.route : "",
        model: typeof d.model === "string" ? d.model : "",
        inputTokens: typeof d.inputTokens === "number" ? d.inputTokens : 0,
        outputTokens: typeof d.outputTokens === "number" ? d.outputTokens : 0,
        costUSD: typeof d.costUSD === "number" ? d.costUSD : 0,
        createdAt: tsToMillis(d.createdAt),
        metadata: (d.metadata as Record<string, unknown>) ?? null,
      };
    });

    return NextResponse.json(
      {
        user: {
          id: userSnap.id,
          email,
          displayName:
            typeof data.displayName === "string" ? data.displayName : "",
          photoURL:
            typeof data.photoURL === "string" ? (data.photoURL as string) : null,
          plan: effectivePlan,
          status: effectiveStatus,
          createdAt: tsToMillis(data.createdAt),
          language:
            typeof data.language === "string" ? (data.language as string) : null,
          onboardingComplete: data.onboardingComplete === true,
          trialEndsAt: tsToMillis(subscription.trialEndsAt),
          freeTrialEndsAt: tsToMillis(subscription.freeTrialEndsAt),
          firstPaymentDate: tsToMillis(subscription.firstPaymentDate),
          refundRequested: subscription.refundRequested === true,
          lastActive: tsToMillis(stats.lastActive),
          postsCount: postsAgg.data().count,
          sessionsCount: sessionsAgg.data().count,
          conversationsThisMonth:
            typeof usage.conversationsThisMonth === "number"
              ? (usage.conversationsThisMonth as number)
              : 0,
          conversationsThisWeek:
            typeof usage.conversationsThisWeek === "number"
              ? (usage.conversationsThisWeek as number)
              : 0,
          lastConversationDate: tsToMillis(usage.lastConversationDate),
        },
        aiUsage: {
          totalInputTokens: aiUsage?.totalInputTokens ?? 0,
          totalOutputTokens: aiUsage?.totalOutputTokens ?? 0,
          totalImagesGenerated: aiUsage?.totalImagesGenerated ?? 0,
          callsCount: aiUsage?.callsCount ?? 0,
          lastCallAt: tsToMillis(aiUsage?.lastCallAt),
        },
        rentability,
        byModel,
        byRoute,
        dailySeries,
        recentEvents,
        windowDays: SERIES_DAYS,
      },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("[admin/users/[id]] query failed", error);
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
}
