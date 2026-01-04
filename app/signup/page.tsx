"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import ConnectionLoader from "@/components/shared/ConnectionLoader";

// Redirect to main page which now handles authentication
export default function SignupPage() {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        // Authenticated: redirect to app or onboarding
        if (!userProfile?.onboardingComplete) {
          router.replace("/onboarding");
        } else {
          router.replace("/app");
        }
      } else {
        // Not authenticated: redirect to main page with auth panel
        router.replace("/");
      }
    }
  }, [user, userProfile, loading, router]);

  return <ConnectionLoader message="Redirection..." />;
}
