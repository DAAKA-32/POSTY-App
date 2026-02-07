"use client";

import { Suspense, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { getAllPlans, PlanConfig, PlanType, getSavingsText, PLAN_TAGLINES, getPlanCoreFeatures, getPlanSecondaryFeatures, getCTALabel, FeatureItem, isTestModeAllowed, PRODUCTION_MODE, TRIAL_PERIOD_DAYS, GUARANTEE_PERIOD_DAYS } from "@/lib/plans";
import { useSubscription } from "@/contexts/SubscriptionContext";
import Button from "@/components/ui/Button";
import BillingToggle from "@/components/ui/BillingToggle";
import TestModePanel from "@/components/subscription/TestModePanel";
import toast from "@/components/ui/Toast";

// Get plans from lib/plans.ts (single source of truth)
const PLANS = getAllPlans();

function SubscriptionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { currentPlan, isTestMode, canStartTrial, isTrialing, trialDaysRemaining } = useSubscription();
  const { t } = useLanguage();
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("yearly");
  const [isLoading, setIsLoading] = useState<PlanType | null>(null);
  const [selectedTestPlan, setSelectedTestPlan] = useState<PlanType | null>(null);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  // Multi-open accordion: up to 3 cards can have expanded features simultaneously
  // If a 4th card is opened, the oldest one closes automatically
  const [expandedCardIds, setExpandedCardIds] = useState<string[]>([]);

  const handleToggleFeatures = (planId: string) => {
    setExpandedCardIds((prev) => {
      // If already open, close it
      if (prev.includes(planId)) {
        return prev.filter((id) => id !== planId);
      }
      // If less than 3 open, add it
      if (prev.length < 3) {
        return [...prev, planId];
      }
      // If 3 already open, remove oldest (first) and add new one
      return [...prev.slice(1), planId];
    });
  };

  // ============================================
  // PRODUCTION MODE: Test mode is completely disabled
  // To re-enable: set NEXT_PUBLIC_ENABLE_TEST_MODE=true in .env.local
  // ============================================
  const [canUseTestMode, setCanUseTestMode] = useState(false);

  useEffect(() => {
    // Use centralized isTestModeAllowed() check from lib/plans.ts
    // This respects PRODUCTION_MODE flag as single source of truth
    setCanUseTestMode(isTestModeAllowed());
  }, []);

  // Enable full scrolling on Subscription page (mouse wheel, trackpad, touch, keyboard)
  useEffect(() => {
    document.documentElement.classList.add("subscription-scroll-enabled");
    document.body.classList.add("subscription-scroll-enabled");
    // Remove any classes that might block scroll
    document.body.classList.remove("pwa-mobile", "no-scroll", "scroll-locked", "modal-open");

    return () => {
      document.documentElement.classList.remove("subscription-scroll-enabled");
      document.body.classList.remove("subscription-scroll-enabled");
    };
  }, []);

  // Show toast if redirected from canceled checkout
  useEffect(() => {
    if (searchParams.get("canceled")) {
      toast.error(t.pricing.paymentCanceled);
    }
    if (searchParams.get("success")) {
      toast.success(t.pricing.subscriptionActivated);
    }
  }, [searchParams, t.pricing.paymentCanceled, t.pricing.subscriptionActivated]);

  const handleSelectPlan = async (plan: PlanConfig) => {
    if (!user) {
      router.push("/?auth=signup");
      return;
    }

    if (plan.id === currentPlan && !isTestMode) {
      return;
    }

    // In dev/admin mode, use test mode instead of Stripe
    if (canUseTestMode) {
      setSelectedTestPlan(plan.id);
      return;
    }

    // Free plan - no action needed (production only)
    if (plan.id === "free") {
      toast.success(t.pricing.alreadyFreePlan);
      return;
    }

    setIsLoading(plan.id);

    try {
      // Create checkout session (with trial if eligible)
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          userEmail: user.email,
          plan: plan.id,
          interval: billingPeriod,
          withTrial: canStartTrial,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t.pricing.checkoutError);
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error(t.pricing.paymentError);
    } finally {
      setIsLoading(null);
    }
  };

  const getYearlySavings = (plan: PlanConfig) => {
    if (plan.price.monthly === 0) return 0;
    const monthlyTotal = plan.price.monthly * 12;
    const savings = monthlyTotal - plan.price.yearly;
    return Math.round(savings * 100) / 100;
  };

  const getYearlyMonthlyPrice = (plan: PlanConfig) => {
    if (plan.price.yearly === 0) return 0;
    return Math.round((plan.price.yearly / 12) * 100) / 100;
  };

  return (
    <div
      className="min-h-screen bg-background-warm dark:bg-background"
      style={{
        overflowY: "auto",
        overflowX: "hidden",
        minHeight: "100vh",
        WebkitOverflowScrolling: "touch",
        touchAction: "pan-y",
      }}
    >
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background-warm/80 dark:bg-dark-bg/80 backdrop-blur-xl border-b border-[#F8935D]/10 dark:border-dark-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative flex items-center h-16">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-gray-600 dark:text-text-secondary hover:text-gray-900 dark:hover:text-white transition-colors group z-10"
            >
              <svg className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="hidden sm:inline">{t.pricing.back}</span>
            </button>
            <div className="absolute left-1/2 -translate-x-1/2 text-lg font-semibold text-gray-900 dark:text-white">
              {t.pricing.subscription}
            </div>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            {t.pricing.title}
          </h1>
          <p className="text-lg text-gray-600 dark:text-text-secondary max-w-2xl mx-auto mb-10">
            {t.pricing.subtitleFull}
          </p>

          {/* Billing Period Selection - Unified Toggle Style */}
          <BillingToggle
            isYearly={billingPeriod === "yearly"}
            onChange={(isYearly) => setBillingPeriod(isYearly ? "yearly" : "monthly")}
            monthlyLabel={t.pricing.monthly}
            yearlyLabel={t.pricing.yearly}
            savingsLabel="-17%"
            showSavings={true}
            size="md"
            className="mb-12"
          />
        </motion.div>

        {/* Pricing Cards - Grid: 2 cols mobile (Pro+Max), 3 cols desktop */}
        <div className="max-w-5xl mx-auto px-2 sm:px-4 md:px-0">
          {/* Mobile: Free plan compact banner */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="sm:hidden mb-4 p-3 bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 border border-primary/20 rounded-xl"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-0.5">Plan Gratuit</h4>
                <p className="text-[10px] text-gray-600 dark:text-text-muted">3 posts/jour • Idéal pour découvrir</p>
              </div>
              {currentPlan === "free" ? (
                <span className="px-3 py-1.5 bg-green-500/20 text-green-400 text-[10px] font-semibold rounded-lg flex items-center gap-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Actuel
                </span>
              ) : (
                <button
                  onClick={() => handleSelectPlan(PLANS[0])}
                  disabled={isLoading === "free"}
                  className="px-3 py-1.5 bg-gradient-to-r from-primary to-accent text-white text-[10px] font-semibold rounded-lg shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-center disabled:opacity-50"
                >
                  {isLoading === "free" ? "..." : "Choisir"}
                </button>
              )}
            </div>
          </motion.div>

          {/* Grid: 2 cols on mobile (Pro + Max side by side), 3 cols on desktop */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4 md:gap-6 lg:gap-8 items-start">
            {PLANS.map((plan, index) => (
              <div
                key={plan.id}
                className={plan.price.monthly === 0 ? "hidden sm:block" : ""}
              >
                <PricingCard
                  plan={plan}
                  billingPeriod={billingPeriod}
                  isCurrentPlan={plan.id === currentPlan}
                  yearlySavings={getYearlySavings(plan)}
                  yearlyMonthlyPrice={getYearlyMonthlyPrice(plan)}
                  onSelect={() => handleSelectPlan(plan)}
                  isLoading={isLoading === plan.id}
                  index={index}
                  translations={t.pricing}
                  isFeaturesExpanded={expandedCardIds.includes(plan.id)}
                  onToggleFeatures={() => handleToggleFeatures(plan.id)}
                  trialEligible={canStartTrial && plan.trialDays > 0}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Test Mode Panel - Hidden in Production Mode
            To re-enable: set NEXT_PUBLIC_ENABLE_TEST_MODE=true in .env.local */}
        {canUseTestMode && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="mt-12 max-w-md mx-auto"
          >
            <TestModePanel
              selectedPlan={selectedTestPlan ?? undefined}
              onPlanActivated={(plan) => {
                setSelectedTestPlan(null);
                toast.success(`Plan ${plan.charAt(0).toUpperCase() + plan.slice(1)} activé en mode test`);
              }}
            />
          </motion.div>
        )}

        {/* FAQ Section - Single Column Layout */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-20"
        >
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-3">
              {t.pricing.faqTitle}
            </h2>
            <p className="text-text-secondary text-sm md:text-base max-w-lg mx-auto">
              Tout ce que vous devez savoir sur nos offres
            </p>
          </div>

          {/* Single column FAQ list */}
          <div className="flex flex-col gap-3 max-w-2xl mx-auto">
            <FAQItem
              question={t.pricing.faqChangePlan}
              answer={t.pricing.faqChangePlanAnswer}
              index={0}
              isOpen={openFaqIndex === 0}
              onToggle={() => setOpenFaqIndex(openFaqIndex === 0 ? null : 0)}
            />
            <FAQItem
              question={t.pricing.faqDailyLimit}
              answer={t.pricing.faqDailyLimitAnswer}
              index={1}
              isOpen={openFaqIndex === 1}
              onToggle={() => setOpenFaqIndex(openFaqIndex === 1 ? null : 1)}
            />
            <FAQItem
              question={t.pricing.faqCommitment}
              answer={t.pricing.faqCommitmentAnswer}
              index={2}
              isOpen={openFaqIndex === 2}
              onToggle={() => setOpenFaqIndex(openFaqIndex === 2 ? null : 2)}
            />
            <FAQItem
              question={t.pricing.faqYearlySavings}
              answer={t.pricing.faqYearlySavingsAnswer}
              index={3}
              isOpen={openFaqIndex === 3}
              onToggle={() => setOpenFaqIndex(openFaqIndex === 3 ? null : 3)}
            />
          </div>
        </motion.div>

        {/* Bottom spacing */}
        <div className="h-12" />
      </div>
    </div>
  );
}

function LoadingFallback() {
  // Note: We can't use hooks here since this is rendered before SubscriptionContent
  // Using a simple loading message that works universally
  return (
    <div className="min-h-screen bg-background-warm dark:bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 md:w-12 md:h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-text-secondary">{/* Loading animation only */}</p>
      </div>
    </div>
  );
}

export default function SubscriptionPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <SubscriptionContent />
    </Suspense>
  );
}

interface PricingTranslations {
  recommended: string;
  currentPlan: string;
  free: string;
  perMonth: string;
  billedYearly: string;
  savingsYearly: string;
}

interface PricingCardProps {
  plan: PlanConfig;
  billingPeriod: "monthly" | "yearly";
  isCurrentPlan: boolean;
  yearlySavings: number;
  yearlyMonthlyPrice: number;
  onSelect: () => void;
  isLoading?: boolean;
  index: number;
  translations: PricingTranslations;
  /** Whether the secondary features are expanded (controlled by parent) */
  isFeaturesExpanded?: boolean;
  /** Callback to toggle the features expansion (controlled by parent) */
  onToggleFeatures?: () => void;
  /** Whether the user is eligible for a free trial on this plan */
  trialEligible?: boolean;
}

// PLAN_TAGLINES, getPlanCoreFeatures, getPlanSecondaryFeatures, getCTALabel are now imported from @/lib/plans

// Feature item component for reuse - responsive version
function FeatureListItem({ feature, index }: { feature: FeatureItem; index: number }) {
  return (
    <motion.li
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.4 + index * 0.05 }}
      className="flex items-start gap-1.5 sm:gap-2 md:gap-3"
    >
      <div className={`
        flex-shrink-0 w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 rounded-full flex items-center justify-center mt-0.5
        ${feature.included
          ? "bg-green-500/20 text-green-400"
          : "bg-red-500/15 text-red-400"
        }
      `}>
        {feature.included ? (
          <svg className="w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg className="w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        )}
      </div>
      <span className={`text-[10px] sm:text-xs md:text-sm ${
        feature.included
          ? "text-text-secondary"
          : "text-text-muted line-through"
      }`}>
        {feature.text}
      </span>
    </motion.li>
  );
}

function PricingCard({
  plan,
  billingPeriod,
  isCurrentPlan,
  yearlySavings,
  yearlyMonthlyPrice,
  onSelect,
  isLoading = false,
  index,
  translations,
  isFeaturesExpanded = false,
  onToggleFeatures,
  trialEligible = false,
}: PricingCardProps) {
  const displayPrice = billingPeriod === "monthly" ? plan.price.monthly : yearlyMonthlyPrice;
  const isPopular = plan.highlight;
  const isPremium = plan.premium;
  const isFree = plan.price.monthly === 0;
  const coreFeatures = getPlanCoreFeatures(plan);
  const secondaryFeatures = getPlanSecondaryFeatures(plan);
  const planInfo = PLAN_TAGLINES[plan.id] || { tagline: plan.description, idealFor: "" };
  const [isHovered, setIsHovered] = useState(false);

  // Use controlled state from parent (multi-open accordion - up to 3 cards can be expanded)
  const showMoreFeatures = isFeaturesExpanded;
  const toggleShowMoreFeatures = () => onToggleFeatures?.();

  // Count included secondary features
  const includedSecondaryCount = secondaryFeatures.filter(f => f.included).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: index * 0.15,
        duration: 0.5,
        ease: [0.22, 1, 0.36, 1]
      }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className={`
        relative rounded-lg sm:rounded-xl md:rounded-2xl overflow-hidden h-full
        ${isPopular
          ? "scale-100 sm:scale-[1.02] md:scale-105 z-20 ring-2 ring-primary/50 sm:ring-primary/70"
          : "z-10"
        }
        ${isCurrentPlan ? "ring-2 ring-green-500/50" : ""}
      `}
    >
      {/* Enhanced glow effect for popular plan - DOMINANT VISUAL */}
      {isPopular && (
        <>
          {/* Outer pulsing glow - subtle on mobile */}
          <div className="absolute -inset-0.5 sm:-inset-1 rounded-xl sm:rounded-2xl md:rounded-3xl bg-gradient-to-r from-primary via-accent to-primary opacity-50 sm:opacity-75 blur-lg sm:blur-xl animate-pulse" />
          {/* Inner animated gradient border */}
          <div className="absolute inset-0 rounded-lg sm:rounded-xl md:rounded-2xl p-[1px] sm:p-[2px] bg-gradient-to-br from-primary via-accent to-primary bg-[length:200%_200%] animate-gradient-slow">
            <div className="absolute inset-[1px] sm:inset-[2px] rounded-[7px] sm:rounded-[10px] md:rounded-[14px] bg-white dark:bg-dark-card" />
          </div>
        </>
      )}

      {/* Premium glow effect */}
      {isPremium && (
        <>
          <div className="absolute -inset-0.5 rounded-lg sm:rounded-xl md:rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 opacity-20 sm:opacity-30 blur-md sm:blur-lg" />
          <div className="absolute inset-0 rounded-lg sm:rounded-xl md:rounded-2xl bg-gradient-to-br from-amber-500/20 via-transparent to-orange-500/20 opacity-60" />
        </>
      )}

      {/* Subtle shimmer effect on hover - desktop only */}
      <motion.div
        className="absolute inset-0 rounded-lg sm:rounded-xl md:rounded-2xl pointer-events-none overflow-hidden hidden sm:block"
        initial={{ opacity: 0 }}
        animate={{ opacity: isHovered ? 1 : 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#F8935D]/[0.05] to-transparent animate-shimmer" />
      </motion.div>

      {/* Card background - RESPONSIVE GRID STRUCTURE */}
      <div className={`
        relative p-2 sm:p-4 md:p-6 lg:p-8 rounded-lg sm:rounded-xl md:rounded-2xl h-full
        flex flex-col
        ${isPopular
          ? "bg-gradient-to-b from-primary/10 via-white dark:via-dark-card to-white dark:to-dark-card"
          : isPremium
            ? "bg-gradient-to-b from-amber-500/5 via-white dark:via-dark-card to-white dark:to-dark-card border sm:border-2 border-amber-500/30"
            : isFree
              ? "bg-white dark:bg-dark-card border border-primary/25 dark:border-primary/20"
              : "bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border"
        }
      `}>

        {/* ZONE 0: Badges section (responsive height) */}
        <div className="h-[24px] sm:h-[32px] md:h-[44px] flex items-start justify-center relative mb-1 sm:mb-2">
          {/* Popular badge with animation */}
          {isPopular && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="relative"
            >
              <div className="absolute inset-0 bg-primary rounded-full blur-md opacity-50 animate-pulse" />
              <div className="relative px-1.5 sm:px-3 md:px-4 py-0.5 sm:py-1 md:py-1.5 bg-gradient-to-r from-primary to-accent text-white text-[10px] sm:text-xs md:text-sm font-semibold rounded-full shadow-lg shadow-primary/30 flex items-center gap-0.5 sm:gap-1 md:gap-1.5">
                <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-4 md:h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span className="hidden sm:inline">Le plus populaire</span>
                <span className="inline sm:hidden">Top</span>
              </div>
            </motion.div>
          )}

          {/* Premium/Elite badge */}
          {isPremium && !isPopular && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="px-1.5 sm:px-3 md:px-4 py-0.5 sm:py-1 md:py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] sm:text-xs md:text-sm font-semibold rounded-full shadow-lg shadow-amber-500/30 flex items-center gap-0.5 sm:gap-1 md:gap-1.5">
                <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-4 md:h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 2a2 2 0 00-2 2v14l3.5-2 3.5 2 3.5-2 3.5 2V4a2 2 0 00-2-2H5zm2.5 3a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm6.207.293a1 1 0 00-1.414 0l-6 6a1 1 0 101.414 1.414l6-6a1 1 0 000-1.414zM12.5 10a1.5 1.5 0 100 3 1.5 1.5 0 000-3z" clipRule="evenodd" />
                </svg>
                Elite
              </div>
            </motion.div>
          )}

          {/* Current plan badge - positioned at top right */}
          {isCurrentPlan && (
            <div className="absolute top-0 right-0 px-1.5 sm:px-2 md:px-3 py-0.5 sm:py-1 bg-green-500/20 text-green-400 text-[9px] sm:text-[10px] md:text-xs font-medium rounded-full border border-green-500/30 flex items-center gap-0.5 sm:gap-1">
              <svg className="w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="hidden sm:inline">Actuel</span>
            </div>
          )}
        </div>

        {/* ZONE 1: Plan header (responsive height for alignment) */}
        <div className="h-[50px] sm:h-[60px] md:h-[80px] text-center flex flex-col justify-center">
          <h3 className={`text-sm sm:text-lg md:text-2xl font-bold mb-0.5 sm:mb-1 ${
            isPremium ? "text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400" : "text-gray-900 dark:text-white"
          }`}>
            {plan.name}
          </h3>
          <p className="text-[10px] sm:text-xs md:text-sm text-text-secondary line-clamp-1 sm:line-clamp-2">{planInfo.tagline}</p>
          <p className={`text-[9px] sm:text-[10px] md:text-xs mt-0.5 sm:mt-1 hidden sm:block ${isPopular ? "text-primary" : isPremium ? "text-amber-400" : "text-text-muted"}`}>
            {planInfo.idealFor}
          </p>
        </div>

        {/* ZONE 2: Price section (responsive height for alignment) */}
        <div className="h-[70px] sm:h-[90px] md:h-[130px] text-center flex flex-col justify-center">
          {/* Price display */}
          <div className="h-[32px] sm:h-[42px] md:h-[56px] flex items-center justify-center">
            <motion.div
              key={`${plan.id}-${billingPeriod}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.15 }}
              className="flex items-baseline justify-center gap-0.5 sm:gap-1"
            >
              {isFree ? (
                <span className="text-lg sm:text-2xl md:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white">Gratuit</span>
              ) : (
                <>
                  <span className={`text-lg sm:text-2xl md:text-4xl lg:text-5xl font-bold tabular-nums ${
                    isPremium ? "text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400" : "text-gray-900 dark:text-white"
                  }`}>
                    {displayPrice.toFixed(2).replace(".", ",")}
                  </span>
                  <span className="text-sm sm:text-base md:text-xl text-gray-900 dark:text-white font-medium">€</span>
                  <span className="text-text-secondary text-[10px] sm:text-xs md:text-sm">/mois</span>
                </>
              )}
            </motion.div>
          </div>

          {/* Savings badge (responsive height for alignment) */}
          <div className={`h-[32px] sm:h-[42px] md:h-[56px] flex flex-col items-center justify-center transition-opacity duration-200 ${
            billingPeriod === "yearly" && !isFree ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}>
            <div className="inline-flex items-center gap-0.5 sm:gap-1 md:gap-1.5 px-1.5 sm:px-2 md:px-3 py-0.5 sm:py-1 bg-green-500/10 rounded-full border border-green-500/20">
              <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-4 md:h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-[10px] sm:text-xs md:text-sm text-green-400 font-semibold">
                {getSavingsText(plan.id) || `${yearlySavings.toFixed(0)}€`}
              </span>
            </div>
            <p className="text-[9px] sm:text-[10px] md:text-xs text-text-muted mt-0.5 sm:mt-1 hidden sm:block">
              Facturé {plan.price.yearly}€/an
            </p>
          </div>
        </div>

        {/* ZONE 3: CTA Button (responsive height for alignment) */}
        <div className="h-[32px] sm:h-[42px] md:h-[56px] relative flex items-center mb-2 sm:mb-4 md:mb-6">
          {/* Glow effect behind button for popular plan */}
          {isPopular && !isCurrentPlan && (
            <div className="absolute inset-0 bg-primary/30 rounded-lg sm:rounded-xl blur-md sm:blur-xl" />
          )}
          {isPremium && !isCurrentPlan && (
            <div className="absolute inset-0 bg-amber-500/20 rounded-lg sm:rounded-xl blur-md sm:blur-xl" />
          )}

          <motion.button
            whileHover={{ scale: isCurrentPlan ? 1 : 1.02 }}
            whileTap={{ scale: isCurrentPlan ? 1 : 0.98 }}
            onClick={onSelect}
            disabled={isCurrentPlan || isLoading}
            className={`
              relative w-full h-full flex items-center justify-center px-2 sm:px-3 md:px-4 rounded-lg sm:rounded-xl font-semibold text-[10px] sm:text-xs md:text-sm
              transition-all duration-300 overflow-hidden
              disabled:opacity-50 disabled:cursor-not-allowed
              ${isCurrentPlan
                ? "bg-gray-100 dark:bg-dark-border text-gray-500 dark:text-text-muted"
                : isPopular
                  ? "bg-gradient-to-r from-primary to-accent text-white shadow-md sm:shadow-lg shadow-primary/30 hover:shadow-lg sm:hover:shadow-xl hover:shadow-primary/40"
                  : isPremium
                    ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md sm:shadow-lg shadow-amber-500/30 hover:shadow-lg sm:hover:shadow-xl hover:shadow-amber-500/40"
                    : "bg-gray-100 dark:bg-dark-elevated hover:bg-gray-200 dark:hover:bg-dark-hover text-gray-900 dark:text-white border border-gray-200 dark:border-dark-border hover:border-primary/50"
              }
            `}
          >
            {/* Shimmer effect on hover */}
            {!isCurrentPlan && (isPopular || isPremium) && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                initial={{ x: "-100%" }}
                animate={isHovered ? { x: "100%" } : { x: "-100%" }}
                transition={{ duration: 0.6, ease: "easeInOut" }}
              />
            )}

            <span className="relative flex items-center justify-center gap-1 sm:gap-2">
              {isLoading ? (
                <>
                  <svg className="animate-spin w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-4 md:h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span className="hidden sm:inline">Redirection...</span>
                </>
              ) : isCurrentPlan ? (
                <>
                  <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-4 md:h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="hidden sm:inline">Plan actuel</span>
                  <span className="inline sm:hidden">Actuel</span>
                </>
              ) : (
                <>
                  {getCTALabel(plan.id, billingPeriod === "yearly", trialEligible)}
                  <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-4 md:h-4 hidden sm:inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </>
              )}
            </span>
          </motion.button>
        </div>

        {/* ZONE 4: Features list (flexible, grows to fill space) */}
        <div className="flex-1 pt-2 sm:pt-3 md:pt-4 border-t border-gray-200 dark:border-dark-border/50">
          <ul className="space-y-1 sm:space-y-1.5 md:space-y-2.5">
            {coreFeatures.map((feature, idx) => (
              <FeatureListItem key={idx} feature={feature} index={idx} />
            ))}
          </ul>

          {/* "Voir plus" toggle for secondary features */}
          {includedSecondaryCount > 0 && (
            <div className="mt-2 sm:mt-3 md:mt-4">
              <button
                onClick={toggleShowMoreFeatures}
                className={`
                  w-full flex items-center justify-center gap-1 sm:gap-2 py-1.5 sm:py-2 px-2 sm:px-3
                  text-[10px] sm:text-xs md:text-sm font-medium rounded-md sm:rounded-lg
                  transition-all duration-200
                  ${showMoreFeatures
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "bg-gray-100 dark:bg-dark-elevated text-text-secondary hover:bg-gray-200 dark:hover:bg-dark-hover border border-gray-200 dark:border-dark-border"
                  }
                `}
              >
                <span className="hidden sm:inline">
                  {showMoreFeatures ? "Voir moins" : `+${includedSecondaryCount} fonctionnalités`}
                </span>
                <span className="inline sm:hidden">
                  {showMoreFeatures ? "Moins" : `+${includedSecondaryCount}`}
                </span>
                <motion.svg
                  className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-4 md:h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  animate={{ rotate: showMoreFeatures ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </motion.svg>
              </button>

              {/* Secondary features - Collapsible */}
              <AnimatePresence initial={false}>
                {showMoreFeatures && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <ul className="space-y-1 sm:space-y-1.5 md:space-y-2.5 mt-2 sm:mt-3 md:mt-4 pt-2 sm:pt-3 md:pt-4 border-t border-gray-200 dark:border-dark-border/50">
                      {secondaryFeatures.filter(f => f.included).map((feature, idx) => (
                        <FeatureListItem key={idx} feature={feature} index={idx} />
                      ))}
                    </ul>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* ZONE 5: Trust badge (responsive height for alignment) */}
        <div className="h-8 sm:h-10 md:h-12 mt-auto pt-2 sm:pt-2.5 md:pt-3 border-t border-gray-200 dark:border-dark-border/50 flex items-center justify-center">
          {!isFree ? (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-[9px] sm:text-[10px] md:text-xs text-text-muted flex items-center justify-center gap-0.5 sm:gap-1 md:gap-1.5"
            >
              <svg className="w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3.5 md:h-3.5 text-green-500 hidden sm:inline" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              {trialEligible ? (
                <>
                  <span className="hidden md:inline">{TRIAL_PERIOD_DAYS}j gratuits • Garantie {GUARANTEE_PERIOD_DAYS}j rembourse</span>
                  <span className="inline md:hidden">{TRIAL_PERIOD_DAYS}j gratuits + garantie</span>
                </>
              ) : (
                <>
                  <span className="hidden md:inline">Garantie {GUARANTEE_PERIOD_DAYS}j rembourse • Sans engagement</span>
                  <span className="inline md:hidden">Garantie {GUARANTEE_PERIOD_DAYS}j</span>
                </>
              )}
            </motion.p>
          ) : (
            <p className="text-[9px] sm:text-[10px] md:text-xs text-text-muted">
              <span className="hidden sm:inline">Ideal pour decouvrir Posty</span>
              <span className="inline sm:hidden">Gratuit</span>
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

interface FAQItemProps {
  question: string;
  answer: string;
  index?: number;
  isOpen: boolean;
  onToggle: () => void;
}

function FAQItem({ question, answer, index = 0, isOpen, onToggle }: FAQItemProps) {

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 * index, duration: 0.3 }}
      className={`
        bg-white dark:bg-dark-card rounded-xl overflow-hidden
        border transition-all duration-200
        ${isOpen
          ? "border-primary/30 dark:border-primary/40 shadow-sm"
          : "border-gray-200 dark:border-dark-border hover:border-gray-300 dark:hover:border-dark-border/80"
        }
      `}
    >
      <button
        onClick={onToggle}
        className={`
          flex items-center justify-between w-full text-left
          px-5 py-4 md:px-6 md:py-5
          transition-colors duration-200
          ${isOpen
            ? "bg-primary/5 dark:bg-primary/10"
            : "hover:bg-gray-50 dark:hover:bg-dark-hover/30"
          }
        `}
        aria-expanded={isOpen}
      >
        <span className={`
          font-medium pr-4 transition-colors duration-200
          ${isOpen
            ? "text-primary dark:text-primary"
            : "text-gray-900 dark:text-white"
          }
        `}>
          {question}
        </span>
        <motion.div
          className={`
            flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
            transition-colors duration-200
            ${isOpen
              ? "bg-primary/10 dark:bg-primary/20"
              : "bg-gray-100 dark:bg-dark-elevated"
            }
          `}
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          <svg
            className={`w-4 h-4 transition-colors duration-200 ${
              isOpen ? "text-primary" : "text-text-secondary"
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              height: { duration: 0.2, ease: [0.04, 0.62, 0.23, 0.98] },
              opacity: { duration: 0.15, ease: "easeOut" }
            }}
            style={{ overflow: "hidden" }}
          >
            <div className="px-5 pb-5 md:px-6 md:pb-6 pt-1">
              <p className="text-sm md:text-base text-text-secondary leading-relaxed">
                {answer}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
