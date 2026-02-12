"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSubscription } from "@/contexts/SubscriptionContext";

interface SubscriptionGuardProps {
  children: React.ReactNode;
  /**
   * Whether to show a loading state while checking subscription
   * @default true
   */
  showLoading?: boolean;
  /**
   * Custom redirect path if subscription is not active
   * @default "/pricing"
   */
  redirectTo?: string;
}

/**
 * SubscriptionGuard - Client-side subscription verification
 *
 * This component verifies that the user has an active subscription before
 * allowing access to protected content.
 *
 * Protection Rules:
 * 1. User must have subscription.status === "active" OR "trialing"
 * 2. Free plan users are redirected to /pricing
 * 3. Inactive/canceled subscriptions are redirected to /pricing
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
  redirectTo = "/pricing",
}: SubscriptionGuardProps) {
  const { subscription, loading } = useSubscription();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading) {
      const hasActiveSubscription =
        subscription.status === "active" || subscription.status === "trialing";

      // Block free plan users from accessing paid features
      const isFreePlan = subscription.plan === "free";

      if (!hasActiveSubscription || isFreePlan) {
        console.warn(
          `[SubscriptionGuard] Blocking access to ${pathname} - Status: ${subscription.status}, Plan: ${subscription.plan}`
        );

        // Redirect to pricing with context
        const url = new URL(redirectTo, window.location.origin);
        url.searchParams.set("redirect", pathname);
        url.searchParams.set("reason", "subscription_required");

        router.push(url.pathname + url.search);
      }
    }
  }, [subscription.status, subscription.plan, loading, router, pathname, redirectTo]);

  // Show loading state while checking subscription
  if (loading) {
    if (!showLoading) return null;

    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400">Vérification de votre abonnement...</p>
        </div>
      </div>
    );
  }

  // Check subscription status
  const hasActiveSubscription =
    subscription.status === "active" || subscription.status === "trialing";
  const isFreePlan = subscription.plan === "free";

  // Block access if subscription is not active or if user is on free plan
  if (!hasActiveSubscription || isFreePlan) {
    // Don't render children - redirect will happen in useEffect
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
