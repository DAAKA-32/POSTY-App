/**
 * Server-side Firestore operations using Firebase Admin SDK
 * These functions bypass security rules and should only be used in API routes
 */

import { adminDb } from "./firebase-admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

// LinkedIn Connection Data type (matching the client-side type)
export interface LinkedInConnectionData {
  userId: string;
  linkedInId: string;
  accessToken: string;
  expiresAt: Timestamp;
  profileName: string;
  profilePicture?: string;
  email?: string;
  connectedAt: Timestamp;
  lastUsedAt?: Timestamp;
}

/**
 * Get LinkedIn connection for a user (server-side)
 */
export async function getLinkedInConnectionAdmin(
  userId: string
): Promise<LinkedInConnectionData | null> {
  if (!adminDb) {
    throw new Error("Firebase Admin not initialized");
  }

  const connectionRef = adminDb.collection("linkedinConnections").doc(userId);
  const connectionSnap = await connectionRef.get();

  if (connectionSnap.exists) {
    return connectionSnap.data() as LinkedInConnectionData;
  }
  return null;
}

/**
 * Update LinkedIn last used timestamp (server-side)
 */
export async function updateLinkedInLastUsedAdmin(userId: string): Promise<void> {
  if (!adminDb) {
    throw new Error("Firebase Admin not initialized");
  }

  const connectionRef = adminDb.collection("linkedinConnections").doc(userId);
  await connectionRef.update({
    lastUsedAt: FieldValue.serverTimestamp(),
  });
}

/**
 * Save LinkedIn post record (server-side)
 */
export async function saveLinkedInPostAdmin(
  userId: string,
  data: {
    linkedInId: string;
    postId: string;
    content: string;
    postUrl?: string;
    success: boolean;
    error?: string;
  }
): Promise<string> {
  if (!adminDb) {
    throw new Error("Firebase Admin not initialized");
  }

  const postsRef = adminDb.collection("linkedinPosts");
  const docRef = await postsRef.add({
    userId,
    linkedInId: data.linkedInId,
    postId: data.postId,
    content: data.content,
    postUrl: data.postUrl || null,
    success: data.success,
    error: data.error || null,
    publishedAt: FieldValue.serverTimestamp(),
  });
  return docRef.id;
}

// ============== QUOTA MANAGEMENT (SERVER-SIDE) ==============

import { SubscriptionPlan } from "@/types";
import { DAILY_MESSAGE_LIMITS, HOURLY_MESSAGE_LIMITS, HOURLY_WINDOW_MS, getFounderOverridePlan, PlanType, PLAN_CONFIGS } from "@/lib/plans";

/**
 * Normalize plan name from Firestore to a valid PlanType.
 * Handles legacy names, case mismatches, and unknown values.
 */
function normalizePlan(raw: string | null | undefined): SubscriptionPlan | null {
  if (!raw) return null;
  const lower = raw.toLowerCase().trim();
  if (lower === "free") return "free";
  if (lower === "starter") return "pro";
  if (lower === "pro" || lower === "max") return lower as SubscriptionPlan;
  return null;
}

/**
 * Get the start of today (00:00:00 UTC)
 */
function getTodayStartUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
}

/**
 * Get the end of today (23:59:59 UTC)
 */
function getTodayEndUTC(): Date {
  const today = getTodayStartUTC();
  today.setUTCDate(today.getUTCDate() + 1);
  return today;
}

/**
 * Check if a date is today (UTC)
 */
function isTodayUTC(date: Date): boolean {
  const today = getTodayStartUTC();
  const tomorrow = getTodayEndUTC();
  return date >= today && date < tomorrow;
}

export interface QuotaCheckResult {
  canGenerate: boolean;
  plan: SubscriptionPlan | null;
  dailyLimit: number;
  usedToday: number;
  remaining: number;
  reason?: string;
}

/**
 * Check if user can generate content (quota not exceeded)
 * Server-side check using Admin SDK
 *
 * IMPORTANT: Respects test mode - if test mode is active, uses the test plan
 * for quota calculations instead of the actual Stripe subscription.
 */
export async function checkUserQuotaAdmin(userId: string, authEmail?: string): Promise<QuotaCheckResult> {
  if (!adminDb) {
    throw new Error("Firebase Admin not initialized");
  }

  const userRef = adminDb.collection("users").doc(userId);
  const userSnap = await userRef.get();

  // Default result for users without a subscription
  const defaultResult: QuotaCheckResult = {
    canGenerate: false,
    plan: null,
    dailyLimit: 0,
    usedToday: 0,
    remaining: 0,
    reason: "Aucun abonnement actif",
  };

  if (!userSnap.exists) {
    // New user, no subscription
    return defaultResult;
  }

  const data = userSnap.data();
  if (!data) return defaultResult;

  // Determine effective plan (normalize to handle casing/legacy names)
  let effectivePlan = normalizePlan(data.subscription?.plan);

  // Founder override: use Firestore email, fallback to Firebase Auth email
  const founderPlan = getFounderOverridePlan(data.email || authEmail);
  if (founderPlan) {
    effectivePlan = founderPlan;
  }

  // No subscription = no generation
  if (!effectivePlan) {
    return defaultResult;
  }

  // ========== FREE PLAN: MONTHLY QUOTA ENFORCEMENT ==========
  if (effectivePlan === "free") {
    const monthlyLimit = PLAN_CONFIGS.free.limits.conversationsPerMonth;
    const usageData = data.usage || {};
    let usedThisMonth = usageData.conversationsThisMonth || 0;

    // Reset monthly counter if different month
    const monthStartDate = usageData.monthStartDate?.toDate?.();
    if (monthStartDate) {
      const now = new Date();
      if (now.getUTCMonth() !== monthStartDate.getUTCMonth() ||
          now.getUTCFullYear() !== monthStartDate.getUTCFullYear()) {
        usedThisMonth = 0;
      }
    }

    const remaining = Math.max(0, monthlyLimit - usedThisMonth);
    const canGenerate = usedThisMonth < monthlyLimit;

    return {
      canGenerate,
      plan: effectivePlan,
      dailyLimit: monthlyLimit,
      usedToday: usedThisMonth,
      remaining,
      reason: canGenerate ? undefined : `Limite mensuelle atteinte (${monthlyLimit} posts/mois)`,
    };
  }

  const dailyLimit = DAILY_MESSAGE_LIMITS[effectivePlan] ?? 0;

  // Unlimited plan (-1) — Max plan: no daily quota
  if (dailyLimit === -1) {
    return {
      canGenerate: true,
      plan: effectivePlan,
      dailyLimit: -1,
      usedToday: data.quota?.dailyMessageCount || 0,
      remaining: -1,
    };
  }

  // Check daily usage
  let usedToday = 0;
  const lastMessageDate = data.quota?.lastMessageDate?.toDate?.();

  if (lastMessageDate && isTodayUTC(lastMessageDate)) {
    usedToday = data.quota?.dailyMessageCount || 0;
  }

  const remaining = Math.max(0, dailyLimit - usedToday);
  const canGenerate = usedToday < dailyLimit;

  return {
    canGenerate,
    plan: effectivePlan,
    dailyLimit,
    usedToday,
    remaining,
    reason: canGenerate ? undefined : "Limite quotidienne atteinte",
  };
}

// ============== HOURLY QUOTA (ROLLING WINDOW) ==============

export interface HourlyQuotaCheckResult {
  canGenerate: boolean;
  plan: SubscriptionPlan | null;
  hourlyLimit: number;
  usedThisHour: number;
  remaining: number;
  /** Seconds until the oldest message in the window expires (0 if not at limit) */
  resetInSeconds: number;
  reason?: string;
}

/**
 * Check if user can generate content based on hourly rolling window.
 * Server-side check using Admin SDK.
 *
 * Uses a 1-hour sliding window: counts messages with timestamps within
 * the last 60 minutes. Respects test mode.
 */
export async function checkHourlyQuotaAdmin(userId: string, authEmail?: string): Promise<HourlyQuotaCheckResult> {
  if (!adminDb) {
    throw new Error("Firebase Admin not initialized");
  }

  const userRef = adminDb.collection("users").doc(userId);
  const userSnap = await userRef.get();

  const defaultResult: HourlyQuotaCheckResult = {
    canGenerate: false,
    plan: null,
    hourlyLimit: 0,
    usedThisHour: 0,
    remaining: 0,
    resetInSeconds: 0,
    reason: "Aucun abonnement actif",
  };

  if (!userSnap.exists) return defaultResult;

  const data = userSnap.data();
  if (!data) return defaultResult;

  // Determine effective plan (normalize to handle casing/legacy names)
  let effectivePlan = normalizePlan(data.subscription?.plan);

  // Founder override: use Firestore email, fallback to Firebase Auth email
  const founderPlan = getFounderOverridePlan(data.email || authEmail);
  if (founderPlan) {
    effectivePlan = founderPlan;
  }

  if (!effectivePlan) return defaultResult;

  const hourlyLimit = HOURLY_MESSAGE_LIMITS[effectivePlan] ?? 0;

  // Unlimited plan (-1)
  if (hourlyLimit === -1) {
    return {
      canGenerate: true,
      plan: effectivePlan,
      hourlyLimit: -1,
      usedThisHour: 0,
      remaining: -1,
      resetInSeconds: 0,
    };
  }

  // Get timestamps and filter to rolling window
  const now = Date.now();
  const windowStart = now - HOURLY_WINDOW_MS;
  const allTimestamps: number[] = data.quota?.messageTimestamps || [];
  const recentTimestamps = allTimestamps.filter((ts: number) => ts > windowStart);
  const usedThisHour = recentTimestamps.length;
  const remaining = Math.max(0, hourlyLimit - usedThisHour);
  const canGenerate = usedThisHour < hourlyLimit;

  // Calculate reset time: when will the oldest message in window expire?
  let resetInSeconds = 0;
  if (!canGenerate && recentTimestamps.length > 0) {
    const oldestInWindow = Math.min(...recentTimestamps);
    const expiresAt = oldestInWindow + HOURLY_WINDOW_MS;
    resetInSeconds = Math.max(0, Math.ceil((expiresAt - now) / 1000));
  }

  return {
    canGenerate,
    plan: effectivePlan,
    hourlyLimit,
    usedThisHour,
    remaining,
    resetInSeconds,
    reason: canGenerate ? undefined : "Limite horaire atteinte",
  };
}

/**
 * Increment user's daily message count
 * Server-side update using Admin SDK
 */
export async function incrementUserQuotaAdmin(userId: string): Promise<void> {
  if (!adminDb) {
    throw new Error("Firebase Admin not initialized");
  }

  const userRef = adminDb.collection("users").doc(userId);
  const userSnap = await userRef.get();

  const today = getTodayStartUTC();
  const now = Date.now();
  const windowStart = now - HOURLY_WINDOW_MS;

  if (!userSnap.exists) {
    // Create user document with initial quota
    await userRef.set({
      uid: userId,
      quota: {
        dailyMessageCount: 1,
        lastMessageDate: Timestamp.fromDate(today),
        messageTimestamps: [now],
      },
      createdAt: FieldValue.serverTimestamp(),
    });
    return;
  }

  const data = userSnap.data();
  const lastMessageDate = data?.quota?.lastMessageDate?.toDate?.();

  let newCount = 1;

  if (lastMessageDate && isTodayUTC(lastMessageDate)) {
    // Same day, increment existing count
    newCount = (data?.quota?.dailyMessageCount || 0) + 1;
  }
  // Otherwise, it's a new day, start fresh at 1

  // Clean old timestamps (keep only last hour) and append new one
  const existingTimestamps: number[] = data?.quota?.messageTimestamps || [];
  const cleanedTimestamps = existingTimestamps.filter((ts: number) => ts > windowStart);
  cleanedTimestamps.push(now);

  // Monthly usage tracking (for free plan)
  const usageData = data?.usage || {};
  let monthlyCount = (usageData.conversationsThisMonth || 0) + 1;
  const monthStartDate = usageData.monthStartDate?.toDate?.();
  const currentDate = new Date();

  // Reset if different month
  if (monthStartDate &&
      (currentDate.getUTCMonth() !== monthStartDate.getUTCMonth() ||
       currentDate.getUTCFullYear() !== monthStartDate.getUTCFullYear())) {
    monthlyCount = 1;
  }

  await userRef.update({
    "quota.dailyMessageCount": newCount,
    "quota.lastMessageDate": Timestamp.fromDate(today),
    "quota.messageTimestamps": cleanedTimestamps,
    "usage.conversationsThisMonth": monthlyCount,
    "usage.monthStartDate": monthStartDate &&
      currentDate.getUTCMonth() === monthStartDate.getUTCMonth() &&
      currentDate.getUTCFullYear() === monthStartDate.getUTCFullYear()
        ? usageData.monthStartDate
        : Timestamp.fromDate(new Date(Date.UTC(currentDate.getUTCFullYear(), currentDate.getUTCMonth(), 1))),
  });
}

// ============== DUAL MODE WEEKLY QUOTA ==============

/**
 * Get the start of the current week (Monday 00:00 UTC)
 */
function getWeekStartUTC(): Date {
  const now = new Date();
  const day = now.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday = 1
  const weekStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + diff));
  return weekStart;
}

/**
 * Check how many dual-mode generations the user has used this week
 */
export async function getDualModeUsageThisWeek(userId: string): Promise<number> {
  if (!adminDb) {
    throw new Error("Firebase Admin not initialized");
  }

  const userRef = adminDb.collection("users").doc(userId);
  const userSnap = await userRef.get();

  if (!userSnap.exists) return 0;

  const data = userSnap.data();
  const weekStart = getWeekStartUTC();
  const lastDualWeekStart = data?.quota?.dualModeWeekStart?.toDate?.();

  // If the stored week start doesn't match current week, count is 0
  if (!lastDualWeekStart || lastDualWeekStart.getTime() < weekStart.getTime()) {
    return 0;
  }

  return data?.quota?.dualModeCountThisWeek || 0;
}

/**
 * Increment dual-mode usage counter for the current week
 */
export async function incrementDualModeUsageAdmin(userId: string): Promise<void> {
  if (!adminDb) {
    throw new Error("Firebase Admin not initialized");
  }

  const userRef = adminDb.collection("users").doc(userId);
  const userSnap = await userRef.get();

  const weekStart = getWeekStartUTC();

  if (!userSnap.exists) return;

  const data = userSnap.data();
  const lastDualWeekStart = data?.quota?.dualModeWeekStart?.toDate?.();

  let newCount = 1;
  if (lastDualWeekStart && lastDualWeekStart.getTime() >= weekStart.getTime()) {
    // Same week, increment
    newCount = (data?.quota?.dualModeCountThisWeek || 0) + 1;
  }

  await userRef.update({
    "quota.dualModeCountThisWeek": newCount,
    "quota.dualModeWeekStart": Timestamp.fromDate(weekStart),
  });
}

/**
 * Get user profile data (server-side)
 *
 * IMPORTANT: Respects test mode - if test mode is active, returns the test plan
 * instead of the actual Stripe subscription.
 */
export async function getUserProfileAdmin(userId: string): Promise<{
  plan: SubscriptionPlan | null;
  profile?: {
    profileType?: string;
    sector?: string;
    role?: string;
    linkedinStyle?: string;
    objective?: string;
    targetAudience?: string;
    communicationTone?: string;
    publishingFrequency?: string;
  };
  isTestMode?: boolean;
} | null> {
  if (!adminDb) {
    throw new Error("Firebase Admin not initialized");
  }

  const userRef = adminDb.collection("users").doc(userId);
  const userSnap = await userRef.get();

  if (!userSnap.exists) {
    return null;
  }

  const data = userSnap.data();

  // Determine effective plan (handle legacy "starter" and "free" plan names)
  let rawPlan2: string | null = data?.subscription?.plan || null;
  if (rawPlan2 === "free") rawPlan2 = null;
  let effectivePlan: SubscriptionPlan | null = rawPlan2 ? (rawPlan2 === "starter" ? "pro" : rawPlan2) as SubscriptionPlan : null;

  // Founder override: founders always get max plan access
  const founderPlan = getFounderOverridePlan(data?.email);
  if (founderPlan) {
    effectivePlan = founderPlan;
  }

  return {
    plan: effectivePlan,
    profile: data?.profile,
    isTestMode: false,
  };
}

/**
 * Save LinkedIn connection (server-side)
 * Used by the OAuth callback route
 */
export async function saveLinkedInConnectionAdmin(
  userId: string,
  data: {
    linkedInId: string;
    accessToken: string;
    expiresAt: Date;
    profileName: string;
    profilePicture?: string;
    email?: string;
  }
): Promise<void> {
  if (!adminDb) {
    throw new Error("Firebase Admin not initialized");
  }

  const connectionRef = adminDb.collection("linkedinConnections").doc(userId);
  await connectionRef.set({
    userId,
    linkedInId: data.linkedInId,
    accessToken: data.accessToken,
    expiresAt: Timestamp.fromDate(data.expiresAt),
    profileName: data.profileName,
    profilePicture: data.profilePicture || null,
    email: data.email || null,
    connectedAt: FieldValue.serverTimestamp(),
    lastUsedAt: null,
  });
}

// ============== TWITTER ADMIN FUNCTIONS ==============

// Twitter Connection Data type
export interface TwitterConnectionData {
  userId: string;
  twitterId: string;
  username: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt: Timestamp;
  profileName: string;
  profilePicture?: string;
  connectedAt: Timestamp;
  lastUsedAt?: Timestamp;
}

/**
 * Get Twitter connection for a user (server-side)
 */
export async function getTwitterConnectionAdmin(
  userId: string
): Promise<TwitterConnectionData | null> {
  if (!adminDb) {
    throw new Error("Firebase Admin not initialized");
  }

  const connectionRef = adminDb.collection("twitterConnections").doc(userId);
  const connectionSnap = await connectionRef.get();

  if (connectionSnap.exists) {
    return connectionSnap.data() as TwitterConnectionData;
  }
  return null;
}

/**
 * Save Twitter connection (server-side)
 * Used by the OAuth callback route
 */
export async function saveTwitterConnectionAdmin(
  userId: string,
  data: {
    twitterId: string;
    username: string;
    accessToken: string;
    refreshToken?: string;
    expiresAt: Date;
    profileName: string;
    profilePicture?: string;
  }
): Promise<void> {
  if (!adminDb) {
    throw new Error("Firebase Admin not initialized");
  }

  const connectionRef = adminDb.collection("twitterConnections").doc(userId);
  await connectionRef.set({
    userId,
    twitterId: data.twitterId,
    username: data.username,
    accessToken: data.accessToken,
    refreshToken: data.refreshToken || null,
    expiresAt: Timestamp.fromDate(data.expiresAt),
    profileName: data.profileName,
    profilePicture: data.profilePicture || null,
    connectedAt: FieldValue.serverTimestamp(),
    lastUsedAt: null,
  });
}

/**
 * Update Twitter tokens after refresh (server-side)
 */
export async function updateTwitterTokensAdmin(
  userId: string,
  accessToken: string,
  refreshToken: string | undefined,
  expiresAt: Date
): Promise<void> {
  if (!adminDb) {
    throw new Error("Firebase Admin not initialized");
  }

  const connectionRef = adminDb.collection("twitterConnections").doc(userId);
  await connectionRef.update({
    accessToken,
    refreshToken: refreshToken || null,
    expiresAt: Timestamp.fromDate(expiresAt),
  });
}

/**
 * Update Twitter last used timestamp (server-side)
 */
export async function updateTwitterLastUsedAdmin(userId: string): Promise<void> {
  if (!adminDb) {
    throw new Error("Firebase Admin not initialized");
  }

  const connectionRef = adminDb.collection("twitterConnections").doc(userId);
  await connectionRef.update({
    lastUsedAt: FieldValue.serverTimestamp(),
  });
}

/**
 * Save Twitter post record (server-side)
 */
export async function saveTwitterPostAdmin(
  userId: string,
  data: {
    twitterId: string;
    tweetId: string;
    content: string;
    tweetUrl?: string;
    success: boolean;
    error?: string;
  }
): Promise<string> {
  if (!adminDb) {
    throw new Error("Firebase Admin not initialized");
  }

  const postsRef = adminDb.collection("twitterPosts");
  const docRef = await postsRef.add({
    userId,
    twitterId: data.twitterId,
    tweetId: data.tweetId,
    content: data.content,
    tweetUrl: data.tweetUrl || null,
    success: data.success,
    error: data.error || null,
    publishedAt: FieldValue.serverTimestamp(),
  });
  return docRef.id;
}

// ============== FACEBOOK ADMIN FUNCTIONS ==============

// Facebook Connection Data type
export interface FacebookConnectionDataAdmin {
  userId: string;
  facebookId: string;
  accessToken: string;
  expiresAt: Timestamp;
  profileName: string;
  profilePicture?: string;
  email?: string;
  pages: Array<{
    id: string;
    name: string;
    accessToken: string;
  }>;
  selectedPageId?: string;
  connectedAt: Timestamp;
  lastUsedAt?: Timestamp;
}

/**
 * Get Facebook connection for a user (server-side)
 */
export async function getFacebookConnectionAdmin(
  userId: string
): Promise<FacebookConnectionDataAdmin | null> {
  if (!adminDb) {
    throw new Error("Firebase Admin not initialized");
  }

  const connectionRef = adminDb.collection("facebookConnections").doc(userId);
  const connectionSnap = await connectionRef.get();

  if (connectionSnap.exists) {
    return connectionSnap.data() as FacebookConnectionDataAdmin;
  }
  return null;
}

/**
 * Save Facebook connection (server-side)
 */
export async function saveFacebookConnectionAdmin(
  userId: string,
  data: {
    facebookId: string;
    accessToken: string;
    expiresAt: Date;
    profileName: string;
    profilePicture?: string;
    email?: string;
    pages: Array<{
      id: string;
      name: string;
      accessToken: string;
    }>;
    selectedPageId?: string;
  }
): Promise<void> {
  if (!adminDb) {
    throw new Error("Firebase Admin not initialized");
  }

  const connectionRef = adminDb.collection("facebookConnections").doc(userId);
  await connectionRef.set({
    userId,
    facebookId: data.facebookId,
    accessToken: data.accessToken,
    expiresAt: Timestamp.fromDate(data.expiresAt),
    profileName: data.profileName,
    profilePicture: data.profilePicture || null,
    email: data.email || null,
    pages: data.pages,
    selectedPageId: data.selectedPageId || (data.pages.length > 0 ? data.pages[0].id : null),
    connectedAt: FieldValue.serverTimestamp(),
    lastUsedAt: null,
  });
}

/**
 * Update Facebook last used timestamp (server-side)
 */
export async function updateFacebookLastUsedAdmin(userId: string): Promise<void> {
  if (!adminDb) {
    throw new Error("Firebase Admin not initialized");
  }

  const connectionRef = adminDb.collection("facebookConnections").doc(userId);
  await connectionRef.update({
    lastUsedAt: FieldValue.serverTimestamp(),
  });
}

/**
 * Save Facebook post record (server-side)
 */
export async function saveFacebookPostAdmin(
  userId: string,
  data: {
    facebookId: string;
    postId: string;
    pageId?: string;
    content: string;
    postUrl?: string;
    success: boolean;
    error?: string;
  }
): Promise<string> {
  if (!adminDb) {
    throw new Error("Firebase Admin not initialized");
  }

  const postsRef = adminDb.collection("facebookPosts");
  const docRef = await postsRef.add({
    userId,
    facebookId: data.facebookId,
    postId: data.postId,
    pageId: data.pageId || null,
    content: data.content,
    postUrl: data.postUrl || null,
    success: data.success,
    error: data.error || null,
    publishedAt: FieldValue.serverTimestamp(),
  });
  return docRef.id;
}

// ============== THREADS ADMIN FUNCTIONS ==============

// Threads Connection Data type
export interface ThreadsConnectionDataAdmin {
  userId: string;
  threadsId: string;
  username: string;
  accessToken: string;
  expiresAt: Timestamp;
  profileName: string;
  profilePicture?: string;
  connectedAt: Timestamp;
  lastUsedAt?: Timestamp;
}

/**
 * Get Threads connection for a user (server-side)
 */
export async function getThreadsConnectionAdmin(
  userId: string
): Promise<ThreadsConnectionDataAdmin | null> {
  if (!adminDb) {
    throw new Error("Firebase Admin not initialized");
  }

  const connectionRef = adminDb.collection("threadsConnections").doc(userId);
  const connectionSnap = await connectionRef.get();

  if (connectionSnap.exists) {
    return connectionSnap.data() as ThreadsConnectionDataAdmin;
  }
  return null;
}

/**
 * Save Threads connection (server-side)
 */
export async function saveThreadsConnectionAdmin(
  userId: string,
  data: {
    threadsId: string;
    username: string;
    accessToken: string;
    expiresAt: Date;
    profileName: string;
    profilePicture?: string;
  }
): Promise<void> {
  if (!adminDb) {
    throw new Error("Firebase Admin not initialized");
  }

  const connectionRef = adminDb.collection("threadsConnections").doc(userId);
  await connectionRef.set({
    userId,
    threadsId: data.threadsId,
    username: data.username,
    accessToken: data.accessToken,
    expiresAt: Timestamp.fromDate(data.expiresAt),
    profileName: data.profileName,
    profilePicture: data.profilePicture || null,
    connectedAt: FieldValue.serverTimestamp(),
    lastUsedAt: null,
  });
}

/**
 * Update Threads last used timestamp (server-side)
 */
export async function updateThreadsLastUsedAdmin(userId: string): Promise<void> {
  if (!adminDb) {
    throw new Error("Firebase Admin not initialized");
  }

  const connectionRef = adminDb.collection("threadsConnections").doc(userId);
  await connectionRef.update({
    lastUsedAt: FieldValue.serverTimestamp(),
  });
}

/**
 * Save Threads post record (server-side)
 */
export async function saveThreadsPostAdmin(
  userId: string,
  data: {
    threadsId: string;
    threadId: string;
    content: string;
    permalink?: string;
    success: boolean;
    error?: string;
  }
): Promise<string> {
  if (!adminDb) {
    throw new Error("Firebase Admin not initialized");
  }

  const postsRef = adminDb.collection("threadsPosts");
  const docRef = await postsRef.add({
    userId,
    threadsId: data.threadsId,
    threadId: data.threadId,
    content: data.content,
    permalink: data.permalink || null,
    success: data.success,
    error: data.error || null,
    publishedAt: FieldValue.serverTimestamp(),
  });
  return docRef.id;
}

