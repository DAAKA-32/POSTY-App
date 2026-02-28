/**
 * Plan feature configuration — DERIVED from lib/plans.ts (single source of truth)
 *
 * This file provides a convenience layer for API routes and components
 * that need simple boolean feature checks. All values are derived from
 * PLAN_CONFIGS in lib/plans.ts to prevent contradictions.
 */

import { SubscriptionPlan, ResponseMode } from "@/types";
import { PLAN_CONFIGS, PlanType } from "./plans";

// Plan feature configuration
export interface PlanFeatures {
  responseMode: ResponseMode;
  hasInsights: boolean;
  hasAnalysis: boolean;
  hasImproveMode: boolean;
  hasMultiPlatform: boolean;
  hasAdaptiveTone: boolean;
  hasAdvancedPersonalization: boolean;
  hasFileAttachments: boolean;
  hasUrlAnalysis: boolean;
}

/**
 * Derive PlanFeatures from the canonical PLAN_CONFIGS.
 * This ensures plan-features.ts never contradicts plans.ts.
 */
function derivePlanFeatures(planId: PlanType): PlanFeatures {
  const limits = PLAN_CONFIGS[planId].limits;

  // Derive responseMode from dual mode config:
  // - Unlimited dual (dualResponsesPerWeek === -1) → "dual"
  // - Limited dual (dualResponsesPerWeek > 0) → "single-choice" (default UI is single, can request dual on demand)
  // - No dual → "business-only"
  let responseMode: ResponseMode;
  if (limits.hasDualResponseMode && limits.dualResponsesPerWeek === -1) {
    responseMode = "dual";
  } else if (limits.hasDualResponseMode) {
    responseMode = "single-choice";
  } else {
    responseMode = "business-only";
  }

  return {
    responseMode,
    hasInsights: true, // All plans have basic insights
    hasAnalysis: planId !== "free", // Pro+ only
    hasImproveMode: planId !== "free", // Pro+ only
    hasMultiPlatform: limits.allowedPlatforms.length > 2,
    hasAdaptiveTone: limits.hasPersonalizedResponses,
    hasAdvancedPersonalization: limits.hasAudienceTargeting,
    hasFileAttachments: planId === "max",
    hasUrlAnalysis: limits.hasUrlAnalysis,
  };
}

// Feature configuration derived from PLAN_CONFIGS
export const PLAN_FEATURES: Record<SubscriptionPlan, PlanFeatures> = {
  free: derivePlanFeatures("free"),
  pro: derivePlanFeatures("pro"),
  max: derivePlanFeatures("max"),
};

/**
 * Get features available for a specific plan
 */
export function getPlanFeatures(plan: SubscriptionPlan | null): PlanFeatures {
  if (!plan) return PLAN_FEATURES.free; // Safe default for users without a plan
  return PLAN_FEATURES[plan] || PLAN_FEATURES.pro;
}

/**
 * Check if a plan has access to a specific feature
 */
export function hasFeature(
  plan: SubscriptionPlan | null,
  feature: keyof PlanFeatures
): boolean {
  const features = getPlanFeatures(plan);
  return !!features[feature];
}

/**
 * Check if user can access dual mode (both storytelling and business)
 */
export function canAccessDualMode(plan: SubscriptionPlan | null): boolean {
  return getPlanFeatures(plan).responseMode === "dual";
}

/**
 * Check if user can choose their response style
 */
export function canChooseStyle(plan: SubscriptionPlan | null): boolean {
  const mode = getPlanFeatures(plan).responseMode;
  return mode === "single-choice" || mode === "dual";
}

/**
 * Check if user can analyze posts
 */
export function canAnalyzePosts(plan: SubscriptionPlan | null): boolean {
  return getPlanFeatures(plan).hasAnalysis;
}

/**
 * Check if user can improve existing posts
 */
export function canImprovePost(plan: SubscriptionPlan | null): boolean {
  return getPlanFeatures(plan).hasImproveMode;
}

/**
 * Check if user can adapt posts to other platforms
 */
export function canAdaptToMultiPlatform(plan: SubscriptionPlan | null): boolean {
  return getPlanFeatures(plan).hasMultiPlatform;
}

/**
 * Check if user can attach files to messages (Max plan only)
 */
export function canAttachFiles(plan: SubscriptionPlan | null): boolean {
  return getPlanFeatures(plan).hasFileAttachments;
}

/**
 * Get the minimum plan required for a feature
 */
export function getMinPlanForFeature(feature: keyof PlanFeatures): SubscriptionPlan {
  if (PLAN_FEATURES.free[feature]) return "free";
  if (PLAN_FEATURES.pro[feature]) return "pro";
  return "max";
}

/**
 * Get upgrade message for a locked feature
 */
export function getUpgradeMessage(
  feature: keyof PlanFeatures,
  language: "fr" | "en" = "fr"
): { title: string; description: string; targetPlan: SubscriptionPlan } {
  const targetPlan = getMinPlanForFeature(feature);

  const messages: Record<keyof PlanFeatures, { fr: { title: string; description: string }; en: { title: string; description: string } }> = {
    responseMode: {
      fr: { title: "Choisissez votre style", description: "Passez au plan Pro pour choisir entre Storytelling et Business." },
      en: { title: "Choose your style", description: "Upgrade to Pro to choose between Storytelling and Business." },
    },
    hasInsights: {
      fr: { title: "Insights IA", description: "Les insights sont disponibles sur tous les plans." },
      en: { title: "AI Insights", description: "Insights are available on all plans." },
    },
    hasAnalysis: {
      fr: { title: "Analyse de post", description: "Passez au plan Pro pour analyser vos posts (hook, structure, CTA)." },
      en: { title: "Post Analysis", description: "Upgrade to Pro to analyze your posts (hook, structure, CTA)." },
    },
    hasImproveMode: {
      fr: { title: "Ameliorer un post", description: "Passez au plan Pro pour ameliorer vos posts existants." },
      en: { title: "Improve Post", description: "Upgrade to Pro to improve your existing posts." },
    },
    hasMultiPlatform: {
      fr: { title: "Multi-plateforme", description: "Passez au plan Max pour adapter vos posts a Threads, Twitter et Facebook." },
      en: { title: "Multi-platform", description: "Upgrade to Max to adapt your posts to Threads, Twitter and Facebook." },
    },
    hasAdaptiveTone: {
      fr: { title: "Ton adaptatif", description: "Passez au plan Pro pour personnaliser le ton de vos posts." },
      en: { title: "Adaptive Tone", description: "Upgrade to Pro to customize the tone of your posts." },
    },
    hasAdvancedPersonalization: {
      fr: { title: "Personnalisation avancee", description: "Passez au plan Max pour une personnalisation complete." },
      en: { title: "Advanced Personalization", description: "Upgrade to Max for full personalization." },
    },
    hasFileAttachments: {
      fr: { title: "Fichiers joints", description: "Passez au plan Max pour joindre des fichiers (images, PDF) à vos messages." },
      en: { title: "File Attachments", description: "Upgrade to Max to attach files (images, PDF) to your messages." },
    },
    hasUrlAnalysis: {
      fr: { title: "Analyse de lien", description: "Passez au plan Pro pour analyser le contenu d'un lien et générer un post basé dessus." },
      en: { title: "URL Analysis", description: "Upgrade to Pro to analyze link content and generate posts from it." },
    },
  };

  return {
    ...messages[feature][language],
    targetPlan,
  };
}
