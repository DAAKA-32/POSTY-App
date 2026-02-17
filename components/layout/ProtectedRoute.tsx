"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import SubscriptionGuard from "./SubscriptionGuard";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireOnboarding?: boolean;
  requireSubscription?: boolean;
}

export default function ProtectedRoute({
  children,
  requireOnboarding = false,
  requireSubscription = false,
}: ProtectedRouteProps) {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      // Redirect to login if not authenticated
      if (!user) {
        router.push("/login");
        return;
      }

      // Redirect to onboarding if not completed
      if (requireOnboarding && userProfile && !userProfile.onboardingComplete) {
        router.push("/onboarding");
        return;
      }
    }
  }, [user, userProfile, loading, router, requireOnboarding]);

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFBFC] dark:bg-dark-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 dark:text-gray-400">Chargement...</p>
        </div>
      </div>
    );
  }

  // Don't render children if not authenticated
  if (!user) {
    return null;
  }

  // Don't render if onboarding required but not completed
  if (requireOnboarding && userProfile && !userProfile.onboardingComplete) {
    return null;
  }

  // If subscription is required, wrap children with SubscriptionGuard
  if (requireSubscription) {
    return <SubscriptionGuard>{children}</SubscriptionGuard>;
  }

  return <>{children}</>;
}

// Higher-order component version
export function withProtectedRoute<P extends object>(
  Component: React.ComponentType<P>,
  options?: { requireOnboarding?: boolean }
) {
  return function ProtectedComponent(props: P) {
    return (
      <ProtectedRoute requireOnboarding={options?.requireOnboarding}>
        <Component {...props} />
      </ProtectedRoute>
    );
  };
}
