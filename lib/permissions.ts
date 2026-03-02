/**
 * Permissions Service - Feature Gating & Access Control
 *
 * Centralized service to check user permissions based on their subscription plan.
 * This is the single point of truth for all feature access decisions.
 */

import {
  PlanType,
  PlanSource,
  Platform,
  getPlanLimits,
  getPlanConfig,
  isPlatformAllowed,
  planHasFeature,
  getMinimumPlanForFeature,
  getMinimumPlanForPlatform,
  canPublishToMultiplePlatforms,
  getMaxPlatformConnections,
  canConnectMorePlatforms,
  PLATFORM_INFO,
} from "./plans";

// Re-export types from plans for convenience
export type { Platform } from "./plans";

// ============================================
// TYPES
// ============================================

export interface UserSubscription {
  plan: PlanType | null;
  planSource: PlanSource;
  status: "active" | "inactive" | "canceled" | "past_due" | "trialing";
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
}

export interface UserUsage {
  // Daily tracking (actively enforced)
  messagesUsedToday: number;
  lastMessageDate?: Date;
  // Weekly/monthly tracking (for future enforcement)
  conversationsThisWeek: number;
  conversationsThisMonth: number;
  lastConversationDate?: Date;
  weekStartDate?: Date;
  monthStartDate?: Date;
}

export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
  requiredPlan?: PlanType;
  currentUsage?: number;
  limit?: number;
}

export interface PermissionError {
  code: string;
  message: string;
  requiredPlan?: PlanType;
  upgradeUrl?: string;
}

// ============================================
// PERMISSION CHECK FUNCTIONS
// ============================================

/**
 * Check if user can send a message (based on conversation quota)
 */
export function canSendMessage(
  subscription: UserSubscription,
  usage: UserUsage
): PermissionCheckResult {
  // No subscription = not allowed
  if (!subscription.plan) {
    return {
      allowed: false,
      reason: "Abonnement requis",
      requiredPlan: "pro",
    };
  }

  const limits = getPlanLimits(subscription.plan);

  // Check subscription status
  if (subscription.status !== "active" && subscription.status !== "trialing") {
    return {
      allowed: false,
      reason: "Votre abonnement n'est pas actif",
    };
  }

  // Check daily limit
  if (limits.quotaResetPeriod === "daily" && limits.messagesPerDay !== -1) {
    if (usage.messagesUsedToday >= limits.messagesPerDay) {
      return {
        allowed: false,
        reason: `Limite quotidienne atteinte (${limits.messagesPerDay} messages)`,
        requiredPlan: "pro",
        currentUsage: usage.messagesUsedToday,
        limit: limits.messagesPerDay,
      };
    }
  }

  // Check weekly limit (future enforcement)
  if (limits.quotaResetPeriod === "weekly" && limits.conversationsPerWeek !== -1) {
    if (usage.conversationsThisWeek >= limits.conversationsPerWeek) {
      return {
        allowed: false,
        reason: `Limite hebdomadaire atteinte (${limits.conversationsPerWeek} conversations)`,
        requiredPlan: "pro",
        currentUsage: usage.conversationsThisWeek,
        limit: limits.conversationsPerWeek,
      };
    }
  }

  // Check monthly limit (future enforcement)
  if (limits.quotaResetPeriod === "monthly" && limits.conversationsPerMonth !== -1) {
    if (usage.conversationsThisMonth >= limits.conversationsPerMonth) {
      return {
        allowed: false,
        reason: `Limite mensuelle atteinte (${limits.conversationsPerMonth} conversations)`,
        requiredPlan: "max",
        currentUsage: usage.conversationsThisMonth,
        limit: limits.conversationsPerMonth,
      };
    }
  }

  return { allowed: true };
}

/**
 * Check if prompt length is within plan limits
 */
export function canUsePromptLength(
  subscription: UserSubscription,
  promptLength: number
): PermissionCheckResult {
  if (!subscription.plan) {
    return { allowed: false, reason: "Abonnement requis", requiredPlan: "pro" };
  }

  const limits = getPlanLimits(subscription.plan);

  if (promptLength > limits.maxCharactersPerPrompt) {
    // Find which plan allows this length
    let requiredPlan: PlanType = "max";
    if (promptLength <= 300) requiredPlan = "pro";

    return {
      allowed: false,
      reason: `Votre prompt dépasse la limite de ${limits.maxCharactersPerPrompt} caractères`,
      requiredPlan,
      currentUsage: promptLength,
      limit: limits.maxCharactersPerPrompt,
    };
  }

  return { allowed: true };
}

/**
 * Check if user can send to a specific number of relations
 */
export function canSendToRelations(
  subscription: UserSubscription,
  relationsCount: number
): PermissionCheckResult {
  if (!subscription.plan) {
    return { allowed: false, reason: "Abonnement requis", requiredPlan: "pro" };
  }

  const limits = getPlanLimits(subscription.plan);

  // Unlimited relations
  if (limits.maxRelations === -1) {
    return { allowed: true };
  }

  if (relationsCount > limits.maxRelations) {
    return {
      allowed: false,
      reason: `Votre plan limite l'envoi à ${limits.maxRelations} relation(s)`,
      requiredPlan: relationsCount <= 10 ? "pro" : "max",
      currentUsage: relationsCount,
      limit: limits.maxRelations,
    };
  }

  return { allowed: true };
}

/**
 * Check if user can use a specific platform
 */
export function canUsePlatform(
  subscription: UserSubscription,
  platform: Platform
): PermissionCheckResult {
  if (!subscription.plan) {
    return { allowed: false, reason: "Abonnement requis", requiredPlan: "pro" };
  }
  if (!isPlatformAllowed(subscription.plan, platform)) {
    const requiredPlan = getMinimumPlanForPlatform(platform);
    const platformNames: Record<Platform, string> = {
      linkedin: "LinkedIn",
      reddit: "Reddit",
      threads: "Threads",
      facebook: "Facebook",
    };

    return {
      allowed: false,
      reason: `${platformNames[platform]} n'est pas disponible avec votre plan`,
      requiredPlan,
    };
  }

  return { allowed: true };
}

/**
 * Check if user can schedule posts
 */
export function canSchedulePosts(subscription: UserSubscription): PermissionCheckResult {
  if (!subscription.plan) {
    return { allowed: false, reason: "Votre abonnement n'est pas actif. Merci de vérifier votre paiement.", requiredPlan: "pro" };
  }

  // Check subscription status
  if (subscription.status !== "active" && subscription.status !== "trialing") {
    return {
      allowed: false,
      reason: "Votre abonnement n'est pas actif. Merci de vérifier votre paiement.",
    };
  }

  if (!planHasFeature(subscription.plan, "canSchedulePosts")) {
    return {
      allowed: false,
      reason: "Votre abonnement ne permet pas la programmation. Merci de vérifier votre paiement.",
      requiredPlan: getMinimumPlanForFeature("canSchedulePosts"),
    };
  }

  return { allowed: true };
}

/**
 * Check if user can manage conversations (rename, pin, delete)
 */
export function canManageConversations(subscription: UserSubscription): PermissionCheckResult {
  if (!subscription.plan) {
    return { allowed: false, reason: "Abonnement requis", requiredPlan: "pro" };
  }
  if (!planHasFeature(subscription.plan, "canManageConversations")) {
    return {
      allowed: false,
      reason: "La gestion avancée des conversations n'est pas disponible avec votre plan",
      requiredPlan: getMinimumPlanForFeature("canManageConversations"),
    };
  }

  return { allowed: true };
}

/**
 * Check if user has personalized responses
 */
export function hasPersonalizedResponses(subscription: UserSubscription): boolean {
  if (!subscription.plan) return false;
  return planHasFeature(subscription.plan, "hasPersonalizedResponses");
}

/**
 * Check if user has audience targeting
 */
export function hasAudienceTargeting(subscription: UserSubscription): boolean {
  if (!subscription.plan) return false;
  return planHasFeature(subscription.plan, "hasAudienceTargeting");
}

/**
 * Check if user has priority processing
 */
export function hasPriorityProcessing(subscription: UserSubscription): boolean {
  if (!subscription.plan) return false;
  return planHasFeature(subscription.plan, "hasPriorityProcessing");
}

/**
 * Check if user has early access to new features
 */
export function hasEarlyAccess(subscription: UserSubscription): boolean {
  if (!subscription.plan) return false;
  return planHasFeature(subscription.plan, "hasEarlyAccess");
}

/**
 * Check if user has dual response mode (Storytelling + Business)
 */
export function hasDualResponseMode(subscription: UserSubscription): boolean {
  if (!subscription.plan) return false;
  return planHasFeature(subscription.plan, "hasDualResponseMode");
}

// ============================================
// MULTI-PLATFORM PUBLISHING CHECKS
// ============================================

/**
 * Check if user can publish to multiple platforms simultaneously
 */
export function canPublishSimultaneously(subscription: UserSubscription): PermissionCheckResult {
  if (!subscription.plan) {
    return { allowed: false, reason: "Abonnement requis", requiredPlan: "max" };
  }
  if (!canPublishToMultiplePlatforms(subscription.plan)) {
    return {
      allowed: false,
      reason: "La publication simultanée multi-plateformes nécessite le plan Max",
      requiredPlan: "max",
    };
  }
  return { allowed: true };
}

/**
 * Check if user can connect more platforms
 */
export function canConnectPlatform(
  subscription: UserSubscription,
  currentConnectionCount: number
): PermissionCheckResult {
  if (!subscription.plan) {
    return { allowed: false, reason: "Abonnement requis", requiredPlan: "pro" };
  }
  const maxConnections = getMaxPlatformConnections(subscription.plan);

  if (currentConnectionCount >= maxConnections) {
    // Determine required plan based on desired connections
    let requiredPlan: PlanType = "max";
    if (currentConnectionCount < 2) requiredPlan = "pro";

    return {
      allowed: false,
      reason: `Votre plan permet de connecter ${maxConnections} plateforme(s) maximum`,
      requiredPlan,
      currentUsage: currentConnectionCount,
      limit: maxConnections,
    };
  }

  return { allowed: true };
}

/**
 * Check if a specific platform is available for the user's plan
 * Returns detailed info about the platform
 */
export function getPlatformAccessInfo(
  subscription: UserSubscription,
  platform: Platform
): {
  hasAccess: boolean;
  platformName: string;
  platformColor: string;
  requiredPlan: PlanType;
  upgradeMessage?: string;
} {
  const info = PLATFORM_INFO[platform];
  const hasAccess = subscription.plan ? isPlatformAllowed(subscription.plan, platform) : false;

  return {
    hasAccess,
    platformName: info.name,
    platformColor: info.color,
    requiredPlan: info.minPlan,
    upgradeMessage: hasAccess
      ? undefined
      : `${info.name} est disponible avec le plan ${info.minPlan === "pro" ? "Pro" : "Max"}`,
  };
}

/**
 * Get all platforms with their access status for the user
 */
export function getAllPlatformsAccessStatus(subscription: UserSubscription): Array<{
  platform: Platform;
  name: string;
  color: string;
  hasAccess: boolean;
  minPlan: PlanType;
}> {
  const platforms: Platform[] = ["linkedin", "reddit", "threads", "facebook"];

  return platforms.map(platform => {
    const info = PLATFORM_INFO[platform];
    return {
      platform,
      name: info.name,
      color: info.color,
      hasAccess: subscription.plan ? isPlatformAllowed(subscription.plan, platform) : false,
      minPlan: info.minPlan,
    };
  });
}

// ============================================
// COMPREHENSIVE PERMISSION CHECK
// ============================================

export type PermissionType =
  | "send_message"
  | "prompt_length"
  | "relations_count"
  | "platform"
  | "schedule_posts"
  | "manage_conversations"
  | "simultaneous_publish"
  | "connect_platform";

export interface PermissionCheckParams {
  type: PermissionType;
  promptLength?: number;
  relationsCount?: number;
  platform?: Platform;
  currentPlatformConnections?: number;
}

/**
 * Unified permission check function
 */
export function checkPermission(
  subscription: UserSubscription,
  usage: UserUsage,
  params: PermissionCheckParams
): PermissionCheckResult {
  switch (params.type) {
    case "send_message":
      return canSendMessage(subscription, usage);

    case "prompt_length":
      if (params.promptLength === undefined) {
        return { allowed: false, reason: "Longueur du prompt non spécifiée" };
      }
      return canUsePromptLength(subscription, params.promptLength);

    case "relations_count":
      if (params.relationsCount === undefined) {
        return { allowed: false, reason: "Nombre de relations non spécifié" };
      }
      return canSendToRelations(subscription, params.relationsCount);

    case "platform":
      if (!params.platform) {
        return { allowed: false, reason: "Plateforme non spécifiée" };
      }
      return canUsePlatform(subscription, params.platform);

    case "schedule_posts":
      return canSchedulePosts(subscription);

    case "manage_conversations":
      return canManageConversations(subscription);

    case "simultaneous_publish":
      return canPublishSimultaneously(subscription);

    case "connect_platform":
      if (params.currentPlatformConnections === undefined) {
        return { allowed: false, reason: "Nombre de connexions actuel non spécifié" };
      }
      return canConnectPlatform(subscription, params.currentPlatformConnections);

    default:
      return { allowed: false, reason: "Type de permission inconnu" };
  }
}

// ============================================
// ERROR GENERATION
// ============================================

/**
 * Generate a standardized permission error
 */
export function createPermissionError(result: PermissionCheckResult): PermissionError {
  const planConfig = result.requiredPlan ? getPlanConfig(result.requiredPlan) : null;

  return {
    code: "PERMISSION_DENIED",
    message: result.reason || "Action non autorisée",
    requiredPlan: result.requiredPlan,
    upgradeUrl: result.requiredPlan ? `/pricing?highlight=${result.requiredPlan}` : undefined,
  };
}

// ============================================
// USAGE TRACKING HELPERS
// ============================================

/**
 * Check if weekly quota should reset
 */
export function shouldResetWeeklyQuota(weekStartDate?: Date): boolean {
  if (!weekStartDate) return true;

  const now = new Date();
  const weekStart = new Date(weekStartDate);

  // Reset if more than 7 days have passed
  const daysDiff = Math.floor((now.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24));
  return daysDiff >= 7;
}

/**
 * Check if monthly quota should reset
 */
export function shouldResetMonthlyQuota(monthStartDate?: Date): boolean {
  if (!monthStartDate) return true;

  const now = new Date();
  const monthStart = new Date(monthStartDate);

  // Reset if different month
  return (
    now.getMonth() !== monthStart.getMonth() ||
    now.getFullYear() !== monthStart.getFullYear()
  );
}

/**
 * Get the start of the current week (Monday)
 */
export function getWeekStartDate(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
  const weekStart = new Date(now.setDate(diff));
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
}

/**
 * Get the start of the current month
 */
export function getMonthStartDate(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
}

// ============================================
// RESPONSE QUALITY HELPERS
// ============================================

/**
 * Get system prompt modifier based on plan's response quality
 */
export function getResponseQualityModifier(subscription: UserSubscription): string {
  if (!subscription.plan) return "";
  const limits = getPlanLimits(subscription.plan);

  switch (limits.responseQuality) {
    case "essential":
      return "Provide a concise, essential response. Keep it brief and to the point.";
    case "complete":
      return "Provide a complete and detailed response. Be thorough but focused.";
    case "ultra":
      return "Provide an ultra-detailed, comprehensive response. Include nuances, examples, and deep insights.";
    default:
      return "";
  }
}

/**
 * Get max response tokens based on plan
 */
export function getMaxResponseTokens(subscription: UserSubscription): number {
  if (!subscription.plan) return 500;
  const limits = getPlanLimits(subscription.plan);

  switch (limits.responseLength) {
    case "short":
      return 500;
    case "medium":
      return 1000;
    case "long":
      return 2000;
    default:
      return 500;
  }
}
