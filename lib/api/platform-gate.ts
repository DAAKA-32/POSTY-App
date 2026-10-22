import { NextResponse } from "next/server";
import { checkUserQuotaAdmin } from "@/lib/db/firestore-admin";
import { isAdminInitialized } from "@/lib/db/firebase-admin";
import { getMinimumPlanForPlatform, isPlatformAllowed, type Platform, type PlanType } from "@/lib/config/plans";

const PLATFORM_NAME: Partial<Record<Platform, string>> = {
  bluesky: "Bluesky",
  mastodon: "Mastodon",
  discord: "Discord",
};

/**
 * Server-side plan gate for a platform (same contract as the LinkedIn publish
 * route): resolves the user's effective plan (founder / gift overrides
 * included) and refuses platforms the plan does not include. Returns the
 * response to send back when access is refused, or null when allowed.
 *
 * The UI already locks these cards, but a locked card is not a gate: without
 * this check a Free user could call the route directly.
 */
export async function requirePlatformPlan(
  auth: { uid: string; email?: string | null },
  platform: Platform
): Promise<NextResponse | null> {
  // Local dev without auth: no real user, no plan to resolve.
  if (auth.uid === "__dev_bypass__") return null;

  let plan: PlanType | null = null;
  try {
    if (isAdminInitialized()) {
      const quota = await checkUserQuotaAdmin(auth.uid, auth.email ?? undefined);
      plan = (quota.plan as PlanType | null) ?? null;
    }
  } catch (error) {
    console.error(`[platform-gate] plan check failed (${platform}):`, error);
    return NextResponse.json(
      {
        success: false,
        error: "service_unavailable",
        message: "Service temporairement indisponible. Veuillez réessayer.",
      },
      { status: 503 }
    );
  }

  if (!plan) {
    return NextResponse.json(
      {
        success: false,
        error: "no_active_plan",
        message: "Vous devez souscrire à un abonnement pour utiliser cette fonctionnalité.",
      },
      { status: 403 }
    );
  }

  if (!isPlatformAllowed(plan, platform)) {
    const requiredPlan = getMinimumPlanForPlatform(platform);
    return NextResponse.json(
      {
        success: false,
        error: "platform_not_allowed",
        message: `${PLATFORM_NAME[platform] ?? platform} n'est pas disponible avec votre plan actuel.`,
        requiredPlan,
      },
      { status: 403 }
    );
  }

  return null;
}
