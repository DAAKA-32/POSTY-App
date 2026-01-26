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
const formatDate = (timestamp: number | Date | undefined): string => {
  if (!timestamp) return "—";
  const date = typeof timestamp === "number" ? new Date(timestamp * 1000) : timestamp;
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
    isFreePlan,
    loading: contextLoading,
  } = useSubscription();

  const [stripeDetails, setStripeDetails] = useState<StripeSubscriptionDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const [isReactivating, setIsReactivating] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Get Stripe customer/subscription IDs from user profile
  const stripeCustomerId = userProfile?.subscription?.stripeCustomerId;
  const stripeSubscriptionId = userProfile?.subscription?.stripeSubscriptionId;

  // Fetch subscription details from Stripe
  const fetchStripeDetails = useCallback(async () => {
    if (!stripeSubscriptionId && !stripeCustomerId) return;
    if (isFreePlan) return;

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
  }, [stripeSubscriptionId, stripeCustomerId, isFreePlan]);

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
    if (isFreePlan) {
      return { label: "Gratuit", color: "text-text-secondary", bg: "bg-dark-hover" };
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
                {currentPlan === "free" ? "Gratuit" : currentPlan === "pro" ? "Pro" : "Max"}
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
          {!isFreePlan && stripeDetails && (
            <>
              {/* Billing Interval */}
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

              {/* Dates */}
              <motion.div
                variants={itemVariants}
                className="grid grid-cols-2 gap-3"
              >
                {/* Start Date */}
                <div className="p-4 bg-dark-bg rounded-xl border border-dark-border">
                  <p className="text-text-muted text-xs mb-1">Début de l'abonnement</p>
                  <p className="text-gray-900 dark:text-white font-medium text-sm">
                    {formatDate(stripeDetails.startDate)}
                  </p>
                </div>

                {/* Next Renewal / End Date */}
                <div className="p-4 bg-dark-bg rounded-xl border border-dark-border">
                  <p className="text-text-muted text-xs mb-1">
                    {stripeDetails.cancelAtPeriodEnd ? "Fin d'accès" : "Prochain renouvellement"}
                  </p>
                  <p className={`font-medium text-sm ${stripeDetails.cancelAtPeriodEnd ? "text-warning" : "text-gray-900 dark:text-white"}`}>
                    {formatDate(stripeDetails.currentPeriodEnd)}
                  </p>
                  {!stripeDetails.cancelAtPeriodEnd && daysRemaining <= 7 && (
                    <p className="text-xs text-text-muted mt-1">
                      Dans {daysRemaining} jour{daysRemaining > 1 ? "s" : ""}
                    </p>
                  )}
                </div>
              </motion.div>

              {/* Cancellation Warning */}
              <AnimatePresence>
                {stripeDetails.cancelAtPeriodEnd && (
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
              {!stripeDetails.cancelAtPeriodEnd && (
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

          {/* Free Plan Upgrade CTA */}
          {isFreePlan && (
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
          {!isFreePlan && stripeCustomerId && (
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
            {isFreePlan
              ? "Plan gratuit sans engagement. Passez à Pro ou Max à tout moment."
              : "Vous pouvez annuler votre abonnement à tout moment. L'accès reste actif jusqu'à la fin de la période payée."}
          </motion.p>
        </div>
      </motion.section>

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
