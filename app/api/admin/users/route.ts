import { NextRequest, NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { requireAdmin } from "@/lib/admin";
import { adminDb } from "@/lib/db/firebase-admin";
import { getFounderOverridePlan } from "@/lib/config/plans";
import { computeRentability } from "@/lib/ai-cost/rentability";
import type { AIUsageAggregate } from "@/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

type AdminUserRow = {
  id: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  plan: string | null;
  status: string | null;
  trialEndsAt: number | null;
  freeTrialEndsAt: number | null;
  firstPaymentDate: number | null;
  refundRequested: boolean;
  postsCount: number;
  sessionsCount: number;
  conversationsThisMonth: number;
  conversationsThisWeek: number;
  lastConversationDate: number | null;
  lastActive: number | null;
  onboardingComplete: boolean;
  createdAt: number | null;
  language: string | null;
  // AI cost & rentability — populated from users.aiUsage (written by
  // lib/ai-cost/tracker). Zeros for users with no tracked calls.
  aiTotalCostUSD: number;
  aiTotalCalls: number;
  aiTotalTokens: number;
  aiAvgCostPerCallUSD: number;
  monthlyRevenueUSD: number;
  marginPctOneMonth: number | null;
  rentabilityStatus: "no-data" | "profitable" | "watch" | "unprofitable" | "free";
  aiLastCallAt: number | null;
};

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

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  if (!adminDb) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const url = new URL(request.url);
  const rawLimit = parseInt(url.searchParams.get("limit") || "", 10);
  const limit = Number.isFinite(rawLimit)
    ? Math.min(Math.max(rawLimit, 1), MAX_LIMIT)
    : DEFAULT_LIMIT;

  try {
    const [usersSnap, sessionsSnap, postsSnap] = await Promise.all([
      adminDb
        .collection("users")
        .orderBy("createdAt", "desc")
        .limit(limit)
        .get(),
      adminDb.collection("sessions").select("userId").get(),
      adminDb.collection("posts").select("userId").get(),
    ]);

    const sessionCounts = new Map<string, number>();
    for (const d of sessionsSnap.docs) {
      const uid = d.get("userId");
      if (typeof uid === "string") {
        sessionCounts.set(uid, (sessionCounts.get(uid) || 0) + 1);
      }
    }
    const postCounts = new Map<string, number>();
    for (const d of postsSnap.docs) {
      const uid = d.get("userId");
      if (typeof uid === "string") {
        postCounts.set(uid, (postCounts.get(uid) || 0) + 1);
      }
    }

    const rows: AdminUserRow[] = usersSnap.docs.map((doc) => {
      const data = doc.data() as Record<string, unknown>;
      const subscription = (data.subscription || {}) as Record<string, unknown>;
      const stats = (data.stats || {}) as Record<string, unknown>;
      const usage = (data.usage || {}) as Record<string, unknown>;
      const aiUsage = (data.aiUsage as AIUsageAggregate | undefined) || undefined;

      // Apply the founder/gift override so whitelisted Max users are surfaced
      // with their EFFECTIVE plan/status, matching the runtime priority used
      // by SubscriptionContext. Without this, the admin user list shows them
      // as "free / inactive" while they actually have full Max access.
      const email = typeof data.email === "string" ? (data.email as string) : "";
      const rawPlan =
        typeof subscription.plan === "string"
          ? (subscription.plan as string)
          : null;
      const overridePlan = getFounderOverridePlan(email);
      const effectivePlan = overridePlan || rawPlan;
      const rawStatus =
        typeof subscription.status === "string"
          ? (subscription.status as string)
          : null;
      const effectiveStatus = overridePlan ? "active" : rawStatus;

      return {
        id: doc.id,
        email,
        displayName:
          typeof data.displayName === "string"
            ? data.displayName
            : typeof data.name === "string"
              ? (data.name as string)
              : "",
        photoURL:
          typeof data.photoURL === "string" ? (data.photoURL as string) : null,
        plan: effectivePlan,
        status: effectiveStatus,
        trialEndsAt: tsToMillis(subscription.trialEndsAt),
        freeTrialEndsAt: tsToMillis(subscription.freeTrialEndsAt),
        firstPaymentDate: tsToMillis(subscription.firstPaymentDate),
        refundRequested: subscription.refundRequested === true,
        postsCount:
          postCounts.get(doc.id) ??
          (typeof stats.postsCount === "number"
            ? (stats.postsCount as number)
            : 0),
        sessionsCount:
          sessionCounts.get(doc.id) ??
          (typeof stats.sessionsCount === "number"
            ? (stats.sessionsCount as number)
            : 0),
        conversationsThisMonth:
          typeof usage.conversationsThisMonth === "number"
            ? (usage.conversationsThisMonth as number)
            : 0,
        conversationsThisWeek:
          typeof usage.conversationsThisWeek === "number"
            ? (usage.conversationsThisWeek as number)
            : 0,
        lastConversationDate: tsToMillis(usage.lastConversationDate),
        lastActive: tsToMillis(stats.lastActive),
        onboardingComplete: data.onboardingComplete === true,
        createdAt: tsToMillis(data.createdAt),
        language:
          typeof data.language === "string" ? (data.language as string) : null,
        ...(() => {
          const r = computeRentability(effectivePlan, aiUsage);
          return {
            aiTotalCostUSD: r.totalCostUSD,
            aiTotalCalls: r.totalCalls,
            aiTotalTokens: r.totalTokens,
            aiAvgCostPerCallUSD: r.avgCostPerCallUSD,
            monthlyRevenueUSD: r.monthlyRevenueUSD,
            marginPctOneMonth: r.marginPctOneMonth,
            rentabilityStatus: r.status,
            aiLastCallAt: tsToMillis(aiUsage?.lastCallAt),
          };
        })(),
      };
    });

    return NextResponse.json(
      { users: rows, count: rows.length },
      {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      }
    );
  } catch (error) {
    console.error("[admin/users] query failed", error);
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
}
