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
  getTrialDaysRemaining,
  checkTrialEligibility,
  checkGuaranteeEligibility,
  formatTrialStatusMessage,
  getFounderOverridePlan,
  resolveFreeTrialEnd,
  resolveFreeTrialStart,
  getFreeTrialDaysRemaining,
  isFreeTrialExpired,
  FREE_TRIAL_DURATION_DAYS,
} from "@/lib/config/plans";
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
  hasMarketingStrategist,
  shouldResetWeeklyQuota,
  shouldResetMonthlyQuota,
  getWeekStartDate,
  getMonthStartDate,
  Platform,
} from "@/lib/config/permissions";
import { doc, getDoc, updateDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/db/firebase";
import { getAuthHeaders } from "@/lib/api/client";

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

  // Free-plan trial (14 days)
  freeTrialStartedAt: Date | null;
  freeTrialEndsAt: Date | null;
  freeTrialDaysRemaining: number;
  /** True when the user is on the Free plan AND the 14-day clock has run out. */
  freeTrialExpired: boolean;

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
  isFreePlan: boolean;
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
  hasMarketingStrategist: boolean; // Max-only conversational marketing advisor

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

  /** Free-plan trial total length in days (constant, exposed for UI). */
  freeTrialTotalDays: number;

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
  planConfig: getPlanConfig("free"),
  planLimits: getPlanLimits("free"),
  isTestMode: false,
  testPlan: null,
  // Trial state
  isTrialing: false,
  trialDaysRemaining: 0,
  trialPlan: null,
  trialEndsAt: null,
  trialEligible: true, // Assume eligible until we check
  // Free-plan trial
  freeTrialStartedAt: null,
  freeTrialEndsAt: null,
  freeTrialDaysRemaining: 0,
  freeTrialExpired: false,
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
  const { user, userProfile, loading: authLoading, refreshUserProfile } = useAuth();

  /* Optimistic overlay for in-flight conversation increments. Cleared when
   * `userProfile` changes (i.e. the next refresh has applied the real value). */
  const [optimisticUsage, setOptimisticUsage] = useState<Partial<UserUsage> | null>(null);
  useEffect(() => {
    setOptimisticUsage(null);
  }, [userProfile]);

  // ============================================
  // DERIVE STATE SYNCHRONOUSLY FROM userProfile
  // ============================================
  // Previously this context did its own `getDoc(users/{uid})` after auth
  // completed, which produced a visible "Vérification de votre abonnement…"
  // loader for every authenticated render. The same data already lives in
  // `userProfile`, so we derive everything synchronously and `loading` simply
  // tracks `authLoading`. Result: zero post-login spinner, zero double-fetch.

  const state = useMemo<SubscriptionState>(() => {
    if (!user?.uid || !userProfile) {
      return { ...defaultState, loading: authLoading };
    }

    const subscriptionData = userProfile.subscription;
    const usageData = userProfile.usage;
    const quotaData = userProfile.quota;

    // Test mode is fully disabled — ignore any leftover testMode data
    const isTestMode = false;
    const testPlan: PlanType | null = null;

    // Normalize plan name (handles legacy names, casing, unknown values)
    const rawPlan = subscriptionData?.plan as string | undefined;
    let stripePlan: PlanType | null = null;
    if (rawPlan) {
      const lower = rawPlan.toLowerCase().trim();
      if (lower === "starter") stripePlan = "pro";
      else if (lower === "free" || lower === "pro" || lower === "max") stripePlan = lower as PlanType;
      // unknown values → null
    }

    // Founder override ALWAYS wins (internal test accounts get full Max access).
    const founderPlan = getFounderOverridePlan(user.email);
    const effectivePlan = founderPlan || stripePlan;
    const isFounderOverride = !!founderPlan;

    // ===== Free-plan 14-day trial =====
    // Resolve trial window from explicit fields with createdAt fallback so
    // accounts created before the trial system landed are still gated.
    const freeTrialStartedAt = isFounderOverride
      ? null
      : resolveFreeTrialStart(userProfile as unknown as Record<string, unknown>);
    const freeTrialEndsAt = isFounderOverride
      ? null
      : resolveFreeTrialEnd(userProfile as unknown as Record<string, unknown>);
    const freeTrialDaysRemaining = getFreeTrialDaysRemaining(freeTrialEndsAt);
    const freeTrialExpired = isFreeTrialExpired(effectivePlan, freeTrialEndsAt);

    const rawStatus = isFounderOverride
      ? "active"
      : ((subscriptionData?.status as UserSubscription["status"]) || "inactive");

    // Effective status:
    //  - Free trial expired → "inactive" (forces upgrade)
    //  - Free trial active  → "active"   (the 14-day window IS the entitlement;
    //                                     Firestore typically carries no status
    //                                     for Free users, so we promote here)
    //  - Pro / Max          → rawStatus  (Stripe is the source of truth)
    const effectiveStatus: UserSubscription["status"] = freeTrialExpired
      ? "inactive"
      : effectivePlan === "free"
        ? "active"
        : rawStatus;

    const subscription: UserSubscription = {
      plan: effectivePlan,
      planSource: isFounderOverride ? "test" : "stripe",
      status: effectiveStatus,
      currentPeriodStart: subscriptionData?.subscribedAt?.toDate?.(),
      currentPeriodEnd: subscriptionData?.expiresAt?.toDate?.(),
    };

    // Parse usage with quota-reset logic
    const weekStartDate = usageData?.weekStartDate?.toDate?.();
    const monthStartDate = usageData?.monthStartDate?.toDate?.();

    let conversationsThisWeek = usageData?.conversationsThisWeek || 0;
    let conversationsThisMonth = usageData?.conversationsThisMonth || 0;
    if (shouldResetWeeklyQuota(weekStartDate)) conversationsThisWeek = 0;
    if (shouldResetMonthlyQuota(monthStartDate)) conversationsThisMonth = 0;

    // Daily quota: check if lastMessageDate is today (UTC)
    const lastMessageDate = quotaData?.lastMessageDate?.toDate?.();
    let messagesUsedToday = 0;
    if (lastMessageDate) {
      const now = new Date();
      if (
        lastMessageDate.getUTCFullYear() === now.getUTCFullYear() &&
        lastMessageDate.getUTCMonth() === now.getUTCMonth() &&
        lastMessageDate.getUTCDate() === now.getUTCDate()
      ) {
        messagesUsedToday = quotaData?.dailyMessageCount || 0;
      }
    }

    const usage: UserUsage = {
      messagesUsedToday,
      lastMessageDate,
      conversationsThisWeek,
      conversationsThisMonth,
      lastConversationDate: usageData?.lastConversationDate?.toDate?.(),
      weekStartDate,
      monthStartDate,
      ...optimisticUsage,
    };

    // Trial state
    const isTrialing = subscriptionData?.status === "trialing";
    const trialEndsAt = subscriptionData?.trialEndsAt?.toDate?.() || null;
    const trialDaysRemaining = getTrialDaysRemaining(trialEndsAt);
    const trialPlan = (subscriptionData?.trialPlan as PlanType) || null;
    const trialEligibility = checkTrialEligibility(userProfile as unknown as Record<string, unknown>);

    // Guarantee state
    const firstPaymentDate = subscriptionData?.firstPaymentDate?.toDate?.() || null;
    const guaranteeResult = checkGuaranteeEligibility(firstPaymentDate);
    const refundRequested = subscriptionData?.refundRequested === true;

    return {
      subscription,
      usage,
      planConfig: getPlanConfig(effectivePlan ?? "free"),
      planLimits: getPlanLimits(effectivePlan ?? "free"),
      isTestMode,
      testPlan,
      isTrialing,
      trialDaysRemaining,
      trialPlan: isTrialing ? trialPlan : null,
      trialEndsAt,
      trialEligible: trialEligibility.eligible,
      freeTrialStartedAt,
      freeTrialEndsAt,
      freeTrialDaysRemaining,
      freeTrialExpired,
      guaranteeEligible: guaranteeResult.eligible && !refundRequested,
      guaranteeDaysRemaining: guaranteeResult.daysRemaining,
      refundRequested,
      needsMigration: stripePlan === null && trialEligibility.eligible,
      loading: false,
      error: null,
    };
  }, [user?.uid, user?.email, userProfile, authLoading, optimisticUsage]);

  /* Cookies for the server-side middleware. Stays in a separate effect so it
   * runs whenever the derived subscription changes (login, refresh, etc.).
   *
   * max-age was 3600 (1h) which produced a "stuck on /subscription after a
   * page refresh / next-day visit" bug: the Firebase session is still valid
   * but this cookie expires, the middleware sees no `subscription_status` and
   * sends Free users on a /app → /pricing → /subscription redirect loop even
   * while their trial is live. Bumped to 7 days; SubscriptionContext rewrites
   * it on every state change, so the upper bound is just a safety net. */
  useEffect(() => {
    if (state.loading) return;
    if (typeof document === "undefined") return;
    const maxAge = 60 * 60 * 24 * 7; // 7 days
    document.cookie = `subscription_status=${state.subscription.status}; path=/; max-age=${maxAge}; SameSite=Strict`;
    document.cookie = `subscription_plan=${state.subscription.plan}; path=/; max-age=${maxAge}; SameSite=Strict`;
  }, [state.loading, state.subscription.status, state.subscription.plan]);

  /* Public refresh entry point — pulls a fresh userProfile from Firestore via
   * AuthContext (single source of truth). Used by Stripe webhooks, refund flow,
   * etc. No UI loading state is exposed; refresh happens in the background. */
  const loadSubscription = useCallback(async () => {
    await refreshUserProfile();
  }, [refreshUserProfile]);

  // ============================================
  // USAGE TRACKING
  // ============================================

  const incrementConversationCount = useCallback(async () => {
    if (!user?.uid) return;

    try {
      const now = new Date();
      const weekStart = state.usage.weekStartDate || getWeekStartDate();
      const monthStart = state.usage.monthStartDate || getMonthStartDate();

      let newWeeklyCount = state.usage.conversationsThisWeek;
      let newMonthlyCount = state.usage.conversationsThisMonth;
      let newWeekStart = weekStart;
      let newMonthStart = monthStart;

      if (shouldResetWeeklyQuota(weekStart)) {
        newWeeklyCount = 0;
        newWeekStart = getWeekStartDate();
      }
      if (shouldResetMonthlyQuota(monthStart)) {
        newMonthlyCount = 0;
        newMonthStart = getMonthStartDate();
      }

      newWeeklyCount += 1;
      newMonthlyCount += 1;

      /* Optimistic UI update — applied instantly so the UI reflects the new
       * count before the Firestore round-trip. Cleared automatically when the
       * next userProfile refresh arrives (effect above). */
      setOptimisticUsage({
        conversationsThisWeek: newWeeklyCount,
        conversationsThisMonth: newMonthlyCount,
        lastConversationDate: now,
        weekStartDate: newWeekStart,
        monthStartDate: newMonthStart,
      });

      await updateDoc(doc(db, "users", user.uid), {
        "usage.conversationsThisWeek": newWeeklyCount,
        "usage.conversationsThisMonth": newMonthlyCount,
        "usage.lastConversationDate": Timestamp.fromDate(now),
        "usage.weekStartDate": Timestamp.fromDate(newWeekStart),
        "usage.monthStartDate": Timestamp.fromDate(newMonthStart),
      });

      /* Refresh userProfile so the optimistic overlay is replaced with the
       * authoritative server value on next render. */
      await refreshUserProfile();
    } catch (error) {
      console.error("Error incrementing conversation count:", error);
    }
  }, [user?.uid, state.usage, refreshUserProfile]);

  const refreshUsage = useCallback(async () => {
    await loadSubscription();
  }, [loadSubscription]);

  // ============================================
  // TEST MODE CONTROLS
  // ============================================
  // PRODUCTION MODE: These functions are blocked in production
  // To re-enable: set NEXT_PUBLIC_ENABLE_TEST_MODE=true in .env.local

  const enableTestMode = useCallback(async (_plan: PlanType) => {
    // Test mode is permanently disabled
    console.warn("[SubscriptionContext] Test mode has been permanently disabled.");
  }, []);

  const disableTestMode = useCallback(async () => {
    // Test mode is permanently disabled
    console.warn("[SubscriptionContext] Test mode has been permanently disabled.");
  }, []);

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
    isFreePlan: state.subscription.plan === "free",
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
    hasMarketingStrategist: hasMarketingStrategist(state.subscription),

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

    freeTrialTotalDays: FREE_TRIAL_DURATION_DAYS,

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
