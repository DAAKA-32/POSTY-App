"use client";

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
import { uploadScheduledPostImages, deleteScheduledPostImages } from "@/lib/storage/storage";
import toast from "@/components/ui/Toast";

const SchedulingContext = createContext<SchedulingContextType | undefined>(
  undefined
);

export function SchedulingProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { canSchedulePosts, currentPlan, isTestMode } = useSubscription();
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  // Load scheduled posts from Firestore
  const loadScheduledPosts = useCallback(async () => {
    if (!user) {
      setScheduledPosts([]);
      setPendingCount(0);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const posts = await getScheduledPosts(user.uid);
      setScheduledPosts(posts);

      // Get pending count for badge
      const count = await getPendingScheduledPostsCount(user.uid);
      setPendingCount(count);
    } catch (error) {
      console.error("Error loading scheduled posts:", error);
      toast.error("Impossible de charger vos posts programmes. Rafraichissez la page.");
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Load posts on mount and when user changes
  useEffect(() => {
    loadScheduledPosts();
  }, [loadScheduledPosts]);

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

      try {
        const hasImages = data.imageFiles && data.imageFiles.length > 0;
        let scheduledPostId: string;

        if (hasImages) {
          // Pre-generate ID so images are stored under it
          scheduledPostId = generateScheduledPostId();
          setIsUploading(true);

          try {
            // Upload images to Firebase Storage
            const uploadedImages = await uploadScheduledPostImages(
              scheduledPostId,
              user.uid,
              data.imageFiles!
            );

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

  // Cancel a scheduled post (pending → cancelled)
  const cancelSchedule = useCallback(
    async (
      scheduledPostId: string
    ): Promise<{ success: boolean; error?: string }> => {
      // Status validation: only pending posts can be cancelled
      const post = scheduledPosts.find((p) => p.id === scheduledPostId);
      if (post && post.status !== "pending") {
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
              ? { ...p, status: "cancelled" as ScheduleStatus }
              : p
          )
        );
        setPendingCount((prev) => Math.max(0, prev - 1));

        toast.success("Programmation annulée");
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

  // Delete a scheduled post permanently (failed or cancelled only)
  const deleteSchedule = useCallback(
    async (
      scheduledPostId: string
    ): Promise<{ success: boolean; error?: string }> => {
      // Status validation: only failed or cancelled posts can be deleted
      const post = scheduledPosts.find((p) => p.id === scheduledPostId);
      if (post && post.status === "published") {
        const msg = "Ce post a deja ete publie et ne peut pas etre supprime.";
        toast.error(msg);
        return { success: false, error: msg };
      }

      try {
        await deleteScheduledPost(scheduledPostId);

        // Optimistic update: remove from list
        setScheduledPosts((prev) => prev.filter((p) => p.id !== scheduledPostId));
        if (post?.status === "pending") {
          setPendingCount((prev) => Math.max(0, prev - 1));
        }

        toast.success("Post supprimé");
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
      // Status validation: published posts cannot be rescheduled
      const post = scheduledPosts.find((p) => p.id === scheduledPostId);
      if (post && post.status === "published") {
        const msg = "Ce post a deja ete publie et ne peut pas etre reprogramme.";
        toast.error(msg);
        return { success: false, error: msg };
      }

      // Validate date is in the future
      const now = new Date();
      if (newDate <= now) {
        toast.error("Choisissez une date future pour programmer votre post.");
        return {
          success: false,
          error: "La date doit être dans le futur",
        };
      }

      try {
        await reschedulePostFirestore(scheduledPostId, newDate);

        // Refresh the list
        await loadScheduledPosts();

        toast.success("Post reprogrammé avec succès !");
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

  // Helper: Get pending posts
  const getPendingPosts = useCallback(() => {
    return scheduledPosts.filter((post) => post.status === "pending");
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
        const scheduledDate =
          post.scheduledAt &&
          typeof (post.scheduledAt as { toDate?: () => Date }).toDate ===
            "function"
            ? (post.scheduledAt as { toDate: () => Date }).toDate()
            : new Date(post.scheduledAt as unknown as string);

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
