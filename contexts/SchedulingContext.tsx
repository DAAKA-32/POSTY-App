"use client";

import { toDate } from "@/lib/utils/timestamp";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
  useMemo,
} from "react";
import { useAuth } from "./AuthContext";
import { useSubscription } from "./SubscriptionContext";
import {
  ScheduledPost,
  CreateScheduledPostData,
  SchedulablePlatform,
  SchedulingContextType,
  ScheduleStatus,
} from "@/types";
import {
  createScheduledPost,
  generateScheduledPostId,
  getScheduledPosts,
  cancelScheduledPost as cancelScheduledPostFirestore,
  reschedulePost as reschedulePostFirestore,
  deleteScheduledPost,
  getPendingScheduledPostsCount,
  getUpcomingScheduledPosts,
} from "@/lib/db/firestore";
import { deleteScheduledPostImages } from "@/lib/storage/storage";
import { getAuthHeaders } from "@/lib/api/client";
import { readWithAuthRetry } from "@/lib/db/with-auth-retry";
import { isSchedulablePlatform } from "@/lib/scheduling/platforms";
import {
  canCancelScheduledPost,
  canDeleteScheduledPost,
  canRescheduleScheduledPost,
  isUpcomingStatus,
} from "@/lib/scheduling/publish-status";
import toast from "@/components/ui/Toast";
import { useLanguage } from "@/contexts/LanguageContext";

/** While a post is due / publishing / retrying, poll so its status updates live. */
const ACTIVE_REFRESH_MS = 20_000;
/** A pending post counts as "active" this long before its scheduled time… */
const ACTIVE_LOOKAHEAD_MS = 2 * 60_000;
/** …and until this long after it (then it is overdue, not in flight). */
const ACTIVE_OVERDUE_MS = 30 * 60_000;

const SchedulingContext = createContext<SchedulingContextType | undefined>(
  undefined
);

export function SchedulingProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { canSchedulePosts, currentPlan, isTestMode } = useSubscription();
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  // Load scheduled posts from Firestore.
  // `permission-denied` on first paint is almost always a stale auth token:
  // React already has `user`, but the Firestore SDK hasn't been re-attached
  // to the refreshed ID token yet (also the case right after a password reset,
  // which revokes prior tokens). readWithAuthRetry force-refreshes the token
  // and retries once before we'd surface the alarming toast — silent recovery
  // beats a false alert. See lib/db/with-auth-retry.ts.
  const loadScheduledPosts = useCallback(async () => {
    if (!user) {
      setScheduledPosts([]);
      setPendingCount(0);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const posts = await readWithAuthRetry(() => getScheduledPosts(user.uid));
      setScheduledPosts(posts);
      // Derive the upcoming count from the already-fetched list instead of
      // firing a second Firestore query on the same collection (getScheduledPosts
      // already returns every status). Publishing / retrying posts are not done yet.
      setPendingCount(posts.filter((p) => isUpcomingStatus(p.status)).length);
    } catch (error) {
      console.error("Error loading scheduled posts:", error);
      toast.error(t.toasts.scheduleLoadError);
    } finally {
      setIsLoading(false);
    }
  }, [user, t]);

  // Load posts on mount and when user changes
  useEffect(() => {
    loadScheduledPosts();
  }, [loadScheduledPosts]);

  // Live status: while a post is about to fire, publishing or waiting for a
  // retry, silently re-read the list so the card moves pending → processing →
  // published/failed without a manual refresh. Idle otherwise (no polling).
  const [activityClock, setActivityClock] = useState(() => Date.now());

  // Wake up when the next pending post enters the look-ahead window.
  useEffect(() => {
    const nowMs = Date.now();
    const nextDueMs = scheduledPosts
      .filter((p) => p.status === "pending")
      .map((p) => toDate(p.scheduledAt).getTime())
      .filter((ms) => ms - ACTIVE_LOOKAHEAD_MS > nowMs)
      .reduce((min, ms) => Math.min(min, ms), Infinity);
    if (!Number.isFinite(nextDueMs)) return;
    // setTimeout overflows past ~24.8 days — clamp.
    const delay = Math.min(nextDueMs - ACTIVE_LOOKAHEAD_MS - nowMs, 2_147_000_000);
    const timer = setTimeout(() => setActivityClock(Date.now()), delay);
    return () => clearTimeout(timer);
  }, [scheduledPosts, activityClock]);

  const hasActivePosts = useMemo(() => {
    const horizon = activityClock + ACTIVE_LOOKAHEAD_MS;
    // A pending post long overdue (scheduler outage) must not keep every open
    // tab polling forever — only the ones that just became due count.
    const floor = activityClock - ACTIVE_OVERDUE_MS;
    return scheduledPosts.some((p) => {
      if (p.status === "processing" || p.status === "retrying") return true;
      if (p.status !== "pending") return false;
      const dueMs = toDate(p.scheduledAt).getTime();
      return dueMs <= horizon && dueMs >= floor;
    });
  }, [scheduledPosts, activityClock]);

  useEffect(() => {
    if (!user || !hasActivePosts) return;
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      readWithAuthRetry(() => getScheduledPosts(user.uid))
        .then((posts) => {
          setScheduledPosts(posts);
          setPendingCount(posts.filter((p) => isUpcomingStatus(p.status)).length);
        })
        .catch((err) => console.warn("[SchedulingContext] Live refresh failed:", err));
    }, ACTIVE_REFRESH_MS);
    return () => clearInterval(interval);
  }, [user, hasActivePosts]);

  // Schedule a new post
  const schedulePost = useCallback(
    async (
      data: CreateScheduledPostData
    ): Promise<{
      success: boolean;
      scheduledPostId?: string;
      error?: string;
    }> => {
      if (!user) {
        return { success: false, error: "Vous devez être connecté" };
      }

      // Validate subscription — use canSchedulePosts() which handles plan resolution correctly
      const schedulePermission = canSchedulePosts();
      if (!schedulePermission.allowed) {
        console.log("[SchedulingContext] Access denied - currentPlan:", currentPlan, "reason:", schedulePermission.reason);
        toast.error(schedulePermission.reason || "Votre abonnement n'est pas actif. Merci de vérifier votre paiement.");
        return {
          success: false,
          error: schedulePermission.reason || "Abonnement inactif",
        };
      }

      // Validate date is in the future
      const now = new Date();
      if (data.scheduledAt <= now) {
        return {
          success: false,
          error: "La date de publication doit être dans le futur",
        };
      }

      // Only platforms the scheduler can actually publish to.
      if (!isSchedulablePlatform(data.platform)) {
        return {
          success: false,
          error: `La programmation n'est pas disponible pour ${data.platform}.`,
        };
      }

      try {
        const hasImages = data.imageFiles && data.imageFiles.length > 0;
        let scheduledPostId: string;

        if (hasImages) {
          // Pre-generate ID so images are stored under it
          scheduledPostId = generateScheduledPostId();
          setIsUploading(true);

          try {
            // Upload images via server-side API route (bypasses CORS)
            const formData = new FormData();
            formData.append("scheduledPostId", scheduledPostId);
            formData.append("userId", user.uid);
            for (const file of data.imageFiles!) {
              formData.append("images", file);
            }

            const authHeaders = await getAuthHeaders();
            const uploadResponse = await fetch("/api/schedule/upload-images", {
              method: "POST",
              headers: authHeaders,
              body: formData,
            });

            if (!uploadResponse.ok) {
              const errorData = await uploadResponse.json().catch(() => ({}));
              throw new Error(errorData.message || `Upload failed (${uploadResponse.status})`);
            }

            const { images: uploadedImages } = await uploadResponse.json();

            // Create Firestore doc with image metadata
            await createScheduledPost(user.uid, data, uploadedImages, scheduledPostId);
          } catch (uploadError) {
            // Clean up any partially uploaded images
            try {
              await deleteScheduledPostImages(user.uid, scheduledPostId);
            } catch { /* ignore cleanup errors */ }
            throw uploadError;
          } finally {
            setIsUploading(false);
          }
        } else {
          // Text-only post (existing flow)
          scheduledPostId = await createScheduledPost(user.uid, data);
        }

        // Refresh the list in background — don't block the success response
        // This prevents mobile/PWA hangs when Firestore re-fetch is slow
        loadScheduledPosts().catch((err) =>
          console.warn("[SchedulingContext] Background refresh failed:", err)
        );

        return { success: true, scheduledPostId };
      } catch (error) {
        console.error("Error scheduling post:", error);
        setIsUploading(false);
        const errorMessage = "La programmation n'a pas abouti. Verifiez votre connexion et reessayez.";
        toast.error(errorMessage);
        return { success: false, error: errorMessage };
      }
    },
    [user, loadScheduledPosts, currentPlan, isTestMode]
  );

  // Schedule the same content on several platforms — one scheduled post per
  // platform (the scheduler publishes each independently). Images, audience,
  // Company Page and seed comment are LinkedIn features: the Facebook /
  // Threads scheduled publishers are text-only, so they are not attached there.
  const schedulePostOnPlatforms = useCallback(
    async (
      data: Omit<CreateScheduledPostData, "platform">,
      platforms: SchedulablePlatform[]
    ) => {
      const results: Array<{ platform: SchedulablePlatform; success: boolean; scheduledPostId?: string; error?: string }> = [];
      for (const platform of platforms) {
        const isLinkedIn = platform === "linkedin";
        const result = await schedulePost({
          ...data,
          platform,
          visibility: isLinkedIn ? data.visibility : undefined,
          organizationUrn: isLinkedIn ? data.organizationUrn : undefined,
          imageFiles: isLinkedIn ? data.imageFiles : undefined,
          seedComment: isLinkedIn ? data.seedComment : undefined,
        });
        results.push({ platform, ...result });
      }
      return results;
    },
    [schedulePost]
  );

  // Cancel a scheduled post (pending / retrying / failed → cancelled)
  const cancelSchedule = useCallback(
    async (
      scheduledPostId: string
    ): Promise<{ success: boolean; error?: string }> => {
      // Status validation mirrors firestore.rules: a post being published or
      // already published can no longer be cancelled.
      const post = scheduledPosts.find((p) => p.id === scheduledPostId);
      if (post && !canCancelScheduledPost(post.status)) {
        const msg = "Ce post ne peut plus etre annule car il a deja ete traite.";
        toast.error(msg);
        return { success: false, error: msg };
      }

      try {
        await cancelScheduledPostFirestore(scheduledPostId);

        // Optimistic update
        setScheduledPosts((prev) =>
          prev.map((p) =>
            p.id === scheduledPostId
              ? { ...p, status: "cancelled" as ScheduleStatus, nextAttemptAt: null }
              : p
          )
        );
        if (post && isUpcomingStatus(post.status)) {
          setPendingCount((prev) => Math.max(0, prev - 1));
        }

        toast.success(t.scheduler.scheduleCancelled);
        return { success: true };
      } catch (error) {
        console.error("Error cancelling scheduled post:", error);
        const errorMessage = "L'annulation n'a pas fonctionne. Reessayez.";
        toast.error(errorMessage);
        return { success: false, error: errorMessage };
      }
    },
    [scheduledPosts]
  );

  // Delete a scheduled post permanently (never while publishing / published)
  const deleteSchedule = useCallback(
    async (
      scheduledPostId: string
    ): Promise<{ success: boolean; error?: string }> => {
      const post = scheduledPosts.find((p) => p.id === scheduledPostId);
      if (post && !canDeleteScheduledPost(post.status)) {
        const msg =
          post.status === "processing"
            ? "Ce post est en cours de publication et ne peut pas etre supprime."
            : "Ce post a deja ete publie et ne peut pas etre supprime.";
        toast.error(msg);
        return { success: false, error: msg };
      }

      try {
        await deleteScheduledPost(scheduledPostId);

        // Optimistic update: remove from list
        setScheduledPosts((prev) => prev.filter((p) => p.id !== scheduledPostId));
        if (post && isUpcomingStatus(post.status)) {
          setPendingCount((prev) => Math.max(0, prev - 1));
        }

        toast.success(t.scheduler.postDeleted);
        return { success: true };
      } catch (error) {
        console.error("Error deleting scheduled post:", error);
        const errorMessage = "La suppression n'a pas fonctionne. Reessayez.";
        toast.error(errorMessage);
        return { success: false, error: errorMessage };
      }
    },
    [scheduledPosts]
  );

  // Reschedule a post (pending or failed → pending with new date)
  const reschedulePost = useCallback(
    async (
      scheduledPostId: string,
      newDate: Date
    ): Promise<{ success: boolean; error?: string }> => {
      // Status validation mirrors firestore.rules (never while publishing / published)
      const post = scheduledPosts.find((p) => p.id === scheduledPostId);
      if (post && !canRescheduleScheduledPost(post.status)) {
        const msg =
          post.status === "processing"
            ? "Ce post est en cours de publication et ne peut pas etre reprogramme."
            : "Ce post a deja ete publie et ne peut pas etre reprogramme.";
        toast.error(msg);
        return { success: false, error: msg };
      }

      // Validate date is in the future
      const now = new Date();
      if (newDate <= now) {
        toast.error(t.scheduler.chooseFutureDate);
        return {
          success: false,
          error: "La date doit être dans le futur",
        };
      }

      try {
        await reschedulePostFirestore(scheduledPostId, newDate);

        // Refresh the list
        await loadScheduledPosts();

        toast.success(t.scheduler.postRescheduled);
        return { success: true };
      } catch (error) {
        console.error("Error rescheduling post:", error);
        const errorMessage = "La reprogrammation n'a pas abouti. Reessayez.";
        toast.error(errorMessage);
        return { success: false, error: errorMessage };
      }
    },
    [loadScheduledPosts, scheduledPosts]
  );

  // Refresh scheduled posts
  const refreshScheduledPosts = useCallback(async () => {
    await loadScheduledPosts();
  }, [loadScheduledPosts]);

  // Helper: Get upcoming posts (waiting, publishing or retrying)
  const getPendingPosts = useCallback(() => {
    return scheduledPosts.filter((post) => isUpcomingStatus(post.status));
  }, [scheduledPosts]);

  // Helper: Get published posts
  const getPublishedPosts = useCallback(() => {
    return scheduledPosts.filter((post) => post.status === "published");
  }, [scheduledPosts]);

  // Helper: Get posts for a specific date
  const getPostsForDate = useCallback(
    (date: Date) => {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      return scheduledPosts.filter((post) => {
        const scheduledDate = toDate(post.scheduledAt);
        return scheduledDate >= startOfDay && scheduledDate <= endOfDay;
      });
    },
    [scheduledPosts]
  );

  const value: SchedulingContextType = useMemo(
    () => ({
      scheduledPosts,
      isLoading,
      isUploading,
      pendingCount,
      schedulePost,
      schedulePostOnPlatforms,
      cancelSchedule,
      deleteSchedule,
      reschedulePost,
      refreshScheduledPosts,
      getPendingPosts,
      getPublishedPosts,
      getPostsForDate,
    }),
    [
      scheduledPosts,
      isLoading,
      isUploading,
      pendingCount,
      schedulePost,
      schedulePostOnPlatforms,
      cancelSchedule,
      deleteSchedule,
      reschedulePost,
      refreshScheduledPosts,
      getPendingPosts,
      getPublishedPosts,
      getPostsForDate,
    ]
  );

  return (
    <SchedulingContext.Provider value={value}>
      {children}
    </SchedulingContext.Provider>
  );
}

export function useScheduling() {
  const context = useContext(SchedulingContext);
  if (context === undefined) {
    throw new Error("useScheduling must be used within a SchedulingProvider");
  }
  return context;
}

// Export pending count hook for badge display
export function useSchedulingPendingCount() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user) {
      setCount(0);
      return;
    }

    const loadCount = async () => {
      try {
        // Badge = posts still waiting for their slot (processing / retrying
        // are transient and already surfaced on the schedule page).
        const pendingCount = await getPendingScheduledPostsCount(user.uid);
        setCount(pendingCount);
      } catch (error) {
        console.error("Error loading pending count:", error);
      }
    };

    loadCount();
  }, [user]);

  return count;
}
