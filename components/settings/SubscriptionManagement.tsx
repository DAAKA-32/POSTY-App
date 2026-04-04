"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useScrollLock } from "@/hooks/ui/useScrollLock";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import Button from "@/components/ui/Button";
import { SubscriptionBadge } from "@/components/stripe";
import toast from "@/components/ui/Toast";
import Link from "next/link";
import { GUARANTEE_PERIOD_DAYS } from "@/lib/config/plans";
import { getAuthHeaders } from "@/lib/api/client";

// Types for Stripe subscription details
interface StripeSubscriptionDetails {
  id: string;
  status: string;
  cancelAtPeriodEnd: boolean;
  cancelAt: number | null;
  canceledAt: number | null;
  currentPeriodStart: number;
  currentPeriodEnd: number;
  startDate: number;
  interval: "month" | "year";
  priceId: string;
  productId: string;
}

// Format date for locale
const formatDate = (timestamp: number | Date | { toDate: () => Date } | undefined, locale: string = "fr-FR"): string => {
  if (!timestamp) return "—";
  let date: Date;
  if (typeof timestamp === "number") {
    date = new Date(timestamp * 1000);
  } else if (timestamp instanceof Date) {
    date = timestamp;
  } else if (typeof (timestamp as { toDate?: () => Date }).toDate === "function") {
    date = (timestamp as { toDate: () => Date }).toDate();
  } else {
    return "—";
  }
  return date.toLocaleDateString(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

// Calculate days remaining
const getDaysRemaining = (endTimestamp: number): number => {
  const now = Date.now();
  const end = endTimestamp * 1000;
  const diff = end - now;
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
};

// Calculate human-readable subscription duration from a start date
const getSubscriptionDuration = (startTimestamp: number | Date | { toDate: () => Date } | undefined, t: any): string | null => {
  if (!startTimestamp) return null;
  let start: Date;
  if (typeof startTimestamp === "number") {
    start = new Date(startTimestamp * 1000);
  } else if (startTimestamp instanceof Date) {
    start = startTimestamp;
  } else if (typeof (startTimestamp as { toDate?: () => Date }).toDate === "function") {
    start = (startTimestamp as { toDate: () => Date }).toDate();
  } else {
    return null;
  }
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  if (diffMs < 0) return null;
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days < 1) return t.settings.todayDuration;
  if (days < 30) return t.settings.durationDays.replace("{n}", String(days)).replace("{s}", days > 1 ? "s" : "");
  const months = Math.floor(days / 30);
  if (months < 12) return t.settings.durationMonths.replace("{n}", String(months));
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  if (remainingMonths === 0) return t.settings.durationYears.replace("{n}", String(years)).replace("{s}", years > 1 ? "s" : "");
  return t.settings.durationYearsMonths.replace("{y}", String(years)).replace("{ys}", years > 1 ? "s" : "").replace("{m}", String(remainingMonths));
};

// Premium animation variants
const smoothEase = [0.22, 1, 0.36, 1] as const;

const sectionVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: smoothEase },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3, ease: smoothEase } },
};

export default function SubscriptionManagement() {
  const { t, language } = useLanguage();
  const dateLocale = language === "en" ? "en-US" : "fr-FR";
  const { userProfile } = useAuth();
  const {
    currentPlan,
    subscription,
    loading: contextLoading,
    guaranteeEligible,
    guaranteeDaysRemaining,
    requestRefund,
  } = useSubscription();

  // Paid plan = Pro or Max (not free, not null)
  const isPaidPlan = currentPlan === "pro" || currentPlan === "max";

  const [stripeDetails, setStripeDetails] = useState<StripeSubscriptionDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const [isReactivating, setIsReactivating] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [isRefunding, setIsRefunding] = useState(false);
  useScrollLock(showCancelModal || showRefundModal);

  // Get Stripe customer/subscription IDs from user profile
  const stripeCustomerId = userProfile?.subscription?.stripeCustomerId;
  const stripeSubscriptionId = userProfile?.subscription?.stripeSubscriptionId;

  // Fetch subscription details from Stripe
  const fetchStripeDetails = useCallback(async () => {
    if (!stripeSubscriptionId && !stripeCustomerId) return;
    if (!currentPlan) return;

    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (stripeSubscriptionId) params.set("subscriptionId", stripeSubscriptionId);
      else if (stripeCustomerId) params.set("customerId", stripeCustomerId);

      const authHeaders = await getAuthHeaders();
      const response = await fetch(`/api/stripe/subscription?${params}`, {
        headers: { ...authHeaders },
      });
      if (response.ok) {
        const data = await response.json();
        if (data.id) {
          setStripeDetails(data);
        }
      }
    } catch (error) {
      console.error("Error fetching subscription details:", error);
    } finally {
      setIsLoading(false);
    }
  }, [stripeSubscriptionId, stripeCustomerId, currentPlan]);

  useEffect(() => {
    fetchStripeDetails();
  }, [fetchStripeDetails]);

  // Handle subscription cancellation
  const handleCancelSubscription = async () => {
    if (!stripeSubscriptionId) return;

    setIsCanceling(true);
    try {
      const cancelAuthHeaders = await getAuthHeaders();
      const response = await fetch("/api/stripe/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...cancelAuthHeaders },
        body: JSON.stringify({
          subscriptionId: stripeSubscriptionId,
          action: "cancel",
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message);
        setShowCancelModal(false);
        // Refresh details
        await fetchStripeDetails();
      } else {
        toast.error(data.error || t.ui.cantCancelSubscription);
      }
    } catch (error) {
      console.error("Error canceling subscription:", error);
      toast.error(t.ui.cantCancelSubscription);
    } finally {
      setIsCanceling(false);
    }
  };

  // Handle subscription reactivation
  const handleReactivateSubscription = async () => {
    if (!stripeSubscriptionId) return;

    setIsReactivating(true);
    try {
      const reactivateAuthHeaders = await getAuthHeaders();
      const response = await fetch("/api/stripe/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...reactivateAuthHeaders },
        body: JSON.stringify({
          subscriptionId: stripeSubscriptionId,
          action: "reactivate",
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message);
        // Refresh details
        await fetchStripeDetails();
      } else {
        toast.error(data.error || t.settings.reactivationFailed);
      }
    } catch (error) {
      console.error("Error reactivating subscription:", error);
      toast.error(t.settings.cantReactivate);
    } finally {
      setIsReactivating(false);
    }
  };

  // Handle refund request (money-back guarantee)
  const handleRefundRequest = async () => {
    setIsRefunding(true);
    try {
      const result = await requestRefund();
      if (result.success) {
        toast.success(result.message || t.settings.refundSuccess);
        setShowRefundModal(false);
        await fetchStripeDetails();
      } else {
        toast.error(result.error || t.settings.refundFailed);
      }
    } catch (error) {
      console.error("Error requesting refund:", error);
      toast.error(t.settings.cantProcessRefund);
    } finally {
      setIsRefunding(false);
    }
  };

  // Open Stripe Customer Portal
  const handleManageSubscription = async () => {
    if (!stripeCustomerId) {
      toast.error(t.ui.noBillingAccount);
      return;
    }

    setIsLoading(true);
    try {
      const portalAuthHeaders = await getAuthHeaders();
      const response = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...portalAuthHeaders },
        body: JSON.stringify({ customerId: stripeCustomerId }),
      });

      const data = await response.json();

      if (data.url) {
        // Save current route so back navigation won't loop to Stripe portal
        sessionStorage.setItem("posty-pre-stripe-route", window.location.pathname);
        window.location.href = data.url;
      } else {
        toast.error(t.settings.cantOpenPortal);
      }
    } catch (error) {
      console.error("Error opening portal:", error);
      toast.error(t.settings.billingPortalUnavailable);
    } finally {
      setIsLoading(false);
    }
  };

  // Determine subscription status display
  const getStatusDisplay = () => {
    if (!isPaidPlan) {
      return { label: t.settings.freePlan, color: "text-text-secondary", bg: "bg-dark-hover" };
    }

    if (stripeDetails?.cancelAtPeriodEnd) {
      return { label: t.settings.scheduledCancellation, color: "text-warning", bg: "bg-warning/10" };
    }

    switch (stripeDetails?.status || subscription.status) {
      case "active":
        return { label: t.ui.active, color: "text-accent", bg: "bg-accent/10" };
      case "trialing":
        return { label: t.settings.trialPeriod, color: "text-primary", bg: "bg-primary/10" };
      case "past_due":
        return { label: t.settings.paymentOverdue, color: "text-error", bg: "bg-error/10" };
      case "canceled":
        return { label: t.settings.canceled, color: "text-error", bg: "bg-error/10" };
      default:
        return { label: t.ui.active, color: "text-accent", bg: "bg-accent/10" };
    }
  };

  const status = getStatusDisplay();
  const daysRemaining = stripeDetails?.currentPeriodEnd
    ? getDaysRemaining(stripeDetails.currentPeriodEnd)
    : 0;

  if (contextLoading) {
    return (
      <div className="p-6 bg-dark-card rounded-xl border border-dark-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
          <span className="text-text-secondary">{t.common.loading}</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <motion.section
        variants={sectionVariants}
        initial="hidden"
        animate="visible"
        className="group bg-dark-card border border-dark-border hover:border-primary/20 rounded-xl p-4 md:p-5 lg:p-6 transition-all duration-300 hover:shadow-[0_0_30px_rgba(232,147,77,0.08)]"
      >
        {/* Section Header */}
        <div className="flex items-center justify-between mb-5 lg:mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-gradient-to-br from-primary/15 to-accent/10 border border-primary/20 flex items-center justify-center group-hover:shadow-glow transition-shadow duration-300">
              <svg className="w-5 h-5 lg:w-6 lg:h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base lg:text-lg font-semibold text-gray-900 dark:text-white">{t.settings.subscriptionTitle}</h2>
              <p className="text-xs lg:text-sm text-text-muted mt-0.5">{t.settings.subscriptionSubtitle}</p>
            </div>
          </div>
          <SubscriptionBadge plan={currentPlan} size="md" />
        </div>

        {/* Subscription Details */}
        <div className="space-y-4">
          {/* Plan & Status Row */}
          <motion.div
            variants={itemVariants}
            className="flex items-center justify-between p-4 bg-dark-bg rounded-xl border border-dark-border"
          >
            <div>
              <p className="text-text-muted text-xs mb-1">{t.settings.currentPlan}</p>
              <p className="text-gray-900 dark:text-white font-semibold text-lg capitalize">
                {currentPlan === "pro" ? "Pro" : currentPlan === "max" ? "Max" : t.settings.freePlanLabel}
              </p>
            </div>
            <div className="text-right">
              <p className="text-text-muted text-xs mb-1">{t.settings.statusLabel}</p>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm font-medium ${status.bg} ${status.color}`}>
                {stripeDetails?.cancelAtPeriodEnd && (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                {status.label}
              </span>
            </div>
          </motion.div>

          {/* Billing Info - Only for paid plans */}
          {isPaidPlan && (
            <>
              {/* Subscription date — always visible using Firestore fallback */}
              <motion.div
                variants={itemVariants}
                className="grid grid-cols-2 gap-3"
              >
                {/* Start Date — Stripe startDate or Firestore subscribedAt */}
                <div className="p-4 bg-dark-bg rounded-xl border border-dark-border">
                  <p className="text-text-muted text-xs mb-1">{t.settings.subscribedSince}</p>
                  <p className="text-gray-900 dark:text-white font-semibold text-sm">
                    {stripeDetails?.startDate
                      ? formatDate(stripeDetails.startDate, dateLocale)
                      : formatDate(userProfile?.subscription?.subscribedAt, dateLocale)}
                  </p>
                  {(() => {
                    const duration = getSubscriptionDuration(stripeDetails?.startDate ?? userProfile?.subscription?.subscribedAt, t);
                    return duration ? (
                      <p className="text-xs text-text-muted mt-1">{duration}</p>
                    ) : null;
                  })()}
                </div>

                {/* Next Renewal / End Date */}
                <div className="p-4 bg-dark-bg rounded-xl border border-dark-border">
                  <p className="text-text-muted text-xs mb-1">
                    {stripeDetails?.cancelAtPeriodEnd ? t.settings.accessEnd : t.settings.nextRenewal}
                  </p>
                  <p className={`font-semibold text-sm ${stripeDetails?.cancelAtPeriodEnd ? "text-warning" : "text-gray-900 dark:text-white"}`}>
                    {stripeDetails?.currentPeriodEnd
                      ? formatDate(stripeDetails.currentPeriodEnd, dateLocale)
                      : formatDate(userProfile?.subscription?.expiresAt, dateLocale)}
                  </p>
                  {stripeDetails && !stripeDetails.cancelAtPeriodEnd && daysRemaining <= 7 && daysRemaining > 0 && (
                    <p className="text-xs text-text-muted mt-1">
                      {t.settings.inDays.replace("{n}", String(daysRemaining)).replace("{s}", daysRemaining > 1 ? "s" : "")}
                    </p>
                  )}
                </div>
              </motion.div>

              {/* Billing Interval — only when Stripe details are loaded */}
              {stripeDetails && (
                <motion.div
                  variants={itemVariants}
                  className="flex items-center justify-between p-4 bg-dark-bg rounded-xl border border-dark-border"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-text-muted text-xs">{t.settings.billingInterval}</p>
                      <p className="text-gray-900 dark:text-white font-medium">
                        {stripeDetails.interval === "year" ? t.settings.billingYearly : t.settings.billingMonthly}
                      </p>
                    </div>
                  </div>
                  {stripeDetails.interval === "year" && (
                    <span className="px-2 py-1 bg-accent/10 text-accent text-xs font-medium rounded-lg">
                      {t.settings.freeMonths}
                    </span>
                  )}
                </motion.div>
              )}

              {/* Toggle "Continuer l'abonnement" */}
              {stripeDetails && (
                <motion.div
                  variants={itemVariants}
                  className={`p-4 rounded-xl border transition-colors duration-300 ${
                    stripeDetails.cancelAtPeriodEnd
                      ? "bg-warning/5 border-warning/20"
                      : "bg-accent/5 border-accent/15"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-300 ${
                        stripeDetails.cancelAtPeriodEnd ? "bg-warning/10" : "bg-accent/10"
                      }`}>
                        <svg className={`w-4 h-4 transition-colors duration-300 ${
                          stripeDetails.cancelAtPeriodEnd ? "text-warning" : "text-accent"
                        }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-gray-900 dark:text-white font-medium text-sm">{t.settings.continueSubscription}</p>
                        <p className="text-text-muted text-xs mt-0.5">
                          {stripeDetails.cancelAtPeriodEnd
                            ? <>{t.settings.subscriptionEndsOn.split("{date}")[0]}<span className="text-warning font-medium">{formatDate(stripeDetails.currentPeriodEnd, dateLocale)}</span>{t.settings.subscriptionEndsOn.split("{date}")[1]}</>
                            : <>{t.settings.nextRenewalOn.split("{date}")[0]}<span className="text-accent font-medium">{formatDate(stripeDetails.currentPeriodEnd, dateLocale)}</span>{t.settings.nextRenewalOn.split("{date}")[1]}</>
                          }
                        </p>
                      </div>
                    </div>

                    {/* Toggle switch */}
                    <button
                      type="button"
                      role="switch"
                      aria-checked={!stripeDetails.cancelAtPeriodEnd}
                      aria-label={t.settings.continueSubscription}
                      disabled={isCanceling || isReactivating}
                      onClick={() => {
                        if (stripeDetails.cancelAtPeriodEnd) {
                          handleReactivateSubscription();
                        } else {
                          setShowCancelModal(true);
                        }
                      }}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-dark-card disabled:opacity-50 disabled:cursor-not-allowed ${
                        !stripeDetails.cancelAtPeriodEnd ? "bg-accent" : "bg-gray-400 dark:bg-gray-600"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-md ring-0 transition-transform duration-300 ease-in-out ${
                          !stripeDetails.cancelAtPeriodEnd ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                      {/* Loading spinner overlay */}
                      {(isCanceling || isReactivating) && (
                        <span className="absolute inset-0 flex items-center justify-center">
                          <span className="w-3.5 h-3.5 border-2 border-white/60 border-t-white rounded-full animate-spin" />
                        </span>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}
            </>
          )}

          {/* Money-back Guarantee Banner */}
          {isPaidPlan && guaranteeEligible && (
            <motion.div
              variants={itemVariants}
              className="p-4 bg-accent/5 border border-accent/20 rounded-xl"
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-accent font-medium text-sm">
                    {t.settings.moneyBackGuarantee}
                  </p>
                  <p className="text-text-secondary text-xs mt-1">
                    {t.settings.moneyBackGuaranteeDesc.split("{days}")[0]}<span className="text-white font-medium">{guaranteeDaysRemaining} {language === "en" ? (guaranteeDaysRemaining > 1 ? "days" : "day") : (guaranteeDaysRemaining > 1 ? "jours" : "jour")}</span>{t.settings.moneyBackGuaranteeDesc.split("{days}")[1]}
                  </p>
                  <button
                    onClick={() => setShowRefundModal(true)}
                    className="mt-2 text-xs text-text-muted hover:text-accent transition-colors underline underline-offset-2"
                  >
                    {t.settings.requestRefund}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Free Plan Upgrade CTA */}
          {!isPaidPlan && (
            <motion.div
              variants={itemVariants}
              className="p-4 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 border border-primary/20 rounded-xl"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-gray-900 dark:text-white font-medium">{t.ui.upgradeToPro}</p>
                  <p className="text-text-secondary text-sm mt-1">
                    {t.settings.upgradeProDesc}
                  </p>
                  <Link
                    href="/subscription"
                    className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-gradient-to-r from-primary to-accent text-white font-medium text-sm rounded-xl hover:opacity-90 transition-opacity"
                  >
                    {t.ui.viewPlans}
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </div>
            </motion.div>
          )}

          {/* Action Buttons - Only for paid plans */}
          {isPaidPlan && stripeCustomerId && (
            <motion.div
              variants={itemVariants}
              className="flex flex-col sm:flex-row gap-3 pt-2"
            >
              <Button
                variant="secondary"
                size="sm"
                onClick={handleManageSubscription}
                isLoading={isLoading}
                className="flex-1 hover:border-primary/40 hover:text-primary"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {t.settings.manageBilling}
              </Button>

            </motion.div>
          )}

          {/* Legal Notice */}
          <motion.p
            variants={itemVariants}
            className="text-xs text-text-muted text-center pt-2"
          >
            {isPaidPlan
              ? t.settings.guaranteeLegalNotice.replace("{days}", String(GUARANTEE_PERIOD_DAYS))
              : t.ui.noActivePlan}
          </motion.p>
        </div>
      </motion.section>

      {/* Refund Confirmation Modal */}
      <AnimatePresence>
        {showRefundModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowRefundModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-dark-card border border-dark-border rounded-2xl p-6 shadow-2xl"
            >
              {/* Shield Icon */}
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center">
                  <svg className="w-8 h-8 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
              </div>

              <h3 className="text-xl font-semibold text-white text-center mb-2">
                {t.settings.refundModalTitle}
              </h3>

              <p className="text-text-secondary text-center mb-6">
                {t.settings.refundModalDesc.replace("{days}", String(GUARANTEE_PERIOD_DAYS))}
              </p>

              <div className="p-4 bg-dark-bg rounded-xl border border-dark-border mb-6">
                <p className="text-sm font-medium text-white mb-2">{t.settings.refundModalWhatHappens}</p>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2 text-sm text-text-secondary">
                    <svg className="w-4 h-4 text-accent shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {t.settings.refundModalFullRefund}
                  </li>
                  <li className="flex items-center gap-2 text-sm text-text-secondary">
                    <svg className="w-4 h-4 text-accent shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {t.settings.refundModalImmediateCancel}
                  </li>
                  <li className="flex items-center gap-2 text-sm text-text-secondary">
                    <svg className="w-4 h-4 text-warning shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01" />
                    </svg>
                    {t.settings.refundModalLosePremium}
                  </li>
                </ul>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onClick={() => setShowRefundModal(false)}
                  className="flex-1"
                >
                  {t.templates.cancel}
                </Button>
                <Button
                  variant="danger"
                  onClick={handleRefundRequest}
                  isLoading={isRefunding}
                  className="flex-1"
                >
                  {t.ui.confirmRefund}
                </Button>
              </div>

              <p className="text-xs text-text-muted text-center mt-4">
                {t.settings.refundModalPaymentMethod}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cancel Confirmation Modal */}
      <AnimatePresence>
        {showCancelModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowCancelModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-dark-card border border-dark-border rounded-2xl p-6 shadow-2xl"
            >
              {/* Warning Icon */}
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center">
                  <svg className="w-8 h-8 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              </div>

              {/* Title */}
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white text-center mb-2">
                {t.ui.cancelSubscription}
              </h3>

              {/* Description */}
              <p className="text-text-secondary text-center mb-6">
                {t.settings.cancelModalDesc
                  .replace("{plan}", currentPlan || "")
                  .replace("{date}", stripeDetails?.currentPeriodEnd ? formatDate(stripeDetails.currentPeriodEnd, dateLocale) : "—")}
              </p>

              {/* What you'll lose */}
              <div className="p-4 bg-dark-bg rounded-xl border border-dark-border mb-6">
                <p className="text-sm font-medium text-gray-900 dark:text-white mb-3">{t.settings.cancelModalWhatYouLose}</p>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2 text-sm text-text-secondary">
                    <svg className="w-4 h-4 text-error shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    {t.settings.cancelModalUnlimitedConversations}
                  </li>
                  <li className="flex items-center gap-2 text-sm text-text-secondary">
                    <svg className="w-4 h-4 text-error shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    {t.settings.cancelModalDetailedResponses}
                  </li>
                  <li className="flex items-center gap-2 text-sm text-text-secondary">
                    <svg className="w-4 h-4 text-error shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    {t.settings.cancelModalPostScheduling}
                  </li>
                </ul>
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onClick={() => setShowCancelModal(false)}
                  className="flex-1"
                >
                  {t.settings.keepSubscription}
                </Button>
                <Button
                  variant="danger"
                  onClick={handleCancelSubscription}
                  isLoading={isCanceling}
                  className="flex-1"
                >
                  {t.ui.confirmCancellation}
                </Button>
              </div>

              {/* Reassurance */}
              <p className="text-xs text-text-muted text-center mt-4">
                {t.settings.cancelModalReassurance}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
