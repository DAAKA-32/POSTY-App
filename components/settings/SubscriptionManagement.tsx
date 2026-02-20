"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import Button from "@/components/ui/Button";
import { SubscriptionBadge } from "@/components/stripe";
import toast from "@/components/ui/Toast";
import Link from "next/link";
import { GUARANTEE_PERIOD_DAYS } from "@/lib/plans";

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

// Format date for French locale
const formatDate = (timestamp: number | Date | { toDate: () => Date } | undefined): string => {
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
  return date.toLocaleDateString("fr-FR", {
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
  const { t } = useLanguage();
  const { userProfile } = useAuth();
  const {
    currentPlan,
    subscription,
    loading: contextLoading,
    guaranteeEligible,
    guaranteeDaysRemaining,
    requestRefund,
  } = useSubscription();

  const [stripeDetails, setStripeDetails] = useState<StripeSubscriptionDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const [isReactivating, setIsReactivating] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [isRefunding, setIsRefunding] = useState(false);

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

      const response = await fetch(`/api/stripe/subscription?${params}`);
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
      const response = await fetch("/api/stripe/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
        toast.error(data.error || "Erreur lors de l'annulation");
      }
    } catch (error) {
      console.error("Error canceling subscription:", error);
      toast.error("Erreur lors de l'annulation de l'abonnement");
    } finally {
      setIsCanceling(false);
    }
  };

  // Handle subscription reactivation
  const handleReactivateSubscription = async () => {
    if (!stripeSubscriptionId) return;

    setIsReactivating(true);
    try {
      const response = await fetch("/api/stripe/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
        toast.error(data.error || "Erreur lors de la réactivation");
      }
    } catch (error) {
      console.error("Error reactivating subscription:", error);
      toast.error("Erreur lors de la réactivation de l'abonnement");
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
        toast.success(result.message || "Remboursement effectué avec succès.");
        setShowRefundModal(false);
        await fetchStripeDetails();
      } else {
        toast.error(result.error || "Erreur lors du remboursement");
      }
    } catch (error) {
      console.error("Error requesting refund:", error);
      toast.error("Erreur lors de la demande de remboursement");
    } finally {
      setIsRefunding(false);
    }
  };

  // Open Stripe Customer Portal
  const handleManageSubscription = async () => {
    if (!stripeCustomerId) {
      toast.error("Aucun compte de facturation trouvé");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: stripeCustomerId }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error("Impossible d'ouvrir le portail de facturation");
      }
    } catch (error) {
      console.error("Error opening portal:", error);
      toast.error("Erreur lors de l'ouverture du portail");
    } finally {
      setIsLoading(false);
    }
  };

  // Determine subscription status display
  const getStatusDisplay = () => {
    if (!currentPlan) {
      return { label: "Aucun abonnement", color: "text-text-secondary", bg: "bg-dark-hover" };
    }

    if (stripeDetails?.cancelAtPeriodEnd) {
      return { label: "Annulation programmée", color: "text-warning", bg: "bg-warning/10" };
    }

    switch (stripeDetails?.status || subscription.status) {
      case "active":
        return { label: "Actif", color: "text-accent", bg: "bg-accent/10" };
      case "trialing":
        return { label: "Période d'essai", color: "text-primary", bg: "bg-primary/10" };
      case "past_due":
        return { label: "Paiement en retard", color: "text-error", bg: "bg-error/10" };
      case "canceled":
        return { label: "Annulé", color: "text-error", bg: "bg-error/10" };
      default:
        return { label: "Actif", color: "text-accent", bg: "bg-accent/10" };
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
          <span className="text-text-secondary">Chargement...</span>
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
              <h2 className="text-base lg:text-lg font-semibold text-gray-900 dark:text-white">Abonnement</h2>
              <p className="text-xs lg:text-sm text-text-muted mt-0.5">Gérez votre plan et facturation</p>
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
              <p className="text-text-muted text-xs mb-1">Plan actuel</p>
              <p className="text-gray-900 dark:text-white font-semibold text-lg capitalize">
                {!currentPlan ? "Aucun abonnement" : currentPlan === "pro" ? "Pro" : "Max"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-text-muted text-xs mb-1">Statut</p>
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
          {!!currentPlan && (
            <>
              {/* Subscription date — always visible using Firestore fallback */}
              <motion.div
                variants={itemVariants}
                className="grid grid-cols-2 gap-3"
              >
                {/* Start Date — Stripe startDate or Firestore subscribedAt */}
                <div className="p-4 bg-dark-bg rounded-xl border border-dark-border">
                  <p className="text-text-muted text-xs mb-1">Abonné depuis le</p>
                  <p className="text-gray-900 dark:text-white font-semibold text-sm">
                    {stripeDetails?.startDate
                      ? formatDate(stripeDetails.startDate)
                      : formatDate(userProfile?.subscription?.subscribedAt)}
                  </p>
                </div>

                {/* Next Renewal / End Date */}
                <div className="p-4 bg-dark-bg rounded-xl border border-dark-border">
                  <p className="text-text-muted text-xs mb-1">
                    {stripeDetails?.cancelAtPeriodEnd ? "Fin d'accès" : "Prochain renouvellement"}
                  </p>
                  <p className={`font-semibold text-sm ${stripeDetails?.cancelAtPeriodEnd ? "text-warning" : "text-gray-900 dark:text-white"}`}>
                    {stripeDetails?.currentPeriodEnd
                      ? formatDate(stripeDetails.currentPeriodEnd)
                      : formatDate(userProfile?.subscription?.expiresAt)}
                  </p>
                  {stripeDetails && !stripeDetails.cancelAtPeriodEnd && daysRemaining <= 7 && daysRemaining > 0 && (
                    <p className="text-xs text-text-muted mt-1">
                      Dans {daysRemaining} jour{daysRemaining > 1 ? "s" : ""}
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
                      <p className="text-text-muted text-xs">Facturation</p>
                      <p className="text-gray-900 dark:text-white font-medium">
                        {stripeDetails.interval === "year" ? "Annuelle" : "Mensuelle"}
                      </p>
                    </div>
                  </div>
                  {stripeDetails.interval === "year" && (
                    <span className="px-2 py-1 bg-accent/10 text-accent text-xs font-medium rounded-lg">
                      2 mois gratuits
                    </span>
                  )}
                </motion.div>
              )}

              {/* Cancellation Warning */}
              <AnimatePresence>
                {stripeDetails?.cancelAtPeriodEnd && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-4 bg-warning/10 border border-warning/20 rounded-xl"
                  >
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-warning shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <div>
                        <p className="text-warning font-medium text-sm">Annulation programmée</p>
                        <p className="text-text-secondary text-xs mt-1">
                          Votre abonnement ne sera pas renouvelé. Vous conservez l'accès à toutes les fonctionnalités
                          jusqu'au <span className="text-gray-900 dark:text-white font-medium">{formatDate(stripeDetails.currentPeriodEnd)}</span>.
                        </p>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={handleReactivateSubscription}
                          isLoading={isReactivating}
                          className="mt-3 hover:border-accent/40 hover:text-accent"
                        >
                          Réactiver l'abonnement
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Auto-Renewal Info */}
              {stripeDetails && !stripeDetails.cancelAtPeriodEnd && (
                <motion.div
                  variants={itemVariants}
                  className="flex items-center gap-3 p-3 bg-accent/5 border border-accent/10 rounded-xl"
                >
                  <svg className="w-5 h-5 text-accent shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <p className="text-text-secondary text-xs">
                    <span className="text-accent font-medium">Renouvellement automatique activé.</span>{" "}
                    Votre abonnement sera renouvelé automatiquement le {formatDate(stripeDetails.currentPeriodEnd)}.
                  </p>
                </motion.div>
              )}
            </>
          )}

          {/* Money-back Guarantee Banner */}
          {!!currentPlan && guaranteeEligible && (
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
                    Garantie satisfait ou remboursé
                  </p>
                  <p className="text-text-secondary text-xs mt-1">
                    Il vous reste <span className="text-white font-medium">{guaranteeDaysRemaining} jour{guaranteeDaysRemaining > 1 ? "s" : ""}</span> pour
                    demander un remboursement intégral si vous n'êtes pas satisfait.
                  </p>
                  <button
                    onClick={() => setShowRefundModal(true)}
                    className="mt-2 text-xs text-text-muted hover:text-accent transition-colors underline underline-offset-2"
                  >
                    Demander un remboursement
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Free Plan Upgrade CTA */}
          {!currentPlan && (
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
                  <p className="text-gray-900 dark:text-white font-medium">Passez à Pro ou Max</p>
                  <p className="text-text-secondary text-sm mt-1">
                    Débloquez des conversations illimitées, des réponses plus longues et des fonctionnalités avancées.
                  </p>
                  <Link
                    href="/subscription"
                    className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-gradient-to-r from-primary to-accent text-white font-medium text-sm rounded-xl hover:opacity-90 transition-opacity"
                  >
                    Voir les plans
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </div>
            </motion.div>
          )}

          {/* Action Buttons - Only for paid plans */}
          {!!currentPlan && stripeCustomerId && (
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
                Gérer la facturation
              </Button>

              {!stripeDetails?.cancelAtPeriodEnd && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowCancelModal(true)}
                  className="flex-1 hover:border-error/40 hover:text-error"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Annuler l'abonnement
                </Button>
              )}
            </motion.div>
          )}

          {/* Legal Notice */}
          <motion.p
            variants={itemVariants}
            className="text-xs text-text-muted text-center pt-2"
          >
            {!currentPlan
              ? "Aucun abonnement actif. Passez à Pro ou Max à tout moment."
              : `Garantie satisfait ou remboursé ${GUARANTEE_PERIOD_DAYS} jours. Annulation possible à tout moment.`}
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
                Demander un remboursement
              </h3>

              <p className="text-text-secondary text-center mb-6">
                Vous êtes dans la période de garantie ({GUARANTEE_PERIOD_DAYS} jours).
                Votre dernier paiement sera intégralement remboursé et votre abonnement sera annulé.
              </p>

              <div className="p-4 bg-dark-bg rounded-xl border border-dark-border mb-6">
                <p className="text-sm font-medium text-white mb-2">Ce qui va se passer :</p>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2 text-sm text-text-secondary">
                    <svg className="w-4 h-4 text-accent shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Remboursement intégral sous 5-10 jours
                  </li>
                  <li className="flex items-center gap-2 text-sm text-text-secondary">
                    <svg className="w-4 h-4 text-accent shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Annulation immédiate de l'abonnement
                  </li>
                  <li className="flex items-center gap-2 text-sm text-text-secondary">
                    <svg className="w-4 h-4 text-warning shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01" />
                    </svg>
                    Retour au plan gratuit
                  </li>
                </ul>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onClick={() => setShowRefundModal(false)}
                  className="flex-1"
                >
                  Annuler
                </Button>
                <Button
                  variant="danger"
                  onClick={handleRefundRequest}
                  isLoading={isRefunding}
                  className="flex-1"
                >
                  Confirmer le remboursement
                </Button>
              </div>

              <p className="text-xs text-text-muted text-center mt-4">
                Le remboursement sera crédité sur votre moyen de paiement original.
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
                Annuler votre abonnement ?
              </h3>

              {/* Description */}
              <p className="text-text-secondary text-center mb-6">
                Votre abonnement <span className="text-gray-900 dark:text-white font-medium capitalize">{currentPlan}</span> restera
                actif jusqu'au{" "}
                <span className="text-gray-900 dark:text-white font-medium">
                  {stripeDetails?.currentPeriodEnd ? formatDate(stripeDetails.currentPeriodEnd) : "—"}
                </span>.
                Après cette date, vous passerez automatiquement au plan gratuit.
              </p>

              {/* What you'll lose */}
              <div className="p-4 bg-dark-bg rounded-xl border border-dark-border mb-6">
                <p className="text-sm font-medium text-gray-900 dark:text-white mb-3">Ce que vous perdrez :</p>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2 text-sm text-text-secondary">
                    <svg className="w-4 h-4 text-error shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Conversations illimitées
                  </li>
                  <li className="flex items-center gap-2 text-sm text-text-secondary">
                    <svg className="w-4 h-4 text-error shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Réponses détaillées et personnalisées
                  </li>
                  <li className="flex items-center gap-2 text-sm text-text-secondary">
                    <svg className="w-4 h-4 text-error shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Planification de posts
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
                  Garder mon abonnement
                </Button>
                <Button
                  variant="danger"
                  onClick={handleCancelSubscription}
                  isLoading={isCanceling}
                  className="flex-1"
                >
                  Confirmer l'annulation
                </Button>
              </div>

              {/* Reassurance */}
              <p className="text-xs text-text-muted text-center mt-4">
                Vous pouvez réactiver votre abonnement à tout moment avant la fin de la période.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
