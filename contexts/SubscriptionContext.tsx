"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { useAuth } from "./AuthContext";
import {
  PlanType,
  PlanSource,
  getPlanConfig,
  getPlanLimits,
  PlanConfig,
  PlanLimits,
  isTestModeValid,
  TEST_MODE_DURATION_MS,
  getTrialDaysRemaining,
  checkTrialEligibility,
  checkGuaranteeEligibility,
  formatTrialStatusMessage,
  isTestModeAllowed,
} from "@/lib/plans";
import {
  UserSubscription,
  UserUsage,
  PermissionCheckResult,
  canSendMessage,
  canUsePromptLength,
  canSendToRelations,
  canUsePlatform,
  canSchedulePosts,
  canManageConversations,
  hasPersonalizedResponses,
  hasAudienceTargeting,
  hasPriorityProcessing,
  hasEarlyAccess,
  shouldResetWeeklyQuota,
  shouldResetMonthlyQuota,
  getWeekStartDate,
  getMonthStartDate,
  Platform,
} from "@/lib/permissions";
import { doc, getDoc, updateDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getAuthHeaders } from "@/lib/api-client";

// ============================================
// TYPES
// ============================================

interface SubscriptionState {
  // Current subscription info
  subscription: UserSubscription;
  usage: UserUsage;
  planConfig: PlanConfig;
  planLimits: PlanLimits;

  // Test mode
  isTestMode: boolean;
  testPlan: PlanType | null;

  // Trial state
  isTrialing: boolean;
  trialDaysRemaining: number;
  trialPlan: PlanType | null;
  trialEndsAt: Date | null;
  trialEligible: boolean;

  // Guarantee state
  guaranteeEligible: boolean;
  guaranteeDaysRemaining: number;
  refundRequested: boolean;

  // Migration: true if user is on deprecated free plan and hasn't used trial yet
  needsMigration: boolean;

  // Loading state
  loading: boolean;
  error: string | null;
}

interface SubscriptionContextValue extends SubscriptionState {
  // Plan info
  currentPlan: PlanType | null;
  isProPlan: boolean;
  isMaxPlan: boolean;

  // Permission checks
  canSendMessage: () => PermissionCheckResult;
  canUsePromptLength: (length: number) => PermissionCheckResult;
  canSendToRelations: (count: number) => PermissionCheckResult;
  canUsePlatform: (platform: Platform) => PermissionCheckResult;
  canSchedulePosts: () => PermissionCheckResult;
  canManageConversations: () => PermissionCheckResult;

  // Feature flags
  hasPersonalizedResponses: boolean;
  hasAudienceTargeting: boolean;
  hasPriorityProcessing: boolean;
  hasEarlyAccess: boolean;

  // Usage tracking
  incrementConversationCount: () => Promise<void>;
  refreshUsage: () => Promise<void>;

  // Test mode controls
  enableTestMode: (plan: PlanType) => Promise<void>;
  disableTestMode: () => Promise<void>;

  // Subscription actions
  refreshSubscription: () => Promise<void>;

  // Trial info
  trialStatusMessage: string | null;
  canStartTrial: boolean;

  // Guarantee info
  guaranteeEligible: boolean;
  guaranteeDaysRemaining: number;
  refundRequested: boolean;
  requestRefund: () => Promise<{ success: boolean; message?: string; error?: string }>;
}

// ============================================
// DEFAULT VALUES
// ============================================

const defaultSubscription: UserSubscription = {
  plan: null,
  planSource: "stripe",
  status: "inactive",
};

const defaultUsage: UserUsage = {
  messagesUsedToday: 0,
  conversationsThisWeek: 0,
  conversationsThisMonth: 0,
};

const defaultState: SubscriptionState = {
  subscription: defaultSubscription,
  usage: defaultUsage,
  planConfig: getPlanConfig("pro"),
  planLimits: getPlanLimits("pro"),
  isTestMode: false,
  testPlan: null,
  // Trial state
  isTrialing: false,
  trialDaysRemaining: 0,
  trialPlan: null,
  trialEndsAt: null,
  trialEligible: true, // Assume eligible until we check
  // Guarantee
  guaranteeEligible: false,
  guaranteeDaysRemaining: 0,
  refundRequested: false,
  // Migration
  needsMigration: false,
  loading: true,
  error: null,
};

// ============================================
// CONTEXT
// ============================================

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

// ============================================
// PROVIDER
// ============================================

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user, userProfile, loading: authLoading } = useAuth();
  const [state, setState] = useState<SubscriptionState>(defaultState);

  // ============================================
  // LOAD SUBSCRIPTION FROM FIRESTORE
  // ============================================

  const loadSubscription = useCallback(async () => {
    if (!user?.uid) {
      setState(defaultState);
      return;
    }

    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const userDoc = await getDoc(doc(db, "users", user.uid));
      const userData = userDoc.data();

      if (!userData) {
        setState({ ...defaultState, loading: false });
        return;
      }

      // Parse subscription data
      const subscriptionData = userData.subscription || {};
      const usageData = userData.usage || {};
      const quotaData = userData.quota || {};

      // Determine effective plan (test mode takes precedence if active and not expired)
      const testModeResult = isTestModeValid(userData.testMode);
      const isTestMode = testModeResult.isActive;
      const testPlan = testModeResult.plan;

      // Map old plan names to new ones (legacy migration)
      let stripePlan: PlanType | null = null;
      if (subscriptionData.plan === "starter") stripePlan = "pro";
      else if (subscriptionData.plan === "free") stripePlan = null;
      else if (subscriptionData.plan === "pro" || subscriptionData.plan === "max") {
        stripePlan = subscriptionData.plan as PlanType;
      }

      const effectivePlan = isTestMode && testPlan ? testPlan : stripePlan;

      // Build subscription object
      // When test mode is active, force status to "active" so SubscriptionGuard allows access
      const subscription: UserSubscription = {
        plan: effectivePlan,
        planSource: isTestMode ? "test" : "stripe",
        status: isTestMode && testPlan ? "active" : (subscriptionData.status || "inactive"),
        currentPeriodStart: subscriptionData.subscribedAt?.toDate(),
        currentPeriodEnd: subscriptionData.expiresAt?.toDate(),
      };

      // Parse usage data with quota reset logic
      const weekStartDate = usageData.weekStartDate?.toDate();
      const monthStartDate = usageData.monthStartDate?.toDate();

      let conversationsThisWeek = usageData.conversationsThisWeek || 0;
      let conversationsThisMonth = usageData.conversationsThisMonth || 0;

      // Reset weekly quota if needed
      if (shouldResetWeeklyQuota(weekStartDate)) {
        conversationsThisWeek = 0;
      }

      // Reset monthly quota if needed
      if (shouldResetMonthlyQuota(monthStartDate)) {
        conversationsThisMonth = 0;
      }

      // Daily quota: check if lastMessageDate is today (UTC)
      const lastMessageDate = quotaData.lastMessageDate?.toDate?.();
      let messagesUsedToday = 0;
      if (lastMessageDate) {
        const now = new Date();
        const isSameDay =
          lastMessageDate.getUTCFullYear() === now.getUTCFullYear() &&
          lastMessageDate.getUTCMonth() === now.getUTCMonth() &&
          lastMessageDate.getUTCDate() === now.getUTCDate();
        if (isSameDay) {
          messagesUsedToday = quotaData.dailyMessageCount || 0;
        }
      }

      const usage: UserUsage = {
        messagesUsedToday,
        lastMessageDate,
        conversationsThisWeek,
        conversationsThisMonth,
        lastConversationDate: usageData.lastConversationDate?.toDate(),
        weekStartDate,
        monthStartDate,
      };

      // Trial state
      const isTrialing = subscriptionData.status === "trialing";
      const trialEndsAt = subscriptionData.trialEndsAt?.toDate() || null;
      const trialDaysRemaining = getTrialDaysRemaining(trialEndsAt);
      const trialPlan = subscriptionData.trialPlan as PlanType || null;
      const trialEligibility = checkTrialEligibility(userData);

      // Guarantee state
      const firstPaymentDate = subscriptionData.firstPaymentDate?.toDate() || null;
      const guaranteeResult = checkGuaranteeEligibility(firstPaymentDate);
      const refundRequested = subscriptionData.refundRequested === true;

      setState({
        subscription,
        usage,
        planConfig: getPlanConfig(effectivePlan ?? "pro"),
        planLimits: getPlanLimits(effectivePlan ?? "pro"),
        isTestMode,
        testPlan,
        // Trial state
        isTrialing,
        trialDaysRemaining,
        trialPlan: isTrialing ? trialPlan : null,
        trialEndsAt,
        trialEligible: trialEligibility.eligible,
        // Guarantee state
        guaranteeEligible: guaranteeResult.eligible && !refundRequested,
        guaranteeDaysRemaining: guaranteeResult.daysRemaining,
        refundRequested,
        // Migration: user without a paid plan who hasn't used trial yet
        needsMigration: stripePlan === null && trialEligibility.eligible,
        loading: false,
        error: null,
      });

      // Set cookies for middleware to use for server-side protection
      // These cookies allow the middleware to check subscription status before rendering pages
      if (typeof document !== "undefined") {
        // Set subscription status cookie (expires in 1 hour - will refresh on next load)
        document.cookie = `subscription_status=${subscription.status}; path=/; max-age=3600; SameSite=Strict`;
        document.cookie = `subscription_plan=${subscription.plan}; path=/; max-age=3600; SameSite=Strict`;
      }
    } catch (error) {
      console.error("Error loading subscription:", error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: "Erreur lors du chargement de l'abonnement",
      }));
    }
  }, [user?.uid]);

  // Load on mount and when user changes — skip while auth is still resolving
  useEffect(() => {
    if (authLoading) return;
    loadSubscription();
  }, [loadSubscription, authLoading]);

  // ============================================
  // USAGE TRACKING
  // ============================================

  const incrementConversationCount = useCallback(async () => {
    if (!user?.uid) return;

    try {
      const now = new Date();
      const weekStart = state.usage.weekStartDate || getWeekStartDate();
      const monthStart = state.usage.monthStartDate || getMonthStartDate();

      // Calculate new counts
      let newWeeklyCount = state.usage.conversationsThisWeek;
      let newMonthlyCount = state.usage.conversationsThisMonth;
      let newWeekStart = weekStart;
      let newMonthStart = monthStart;

      // Check if we need to reset weekly
      if (shouldResetWeeklyQuota(weekStart)) {
        newWeeklyCount = 0;
        newWeekStart = getWeekStartDate();
      }

      // Check if we need to reset monthly
      if (shouldResetMonthlyQuota(monthStart)) {
        newMonthlyCount = 0;
        newMonthStart = getMonthStartDate();
      }

      // Increment counts
      newWeeklyCount += 1;
      newMonthlyCount += 1;

      // Update Firestore
      await updateDoc(doc(db, "users", user.uid), {
        "usage.conversationsThisWeek": newWeeklyCount,
        "usage.conversationsThisMonth": newMonthlyCount,
        "usage.lastConversationDate": Timestamp.fromDate(now),
        "usage.weekStartDate": Timestamp.fromDate(newWeekStart),
        "usage.monthStartDate": Timestamp.fromDate(newMonthStart),
      });

      // Update local state
      setState(prev => ({
        ...prev,
        usage: {
          ...prev.usage,
          conversationsThisWeek: newWeeklyCount,
          conversationsThisMonth: newMonthlyCount,
          lastConversationDate: now,
          weekStartDate: newWeekStart,
          monthStartDate: newMonthStart,
        },
      }));
    } catch (error) {
      console.error("Error incrementing conversation count:", error);
    }
  }, [user?.uid, state.usage]);

  const refreshUsage = useCallback(async () => {
    await loadSubscription();
  }, [loadSubscription]);

  // ============================================
  // TEST MODE CONTROLS
  // ============================================
  // PRODUCTION MODE: These functions are blocked in production
  // To re-enable: set NEXT_PUBLIC_ENABLE_TEST_MODE=true in .env.local

  const enableTestMode = useCallback(async (plan: PlanType) => {
    // Block unless user is a founder or test mode is globally enabled
    if (!isTestModeAllowed(user?.email)) {
      console.warn("[SubscriptionContext] Test mode is disabled for this user.");
      return;
    }

    if (!user?.uid) return;

    try {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + TEST_MODE_DURATION_MS);
      await updateDoc(doc(db, "users", user.uid), {
        "testMode.active": true,
        "testMode.plan": plan,
        "testMode.activatedAt": Timestamp.fromDate(now),
        "testMode.expiresAt": Timestamp.fromDate(expiresAt),
      });

      // Update local state immediately — must set status to "active" so
      // SubscriptionGuard allows access (it checks status === "active" || "trialing")
      setState(prev => ({
        ...prev,
        subscription: {
          ...prev.subscription,
          plan,
          planSource: "test",
          status: "active",
        },
        planConfig: getPlanConfig(plan),
        planLimits: getPlanLimits(plan),
        isTestMode: true,
        testPlan: plan,
      }));
    } catch (error) {
      console.error("Error enabling test mode:", error);
      throw error;
    }
  }, [user?.uid]);

  const disableTestMode = useCallback(async () => {
    // Block unless user is a founder or test mode is globally enabled
    if (!isTestModeAllowed(user?.email)) {
      console.warn("[SubscriptionContext] Test mode is disabled for this user.");
      return;
    }

    if (!user?.uid) return;

    try {
      // Get the actual Stripe subscription
      const userDoc = await getDoc(doc(db, "users", user.uid));
      const userData = userDoc.data();
      const subscriptionData = userData?.subscription || {};

      // Map old plan names
      let stripePlan: PlanType | null = null;
      if (subscriptionData.plan === "starter") stripePlan = "pro";
      else if (subscriptionData.plan === "free") stripePlan = null;
      else if (subscriptionData.plan === "pro") stripePlan = "max";
      else if (["pro", "max"].includes(subscriptionData.plan)) {
        stripePlan = subscriptionData.plan as PlanType;
      }

      await updateDoc(doc(db, "users", user.uid), {
        "testMode.active": false,
        "testMode.plan": null,
        "testMode.deactivatedAt": Timestamp.fromDate(new Date()),
      });

      // Update local state to real Stripe subscription (restore real status)
      setState(prev => ({
        ...prev,
        subscription: {
          ...prev.subscription,
          plan: stripePlan,
          planSource: "stripe",
          status: subscriptionData.status || "inactive",
        },
        planConfig: getPlanConfig(stripePlan ?? "pro"),
        planLimits: getPlanLimits(stripePlan ?? "pro"),
        isTestMode: false,
        testPlan: null,
      }));
    } catch (error) {
      console.error("Error disabling test mode:", error);
      throw error;
    }
  }, [user?.uid]);

  // ============================================
  // REFUND / GUARANTEE
  // ============================================

  const requestRefund = useCallback(async (): Promise<{ success: boolean; message?: string; error?: string }> => {
    if (!user?.uid) return { success: false, error: "Non connecté" };

    try {
      const authHeaders = await getAuthHeaders();
      const response = await fetch("/api/stripe/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ userId: user.uid }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Refresh subscription data
        await loadSubscription();
        return { success: true, message: data.message };
      }

      return { success: false, error: data.message || data.error || "Erreur lors du remboursement" };
    } catch (error) {
      console.error("Refund error:", error);
      return { success: false, error: "Erreur réseau. Veuillez réessayer." };
    }
  }, [user?.uid, loadSubscription]);

  // ============================================
  // PERMISSION CHECK FUNCTIONS
  // ============================================

  const checkCanSendMessage = useCallback((): PermissionCheckResult => {
    return canSendMessage(state.subscription, state.usage);
  }, [state.subscription, state.usage]);

  const checkCanUsePromptLength = useCallback((length: number): PermissionCheckResult => {
    return canUsePromptLength(state.subscription, length);
  }, [state.subscription]);

  const checkCanSendToRelations = useCallback((count: number): PermissionCheckResult => {
    return canSendToRelations(state.subscription, count);
  }, [state.subscription]);

  const checkCanUsePlatform = useCallback((platform: Platform): PermissionCheckResult => {
    return canUsePlatform(state.subscription, platform);
  }, [state.subscription]);

  const checkCanSchedulePosts = useCallback((): PermissionCheckResult => {
    return canSchedulePosts(state.subscription);
  }, [state.subscription]);

  const checkCanManageConversations = useCallback((): PermissionCheckResult => {
    return canManageConversations(state.subscription);
  }, [state.subscription]);

  // ============================================
  // MEMOIZED VALUES
  // ============================================

  const contextValue = useMemo<SubscriptionContextValue>(() => ({
    // State
    ...state,

    // Plan info
    currentPlan: state.subscription.plan,
    isProPlan: state.subscription.plan === "pro",
    isMaxPlan: state.subscription.plan === "max",

    // Permission checks
    canSendMessage: checkCanSendMessage,
    canUsePromptLength: checkCanUsePromptLength,
    canSendToRelations: checkCanSendToRelations,
    canUsePlatform: checkCanUsePlatform,
    canSchedulePosts: checkCanSchedulePosts,
    canManageConversations: checkCanManageConversations,

    // Feature flags
    hasPersonalizedResponses: hasPersonalizedResponses(state.subscription),
    hasAudienceTargeting: hasAudienceTargeting(state.subscription),
    hasPriorityProcessing: hasPriorityProcessing(state.subscription),
    hasEarlyAccess: hasEarlyAccess(state.subscription),

    // Usage tracking
    incrementConversationCount,
    refreshUsage,

    // Test mode controls
    enableTestMode,
    disableTestMode,

    // Subscription actions
    refreshSubscription: loadSubscription,

    // Trial info
    trialStatusMessage: formatTrialStatusMessage(
      state.subscription.status,
      state.trialEndsAt,
      state.trialPlan || undefined
    ),
    canStartTrial: state.trialEligible && !state.isTrialing,

    // Guarantee info
    guaranteeEligible: state.guaranteeEligible,
    guaranteeDaysRemaining: state.guaranteeDaysRemaining,
    refundRequested: state.refundRequested,
    requestRefund,
  }), [
    state,
    checkCanSendMessage,
    checkCanUsePromptLength,
    checkCanSendToRelations,
    checkCanUsePlatform,
    checkCanSchedulePosts,
    checkCanManageConversations,
    incrementConversationCount,
    refreshUsage,
    enableTestMode,
    disableTestMode,
    loadSubscription,
    requestRefund,
  ]);

  return (
    <SubscriptionContext.Provider value={contextValue}>
      {children}
    </SubscriptionContext.Provider>
  );
}

// ============================================
// HOOK
// ============================================

export function useSubscription(): SubscriptionContextValue {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error("useSubscription must be used within a SubscriptionProvider");
  }
  return context;
}

// ============================================
// UTILITY HOOKS
// ============================================

/**
 * Hook to check if a specific feature is available
 */
export function useFeatureAccess(feature: "schedule" | "manage" | "personalized" | "audience" | "priority" | "early"): boolean {
  const { subscription } = useSubscription();

  switch (feature) {
    case "schedule":
      return canSchedulePosts(subscription).allowed;
    case "manage":
      return canManageConversations(subscription).allowed;
    case "personalized":
      return hasPersonalizedResponses(subscription);
    case "audience":
      return hasAudienceTargeting(subscription);
    case "priority":
      return hasPriorityProcessing(subscription);
    case "early":
      return hasEarlyAccess(subscription);
    default:
      return false;
  }
}

/**
 * Hook to check platform access
 */
export function usePlatformAccess(platform: Platform): boolean {
  const { canUsePlatform } = useSubscription();
  return canUsePlatform(platform).allowed;
}
