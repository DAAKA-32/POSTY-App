/**
 * Plan Configuration - Single Source of Truth
 *
 * This file defines all plan limits, features, and pricing.
 * Used by both frontend and backend for consistent behavior.
 */

// Plan Types
export type PlanType = "free" | "pro" | "max";
export type PlanSource = "stripe" | "test";
export type SubscriptionStatus = "active" | "inactive" | "canceled" | "past_due" | "trialing";

// Platform Types - All supported social platforms
export type Platform = "linkedin" | "reddit" | "instagram" | "facebook";

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
    description: "Communautés et discussions",
    minPlan: "pro",
  },
  instagram: {
    id: "instagram",
    name: "Instagram",
    icon: "instagram",
    color: "#E4405F",
    description: "Contenu visuel et stories",
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
export function getPlatformsForPlan(plan: PlanType): Platform[] {
  const planOrder: Record<PlanType, number> = { free: 0, pro: 1, max: 2 };
  const currentPlanLevel = planOrder[plan];

  return getAllPlatforms().filter(platform => {
    const minPlanLevel = planOrder[PLATFORM_INFO[platform].minPlan];
    return currentPlanLevel >= minPlanLevel;
  });
}

// Plan Limits Interface
export interface PlanLimits {
  // Conversations
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

  // Multi-Platform Publishing
  allowedPlatforms: Platform[];
  maxPlatformConnections: number; // Maximum number of platforms that can be connected
  canPublishSimultaneously: boolean; // Can publish to multiple platforms at once

  // Quotas Reset
  quotaResetPeriod: "weekly" | "monthly";
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
}

// ============================================
// PLAN CONFIGURATIONS
// ============================================

export const PLAN_CONFIGS: Record<PlanType, PlanConfig> = {
  free: {
    id: "free",
    name: "Découverte",
    displayName: "Free",
    description: "Découvrez le potentiel de Posty",
    price: {
      monthly: 0,
      yearly: 0,
    },
    limits: {
      conversationsPerWeek: 5,
      conversationsPerMonth: -1, // Uses weekly limit
      maxCharactersPerPrompt: 100,
      maxRelations: 1,
      responseQuality: "essential",
      responseLength: "short",
      canSchedulePosts: false,
      canManageConversations: false,
      hasPersonalizedResponses: false,
      hasAudienceTargeting: false,
      hasPriorityProcessing: false,
      hasEarlyAccess: false,
      hasDualResponseMode: false,
      // Multi-Platform: LinkedIn only
      allowedPlatforms: ["linkedin"],
      maxPlatformConnections: 1,
      canPublishSimultaneously: false,
      quotaResetPeriod: "weekly",
    },
    highlight: false,
    premium: false,
  },

  pro: {
    id: "pro",
    name: "Pro",
    displayName: "Pro",
    description: "Le meilleur rapport qualité/prix",
    price: {
      monthly: 12.90,
      yearly: 129, // -17% (10.75€/mois)
    },
    limits: {
      conversationsPerWeek: -1, // Unlimited
      conversationsPerMonth: 100, // "Comfortable monthly usage"
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
      hasDualResponseMode: false,
      // Multi-Platform: LinkedIn + Reddit
      allowedPlatforms: ["linkedin", "reddit"],
      maxPlatformConnections: 2,
      canPublishSimultaneously: false, // One platform at a time
      quotaResetPeriod: "monthly",
    },
    badge: "Recommandé",
    highlight: true,
    premium: false,
  },

  max: {
    id: "max",
    name: "Max",
    displayName: "Max",
    description: "Pour les créateurs ambitieux",
    price: {
      monthly: 19.90,
      yearly: 199, // -17% (16.58€/mois)
    },
    limits: {
      conversationsPerWeek: -1, // Unlimited
      conversationsPerMonth: -1, // Unlimited (intensive usage)
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
      // Multi-Platform: All 4 platforms + simultaneous publishing
      allowedPlatforms: ["linkedin", "reddit", "instagram", "facebook"],
      maxPlatformConnections: 4, // All platforms
      canPublishSimultaneously: true, // Publish to multiple platforms at once
      quotaResetPeriod: "monthly",
    },
    badge: "Elite",
    highlight: false,
    premium: true,
  },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get plan configuration by type
 */
export function getPlanConfig(plan: PlanType): PlanConfig {
  return PLAN_CONFIGS[plan] || PLAN_CONFIGS.free;
}

/**
 * Get plan limits by type
 */
export function getPlanLimits(plan: PlanType): PlanLimits {
  return getPlanConfig(plan).limits;
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
export function comparePlans(plan1: PlanType, plan2: PlanType): number {
  const order: Record<PlanType, number> = { free: 0, pro: 1, max: 2 };
  return order[plan1] - order[plan2];
}

/**
 * Check if plan1 is higher tier than plan2
 */
export function isHigherPlan(plan1: PlanType, plan2: PlanType): boolean {
  return comparePlans(plan1, plan2) > 0;
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
export function stripePriceToPlan(priceId: string): PlanType {
  return STRIPE_PRICE_TO_PLAN[priceId] || "free";
}

// ============================================
// PLAN DISPLAY HELPERS
// ============================================

/**
 * Get formatted price string
 */
export function formatPlanPrice(plan: PlanType, interval: "monthly" | "yearly" = "monthly"): string {
  const config = getPlanConfig(plan);
  const price = interval === "monthly" ? config.price.monthly : config.price.yearly;
  if (price === 0) return "Gratuit";
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
  const config = getPlanConfig(plan);
  if (config.price.monthly === 0) return 0;
  const monthlyTotal = config.price.monthly * 12;
  return Math.round((monthlyTotal - config.price.yearly) * 100) / 100;
}

/**
 * Calculate equivalent monthly price for yearly subscription
 */
export function getYearlyMonthlyEquivalent(plan: PlanType): number {
  const config = getPlanConfig(plan);
  if (config.price.yearly === 0) return 0;
  return Math.round((config.price.yearly / 12) * 100) / 100;
}

/**
 * Get savings as "X mois gratuits" text
 */
export function getSavingsText(plan: PlanType): string | null {
  const config = getPlanConfig(plan);
  if (config.price.monthly === 0) return null;
  const savings = getYearlySavings(plan);
  const monthsSaved = Math.round(savings / config.price.monthly);
  if (monthsSaved >= 1) {
    return `${monthsSaved} mois gratuit${monthsSaved > 1 ? "s" : ""}`;
  }
  return null;
}

/**
 * Get discount percentage for yearly subscription
 */
export function getYearlyDiscountPercent(plan: PlanType): number {
  const config = getPlanConfig(plan);
  if (config.price.monthly === 0) return 0;
  const monthlyTotal = config.price.monthly * 12;
  const discount = ((monthlyTotal - config.price.yearly) / monthlyTotal) * 100;
  return Math.round(discount);
}

// ============================================
// UI DISPLAY CONSTANTS - SINGLE SOURCE OF TRUTH
// ============================================

/**
 * Plan-specific taglines for marketing/conversion
 * Used by both Landing page and Subscription page
 */
export const PLAN_TAGLINES: Record<PlanType, { tagline: string; idealFor: string }> = {
  free: {
    tagline: "Découvrez le potentiel de l'IA",
    idealFor: "Idéal pour tester et découvrir",
  },
  pro: {
    tagline: "Le meilleur rapport qualité-prix",
    idealFor: "Parfait pour les créateurs sérieux",
  },
  max: {
    tagline: "Puissance maximale, résultats exceptionnels",
    idealFor: "Conçu pour les ambitieux qui veulent dominer",
  },
};

/**
 * CORE Features - Always visible on cards (5-6 max for clarity)
 * These are the main differentiators that drive conversion
 */
export const CORE_FEATURES = [
  { key: "creations", label: "Créations illimitées" },
  { key: "quality", label: "Posts optimisés IA" },
  { key: "scheduling", label: "Programmation automatique" },
  { key: "personalized", label: "Ton personnalisé" },
  { key: "priority", label: "Génération prioritaire" },
  { key: "multiplatform", label: "Multi-plateformes" },
] as const;

/**
 * SECONDARY Features - Shown in "Voir plus" section
 * Additional features that add value but aren't primary decision drivers
 */
export const SECONDARY_FEATURES = [
  { key: "insights", label: "Insights IA stratégiques" },
  { key: "styleChoice", label: "Choix du style (Storytelling/Business)" },
  { key: "postAnalysis", label: "Analyse détaillée de posts" },
  { key: "improveMode", label: "Mode \"Améliorer un post\"" },
  { key: "prompts", label: "Prompts longs et détaillés" },
  { key: "sharing", label: "Partage avec contacts" },
  { key: "conversations", label: "Organisation des conversations" },
  { key: "dualMode", label: "Les deux styles simultanés" },
  { key: "simultaneousPublish", label: "Publication simultanée multi-plateformes" },
  { key: "earlyAccess", label: "Accès VIP aux nouveautés" },
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
 */
export function getCTALabel(planId: PlanType, isYearly: boolean): string {
  if (planId === "free") return "Commencer gratuitement";
  if (planId === "pro") return isYearly ? "Économiser avec Pro" : "Passer à Pro";
  if (planId === "max") return isYearly ? "Débloquer Max" : "Devenir Max";
  return "Choisir ce plan";
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
      return limits.conversationsPerWeek === -1 && limits.conversationsPerMonth === -1;
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
      return limits.maxCharactersPerPrompt >= 1000;
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
    case "earlyAccess":
      return limits.hasEarlyAccess;
    default:
      return false;
  }
}

/**
 * Get CORE features for a plan (always visible)
 * Returns only the primary differentiating features
 */
export function getPlanCoreFeatures(plan: PlanConfig): FeatureItem[] {
  return CORE_FEATURES.map((feature) => {
    let text: string = feature.label;

    // Dynamic text for multiplatform feature
    if (feature.key === "multiplatform") {
      const platforms = plan.limits.allowedPlatforms;
      if (platforms.length === 1) {
        text = `${PLATFORM_INFO[platforms[0]]?.name || platforms[0]} uniquement`;
      } else if (platforms.length > 1) {
        const names = platforms.map(p => PLATFORM_INFO[p]?.name || p).join(", ");
        text = `Multi-plateformes (${names})`;
      }
    }

    return {
      text,
      included: getFeatureIncluded(feature.key, plan),
    };
  });
}

/**
 * Get SECONDARY features for a plan (shown in "Voir plus")
 * Returns additional features
 */
export function getPlanSecondaryFeatures(plan: PlanConfig): FeatureItem[] {
  return SECONDARY_FEATURES.map((feature) => ({
    text: feature.label,
    included: getFeatureIncluded(feature.key, plan),
  }));
}

/**
 * Get plan features in unified format (all features, same order)
 * Used by Subscription page for side-by-side comparison with checkmarks/X
 */
export function getPlanFeaturesUnified(plan: PlanConfig): FeatureItem[] {
  const limits = plan.limits;
  const planId = plan.id;

  return UNIFIED_FEATURES.map((feature) => {
    let included = false;

    switch (feature.key) {
      case "creations":
        included = limits.conversationsPerWeek === -1 && limits.conversationsPerMonth === -1;
        break;
      case "insights":
        // AI Insights available for all plans
        included = true;
        break;
      case "quality":
        included = limits.responseQuality === "complete" || limits.responseQuality === "ultra";
        break;
      case "styleChoice":
        // Style choice (Storytelling/Business) for PRO+
        included = planId === "pro" || planId === "max";
        break;
      case "postAnalysis":
        // Post analysis for PRO+
        included = planId === "pro" || planId === "max";
        break;
      case "improveMode":
        // "Improve a post" mode for PRO+
        included = planId === "pro" || planId === "max";
        break;
      case "prompts":
        included = limits.maxCharactersPerPrompt >= 1000;
        break;
      case "sharing":
        included = limits.maxRelations > 1 || limits.maxRelations === -1;
        break;
      case "personalized":
        included = limits.hasPersonalizedResponses;
        break;
      case "scheduling":
        included = limits.canSchedulePosts;
        break;
      case "conversations":
        included = limits.canManageConversations;
        break;
      case "priority":
        included = limits.hasPriorityProcessing;
        break;
      case "dualMode":
        included = limits.hasDualResponseMode;
        break;
      case "multiplatform":
        included = limits.allowedPlatforms.length > 1;
        break;
      case "simultaneousPublish":
        included = limits.canPublishSimultaneously;
        break;
      case "earlyAccess":
        included = limits.hasEarlyAccess;
        break;
    }

    return { text: feature.label, included };
  });
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
  if (limits.conversationsPerWeek === -1 && limits.conversationsPerMonth === -1) {
    features.push({ text: "Créations illimitées", included: true, highlight: true });
  } else if (limits.conversationsPerMonth > 0) {
    features.push({ text: `${limits.conversationsPerMonth} créations / mois`, included: true });
  } else if (limits.conversationsPerWeek > 0) {
    features.push({ text: `${limits.conversationsPerWeek} créations / semaine`, included: true });
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
      text: "Prompts longs et détaillés",
      included: true,
      highlight: true
    });
  } else if (limits.maxCharactersPerPrompt >= 300) {
    features.push({
      text: "Prompts étendus (300 car.)",
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
      text: "Programmation automatique",
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
    features.push({
      text: "Mode Storytelling + Business",
      included: true,
      highlight: true
    });
  }

  return features;
}
