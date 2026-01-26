"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

// Redirect to main page which now handles authentication
export default function SignupPage() {
  const { user, isNewUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        // Authenticated: redirect based on isNewUser flag
        if (isNewUser) {
          // Just signed up - go to onboarding
          router.replace("/onboarding");
        } else {
          // Existing user (somehow landed on signup page) - go to app
          router.replace("/app");
        }
      } else {
        // Not authenticated: redirect to main page with auth panel
        router.replace("/");
      }
    }
  }, [user, isNewUser, loading, router]);

  // CRITICAL: Return nothing during auth check - invisible, no flash
  // This page is purely a redirect handler, it should never be visible
  return null;
}
