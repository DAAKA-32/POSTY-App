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
import { DAILY_MESSAGE_LIMITS, isTestModeValid } from "@/lib/plans";

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
  plan: SubscriptionPlan;
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
export async function checkUserQuotaAdmin(userId: string): Promise<QuotaCheckResult> {
  if (!adminDb) {
    throw new Error("Firebase Admin not initialized");
  }

  const userRef = adminDb.collection("users").doc(userId);
  const userSnap = await userRef.get();

  // Default free plan limits
  const defaultResult: QuotaCheckResult = {
    canGenerate: true,
    plan: "free",
    dailyLimit: DAILY_MESSAGE_LIMITS.free,
    usedToday: 0,
    remaining: DAILY_MESSAGE_LIMITS.free,
  };

  if (!userSnap.exists) {
    // New user, use free limits
    return defaultResult;
  }

  const data = userSnap.data();
  if (!data) return defaultResult;

  // Check for test mode - test plan takes precedence if active and not expired
  const testModeResult = isTestModeValid(data.testMode);
  const isTestMode = testModeResult.isActive;
  const testPlan = testModeResult.plan;

  // Determine effective plan (test mode overrides actual subscription)
  // Handle legacy "starter" plan name from database
  const rawPlan = data.subscription?.plan || "free";
  let effectivePlan: SubscriptionPlan = (rawPlan === "starter" ? "pro" : rawPlan) as SubscriptionPlan;

  // Use test plan if test mode is active
  if (isTestMode && testPlan) {
    effectivePlan = testPlan as SubscriptionPlan;
  }

  const dailyLimit = DAILY_MESSAGE_LIMITS[effectivePlan];

  // Unlimited plan (-1) - Max plan and test mode with max plan
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

  if (!userSnap.exists) {
    // Create user document with initial quota
    await userRef.set({
      uid: userId,
      quota: {
        dailyMessageCount: 1,
        lastMessageDate: Timestamp.fromDate(today),
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

  await userRef.update({
    "quota.dailyMessageCount": newCount,
    "quota.lastMessageDate": Timestamp.fromDate(today),
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
  plan: SubscriptionPlan;
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

  // Check for test mode - test plan takes precedence if active and not expired
  const testModeResult2 = isTestModeValid(data?.testMode);
  const isTestMode = testModeResult2.isActive;
  const testPlan = testModeResult2.plan;

  // Determine effective plan (handle legacy "starter" plan name)
  const rawPlan2 = data?.subscription?.plan || "free";
  let effectivePlan: SubscriptionPlan = (rawPlan2 === "starter" ? "pro" : rawPlan2) as SubscriptionPlan;

  // Use test plan if active
  if (isTestMode && testPlan) {
    effectivePlan = testPlan as SubscriptionPlan;
  }

  return {
    plan: effectivePlan,
    profile: data?.profile,
    isTestMode,
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

// ============== MEDIUM ADMIN FUNCTIONS ==============

// Medium Connection Data type
export interface MediumConnectionData {
  userId: string;
  mediumId: string;
  username: string;
  integrationToken: string;
  profileName: string;
  profilePicture?: string;
  profileUrl?: string;
  connectedAt: Timestamp;
  lastUsedAt?: Timestamp;
}

export type MediumPublishStatus = "draft" | "public" | "unlisted";

/**
 * Get Medium connection for a user (server-side)
 */
export async function getMediumConnectionAdmin(
  userId: string
): Promise<MediumConnectionData | null> {
  if (!adminDb) {
    throw new Error("Firebase Admin not initialized");
  }

  const connectionRef = adminDb.collection("mediumConnections").doc(userId);
  const connectionSnap = await connectionRef.get();

  if (connectionSnap.exists) {
    return connectionSnap.data() as MediumConnectionData;
  }
  return null;
}

/**
 * Update Medium last used timestamp (server-side)
 */
export async function updateMediumLastUsedAdmin(userId: string): Promise<void> {
  if (!adminDb) {
    throw new Error("Firebase Admin not initialized");
  }

  const connectionRef = adminDb.collection("mediumConnections").doc(userId);
  await connectionRef.update({
    lastUsedAt: FieldValue.serverTimestamp(),
  });
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

/**
 * Save Medium post record (server-side)
 */
export async function saveMediumPostAdmin(
  userId: string,
  data: {
    mediumId: string;
    articleId: string;
    title: string;
    content: string;
    articleUrl?: string;
    publishStatus: MediumPublishStatus;
    success: boolean;
    error?: string;
  }
): Promise<string> {
  if (!adminDb) {
    throw new Error("Firebase Admin not initialized");
  }

  const postsRef = adminDb.collection("mediumPosts");
  const docRef = await postsRef.add({
    userId,
    mediumId: data.mediumId,
    articleId: data.articleId,
    title: data.title,
    content: data.content,
    articleUrl: data.articleUrl || null,
    publishStatus: data.publishStatus,
    success: data.success,
    error: data.error || null,
    publishedAt: FieldValue.serverTimestamp(),
  });
  return docRef.id;
}
