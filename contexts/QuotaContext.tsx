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
import { getUserQuota, incrementMessageCount, QuotaInfo } from "@/lib/firestore";
import { SubscriptionPlan } from "@/types";
import { getPlanConfig } from "@/lib/plans";

interface QuotaContextType {
  quota: QuotaInfo | null;
  isLoading: boolean;
  canSendMessage: boolean;
  // Plan info
  currentPlan: SubscriptionPlan | null;
  planName: string;
  isPremium: boolean;
  isProPlan: boolean;
  isMaxPlan: boolean;
  // Quota UI helpers
  hasDailyLimit: boolean; // true for Pro (shows gauge), false for Max
  usagePercent: number; // 0-100, percentage of daily quota used
  // Usage info
  messagesUsedToday: number;
  messagesRemaining: number;
  dailyLimit: number;
  resetsAt: Date | null;
  // Actions
  refreshQuota: () => Promise<void>;
  recordMessage: () => Promise<void>;
  // Legacy compatibility
  canPublish: boolean;
  recordPublish: () => Promise<void>;
}

const defaultQuota: QuotaInfo = {
  plan: null,
  dailyLimit: 0,
  usedToday: 0,
  remaining: 0,
  canSendMessage: false,
  resetsAt: new Date(),
  weeklyLimit: 0,
  usedThisWeek: 0,
  canPublish: false,
};

const QuotaContext = createContext<QuotaContextType | undefined>(undefined);

export function QuotaProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [quota, setQuota] = useState<QuotaInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load quota from Firestore
  const loadQuota = useCallback(async () => {
    if (!user) {
      setQuota(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const userQuota = await getUserQuota(user.uid, user.email);
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

  // Derived values
  const currentPlan: SubscriptionPlan | null = quota?.plan || null;
  const planConfig = getPlanConfig(currentPlan ?? "pro");
  const isPremium = currentPlan !== null;
  const isProPlan = currentPlan === "pro";
  const isMaxPlan = currentPlan === "max";
  // Pro has a visible daily limit (60); Max is truly unlimited (-1)
  const hasDailyLimit = isProPlan;
  const dailyLimit = quota?.dailyLimit ?? 0;
  const usedToday = quota?.usedToday ?? 0;
  const usagePercent = dailyLimit > 0 ? Math.min(100, Math.round((usedToday / dailyLimit) * 100)) : 0;

  const value: QuotaContextType = {
    quota,
    isLoading,
    canSendMessage: quota?.canSendMessage ?? true,
    // Plan info
    currentPlan,
    planName: planConfig.name,
    isPremium,
    isProPlan,
    isMaxPlan,
    // Quota UI helpers
    hasDailyLimit,
    usagePercent,
    // Usage info
    messagesUsedToday: usedToday,
    messagesRemaining: quota?.remaining ?? 3,
    dailyLimit,
    resetsAt: quota?.resetsAt ?? null,
    // Actions
    refreshQuota: loadQuota,
    recordMessage,
    // Legacy
    canPublish: quota?.canSendMessage ?? true,
    recordPublish: recordMessage,
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
