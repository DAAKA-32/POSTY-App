/**
 * API Permissions Middleware
 *
 * Server-side permission checking for API routes.
 * Uses Firebase Admin to verify user subscription and enforce limits.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, isAdminInitialized } from "./firebase-admin";
import {
  PlanType,
  PlanSource,
  getPlanLimits,
  Platform,
  isTestModeValid,
} from "./plans";
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
  canPublishSimultaneously,
  canConnectPlatform,
  shouldResetWeeklyQuota,
  shouldResetMonthlyQuota,
  getWeekStartDate,
  getMonthStartDate,
} from "./permissions";

// ============================================
// TYPES
// ============================================

export interface SubscriptionData {
  subscription: UserSubscription;
  usage: UserUsage;
  isTestMode: boolean;
}

export interface PermissionMiddlewareResult {
  allowed: boolean;
  subscription?: SubscriptionData;
  error?: {
    code: string;
    message: string;
    requiredPlan?: PlanType;
    status: number;
  };
}

// ============================================
// GET USER SUBSCRIPTION FROM FIRESTORE
// ============================================

/**
 * Fetch user subscription data from Firestore (server-side)
 */
export async function getUserSubscriptionData(userId: string): Promise<SubscriptionData | null> {
  try {
    const adminDb = getAdminDb();
    if (!adminDb) {
      console.error("Firebase Admin DB not initialized");
      return null;
    }

    const userDoc = await adminDb.collection("users").doc(userId).get();
    const userData = userDoc.data();

    if (!userData) {
      return null;
    }

    // Parse subscription data
    const subscriptionData = userData.subscription || {};
    const usageData = userData.usage || {};
    // Determine effective plan (test mode takes precedence if active and not expired)
    const testModeResult = isTestModeValid(userData.testMode);
    const isTestMode = testModeResult.isActive;
    const testPlan = testModeResult.plan;

    // Map old plan names to new ones
    let stripePlan: PlanType | null = null;
    if (subscriptionData.plan === "starter") stripePlan = "pro";
    else if (subscriptionData.plan === "pro") stripePlan = "max";
    else if (["pro", "max"].includes(subscriptionData.plan)) {
      stripePlan = subscriptionData.plan as PlanType;
    }

    const effectivePlan = isTestMode && testPlan ? testPlan : stripePlan;

    // Build subscription object
    // When test mode is active, force status to "active" so all permission checks pass
    const subscription: UserSubscription = {
      plan: effectivePlan,
      planSource: isTestMode ? "test" : "stripe",
      status: isTestMode && testPlan ? "active" : (subscriptionData.status || "active"),
      currentPeriodStart: subscriptionData.subscribedAt?.toDate(),
      currentPeriodEnd: subscriptionData.expiresAt?.toDate(),
    };

    // Parse daily quota data
    const quotaData = userData.quota || {};
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

    const usage: UserUsage = {
      messagesUsedToday,
      lastMessageDate,
      conversationsThisWeek,
      conversationsThisMonth,
      lastConversationDate: usageData.lastConversationDate?.toDate(),
      weekStartDate,
      monthStartDate,
    };

    return {
      subscription,
      usage,
      isTestMode,
    };
  } catch (error) {
    console.error("Error fetching subscription data:", error);
    return null;
  }
}

// ============================================
// INCREMENT USAGE (SERVER-SIDE)
// ============================================

/**
 * Increment conversation count for a user (server-side)
 */
export async function incrementUserConversationCount(userId: string): Promise<void> {
  try {
    const adminDb = getAdminDb();
    if (!adminDb) {
      console.error("Firebase Admin DB not initialized");
      return;
    }

    const userRef = adminDb.collection("users").doc(userId);
    const userDoc = await userRef.get();
    const userData = userDoc.data();

    if (!userData) return;

    const usageData = userData.usage || {};
    const now = new Date();
    const weekStartDate = usageData.weekStartDate?.toDate();
    const monthStartDate = usageData.monthStartDate?.toDate();

    // Calculate new counts
    let newWeeklyCount = usageData.conversationsThisWeek || 0;
    let newMonthlyCount = usageData.conversationsThisMonth || 0;
    let newWeekStart = weekStartDate || getWeekStartDate();
    let newMonthStart = monthStartDate || getMonthStartDate();

    // Check if we need to reset weekly
    if (shouldResetWeeklyQuota(weekStartDate)) {
      newWeeklyCount = 0;
      newWeekStart = getWeekStartDate();
    }

    // Check if we need to reset monthly
    if (shouldResetMonthlyQuota(monthStartDate)) {
      newMonthlyCount = 0;
      newMonthStart = getMonthStartDate();
    }

    // Increment counts
    newWeeklyCount += 1;
    newMonthlyCount += 1;

    // Update Firestore
    await userRef.update({
      "usage.conversationsThisWeek": newWeeklyCount,
      "usage.conversationsThisMonth": newMonthlyCount,
      "usage.lastConversationDate": now,
      "usage.weekStartDate": newWeekStart,
      "usage.monthStartDate": newMonthStart,
    });
  } catch (error) {
    console.error("Error incrementing conversation count:", error);
    throw error;
  }
}

// ============================================
// PERMISSION CHECK MIDDLEWARE
// ============================================

/**
 * Check if user can send a message (for /api/generate, /api/chat)
 */
export async function checkCanSendMessage(userId: string): Promise<PermissionMiddlewareResult> {
  const data = await getUserSubscriptionData(userId);

  if (!data) {
    return {
      allowed: false,
      error: {
        code: "USER_NOT_FOUND",
        message: "Utilisateur non trouvé",
        status: 404,
      },
    };
  }

  const result = canSendMessage(data.subscription, data.usage);

  if (!result.allowed) {
    return {
      allowed: false,
      subscription: data,
      error: {
        code: "QUOTA_EXCEEDED",
        message: result.reason || "Quota dépassé",
        requiredPlan: result.requiredPlan,
        status: 403,
      },
    };
  }

  return { allowed: true, subscription: data };
}

/**
 * Check if prompt length is within limits
 */
export async function checkPromptLength(
  userId: string,
  promptLength: number
): Promise<PermissionMiddlewareResult> {
  const data = await getUserSubscriptionData(userId);

  if (!data) {
    return {
      allowed: false,
      error: {
        code: "USER_NOT_FOUND",
        message: "Utilisateur non trouvé",
        status: 404,
      },
    };
  }

  const result = canUsePromptLength(data.subscription, promptLength);

  if (!result.allowed) {
    return {
      allowed: false,
      subscription: data,
      error: {
        code: "PROMPT_TOO_LONG",
        message: result.reason || "Prompt trop long",
        requiredPlan: result.requiredPlan,
        status: 403,
      },
    };
  }

  return { allowed: true, subscription: data };
}

/**
 * Check if user can send to specified number of relations
 */
export async function checkRelationsCount(
  userId: string,
  relationsCount: number
): Promise<PermissionMiddlewareResult> {
  const data = await getUserSubscriptionData(userId);

  if (!data) {
    return {
      allowed: false,
      error: {
        code: "USER_NOT_FOUND",
        message: "Utilisateur non trouvé",
        status: 404,
      },
    };
  }

  const result = canSendToRelations(data.subscription, relationsCount);

  if (!result.allowed) {
    return {
      allowed: false,
      subscription: data,
      error: {
        code: "RELATIONS_LIMIT_EXCEEDED",
        message: result.reason || "Limite de relations dépassée",
        requiredPlan: result.requiredPlan,
        status: 403,
      },
    };
  }

  return { allowed: true, subscription: data };
}

/**
 * Check if user can use a specific platform
 */
export async function checkPlatformAccess(
  userId: string,
  platform: Platform
): Promise<PermissionMiddlewareResult> {
  const data = await getUserSubscriptionData(userId);

  if (!data) {
    return {
      allowed: false,
      error: {
        code: "USER_NOT_FOUND",
        message: "Utilisateur non trouvé",
        status: 404,
      },
    };
  }

  const result = canUsePlatform(data.subscription, platform);

  if (!result.allowed) {
    return {
      allowed: false,
      subscription: data,
      error: {
        code: "PLATFORM_NOT_ALLOWED",
        message: result.reason || "Plateforme non disponible",
        requiredPlan: result.requiredPlan,
        status: 403,
      },
    };
  }

  return { allowed: true, subscription: data };
}

/**
 * Check if user can schedule posts
 */
export async function checkCanSchedule(userId: string): Promise<PermissionMiddlewareResult> {
  const data = await getUserSubscriptionData(userId);

  if (!data) {
    return {
      allowed: false,
      error: {
        code: "USER_NOT_FOUND",
        message: "Utilisateur non trouvé",
        status: 404,
      },
    };
  }

  const result = canSchedulePosts(data.subscription);

  if (!result.allowed) {
    return {
      allowed: false,
      subscription: data,
      error: {
        code: "SCHEDULING_NOT_ALLOWED",
        message: result.reason || "Programmation non disponible",
        requiredPlan: result.requiredPlan,
        status: 403,
      },
    };
  }

  return { allowed: true, subscription: data };
}

/**
 * Check if user can manage conversations (rename, pin, delete)
 */
export async function checkCanManageConversations(userId: string): Promise<PermissionMiddlewareResult> {
  const data = await getUserSubscriptionData(userId);

  if (!data) {
    return {
      allowed: false,
      error: {
        code: "USER_NOT_FOUND",
        message: "Utilisateur non trouvé",
        status: 404,
      },
    };
  }

  const result = canManageConversations(data.subscription);

  if (!result.allowed) {
    return {
      allowed: false,
      subscription: data,
      error: {
        code: "MANAGEMENT_NOT_ALLOWED",
        message: result.reason || "Gestion des conversations non disponible",
        requiredPlan: result.requiredPlan,
        status: 403,
      },
    };
  }

  return { allowed: true, subscription: data };
}

/**
 * Check if user can publish simultaneously to multiple platforms (MAX only)
 */
export async function checkCanPublishSimultaneously(userId: string): Promise<PermissionMiddlewareResult> {
  const data = await getUserSubscriptionData(userId);

  if (!data) {
    return {
      allowed: false,
      error: {
        code: "USER_NOT_FOUND",
        message: "Utilisateur non trouvé",
        status: 404,
      },
    };
  }

  const result = canPublishSimultaneously(data.subscription);

  if (!result.allowed) {
    return {
      allowed: false,
      subscription: data,
      error: {
        code: "SIMULTANEOUS_PUBLISH_NOT_ALLOWED",
        message: result.reason || "Publication simultanée non disponible",
        requiredPlan: result.requiredPlan,
        status: 403,
      },
    };
  }

  return { allowed: true, subscription: data };
}

/**
 * Check if user can connect another platform
 */
export async function checkCanConnectPlatform(
  userId: string,
  currentConnectionCount: number
): Promise<PermissionMiddlewareResult> {
  const data = await getUserSubscriptionData(userId);

  if (!data) {
    return {
      allowed: false,
      error: {
        code: "USER_NOT_FOUND",
        message: "Utilisateur non trouvé",
        status: 404,
      },
    };
  }

  const result = canConnectPlatform(data.subscription, currentConnectionCount);

  if (!result.allowed) {
    return {
      allowed: false,
      subscription: data,
      error: {
        code: "CONNECTION_LIMIT_EXCEEDED",
        message: result.reason || "Limite de connexions atteinte",
        requiredPlan: result.requiredPlan,
        status: 403,
      },
    };
  }

  return { allowed: true, subscription: data };
}

/**
 * Check if user can access multiple platforms (for multi-platform publishing)
 */
export async function checkMultiplePlatformAccess(
  userId: string,
  platforms: Platform[]
): Promise<PermissionMiddlewareResult> {
  const data = await getUserSubscriptionData(userId);

  if (!data) {
    return {
      allowed: false,
      error: {
        code: "USER_NOT_FOUND",
        message: "Utilisateur non trouvé",
        status: 404,
      },
    };
  }

  // Check each platform
  for (const platform of platforms) {
    const result = canUsePlatform(data.subscription, platform);
    if (!result.allowed) {
      return {
        allowed: false,
        subscription: data,
        error: {
          code: "PLATFORM_NOT_ALLOWED",
          message: result.reason || `Plateforme ${platform} non disponible`,
          requiredPlan: result.requiredPlan,
          status: 403,
        },
      };
    }
  }

  // If multiple platforms, check simultaneous publishing permission
  if (platforms.length > 1) {
    const simultaneousCheck = canPublishSimultaneously(data.subscription);
    if (!simultaneousCheck.allowed) {
      return {
        allowed: false,
        subscription: data,
        error: {
          code: "SIMULTANEOUS_PUBLISH_NOT_ALLOWED",
          message: simultaneousCheck.reason || "Publication simultanée non disponible",
          requiredPlan: simultaneousCheck.requiredPlan,
          status: 403,
        },
      };
    }
  }

  return { allowed: true, subscription: data };
}

// ============================================
// HELPER: CREATE ERROR RESPONSE
// ============================================

/**
 * Create a standardized error response for API routes
 */
export function createPermissionErrorResponse(
  result: PermissionMiddlewareResult
): NextResponse {
  if (!result.error) {
    return NextResponse.json({ error: "Unknown error" }, { status: 500 });
  }

  return NextResponse.json(
    {
      error: result.error.message,
      code: result.error.code,
      requiredPlan: result.error.requiredPlan,
      upgradeUrl: result.error.requiredPlan
        ? `/subscription?highlight=${result.error.requiredPlan}`
        : undefined,
    },
    { status: result.error.status }
  );
}

// ============================================
// COMBINED PERMISSION CHECK
// ============================================

interface GeneratePermissionParams {
  userId: string;
  promptLength: number;
  platform?: Platform;
  /** For multi-platform simultaneous publishing */
  platforms?: Platform[];
  relationsCount?: number;
  scheduled?: boolean;
}

/**
 * Combined permission check for /api/generate endpoint
 * Checks all relevant permissions in one call
 */
export async function checkGeneratePermissions(
  params: GeneratePermissionParams
): Promise<PermissionMiddlewareResult> {
  const { userId, promptLength, platform, platforms, relationsCount, scheduled } = params;

  // Get subscription data once
  const data = await getUserSubscriptionData(userId);

  if (!data) {
    return {
      allowed: false,
      error: {
        code: "USER_NOT_FOUND",
        message: "Utilisateur non trouvé",
        status: 404,
      },
    };
  }

  // Check message quota
  const messageCheck = canSendMessage(data.subscription, data.usage);
  if (!messageCheck.allowed) {
    return {
      allowed: false,
      subscription: data,
      error: {
        code: "QUOTA_EXCEEDED",
        message: messageCheck.reason || "Quota dépassé",
        requiredPlan: messageCheck.requiredPlan,
        status: 403,
      },
    };
  }

  // Check prompt length
  const promptCheck = canUsePromptLength(data.subscription, promptLength);
  if (!promptCheck.allowed) {
    return {
      allowed: false,
      subscription: data,
      error: {
        code: "PROMPT_TOO_LONG",
        message: promptCheck.reason || "Prompt trop long",
        requiredPlan: promptCheck.requiredPlan,
        status: 403,
      },
    };
  }

  // Check multiple platforms if specified (for simultaneous publishing)
  if (platforms && platforms.length > 0) {
    // Check each platform
    for (const p of platforms) {
      const platformCheck = canUsePlatform(data.subscription, p);
      if (!platformCheck.allowed) {
        return {
          allowed: false,
          subscription: data,
          error: {
            code: "PLATFORM_NOT_ALLOWED",
            message: platformCheck.reason || `Plateforme ${p} non disponible`,
            requiredPlan: platformCheck.requiredPlan,
            status: 403,
          },
        };
      }
    }

    // If multiple platforms, check simultaneous publishing permission
    if (platforms.length > 1) {
      const simultaneousCheck = canPublishSimultaneously(data.subscription);
      if (!simultaneousCheck.allowed) {
        return {
          allowed: false,
          subscription: data,
          error: {
            code: "SIMULTANEOUS_PUBLISH_NOT_ALLOWED",
            message: simultaneousCheck.reason || "Publication simultanée non disponible avec votre plan",
            requiredPlan: simultaneousCheck.requiredPlan,
            status: 403,
          },
        };
      }
    }
  }
  // Check single platform if specified (legacy support)
  else if (platform) {
    const platformCheck = canUsePlatform(data.subscription, platform);
    if (!platformCheck.allowed) {
      return {
        allowed: false,
        subscription: data,
        error: {
          code: "PLATFORM_NOT_ALLOWED",
          message: platformCheck.reason || "Plateforme non disponible",
          requiredPlan: platformCheck.requiredPlan,
          status: 403,
        },
      };
    }
  }

  // Check relations count if specified
  if (relationsCount !== undefined && relationsCount > 0) {
    const relationsCheck = canSendToRelations(data.subscription, relationsCount);
    if (!relationsCheck.allowed) {
      return {
        allowed: false,
        subscription: data,
        error: {
          code: "RELATIONS_LIMIT_EXCEEDED",
          message: relationsCheck.reason || "Limite de relations dépassée",
          requiredPlan: relationsCheck.requiredPlan,
          status: 403,
        },
      };
    }
  }

  // Check scheduling if specified
  if (scheduled) {
    const scheduleCheck = canSchedulePosts(data.subscription);
    if (!scheduleCheck.allowed) {
      return {
        allowed: false,
        subscription: data,
        error: {
          code: "SCHEDULING_NOT_ALLOWED",
          message: scheduleCheck.reason || "Programmation non disponible",
          requiredPlan: scheduleCheck.requiredPlan,
          status: 403,
        },
      };
    }
  }

  return { allowed: true, subscription: data };
}
