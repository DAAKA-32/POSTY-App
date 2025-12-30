"use client";

// Re-export useAuth from AuthContext for convenience
export { useAuth } from "@/contexts/AuthContext";

// Hook to check if user has completed onboarding
import { useAuth } from "@/contexts/AuthContext";

export function useOnboardingStatus() {
  const { userProfile, loading } = useAuth();

  return {
    isComplete: userProfile?.onboardingComplete ?? false,
    isLoading: loading,
    profile: userProfile?.profile,
  };
}

// Hook to check authentication status
export function useAuthStatus() {
  const { user, loading } = useAuth();

  return {
    isAuthenticated: !!user,
    isLoading: loading,
    userId: user?.uid,
    email: user?.email,
  };
}
