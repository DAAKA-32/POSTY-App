import { NextRequest, NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { requireAdmin } from "@/lib/admin";
import { adminDb } from "@/lib/db/firebase-admin";
import { getFounderOverridePlan } from "@/lib/config/plans";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type AdminStats = {
  totalUsers: number;
  byPlan: { free: number; pro: number; max: number; unset: number };
  activeSubscriptions: number;
  trialingNow: number;
  refundsRequested: number;
  newUsersLast7Days: number;
  newUsersLast30Days: number;
  totalPostsTracked: number;
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

  try {
    const [snap, postsCountAgg] = await Promise.all([
      adminDb.collection("users").get(),
      adminDb.collection("posts").count().get(),
    ]);

    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    const stats: AdminStats = {
      totalUsers: snap.size,
      byPlan: { free: 0, pro: 0, max: 0, unset: 0 },
      activeSubscriptions: 0,
      trialingNow: 0,
      refundsRequested: 0,
      newUsersLast7Days: 0,
      newUsersLast30Days: 0,
      totalPostsTracked: 0,
    };

    for (const doc of snap.docs) {
      const data = doc.data() as Record<string, unknown>;
      const subscription = (data.subscription || {}) as Record<string, unknown>;

      // Resolve the raw Stripe plan from Firestore, then apply the founder/gift
      // override so whitelisted Max users are counted as Max (not Free/unset).
      // Mirrors the runtime priority used by SubscriptionContext.
      const rawPlan =
        typeof subscription.plan === "string"
          ? (subscription.plan as string).toLowerCase()
          : null;
      const email = typeof data.email === "string" ? (data.email as string) : null;
      const overridePlan = getFounderOverridePlan(email);
      const plan = overridePlan || rawPlan;

      if (plan === "pro") stats.byPlan.pro += 1;
      else if (plan === "max") stats.byPlan.max += 1;
      else if (plan === "free") stats.byPlan.free += 1;
      else stats.byPlan.unset += 1;

      // Gifted users are always treated as active for the activeSubscriptions
      // count, even if their Firestore status is still a stale "inactive".
      const effectiveStatus = overridePlan ? "active" : subscription.status;
      if (effectiveStatus === "active") stats.activeSubscriptions += 1;
      if (subscription.status === "trialing") stats.trialingNow += 1;
      if (subscription.refundRequested === true) stats.refundsRequested += 1;

      const created = tsToMillis(data.createdAt);
      if (created !== null) {
        if (created >= sevenDaysAgo) stats.newUsersLast7Days += 1;
        if (created >= thirtyDaysAgo) stats.newUsersLast30Days += 1;
      }

    }

    stats.totalPostsTracked = postsCountAgg.data().count;

    return NextResponse.json(stats, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("[admin/stats] query failed", error);
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
}
