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
  getScheduledPosts,
  cancelScheduledPost as cancelScheduledPostFirestore,
  reschedulePost as reschedulePostFirestore,
  deleteScheduledPost,
  getPendingScheduledPostsCount,
  getUpcomingScheduledPosts,
} from "@/lib/firestore";
import toast from "@/components/ui/Toast";

const SchedulingContext = createContext<SchedulingContextType | undefined>(
  undefined
);

export function SchedulingProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { canSchedulePosts, currentPlan, isTestMode } = useSubscription();
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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
      toast.error("Erreur lors du chargement des posts programmes");
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
        return { success: false, error: "Vous devez etre connecte" };
      }

      // Validate subscription — use canSchedulePosts() which handles plan resolution correctly
      const schedulePermission = canSchedulePosts();
      if (!schedulePermission.allowed) {
        console.log("[SchedulingContext] Access denied - currentPlan:", currentPlan, "reason:", schedulePermission.reason);
        toast.error(schedulePermission.reason || "Votre abonnement n'est pas actif. Merci de verifier votre paiement.");
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
          error: "La date de publication doit etre dans le futur",
        };
      }

      try {
        const scheduledPostId = await createScheduledPost(user.uid, data);

        // Refresh the list
        await loadScheduledPosts();

        toast.success("Post programme avec succes !");

        return { success: true, scheduledPostId };
      } catch (error) {
        console.error("Error scheduling post:", error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Erreur lors de la programmation";
        toast.error(errorMessage);
        return { success: false, error: errorMessage };
      }
    },
    [user, loadScheduledPosts, currentPlan, isTestMode]
  );

  // Cancel a scheduled post
  const cancelSchedule = useCallback(
    async (
      scheduledPostId: string
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        await cancelScheduledPostFirestore(scheduledPostId);

        // Optimistic update
        setScheduledPosts((prev) =>
          prev.map((post) =>
            post.id === scheduledPostId
              ? { ...post, status: "cancelled" as ScheduleStatus }
              : post
          )
        );
        setPendingCount((prev) => Math.max(0, prev - 1));

        toast.success("Programmation annulee");
        return { success: true };
      } catch (error) {
        console.error("Error cancelling scheduled post:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Erreur lors de l'annulation";
        toast.error(errorMessage);
        return { success: false, error: errorMessage };
      }
    },
    []
  );

  // Reschedule a post
  const reschedulePost = useCallback(
    async (
      scheduledPostId: string,
      newDate: Date
    ): Promise<{ success: boolean; error?: string }> => {
      // Validate date is in the future
      const now = new Date();
      if (newDate <= now) {
        toast.error("La date doit etre dans le futur");
        return {
          success: false,
          error: "La date doit etre dans le futur",
        };
      }

      try {
        await reschedulePostFirestore(scheduledPostId, newDate);

        // Refresh the list
        await loadScheduledPosts();

        toast.success("Post reprogramme avec succes !");
        return { success: true };
      } catch (error) {
        console.error("Error rescheduling post:", error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Erreur lors de la reprogrammation";
        toast.error(errorMessage);
        return { success: false, error: errorMessage };
      }
    },
    [loadScheduledPosts]
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
      schedulePost,
      cancelSchedule,
      reschedulePost,
      refreshScheduledPosts,
      getPendingPosts,
      getPublishedPosts,
      getPostsForDate,
    }),
    [
      scheduledPosts,
      isLoading,
      schedulePost,
      cancelSchedule,
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
