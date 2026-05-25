"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { updateUserProfile } from "@/lib/db/firestore";

const LOCAL_STORAGE_KEY = "posty_app_tour_seen";

function readLocalSeen(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(LOCAL_STORAGE_KEY) === "true";
}

function writeLocalSeen(seen: boolean): void {
  if (typeof window === "undefined") return;
  if (seen) window.localStorage.setItem(LOCAL_STORAGE_KEY, "true");
  else window.localStorage.removeItem(LOCAL_STORAGE_KEY);
}

export function useAppTour() {
  const { user, userProfile, refreshUserProfile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  // Decide whether the tour should appear automatically.
  // Conditions: user signed in, profile loaded, onboarding form completed,
  // AND tour not yet seen (Firestore flag is the source of truth, fall back
  // to localStorage to avoid a flash on first paint).
  useEffect(() => {
    if (!user || !userProfile) return;
    if (!userProfile.onboardingComplete) return;

    const firestoreSeen = userProfile.hasSeenAppTour === true;
    const localSeen = readLocalSeen();

    if (!firestoreSeen && !localSeen) {
      setIsOpen(true);
    }
  }, [user, userProfile]);

  const markAsSeen = useCallback(async () => {
    writeLocalSeen(true);
    setIsOpen(false);
    if (!user) return;
    try {
      await updateUserProfile(user.uid, { hasSeenAppTour: true });
      await refreshUserProfile();
    } catch (error) {
      console.warn("Failed to persist app tour state:", error);
    }
  }, [user, refreshUserProfile]);

  const replay = useCallback(() => {
    writeLocalSeen(false);
    setIsOpen(true);
  }, []);

  return {
    isOpen,
    markAsSeen,
    replay,
  };
}
