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
      const userQuota = await getUserQuota(user.uid);
      setQuota(userQuota);
    } catch (error) {
      console.error("Error loading quota:", error);
      setQuota(defaultQuota);
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

  const value: QuotaContextType = {
    quota,
    isLoading,
    canSendMessage: quota?.canSendMessage ?? true,
    // Plan info
    currentPlan,
    planName: planConfig.name,
    isPremium,
    // Usage info
    messagesUsedToday: quota?.usedToday ?? 0,
    messagesRemaining: quota?.remaining ?? 3,
    dailyLimit: quota?.dailyLimit ?? 3,
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
