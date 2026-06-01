"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
} from "react";
import { useAuth } from "./AuthContext";
import { getUserQuota, incrementMessageCount, incrementWeeklyPublishCount, QuotaInfo } from "@/lib/db/firestore";
import { readWithAuthRetry } from "@/lib/db/with-auth-retry";
import { SubscriptionPlan } from "@/types";
import { getPlanConfig } from "@/lib/config/plans";

// Month names for reset label
const MONTH_NAMES = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

// Day names for weekly reset label
const DAY_NAMES = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

/**
 * Compute a human-readable reset label based on plan type.
 */
function computeResetLabel(plan: SubscriptionPlan | null, resetsAt: Date | null): string {
  if (!resetsAt || !plan) return "";

  if (plan === "free") {
    // Monthly reset — show next month's 1st
    return `Le 1er ${MONTH_NAMES[resetsAt.getUTCMonth()]}`;
  }

  if (plan === "pro") {
    return "Demain à minuit";
  }

  return ""; // Max has no limit
}

interface QuotaContextType {
  quota: QuotaInfo | null;
  isLoading: boolean;
  canSendMessage: boolean;
  // Plan info
  currentPlan: SubscriptionPlan | null;
  planName: string;
  isPremium: boolean;
  isFreePlan: boolean;
  isProPlan: boolean;
  isMaxPlan: boolean;
  // Quota UI helpers
  hasDailyLimit: boolean;    // true for Pro (shows daily gauge)
  hasMonthlyLimit: boolean;  // true for Free (shows monthly gauge)
  usagePercent: number;      // 0-100, percentage of quota used (daily or monthly)
  // Usage info
  messagesUsedToday: number;
  messagesRemaining: number;
  dailyLimit: number;
  resetsAt: Date | null;
  // Monthly quota (Free plan)
  messagesUsedThisMonth: number;
  monthlyLimit: number;
  monthlyRemaining: number;
  // Weekly publish quota (Free plan)
  hasWeeklyPublishLimit: boolean;
  weeklyPublishUsed: number;
  weeklyPublishLimit: number;
  weeklyPublishRemaining: number;
  canPublishThisWeek: boolean;
  weeklyPublishResetsAt: Date | null;
  // Reset label
  quotaResetLabel: string;   // "Demain à minuit" / "Le 1er mars"
  // Quota exceeded modal
  showQuotaModal: boolean;
  openQuotaModal: () => void;
  closeQuotaModal: () => void;
  // Actions
  refreshQuota: () => Promise<void>;
  recordMessage: () => Promise<void>;
  recordPublish: () => Promise<void>;
  // Legacy compatibility
  canPublish: boolean;
}

const defaultQuota: QuotaInfo = {
  plan: null,
  dailyLimit: 0,
  usedToday: 0,
  remaining: 0,
  canSendMessage: false,
  resetsAt: new Date(),
  monthlyLimit: 0,
  usedThisMonth: 0,
  monthlyRemaining: 0,
  hasMonthlyLimit: false,
  weeklyPublishLimit: 0,
  weeklyPublishUsed: 0,
  weeklyPublishRemaining: 0,
  hasWeeklyPublishLimit: false,
  weeklyPublishResetsAt: new Date(),
  canPublishThisWeek: false,
  weeklyLimit: 0,
  usedThisWeek: 0,
  canPublish: false,
};

const QuotaContext = createContext<QuotaContextType | undefined>(undefined);

export function QuotaProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [quota, setQuota] = useState<QuotaInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showQuotaModal, setShowQuotaModal] = useState(false);

  // Load quota from Firestore
  const loadQuota = useCallback(async () => {
    if (!user) {
      setQuota(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const userQuota = await readWithAuthRetry(() =>
        getUserQuota(user.uid, user.email)
      );
      setQuota(userQuota);
    } catch (error) {
      console.error("Error loading quota:", error);
      // Fail open: don't block the user on client-side errors.
      // The server-side API always performs its own quota check.
      setQuota(null);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Load quota on mount and when user changes — skip while auth is resolving
  useEffect(() => {
    if (authLoading) return;
    loadQuota();
  }, [loadQuota, authLoading]);

  // Record a message and update quota
  const recordMessage = useCallback(async () => {
    if (!user) return;

    try {
      await incrementMessageCount(user.uid);
      await loadQuota();
    } catch (error) {
      console.error("Error recording message:", error);
    }
  }, [user, loadQuota]);

  // Record a publish (increments weekly publish count + message count)
  const recordPublish = useCallback(async () => {
    if (!user) return;

    try {
      await incrementWeeklyPublishCount(user.uid);
      await incrementMessageCount(user.uid);
      await loadQuota();
    } catch (error) {
      console.error("Error recording publish:", error);
    }
  }, [user, loadQuota]);

  // Modal callbacks
  const openQuotaModal = useCallback(() => setShowQuotaModal(true), []);
  const closeQuotaModal = useCallback(() => setShowQuotaModal(false), []);

  // Derived values
  const currentPlan: SubscriptionPlan | null = quota?.plan || null;
  const planConfig = getPlanConfig(currentPlan ?? "pro");
  const isPremium = currentPlan !== null;
  const isFreePlan = currentPlan === "free";
  const isProPlan = currentPlan === "pro";
  const isMaxPlan = currentPlan === "max";

  // Quota type flags
  const hasDailyLimit = isProPlan;
  const hasMonthlyLimit = quota?.hasMonthlyLimit ?? false;

  // Daily usage (Pro)
  const dailyLimit = quota?.dailyLimit ?? 0;
  const usedToday = quota?.usedToday ?? 0;

  // Monthly usage (Free)
  const messagesUsedThisMonth = quota?.usedThisMonth ?? 0;
  const monthlyLimit = quota?.monthlyLimit ?? 0;
  const monthlyRemaining = quota?.monthlyRemaining ?? 0;

  // Weekly publish usage (Free)
  const hasWeeklyPublishLimit = quota?.hasWeeklyPublishLimit ?? false;
  const weeklyPublishUsed = quota?.weeklyPublishUsed ?? 0;
  const weeklyPublishLimit = quota?.weeklyPublishLimit ?? 0;
  const weeklyPublishRemaining = quota?.weeklyPublishRemaining ?? 0;
  const canPublishThisWeek = quota?.canPublishThisWeek ?? true;
  const weeklyPublishResetsAt = quota?.weeklyPublishResetsAt ?? null;

  // Usage percent — adapts to plan type
  const usagePercent = hasMonthlyLimit
    ? (monthlyLimit > 0 ? Math.min(100, Math.round((messagesUsedThisMonth / monthlyLimit) * 100)) : 0)
    : (dailyLimit > 0 ? Math.min(100, Math.round((usedToday / dailyLimit) * 100)) : 0);

  // Reset label
  const quotaResetLabel = computeResetLabel(currentPlan, quota?.resetsAt ?? null);

  const value: QuotaContextType = {
    quota,
    isLoading,
    canSendMessage: quota?.canSendMessage ?? true,
    // Plan info
    currentPlan,
    planName: planConfig.name,
    isPremium,
    isFreePlan,
    isProPlan,
    isMaxPlan,
    // Quota UI helpers
    hasDailyLimit,
    hasMonthlyLimit,
    usagePercent,
    // Usage info
    messagesUsedToday: usedToday,
    messagesRemaining: quota?.remaining ?? 3,
    dailyLimit,
    resetsAt: quota?.resetsAt ?? null,
    // Monthly quota
    messagesUsedThisMonth,
    monthlyLimit,
    monthlyRemaining,
    // Weekly publish quota
    hasWeeklyPublishLimit,
    weeklyPublishUsed,
    weeklyPublishLimit,
    weeklyPublishRemaining,
    canPublishThisWeek,
    weeklyPublishResetsAt,
    // Reset label
    quotaResetLabel,
    // Modal
    showQuotaModal,
    openQuotaModal,
    closeQuotaModal,
    // Actions
    refreshQuota: loadQuota,
    recordMessage,
    recordPublish,
    // Legacy
    canPublish: quota?.canSendMessage ?? true,
  };

  return (
    <QuotaContext.Provider value={value}>
      {children}
    </QuotaContext.Provider>
  );
}

export function useQuota() {
  const context = useContext(QuotaContext);
  if (context === undefined) {
    throw new Error("useQuota must be used within a QuotaProvider");
  }
  return context;
}
