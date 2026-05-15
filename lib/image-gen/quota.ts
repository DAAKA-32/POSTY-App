/**
 * Per-day image generation quota — tracked independently of the post quota
 * so a visual request doesn't burn a post credit (and vice-versa).
 *
 * Storage: `users/{uid}.imageGenUsage = { count, dayStart }`. Day boundary
 * is computed in UTC to match the rest of Posty's quota math.
 */

import { adminDb } from "@/lib/db/firebase-admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import {
  PlanType,
  PLAN_CONFIGS,
  getFounderOverridePlan,
  resolveFreeTrialEnd,
  isFreeTrialExpired,
} from "@/lib/config/plans";

export interface ImageQuotaCheck {
  allowed: boolean;
  plan: PlanType | null;
  limit: number;
  used: number;
  remaining: number;
  reason?: string;
}

interface ImageUsage {
  count: number;
  dayStart: Timestamp;
}

/** Returns the UTC midnight that owns `now`. */
function utcDayStart(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function normalizePlan(raw: unknown): PlanType | null {
  if (typeof raw !== "string") return null;
  const lower = raw.toLowerCase().trim();
  if (lower === "starter") return "pro";
  if (lower === "free" || lower === "pro" || lower === "max") return lower as PlanType;
  return null;
}

/** Pure check — does NOT mutate. Use before calling the AI. */
export async function checkImageQuota(
  userId: string,
  authEmail?: string
): Promise<ImageQuotaCheck> {
  if (!adminDb) {
    throw new Error("Firebase Admin not initialized");
  }

  const userRef = adminDb.collection("users").doc(userId);
  const userSnap = await userRef.get();
  if (!userSnap.exists) {
    return {
      allowed: false,
      plan: null,
      limit: 0,
      used: 0,
      remaining: 0,
      reason: "Profil utilisateur introuvable.",
    };
  }

  const data = userSnap.data() || {};
  let plan: PlanType | null = normalizePlan(data.subscription?.plan);
  const founderPlan = getFounderOverridePlan(data.email || authEmail);
  if (founderPlan) plan = founderPlan;

  if (!plan) {
    return {
      allowed: false,
      plan: null,
      limit: 0,
      used: 0,
      remaining: 0,
      reason: "Aucun abonnement actif.",
    };
  }

  // Block during Free-trial expiry — same gate as post generation
  if (plan === "free") {
    const trialEnd = resolveFreeTrialEnd({
      subscription: data.subscription,
      createdAt: data.createdAt,
    });
    if (isFreeTrialExpired("free", trialEnd)) {
      return {
        allowed: false,
        plan: "free",
        limit: 0,
        used: 0,
        remaining: 0,
        reason: "Essai gratuit expiré.",
      };
    }
  }

  const limit = PLAN_CONFIGS[plan].limits.imagesPerDay;
  if (limit <= 0) {
    return {
      allowed: false,
      plan,
      limit: 0,
      used: 0,
      remaining: 0,
      reason: "La génération de visuels est réservée à Pro et Max.",
    };
  }

  // Read existing usage and reset if the day has rolled over.
  const usage = data.imageGenUsage as ImageUsage | undefined;
  const today = utcDayStart();
  let used = 0;
  if (usage?.dayStart) {
    const stored = usage.dayStart.toDate();
    const sameDay = utcDayStart(stored).getTime() === today.getTime();
    if (sameDay) used = usage.count || 0;
  }

  const remaining = Math.max(0, limit - used);
  return {
    allowed: used < limit,
    plan,
    limit,
    used,
    remaining,
    reason: used >= limit ? `Quota journalier atteint (${limit}/jour).` : undefined,
  };
}

/** Atomic increment-with-reset. Call AFTER a successful render. */
export async function incrementImageQuota(userId: string): Promise<void> {
  if (!adminDb) throw new Error("Firebase Admin not initialized");

  const userRef = adminDb.collection("users").doc(userId);
  const today = utcDayStart();
  const todayTs = Timestamp.fromDate(today);

  await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(userRef);
    const data = snap.data() || {};
    const usage = data.imageGenUsage as ImageUsage | undefined;
    const sameDay =
      usage?.dayStart &&
      utcDayStart(usage.dayStart.toDate()).getTime() === today.getTime();
    if (sameDay) {
      tx.update(userRef, {
        "imageGenUsage.count": FieldValue.increment(1),
        "imageGenUsage.lastGenAt": FieldValue.serverTimestamp(),
      });
    } else {
      tx.set(
        userRef,
        {
          imageGenUsage: {
            count: 1,
            dayStart: todayTs,
            lastGenAt: FieldValue.serverTimestamp(),
          },
        },
        { merge: true }
      );
    }
  });
}
