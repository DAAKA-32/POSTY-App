"use client";

import { Suspense, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { getAuthHeaders } from "@/lib/api/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { getAllPlans, PlanConfig, PlanType, GUARANTEE_PERIOD_DAYS } from "@/lib/config/plans";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { activateFreePlan } from "@/lib/db/firestore";
import BillingToggle from "@/components/ui/BillingToggle";
import toast from "@/components/ui/Toast";
import WelcomeModal from "@/components/ui/WelcomeModal";
import PricingCard from "@/components/pricing/PricingCard";
import { usePageTitle } from "@/hooks/ui/usePageTitle";

// Get all plans (Free + Pro + Max) from lib/plans.ts (single source of truth)
const PLANS = getAllPlans();

function SubscriptionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, signOut, userProfile } = useAuth();
  const { currentPlan, canStartTrial, refreshSubscription } = useSubscription();
  const { t } = useLanguage();
  usePageTitle("subscription");
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("yearly");
  const [isLoading, setIsLoading] = useState<PlanType | null>(null);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [welcomePlanName, setWelcomePlanName] = useState<string | undefined>();


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

  // Determine if user was redirected from a guard (for back button behavior)
  const isRedirectedFromGuard = searchParams.get("reason") === "subscription_required" || searchParams.get("reason") === "trial_expired";

  // Show toast if redirected from canceled checkout
  useEffect(() => {
    if (searchParams.get("canceled")) {
      toast.error(t.pricing.paymentCanceled);
    }
  }, [searchParams, t.pricing.paymentCanceled]);

  // Show welcome modal after successful Stripe payment
  useEffect(() => {
    if (searchParams.get("success")) {
      const plan = currentPlan;
      const name = plan === "max" ? "Max" : plan === "pro" ? "Pro" : undefined;
      setWelcomePlanName(name);
      setShowWelcomeModal(true);
    }
  }, [searchParams, currentPlan]);

  const handleSelectPlan = async (plan: PlanConfig) => {
    if (!user) {
      router.push("/login?mode=signup");
      return;
    }

    // Free plan — activate in Firestore and show welcome modal
    // Handled BEFORE currentPlan check so free users are never stuck
    if (plan.id === "free") {
      if (!currentPlan || currentPlan === "free") {
        try {
          await activateFreePlan(user.uid);
          await refreshSubscription();
        } catch (error) {
          console.error("Error activating free plan:", error);
        }
      }
      setWelcomePlanName(undefined);
      setShowWelcomeModal(true);
      return;
    }

    // Paid plans — skip if already on this plan
    if (plan.id === currentPlan) {
      return;
    }

    setIsLoading(plan.id);

    try {
      // Get redirect param to pass through checkout flow
      const redirectAfterSuccess = searchParams.get("redirect");

      // Create checkout session (with trial if eligible)
      const authHeaders = await getAuthHeaders();
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({
          userId: user.uid,
          userEmail: user.email,
          plan: plan.id,
          interval: billingPeriod,
          withTrial: canStartTrial && plan.trialDays > 0,
          redirectAfterSuccess: redirectAfterSuccess || undefined,
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

  return (
    <div
      className="bg-background-warm dark:bg-background"
      style={{
        height: "100dvh",
        maxHeight: "100dvh",
        overflowY: "auto",
        overflowX: "hidden",
        WebkitOverflowScrolling: "touch",
        touchAction: "pan-y",
      }}
    >
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background-warm/80 dark:bg-dark-bg/80 backdrop-blur-xl border-b border-[#F8935D]/10 dark:border-dark-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative flex items-center h-16">
            {currentPlan && (
              <button
                onClick={() => isRedirectedFromGuard ? router.push("/") : router.back()}
                className="flex items-center gap-2 text-gray-600 dark:text-text-secondary hover:text-gray-900 dark:hover:text-white transition-colors group z-10"
              >
                <svg className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="hidden sm:inline">{t.pricing.back}</span>
              </button>
            )}
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
          <p className="text-lg text-gray-600 dark:text-text-secondary max-w-2xl mx-auto mb-6">
            {t.pricing.subtitleFull}
          </p>

          {/* Contextual Message - Show reason for redirect */}
          {searchParams.get("reason") && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-2xl mx-auto mb-8"
            >
              <div className="bg-[#F8935D]/5 dark:bg-primary/10 border border-[#F8935D]/20 dark:border-primary/20 rounded-xl p-4 flex items-start gap-3">
                <svg className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-primary-dark dark:text-primary-light mb-1">
                    {searchParams.get("reason") === "subscription_required"
                      ? t.subscriptionPage.subscriptionRequired
                      : searchParams.get("reason") === "trial_expired"
                      ? t.subscriptionPage.trialExpired
                      : t.subscriptionPage.upgradeNeeded
                    }
                  </p>
                  <p className="text-xs text-primary-dark dark:text-secondary">
                    {searchParams.get("reason") === "subscription_required"
                      ? t.subscriptionPage.subscriptionRequiredDesc
                      : searchParams.get("reason") === "trial_expired"
                      ? t.subscriptionPage.trialExpiredDesc
                      : t.subscriptionPage.upgradeNeededDesc
                    }
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Billing Period Selection - Unified Toggle Style */}
          <BillingToggle
            isYearly={billingPeriod === "yearly"}
            onChange={(isYearly) => setBillingPeriod(isYearly ? "yearly" : "monthly")}
            monthlyLabel={t.pricing.monthly}
            yearlyLabel={t.pricing.yearly}
            savingsLabel={t.subscriptionPage.monthsFree}
            showSavings={true}
            size="md"
            className="mb-12"
          />
        </motion.div>

        {/* Pricing Cards - Grid: 1 col mobile, 3 cols desktop */}
        <div className="max-w-5xl mx-auto px-2 sm:px-4 md:px-0">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5 md:gap-6 lg:gap-8 items-start">
            {PLANS.map((plan, index) => (
              <PricingCard
                key={plan.id}
                plan={plan}
                billingPeriod={billingPeriod}
                index={index}
                isAuthenticated={true}
                isCurrentPlan={plan.id !== "free" && plan.id === currentPlan}
                isLoading={isLoading === plan.id}
                onSelect={() => handleSelectPlan(plan)}
              />
            ))}
          </div>
        </div>

        {/* Legal notice — EU withdrawal waiver (Directive 2011/83/EU, art. L.221-28) */}
        <div className="max-w-2xl mx-auto mt-8 text-center">
          <p className="text-[10px] sm:text-xs text-text-muted leading-relaxed">
            {t.subscriptionPage.legalNotice}{" "}
            <a href="/legal/terms" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary transition-colors">
              {t.subscriptionPage.termsLink}
            </a>{" "}
            {t.subscriptionPage.legalNotice2} {GUARANTEE_PERIOD_DAYS} {t.subscriptionPage.guaranteeNotice}
          </p>
        </div>

        {/* FAQ Section - Single Column Layout */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.35 }}
          className="mt-20"
        >
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-3">
              {t.pricing.faqTitle}
            </h2>
            <p className="text-text-secondary text-sm md:text-base max-w-lg mx-auto">
              {t.subscriptionPage.faqSubtitle}
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

        {/* Bottom actions — only for users without an active plan */}
        {!currentPlan && (
          <div className="max-w-2xl mx-auto mt-10 flex items-center justify-between px-2">
            {userProfile?.onboardingComplete ? (
              <button
                onClick={() => { window.location.href = "/onboarding?edit=true"; }}
                className="flex items-center gap-2 text-sm text-text-secondary hover:text-primary transition-colors group"
                aria-label={t.subscriptionPage.editProfile}
              >
                <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span>{t.subscriptionPage.editProfile}</span>
              </button>
            ) : (
              <div />
            )}
            <button
              onClick={async () => { await signOut(); router.push("/login"); }}
              className="flex items-center gap-2 text-sm text-text-secondary hover:text-primary transition-colors group"
              aria-label={t.subscriptionPage.backToLogin}
            >
              <span>{t.subscriptionPage.backToLogin}</span>
              <svg
                className="w-4 h-4 group-hover:translate-x-0.5 transition-transform"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        )}

        {/* Bottom spacing */}
        <div className="h-12" />
      </div>

      {/* Welcome modal — shown after successful payment (real or test) */}
      <WelcomeModal
        isOpen={showWelcomeModal}
        planName={welcomePlanName}
        redirectTo={searchParams.get("redirect") || "/app"}
      />
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
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.04 * index, duration: 0.25 }}
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
