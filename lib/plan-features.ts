/**
 * Centralized plan feature configuration
 * Defines what features are available for each subscription plan
 */

import { SubscriptionPlan, ResponseMode } from "@/types";

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
}

// Feature configuration for each plan
export const PLAN_FEATURES: Record<SubscriptionPlan, PlanFeatures> = {
  pro: {
    responseMode: "single-choice",
    hasInsights: true,
    hasAnalysis: true,
    hasImproveMode: true,
    hasMultiPlatform: false,
    hasAdaptiveTone: true,
    hasAdvancedPersonalization: false,
    hasFileAttachments: false,
  },
  max: {
    responseMode: "dual",
    hasInsights: true,
    hasAnalysis: true,
    hasImproveMode: true,
    hasMultiPlatform: true,
    hasAdaptiveTone: true,
    hasAdvancedPersonalization: true,
    hasFileAttachments: true,
  },
};

/**
 * Get features available for a specific plan
 */
export function getPlanFeatures(plan: SubscriptionPlan | null): PlanFeatures {
  if (!plan) return PLAN_FEATURES.pro; // Safe default for unsubscribed users (they're blocked anyway)
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
  };

  return {
    ...messages[feature][language],
    targetPlan,
  };
}
