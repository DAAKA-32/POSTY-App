"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { PlanType, meetsMinimumPlan } from "@/lib/config/plans";

interface SubscriptionGuardProps {
  children: React.ReactNode;
  /**
   * Whether to show a loading state while checking subscription
   * @default true
   */
  showLoading?: boolean;
  /**
   * Custom redirect path if subscription is not active
   * @default "/subscription"
   */
  redirectTo?: string;
  /**
   * Minimum plan level required to access this content.
   * If set, users with a lower plan will be redirected.
   * Uses plan hierarchy: free < pro < max
   */
  minimumPlan?: PlanType;
}

/**
 * SubscriptionGuard - Client-side subscription verification
 *
 * This component verifies that the user has an active subscription before
 * allowing access to protected content.
 *
 * Protection Rules:
 * 1. User must have subscription.status === "active" OR "trialing"
 * 2. Users without a plan (plan is null) are redirected to /subscription
 * 3. Inactive/canceled subscriptions are redirected to /subscription
 *
 * Usage:
 * ```tsx
 * <SubscriptionGuard>
 *   <YourProtectedContent />
 * </SubscriptionGuard>
 * ```
 */
export default function SubscriptionGuard({
  children,
  showLoading = true,
  redirectTo = "/subscription",
  minimumPlan,
}: SubscriptionGuardProps) {
  const { subscription, loading, freeTrialExpired } = useSubscription();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading) {
      const hasActiveSubscription =
        subscription.status === "active" || subscription.status === "trialing";

      // When the 30-day Free trial expires we deliberately KEEP the user on
      // /app so the paywall overlay (FreeTrialPaywall) can do the conversion
      // work in-context. No redirect — the overlay blocks all interactions.
      if (freeTrialExpired) return;

      // Check 1: Active subscription with a plan
      if (!hasActiveSubscription || !subscription.plan) {
        console.warn(
          `[SubscriptionGuard] Blocking access to ${pathname} - Status: ${subscription.status}, Plan: ${subscription.plan}`
        );

        const url = new URL(redirectTo, window.location.origin);
        url.searchParams.set("redirect", pathname);
        url.searchParams.set("reason", "subscription_required");
        router.replace(url.pathname + url.search);
        return;
      }

      // Check 2: Minimum plan level (if specified)
      if (minimumPlan && !meetsMinimumPlan(subscription.plan as PlanType, minimumPlan)) {
        console.warn(
          `[SubscriptionGuard] Plan too low for ${pathname} - Current: ${subscription.plan}, Required: ${minimumPlan}+`
        );

        const url = new URL(redirectTo, window.location.origin);
        url.searchParams.set("redirect", pathname);
        url.searchParams.set("reason", "plan_required");
        url.searchParams.set("required", minimumPlan);
        router.replace(url.pathname + url.search);
      }
    }
  }, [subscription.status, subscription.plan, freeTrialExpired, loading, router, pathname, redirectTo, minimumPlan]);

  // Show loading state while checking subscription
  if (loading) {
    if (!showLoading) return null;

    return (
      <div className="min-h-screen bg-[#FAFBFC] dark:bg-dark-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 dark:text-gray-400">Vérification de votre abonnement...</p>
        </div>
      </div>
    );
  }

  // Free trial expired → render the children so MainLayout's FreeTrialPaywall
  // overlays them. We rely on the paywall's pointer-events to block usage.
  if (freeTrialExpired) {
    return <>{children}</>;
  }

  // Check subscription status
  const hasActiveSubscription =
    subscription.status === "active" || subscription.status === "trialing";

  // Block access if subscription is not active or if user has no plan
  if (!hasActiveSubscription || !subscription.plan) {
    return null;
  }

  // Block access if plan level is insufficient
  if (minimumPlan && !meetsMinimumPlan(subscription.plan as PlanType, minimumPlan)) {
    return null;
  }

  // Render children if subscription is valid
  return <>{children}</>;
}

/**
 * Higher-order component version of SubscriptionGuard
 *
 * Usage:
 * ```tsx
 * export default withSubscriptionGuard(YourComponent);
 * ```
 */
export function withSubscriptionGuard<P extends object>(
  Component: React.ComponentType<P>,
  options?: Omit<SubscriptionGuardProps, "children">
) {
  return function SubscriptionProtectedComponent(props: P) {
    return (
      <SubscriptionGuard {...options}>
        <Component {...props} />
      </SubscriptionGuard>
    );
  };
}
