/**
 * Plan Configuration - Single Source of Truth
 *
 * This file defines all plan limits, features, and pricing.
 * Used by both frontend and backend for consistent behavior.
 */

// ============================================
// PRODUCTION MODE — TEST MODE FULLY DISABLED
// ============================================
export const PRODUCTION_MODE = true;

// ============================================
// FOUNDER PLAN OVERRIDE
// ============================================

/** Founder emails receive permanent Max plan access */
const FOUNDER_EMAILS: string[] = ["emilien.nepveu@gmail.com", "maubertcome27@gmail.com"];
const FOUNDER_OVERRIDE_PLAN: PlanType = "max";

/** Gift emails receive Max plan access (offered by founders) */
interface GiftRecipient {
  email: string;
  displayName: string; // First name for the welcome popup
}

const GIFT_RECIPIENTS: GiftRecipient[] = [
  { email: "cerisecottier@gmail.com", displayName: "Cerise" },
];

/** Check if an email belongs to a founder */
export function isFounderEmail(email?: string | null): boolean {
  if (!email) return false;
  return FOUNDER_EMAILS.includes(email.toLowerCase());
}

/** Check if an email belongs to a gift recipient */
export function isGiftRecipient(email?: string | null): boolean {
  if (!email) return false;
  return GIFT_RECIPIENTS.some(r => r.email === email.toLowerCase());
}

/** Get gift recipient info */
export function getGiftRecipientInfo(email?: string | null): GiftRecipient | null {
  if (!email) return null;
  return GIFT_RECIPIENTS.find(r => r.email === email.toLowerCase()) || null;
}

/**
 * Get the plan override for a founder.
 * Returns "max" for founder emails, null otherwise.
 */
export function getFounderOverridePlan(email?: string | null): PlanType | null {
  if (isFounderEmail(email)) return FOUNDER_OVERRIDE_PLAN;
  if (isGiftRecipient(email)) return "max";
  return null;
}

/**
 * Test mode is permanently disabled.
 * This function always returns false.
 * @deprecated Test mode has been removed. Use getFounderOverridePlan() instead.
 */
export function isTestModeAllowed(_email?: string | null): boolean {
  return false;
}

// Plan Types
export type PlanType = "free" | "pro" | "max";
export type PaidPlanType = "pro" | "max"; // Plans that can be purchased/trialed
export type PlanSource = "stripe" | "test" | "trial";
export type SubscriptionStatus = "active" | "inactive" | "canceled" | "past_due" | "trialing";

// ============================================
// TRIAL CONFIGURATION
// ============================================

/** Trial period duration in days (disabled — Free plan replaces trial) */
export const TRIAL_PERIOD_DAYS = 0;

/** Money-back guarantee period in days (after first payment post-trial) */
export const GUARANTEE_PERIOD_DAYS = 7;

/** Trial period duration in milliseconds */
export const TRIAL_PERIOD_MS = TRIAL_PERIOD_DAYS * 24 * 60 * 60 * 1000;

/** Default plan for trial (shown as primary CTA) */
export const DEFAULT_TRIAL_PLAN: PaidPlanType = "pro";

/** Plans that offer free trials (one trial per account, any plan) */
export const TRIAL_ELIGIBLE_PLANS: PaidPlanType[] = ["pro", "max"];

/**
 * Check if a plan type supports free trials
 */
export function isPlanTrialEligible(plan: PlanType): plan is PaidPlanType {
  return TRIAL_ELIGIBLE_PLANS.includes(plan as PaidPlanType);
}

// Platform Types - All supported social platforms
export type Platform = "linkedin" | "reddit" | "threads" | "facebook";

// Platform display information
export interface PlatformInfo {
  id: Platform;
  name: string;
  icon: string; // For reference in UI components
  color: string; // Brand color
  description: string;
  minPlan: PlanType; // Minimum plan required
}

export const PLATFORM_INFO: Record<Platform, PlatformInfo> = {
  linkedin: {
    id: "linkedin",
    name: "LinkedIn",
    icon: "linkedin",
    color: "#0A66C2",
    description: "Réseau professionnel #1",
    minPlan: "free",
  },
  reddit: {
    id: "reddit",
    name: "Reddit",
    icon: "reddit",
    color: "#FF4500",
    description: "Bientôt disponible",
    minPlan: "pro",
  },
  threads: {
    id: "threads",
    name: "Threads",
    icon: "threads",
    color: "#000000",
    description: "Conversations et micro-blogging",
    minPlan: "max",
  },
  facebook: {
    id: "facebook",
    name: "Facebook",
    icon: "facebook",
    color: "#1877F2",
    description: "Réseau social grand public",
    minPlan: "max",
  },
};

// Get all platforms as array
export function getAllPlatforms(): Platform[] {
  return Object.keys(PLATFORM_INFO) as Platform[];
}

// Get platforms available for a specific plan
export function getPlatformsForPlan(plan: PlanType | null): Platform[] {
  if (!plan) return [];
  const planOrder: Record<PlanType, number> = { free: 0, pro: 1, max: 2 };
  const currentPlanLevel = planOrder[plan];

  return getAllPlatforms().filter(platform => {
    const minPlanLevel = planOrder[PLATFORM_INFO[platform].minPlan];
    return currentPlanLevel >= minPlanLevel;
  });
}

// Plan Limits Interface
export interface PlanLimits {
  // Daily message limit (legacy — kept for analytics)
  messagesPerDay: number; // -1 = unlimited

  // Hourly message limit (rolling window — actively enforced)
  messagesPerHour: number; // -1 = unlimited

  // Conversations (weekly/monthly — for future use)
  conversationsPerWeek: number; // -1 = unlimited
  conversationsPerMonth: number; // -1 = unlimited

  // Characters
  maxCharactersPerPrompt: number;

  // Relations/Recipients
  maxRelations: number; // -1 = unlimited

  // Response Quality
  responseQuality: "essential" | "complete" | "ultra";
  responseLength: "short" | "medium" | "long";

  // Features
  canSchedulePosts: boolean;
  canManageConversations: boolean; // rename, pin, delete
  hasPersonalizedResponses: boolean; // based on onboarding profile
  hasAudienceTargeting: boolean; // responses targeted to audience
  hasPriorityProcessing: boolean;
  hasEarlyAccess: boolean;
  hasDualResponseMode: boolean; // Storytelling + Business dual responses
  dualResponsesPerWeek: number; // -1 = unlimited, 0 = disabled

  // URL Analysis
  hasUrlAnalysis: boolean; // Analyze URL content for post generation (Pro+)

  // Multi-Platform Publishing
  allowedPlatforms: Platform[];
  maxPlatformConnections: number; // Maximum number of platforms that can be connected
  canPublishSimultaneously: boolean; // Can publish to multiple platforms at once

  // Quotas Reset
  quotaResetPeriod: "daily" | "weekly" | "monthly";
}

// Plan Configuration
export interface PlanConfig {
  id: PlanType;
  name: string;
  displayName: string;
  description: string;
  price: {
    monthly: number;
    yearly: number;
  };
  limits: PlanLimits;
  badge?: string;
  highlight: boolean;
  premium: boolean;
  /** Trial period in days (0 = no trial, only for paid plans) */
  trialDays: number;
  /** Whether this plan is deprecated */
  deprecated?: boolean;
}

// ============================================
// PLAN CONFIGURATIONS
// ============================================

export const PLAN_CONFIGS: Record<PlanType, PlanConfig> = {
  free: {
    id: "free",
    name: "Free",
    displayName: "Gratuit",
    description: "Testez Posty gratuitement et publiez vos premiers posts LinkedIn",
    price: {
      monthly: 0,
      yearly: 0,
    },
    limits: {
      messagesPerDay: 3, // Soft daily cap (real limit is monthly)
      messagesPerHour: 2, // Anti-abuse
      conversationsPerWeek: -1,
      conversationsPerMonth: 3, // 3 posts per month — primary enforcement
      maxCharactersPerPrompt: 300,
      maxRelations: 0,
      responseQuality: "essential",
      responseLength: "short",
      canSchedulePosts: false,
      canManageConversations: false,
      hasPersonalizedResponses: false,
      hasAudienceTargeting: false,
      hasPriorityProcessing: false,
      hasEarlyAccess: false,
      hasDualResponseMode: false,
      dualResponsesPerWeek: 0,
      hasUrlAnalysis: false,
      allowedPlatforms: ["linkedin"],
      maxPlatformConnections: 1,
      canPublishSimultaneously: false,
      quotaResetPeriod: "monthly",
    },
    highlight: false,
    premium: false,
    trialDays: 0,
  },

  pro: {
    id: "pro",
    name: "Pro",
    displayName: "Pro",
    description: "Tout pour publier et convertir sur LinkedIn",
    price: {
      monthly: 12.90,
      yearly: 129, // -17% (10.75€/mois)
    },
    limits: {
      messagesPerDay: 60, // 60 créations par jour (reset minuit UTC)
      messagesPerHour: 50, // Rolling window: 50 msg/hour (anti-abuse)
      conversationsPerWeek: -1, // Unlimited
      conversationsPerMonth: -1, // Unlimited (daily enforcement only)
      maxCharactersPerPrompt: 300,
      maxRelations: 10,
      responseQuality: "complete",
      responseLength: "medium",
      canSchedulePosts: true,
      canManageConversations: true,
      hasPersonalizedResponses: true,
      hasAudienceTargeting: false,
      hasPriorityProcessing: false,
      hasEarlyAccess: false,
      hasDualResponseMode: true, // Limited dual mode (3/week)
      dualResponsesPerWeek: 3, // 3 dual generations per week
      // URL Analysis
      hasUrlAnalysis: true,
      // Multi-Platform: LinkedIn + Reddit
      allowedPlatforms: ["linkedin", "reddit"],
      maxPlatformConnections: 2,
      canPublishSimultaneously: false, // One platform at a time
      quotaResetPeriod: "daily",
    },
    badge: "Recommandé",
    highlight: true,
    premium: false,
    trialDays: TRIAL_PERIOD_DAYS,
  },

  max: {
    id: "max",
    name: "Max",
    displayName: "Max",
    description: "Puissance maximale, 4 plateformes, zéro limite",
    price: {
      monthly: 19.90,
      yearly: 199, // -17% (16.58€/mois)
    },
    limits: {
      messagesPerDay: -1, // Truly unlimited — no daily quota
      messagesPerHour: -1, // Truly unlimited — no hourly quota
      conversationsPerWeek: -1, // Unlimited
      conversationsPerMonth: -1, // Unlimited
      maxCharactersPerPrompt: 3000,
      maxRelations: -1, // Unlimited
      responseQuality: "ultra",
      responseLength: "long",
      canSchedulePosts: true,
      canManageConversations: true,
      hasPersonalizedResponses: true,
      hasAudienceTargeting: true,
      hasPriorityProcessing: true,
      hasEarlyAccess: true,
      hasDualResponseMode: true, // Storytelling + Business simultanés
      dualResponsesPerWeek: -1, // Unlimited
      // URL Analysis
      hasUrlAnalysis: true,
      // Multi-Platform: All 4 platforms + simultaneous publishing
      allowedPlatforms: ["linkedin", "reddit", "threads", "facebook"],
      maxPlatformConnections: 4, // All platforms
      canPublishSimultaneously: true, // Publish to multiple platforms at once
      quotaResetPeriod: "monthly",
    },
    badge: "Le plus performant",
    highlight: false,
    premium: true,
    trialDays: 0,
  },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get plan configuration by type
 */
export function getPlanConfig(plan: PlanType): PlanConfig {
  return PLAN_CONFIGS[plan] || PLAN_CONFIGS.pro;
}

/**
 * Get plan limits by type
 */
export function getPlanLimits(plan: PlanType): PlanLimits {
  return getPlanConfig(plan).limits;
}

/**
 * Get max_tokens for OpenAI based on plan's responseLength
 */
export function getMaxTokensForPlan(plan: PlanType): number {
  const limits = getPlanLimits(plan);
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

/**
 * Check if a plan has a specific feature
 */
export function planHasFeature(
  plan: PlanType,
  feature: keyof Pick<PlanLimits,
    | "canSchedulePosts"
    | "canManageConversations"
    | "hasPersonalizedResponses"
    | "hasAudienceTargeting"
    | "hasPriorityProcessing"
    | "hasEarlyAccess"
    | "hasDualResponseMode"
    | "canPublishSimultaneously"
    | "hasUrlAnalysis"
  >
): boolean {
  return getPlanLimits(plan)[feature];
}

/**
 * Check if a platform is allowed for a plan
 */
export function isPlatformAllowed(plan: PlanType, platform: Platform): boolean {
  return getPlanLimits(plan).allowedPlatforms.includes(platform);
}

/**
 * Get all allowed platforms for a plan
 */
export function getAllowedPlatforms(plan: PlanType): Platform[] {
  return getPlanLimits(plan).allowedPlatforms;
}

/**
 * Check if simultaneous multi-platform publishing is allowed
 */
export function canPublishToMultiplePlatforms(plan: PlanType): boolean {
  return getPlanLimits(plan).canPublishSimultaneously;
}

/**
 * Get maximum number of platforms that can be connected
 */
export function getMaxPlatformConnections(plan: PlanType): number {
  return getPlanLimits(plan).maxPlatformConnections;
}

/**
 * Check if user can connect more platforms
 */
export function canConnectMorePlatforms(plan: PlanType, currentConnections: number): boolean {
  const max = getMaxPlatformConnections(plan);
  return currentConnections < max;
}

/**
 * Compare two plans - returns positive if plan1 > plan2
 */
export function comparePlans(plan1: PlanType | null, plan2: PlanType | null): number {
  const order: Record<string, number> = { free: 0, pro: 1, max: 2 };
  return (plan1 ? (order[plan1] ?? 0) : -1) - (plan2 ? (order[plan2] ?? 0) : -1);
}

/**
 * Check if plan1 is higher tier than plan2
 */
export function isHigherPlan(plan1: PlanType, plan2: PlanType): boolean {
  return comparePlans(plan1, plan2) > 0;
}

/**
 * Check if a user's plan meets the minimum required plan level.
 * Returns true if userPlan >= requiredPlan in the hierarchy (free < pro < max).
 */
export function meetsMinimumPlan(userPlan: PlanType | null, requiredPlan: PlanType): boolean {
  if (!userPlan) return false;
  return comparePlans(userPlan, requiredPlan) >= 0;
}

/**
 * Get the minimum plan required for a feature
 */
export function getMinimumPlanForFeature(
  feature: keyof Pick<PlanLimits,
    | "canSchedulePosts"
    | "canManageConversations"
    | "hasPersonalizedResponses"
    | "hasAudienceTargeting"
    | "hasPriorityProcessing"
    | "hasEarlyAccess"
    | "hasDualResponseMode"
    | "canPublishSimultaneously"
    | "hasUrlAnalysis"
  >
): PlanType {
  const plans: PlanType[] = ["free", "pro", "max"];
  for (const plan of plans) {
    if (planHasFeature(plan, feature)) {
      return plan;
    }
  }
  return "max"; // Default to max if not found
}

/**
 * Get the minimum plan required for a platform
 */
export function getMinimumPlanForPlatform(platform: Platform): PlanType {
  // Use PLATFORM_INFO for consistent minimum plan lookup
  return PLATFORM_INFO[platform]?.minPlan || "max";
}

/**
 * Get minimum plan required for simultaneous multi-platform publishing
 */
export function getMinimumPlanForSimultaneousPublishing(): PlanType {
  return "max"; // Only Max plan can publish simultaneously
}

// ============================================
// DAILY MESSAGE LIMITS (for quota enforcement)
// ============================================

// Derived from PLAN_CONFIGS.limits.messagesPerDay
export const DAILY_MESSAGE_LIMITS: Record<PlanType, number> = Object.fromEntries(
  (Object.keys(PLAN_CONFIGS) as PlanType[]).map((plan) => [
    plan,
    PLAN_CONFIGS[plan].limits.messagesPerDay,
  ])
) as Record<PlanType, number>;

// Derived from PLAN_CONFIGS.limits.messagesPerHour (rolling window enforcement)
export const HOURLY_MESSAGE_LIMITS: Record<PlanType, number> = Object.fromEntries(
  (Object.keys(PLAN_CONFIGS) as PlanType[]).map((plan) => [
    plan,
    PLAN_CONFIGS[plan].limits.messagesPerHour,
  ])
) as Record<PlanType, number>;

/** Rolling window duration in milliseconds (1 hour) */
export const HOURLY_WINDOW_MS = 60 * 60 * 1000;

// ============================================
// STRIPE PRICE ID MAPPING
// ============================================

// Maps Stripe price IDs to plan types
// Update these with your actual Stripe price IDs
export const STRIPE_PRICE_TO_PLAN: Record<string, PlanType> = {
  // Monthly prices
  [process.env.STRIPE_PRICE_PRO_MONTHLY || "price_pro_monthly"]: "pro",
  [process.env.STRIPE_PRICE_MAX_MONTHLY || "price_max_monthly"]: "max",
  // Yearly prices
  [process.env.STRIPE_PRICE_PRO_YEARLY || "price_pro_yearly"]: "pro",
  [process.env.STRIPE_PRICE_MAX_YEARLY || "price_max_yearly"]: "max",
  // Legacy mappings (starter → pro)
  [process.env.STRIPE_PRICE_STARTER_MONTHLY || "price_starter_monthly"]: "pro",
  [process.env.STRIPE_PRICE_STARTER_YEARLY || "price_starter_yearly"]: "pro",
};

/**
 * Convert Stripe price ID to plan type
 */
export function stripePriceToPlan(priceId: string): PlanType | null {
  return STRIPE_PRICE_TO_PLAN[priceId] || null;
}

// ============================================
// PLAN DISPLAY HELPERS
// ============================================

/**
 * Get formatted price string
 */
export function formatPlanPrice(plan: PlanType | null, interval: "monthly" | "yearly" = "monthly"): string {
  if (!plan) return "—";
  if (plan === "free") return "Gratuit";
  const config = getPlanConfig(plan);
  const price = interval === "monthly" ? config.price.monthly : config.price.yearly;
  return `${price.toFixed(2).replace(".", ",")}€`;
}

/**
 * Get all plans as array (for iteration)
 */
export function getAllPlans(): PlanConfig[] {
  return Object.values(PLAN_CONFIGS);
}

/**
 * Get paid plans only
 */
export function getPaidPlans(): PlanConfig[] {
  return getAllPlans().filter(p => p.price.monthly > 0);
}

// ============================================
// PRICING CALCULATION HELPERS
// ============================================

/**
 * Calculate yearly savings in euros
 */
export function getYearlySavings(plan: PlanType): number {
  if (plan === "free") return 0;
  const config = getPlanConfig(plan);
  const monthlyTotal = config.price.monthly * 12;
  return Math.round((monthlyTotal - config.price.yearly) * 100) / 100;
}

/**
 * Calculate equivalent monthly price for yearly subscription
 */
export function getYearlyMonthlyEquivalent(plan: PlanType): number {
  if (plan === "free") return 0;
  const config = getPlanConfig(plan);
  if (config.price.yearly === 0) return 0;
  return Math.round((config.price.yearly / 12) * 100) / 100;
}

/**
 * Get savings as "X mois gratuits" text
 * @deprecated Use getLocalizedSavingsText for i18n support
 */
export function getSavingsText(plan: PlanType): string | null {
  if (plan === "free") return null;
  const config = getPlanConfig(plan);
  const savings = getYearlySavings(plan);
  const monthsSaved = Math.round(savings / config.price.monthly);
  if (monthsSaved >= 1) {
    return `${monthsSaved} mois gratuit${monthsSaved > 1 ? "s" : ""}`;
  }
  return null;
}

/**
 * Get localized savings text
 */
export function getLocalizedSavingsText(plan: PlanType, t: TranslationsParam): string | null {
  if (plan === "free") return null;
  const config = getPlanConfig(plan);
  const savings = getYearlySavings(plan);
  const monthsSaved = Math.round(savings / config.price.monthly);
  if (monthsSaved >= 1) {
    const template = monthsSaved > 1 ? t.plans.monthsFreePlural : t.plans.monthsFree;
    return template.replace("{n}", String(monthsSaved));
  }
  return null;
}

/**
 * Get discount percentage for yearly subscription
 */
export function getYearlyDiscountPercent(plan: PlanType): number {
  if (plan === "free") return 0;
  const config = getPlanConfig(plan);
  const monthlyTotal = config.price.monthly * 12;
  if (monthlyTotal === 0) return 0;
  const discount = ((monthlyTotal - config.price.yearly) / monthlyTotal) * 100;
  return Math.round(discount);
}

// ============================================
// UI DISPLAY CONSTANTS - SINGLE SOURCE OF TRUTH
// ============================================

/**
 * Plan-specific taglines for marketing/conversion
 * Used by both Landing page and Subscription page
 * @deprecated Use getLocalizedPlanTaglines(t) for i18n support
 */
export const PLAN_TAGLINES: Record<PlanType, { tagline: string; idealFor: string }> = {
  free: {
    tagline: "Testez Posty et publiez vos premiers posts",
    idealFor: "Idéal pour découvrir",
  },
  pro: {
    tagline: "Publiez régulièrement, attirez vos premiers clients",
    idealFor: "Pour les freelances et indépendants",
  },
  max: {
    tagline: "Puissance maximale pour dominer votre marché",
    idealFor: "Pour les agences et créateurs ambitieux",
  },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TranslationsParam = any;

/**
 * Get localized plan taglines
 */
export function getLocalizedPlanTaglines(t: TranslationsParam): Record<PlanType, { tagline: string; idealFor: string }> {
  return {
    free: { tagline: t.plans.free.tagline, idealFor: t.plans.free.idealFor },
    pro: { tagline: t.plans.pro.tagline, idealFor: t.plans.pro.idealFor },
    max: { tagline: t.plans.max.tagline, idealFor: t.plans.max.idealFor },
  };
}

/**
 * CORE Features - Always visible on cards (5-6 max for clarity)
 * These are the main differentiators that drive conversion
 */
export const CORE_FEATURES = [
  { key: "creations", label: "Créations quotidiennes" },
  { key: "quality", label: "Qualité de contenu IA" },
  { key: "scheduling", label: "Programmation de posts" },
  { key: "personalized", label: "Ton adapté à votre profil" },
  { key: "dualMode", label: "Double format Story + Business" },
  { key: "multiplatform", label: "Multi-plateformes" },
] as const;

/**
 * SECONDARY Features - Additional features beyond core differentiators
 * Displayed alongside core features in unified list
 */
export const SECONDARY_FEATURES = [
  { key: "prompts", label: "Briefs personnalisés" },
  { key: "sharing", label: "Collaboration & partage" },
  { key: "conversations", label: "Gestion des conversations" },
  { key: "postAnalysis", label: "Analyse de posts existants" },
  { key: "improveMode", label: "Réécriture & amélioration de posts" },
  { key: "priority", label: "Accès prioritaire (file VIP)" },
  { key: "fileAttachments", label: "Fichiers joints (images, PDF)" },
  { key: "simultaneousPublish", label: "Publication simultanée multi-réseaux" },
  { key: "earlyAccess", label: "Accès anticipé aux nouveautés" },
] as const;

/**
 * Unified feature list - same labels for all plans for easy comparison
 * Each feature appears at the same position across all plan cards
 * Used by Subscription page for side-by-side comparison
 */
export const UNIFIED_FEATURES = [
  ...CORE_FEATURES,
  ...SECONDARY_FEATURES,
] as const;

export type UnifiedFeatureKey = typeof UNIFIED_FEATURES[number]["key"];

/**
 * Get CTA button label based on plan - action-oriented
 * @deprecated Use getLocalizedCTALabel for i18n support
 */
export function getCTALabel(planId: PlanType, isYearly: boolean, trialEligible: boolean = false): string {
  if (planId === "free") return "Commencer gratuitement";
  if (trialEligible) {
    const days = PLAN_CONFIGS[planId]?.trialDays || TRIAL_PERIOD_DAYS;
    if (days > 0) return `Essayer ${days}j gratuitement`;
  }
  if (planId === "pro") return "Démarrer avec Pro";
  if (planId === "max") return "Tout débloquer";
  return "Choisir ce plan";
}

/**
 * Get localized CTA button label
 */
export function getLocalizedCTALabel(planId: PlanType, t: TranslationsParam, trialEligible: boolean = false): string {
  if (planId === "free") return t.plans.ctaFree;
  if (trialEligible) {
    const days = PLAN_CONFIGS[planId]?.trialDays || TRIAL_PERIOD_DAYS;
    if (days > 0) return t.plans.ctaTrial.replace("{n}", String(days));
  }
  if (planId === "pro") return t.plans.ctaPro;
  if (planId === "max") return t.plans.ctaMax;
  return t.plans.ctaDefault;
}

/**
 * Feature item for display
 */
export interface FeatureItem {
  text: string;
  included: boolean;
  highlight?: boolean;
}

/**
 * Get feature inclusion status for a given plan
 */
function getFeatureIncluded(key: string, plan: PlanConfig): boolean {
  const limits = plan.limits;
  const planId = plan.id;

  switch (key) {
    case "creations":
      return limits.messagesPerDay > 0 || limits.messagesPerDay === -1;
    case "insights":
      return true; // AI Insights available for all plans
    case "quality":
      return limits.responseQuality === "complete" || limits.responseQuality === "ultra";
    case "styleChoice":
      return planId === "pro" || planId === "max";
    case "postAnalysis":
      return planId === "pro" || planId === "max";
    case "improveMode":
      return planId === "pro" || planId === "max";
    case "prompts":
      return limits.maxCharactersPerPrompt >= 300;
    case "sharing":
      return limits.maxRelations > 1 || limits.maxRelations === -1;
    case "personalized":
      return limits.hasPersonalizedResponses;
    case "scheduling":
      return limits.canSchedulePosts;
    case "conversations":
      return limits.canManageConversations;
    case "priority":
      return limits.hasPriorityProcessing;
    case "dualMode":
      return limits.hasDualResponseMode;
    case "multiplatform":
      return limits.allowedPlatforms.length > 1;
    case "simultaneousPublish":
      return limits.canPublishSimultaneously;
    case "fileAttachments":
      return planId === "max";
    case "earlyAccess":
      return limits.hasEarlyAccess;
    default:
      return false;
  }
}

/**
 * Get dynamic, plan-specific label for a feature.
 * Returns a label that accurately reflects the plan's actual limits,
 * or an empty string to signal "use the static fallback label".
 */
function getDynamicFeatureLabel(key: string, plan: PlanConfig): string {
  const limits = plan.limits;

  switch (key) {
    case "prompts":
      if (limits.maxCharactersPerPrompt >= 1000) {
        return `Briefs détaillés (${limits.maxCharactersPerPrompt} car.)`;
      }
      return `Briefs jusqu'à ${limits.maxCharactersPerPrompt} caractères`;

    case "dualMode":
      if (limits.dualResponsesPerWeek === -1) {
        return "Story + Business illimité";
      } else if (limits.dualResponsesPerWeek > 0) {
        return `Story + Business (${limits.dualResponsesPerWeek}/semaine)`;
      }
      return "";

    case "multiplatform": {
      const platforms = limits.allowedPlatforms;
      if (platforms.length === 1) {
        return `${PLATFORM_INFO[platforms[0]]?.name || platforms[0]} uniquement`;
      } else if (platforms.length <= 2) {
        return platforms.map(p => PLATFORM_INFO[p]?.name || p).join(" + ");
      }
      return `4 réseaux connectés`;
    }

    case "sharing":
      if (limits.maxRelations === -1) {
        return "Partage illimité avec votre équipe";
      } else if (limits.maxRelations > 1) {
        return `Partage avec ${limits.maxRelations} contacts`;
      }
      return "";

    case "quality":
      if (limits.responseQuality === "ultra") {
        return "Posts IA ultra-précis, 2x plus complets";
      } else if (limits.responseQuality === "complete") {
        return "Posts IA optimisés pour l'engagement";
      }
      return "";

    case "creations":
      if (limits.messagesPerDay === -1 || limits.messagesPerDay >= 500) {
        return "Créations illimitées, zéro quota";
      }
      if (limits.quotaResetPeriod === "monthly" && limits.conversationsPerMonth > 0) {
        return `${limits.conversationsPerMonth} créations par mois`;
      }
      return `${limits.messagesPerDay} créations par jour`;

    default:
      return "";
  }
}

/**
 * Get CORE features for a plan (always visible)
 * Returns only the primary differentiating features
 */
export function getPlanCoreFeatures(plan: PlanConfig): FeatureItem[] {
  return CORE_FEATURES.map((feature) => {
    const dynamicLabel = getDynamicFeatureLabel(feature.key, plan);
    return {
      text: dynamicLabel || feature.label,
      included: getFeatureIncluded(feature.key, plan),
    };
  });
}

/**
 * Get SECONDARY features for a plan
 * Returns additional features beyond core differentiators
 */
export function getPlanSecondaryFeatures(plan: PlanConfig): FeatureItem[] {
  return SECONDARY_FEATURES.map((feature) => {
    const dynamicLabel = getDynamicFeatureLabel(feature.key, plan);
    return {
      text: dynamicLabel || feature.label,
      included: getFeatureIncluded(feature.key, plan),
    };
  });
}

/**
 * Get plan features in unified format (all features, same order)
 * Used by Subscription page for side-by-side comparison with checkmarks/X
 */
export function getPlanFeaturesUnified(plan: PlanConfig): FeatureItem[] {
  return UNIFIED_FEATURES.map((feature) => {
    const dynamicLabel = getDynamicFeatureLabel(feature.key, plan);
    return {
      text: dynamicLabel || feature.label,
      included: getFeatureIncluded(feature.key, plan),
    };
  });
}

/**
 * Get localized dynamic feature label
 */
function getLocalizedDynamicFeatureLabel(key: string, plan: PlanConfig, t: TranslationsParam): string {
  const limits = plan.limits;

  switch (key) {
    case "prompts":
      if (limits.maxCharactersPerPrompt >= 1000) {
        return t.plans.briefsDetailed.replace("{n}", String(limits.maxCharactersPerPrompt));
      }
      return t.plans.briefsUpTo.replace("{n}", String(limits.maxCharactersPerPrompt));

    case "dualMode":
      if (limits.dualResponsesPerWeek === -1) {
        return t.plans.storyBusinessUnlimited;
      } else if (limits.dualResponsesPerWeek > 0) {
        return t.plans.storyBusinessPerWeek.replace("{n}", String(limits.dualResponsesPerWeek));
      }
      return "";

    case "multiplatform": {
      const platforms = limits.allowedPlatforms;
      if (platforms.length === 1) {
        return t.plans.platformOnly.replace("{name}", PLATFORM_INFO[platforms[0]]?.name || platforms[0]);
      } else if (platforms.length <= 2) {
        return platforms.map(p => PLATFORM_INFO[p]?.name || p).join(" + ");
      }
      return t.plans.networksConnected;
    }

    case "sharing":
      if (limits.maxRelations === -1) {
        return t.plans.unlimitedSharing;
      } else if (limits.maxRelations > 1) {
        return t.plans.shareWithContacts.replace("{n}", String(limits.maxRelations));
      }
      return "";

    case "quality":
      if (limits.responseQuality === "ultra") {
        return t.plans.postsUltraPrecise;
      } else if (limits.responseQuality === "complete") {
        return t.plans.postsOptimized;
      }
      return "";

    case "creations":
      if (limits.messagesPerDay === -1 || limits.messagesPerDay >= 500) {
        return t.plans.unlimitedCreations;
      }
      if (limits.quotaResetPeriod === "monthly" && limits.conversationsPerMonth > 0) {
        return t.plans.creationsPerMonth.replace("{n}", String(limits.conversationsPerMonth));
      }
      return t.plans.creationsPerDay.replace("{n}", String(limits.messagesPerDay));

    default:
      return "";
  }
}

/**
 * Get localized feature label (static or dynamic)
 */
function getLocalizedFeatureLabel(key: string, t: TranslationsParam): string {
  const featureKeyMap: Record<string, string> = {
    creations: "featureCreations",
    quality: "featureQuality",
    scheduling: "featureScheduling",
    personalized: "featurePersonalized",
    dualMode: "featureDualMode",
    multiplatform: "featureMultiplatform",
    prompts: "featurePrompts",
    sharing: "featureSharing",
    conversations: "featureConversations",
    postAnalysis: "featurePostAnalysis",
    improveMode: "featureImproveMode",
    priority: "featurePriority",
    fileAttachments: "featureFileAttachments",
    simultaneousPublish: "featureSimultaneousPublish",
    earlyAccess: "featureEarlyAccess",
  };
  const tKey = featureKeyMap[key];
  return tKey ? t.plans[tKey] : key;
}

/**
 * Get localized plan features in unified format
 */
export function getLocalizedPlanFeaturesUnified(plan: PlanConfig, t: TranslationsParam): FeatureItem[] {
  return UNIFIED_FEATURES.map((feature) => {
    const dynamicLabel = getLocalizedDynamicFeatureLabel(feature.key, plan, t);
    return {
      text: dynamicLabel || getLocalizedFeatureLabel(feature.key, t),
      included: getFeatureIncluded(feature.key, plan),
    };
  });
}

/**
 * Comparison table data — data-driven from UNIFIED_FEATURES.
 * Returns one row per feature with values for each plan.
 */
export interface ComparisonRow {
  label: string;
  values: Record<PlanType, { text: string; included: boolean }>;
}

export function getComparisonData(): ComparisonRow[] {
  const plans = getAllPlans();
  return UNIFIED_FEATURES.map((feature) => ({
    label: feature.label,
    values: Object.fromEntries(
      plans.map((plan) => {
        const dynamicLabel = getDynamicFeatureLabel(feature.key, plan);
        return [
          plan.id,
          {
            text: dynamicLabel || feature.label,
            included: getFeatureIncluded(feature.key, plan),
          },
        ];
      })
    ) as Record<PlanType, { text: string; included: boolean }>,
  }));
}

/**
 * Card features for pricing cards — short, benefit-oriented, 5-6 per plan.
 * Uses progressive "Everything in X, plus:" pattern.
 */
export interface CardFeatureSet {
  inheritFrom?: string; // "Tout dans Free, plus:" / "Tout dans Pro, plus:"
  features: string[];
}

export function getPlanCardFeatures(planId: PlanType): CardFeatureSet {
  switch (planId) {
    case "free":
      return {
        features: [
          "3 créations par mois",
          "LinkedIn uniquement",
          "Génération IA basique",
          "Publication texte",
          "Prompts jusqu'à 300 caractères",
        ],
      };
    case "pro":
      return {
        inheritFrom: "Tout dans Free, plus :",
        features: [
          "60 créations par jour",
          "Programmation automatique",
          "Mode Storytelling + Business",
          "Analyse et amélioration de posts",
          "LinkedIn + Reddit",
          "Ton adapté à votre profil",
        ],
      };
    case "max":
      return {
        inheritFrom: "Tout dans Pro, plus :",
        features: [
          "Créations illimitées, zéro quota",
          "IA ultra-précise, posts 2x plus riches",
          "4 réseaux + publication simultanée",
          "Prompts détaillés (3 000 car.)",
          "Pièces jointes (images, PDF)",
          "Traitement prioritaire",
        ],
      };
    default:
      return { features: [] };
  }
}

/**
 * Get plan features in dynamic format (only included features, benefit-oriented text)
 * Used by Landing page for marketing-focused display
 */
export function getPlanFeaturesDynamic(plan: PlanConfig): FeatureItem[] {
  const limits = plan.limits;
  const planId = plan.id;
  const features: FeatureItem[] = [];

  // Conversations quota - benefit-oriented language
  if (limits.messagesPerDay === -1 || limits.messagesPerDay >= 500) {
    features.push({ text: "Création illimitée", included: true, highlight: true });
  } else {
    features.push({ text: `${limits.messagesPerDay} créations par jour`, included: true });
  }

  // AI Insights - All plans
  features.push({ text: "Insights IA stratégiques", included: true });

  // Style choice - PRO+
  if (planId === "pro" || planId === "max") {
    features.push({ text: "Choix du style de post", included: true });
  }

  // Post Analysis - PRO+
  if (planId === "pro" || planId === "max") {
    features.push({ text: "Analyse détaillée de posts", included: true, highlight: true });
  }

  // Improve mode - PRO+
  if (planId === "pro" || planId === "max") {
    features.push({ text: "Mode \"Améliorer un post\"", included: true });
  }

  // Response quality - benefit language
  const qualityLabels: Record<string, string> = {
    essential: "Posts IA de qualité",
    complete: "Posts optimisés pour l'engagement",
    ultra: "Posts ultra-performants",
  };
  features.push({
    text: qualityLabels[limits.responseQuality] || "Posts IA",
    included: true,
    highlight: limits.responseQuality === "ultra"
  });

  // Characters per prompt
  if (limits.maxCharactersPerPrompt >= 1000) {
    features.push({
      text: `Prompts longs (jusqu'à ${limits.maxCharactersPerPrompt} car.)`,
      included: true,
      highlight: true
    });
  } else if (limits.maxCharactersPerPrompt >= 300) {
    features.push({
      text: `Prompts étendus (${limits.maxCharactersPerPrompt} car.)`,
      included: true
    });
  }

  // Relations - benefit language
  if (limits.maxRelations === -1) {
    features.push({ text: "Partage illimité", included: true, highlight: true });
  } else if (limits.maxRelations > 1) {
    features.push({ text: `Partage avec ${limits.maxRelations} contacts`, included: true });
  }

  // Personalized responses
  if (limits.hasPersonalizedResponses) {
    features.push({ text: "Ton personnalisé à votre style", included: true });
  }

  // Scheduling
  if (limits.canSchedulePosts) {
    features.push({
      text: "Programmation automatique (arrive très bientôt)",
      included: true,
      highlight: true
    });
  }

  // Conversation management
  if (limits.canManageConversations) {
    features.push({
      text: "Organisation des conversations",
      included: true
    });
  }

  // Priority processing
  if (limits.hasPriorityProcessing) {
    features.push({ text: "Génération prioritaire", included: true, highlight: true });
  }

  // Multi-platform - show specific platforms
  if (limits.allowedPlatforms.length > 1) {
    const platformNames = limits.allowedPlatforms
      .map(p => PLATFORM_INFO[p]?.name || p)
      .join(", ");
    features.push({
      text: `Multi-plateformes (${platformNames})`,
      included: true,
      highlight: true
    });
  }

  // Simultaneous publishing (Max only)
  if (limits.canPublishSimultaneously) {
    features.push({
      text: "Publication simultanée multi-plateformes",
      included: true,
      highlight: true
    });
  }

  // Early access
  if (limits.hasEarlyAccess) {
    features.push({ text: "Accès VIP aux nouveautés", included: true });
  }

  // Dual response mode (Storytelling + Business)
  if (limits.hasDualResponseMode) {
    const dualText = limits.dualResponsesPerWeek === -1
      ? "Mode Storytelling + Business"
      : `Mode Storytelling + Business (${limits.dualResponsesPerWeek}/sem.)`;
    features.push({
      text: dualText,
      included: true,
      highlight: true
    });
  }

  return features;
}

// ============================================
// TEST MODE EXPIRATION
// ============================================

/** Default test mode duration: 24 hours in milliseconds */
export const TEST_MODE_DURATION_MS = 24 * 60 * 60 * 1000;

/**
 * Extract milliseconds from a Firestore Timestamp, Date, or number.
 * Works with both firebase/firestore and firebase-admin/firestore Timestamps.
 */
function getTimestampMs(value: unknown): number {
  if (typeof value === "number") return value;
  if (value instanceof Date) return value.getTime();
  if (value && typeof (value as { toMillis?: () => number }).toMillis === "function") {
    return (value as { toMillis: () => number }).toMillis();
  }
  if (value && typeof (value as { toDate?: () => Date }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate().getTime();
  }
  return 0;
}

/**
 * Check if test mode is currently active and not expired.
 *
 * Expiration logic:
 * 1. If `expiresAt` exists → use it directly
 * 2. Else if `activatedAt` exists → expire after TEST_MODE_DURATION_MS (24h)
 * 3. Else → trust the `active` flag (backward compat for old data without timestamps)
 */
export function isTestModeValid(testModeData: {
  active?: boolean;
  plan?: string;
  activatedAt?: unknown;
  expiresAt?: unknown;
} | null | undefined): { isActive: boolean; plan: PlanType | null } {
  if (!testModeData?.active) {
    return { isActive: false, plan: null };
  }

  const now = Date.now();

  // Check explicit expiresAt
  if (testModeData.expiresAt) {
    const expiresAtMs = getTimestampMs(testModeData.expiresAt);
    if (expiresAtMs > 0 && now > expiresAtMs) {
      return { isActive: false, plan: null };
    }
  }

  // Fallback: check activatedAt + 24h (for data created before expiresAt was added)
  if (testModeData.activatedAt && !testModeData.expiresAt) {
    const activatedMs = getTimestampMs(testModeData.activatedAt);
    if (activatedMs > 0 && now > activatedMs + TEST_MODE_DURATION_MS) {
      return { isActive: false, plan: null };
    }
  }

  return {
    isActive: true,
    plan: (testModeData.plan as PlanType) || null,
  };
}

// ============================================
// TRIAL HELPER FUNCTIONS
// ============================================

/**
 * Get all available plans for new users
 */
export function getAvailablePlansForNewUsers(): PlanConfig[] {
  return getAllPlans();
}

/**
 * Get plans that support free trials
 */
export function getTrialEligiblePlans(): PlanConfig[] {
  return Object.values(PLAN_CONFIGS).filter(plan => plan.trialDays > 0);
}

/**
 * Check if user is eligible for a trial
 * @param userData User's subscription data from Firestore
 * @returns Object with eligibility status and reason if not eligible
 */
export function checkTrialEligibility(userData: {
  subscription?: {
    trialUsed?: boolean;
    status?: string;
    plan?: string;
  };
} | null | undefined): {
  eligible: boolean;
  reason?: string;
} {
  // No user data = eligible (new user)
  if (!userData?.subscription) {
    return { eligible: true };
  }

  const { trialUsed, status, plan } = userData.subscription;

  // Already used a trial = not eligible
  if (trialUsed) {
    return {
      eligible: false,
      reason: "Vous avez déjà utilisé votre essai gratuit.",
    };
  }

  // Currently in trial = not eligible
  if (status === "trialing") {
    return {
      eligible: false,
      reason: "Vous êtes actuellement en période d'essai.",
    };
  }

  // Active paid subscription = not eligible (they're already paying)
  if (status === "active" && plan) {
    return {
      eligible: false,
      reason: "Vous avez déjà un abonnement actif.",
    };
  }

  return { eligible: true };
}

/**
 * Calculate trial end date from start date
 */
export function calculateTrialEndDate(startDate: Date = new Date()): Date {
  return new Date(startDate.getTime() + TRIAL_PERIOD_MS);
}

/**
 * Get days remaining in trial
 */
export function getTrialDaysRemaining(trialEndsAt: Date | { toDate: () => Date } | null | undefined): number {
  if (!trialEndsAt) return 0;

  const endDate = trialEndsAt instanceof Date
    ? trialEndsAt
    : trialEndsAt.toDate();

  const now = Date.now();
  const remaining = endDate.getTime() - now;

  if (remaining <= 0) return 0;
  return Math.ceil(remaining / (24 * 60 * 60 * 1000));
}

/**
 * Format trial status message for UI
 */
export function formatTrialStatusMessage(
  status: string | undefined,
  trialEndsAt: Date | { toDate: () => Date } | null | undefined,
  trialPlan: string | undefined
): string | null {
  if (status !== "trialing" || !trialEndsAt) return null;

  const daysRemaining = getTrialDaysRemaining(trialEndsAt);
  const planName = trialPlan ? PLAN_CONFIGS[trialPlan as PlanType]?.name || trialPlan : "votre plan";

  if (daysRemaining <= 0) {
    return `Votre essai ${planName} est terminé.`;
  }

  if (daysRemaining === 1) {
    return `Dernier jour de votre essai ${planName} !`;
  }

  return `${daysRemaining} jours restants sur votre essai ${planName}.`;
}

// ============================================
// GUARANTEE HELPER FUNCTIONS
// ============================================

/** Guarantee period duration in milliseconds */
export const GUARANTEE_PERIOD_MS = GUARANTEE_PERIOD_DAYS * 24 * 60 * 60 * 1000;

/**
 * Check if user is within the money-back guarantee period.
 * The guarantee starts when the first payment is made (after trial ends).
 * @param firstPaymentDate Date of the first successful payment
 * @returns Object with eligibility and days remaining
 */
export function checkGuaranteeEligibility(
  firstPaymentDate: Date | { toDate: () => Date } | null | undefined
): { eligible: boolean; daysRemaining: number } {
  if (!firstPaymentDate) return { eligible: false, daysRemaining: 0 };

  const paymentDate = firstPaymentDate instanceof Date
    ? firstPaymentDate
    : firstPaymentDate.toDate();

  const guaranteeEnd = new Date(paymentDate.getTime() + GUARANTEE_PERIOD_MS);
  const now = Date.now();
  const remaining = guaranteeEnd.getTime() - now;

  if (remaining <= 0) return { eligible: false, daysRemaining: 0 };

  return {
    eligible: true,
    daysRemaining: Math.ceil(remaining / (24 * 60 * 60 * 1000)),
  };
}
