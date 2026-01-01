"use client";

import { Suspense, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useQuota } from "@/contexts/QuotaContext";
import { SUBSCRIPTION_PLANS, SubscriptionPlan, PlanConfig } from "@/types";
import Button from "@/components/ui/Button";
import toast from "react-hot-toast";

function PricingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { currentPlan } = useQuota();
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");
  const [isLoading, setIsLoading] = useState<SubscriptionPlan | null>(null);

  // Show toast if redirected from canceled checkout
  useEffect(() => {
    if (searchParams.get("canceled")) {
      toast.error("Paiement annule", { id: "checkout-canceled" });
    }
  }, [searchParams]);

  const handleSelectPlan = async (plan: PlanConfig) => {
    if (!user) {
      router.push("/?auth=signup");
      return;
    }

    if (plan.id === currentPlan) {
      return;
    }

    // Free plan - no action needed
    if (plan.id === "free") {
      toast.success("Vous etes deja sur le plan gratuit");
      return;
    }

    setIsLoading(plan.id);

    try {
      // Create checkout session
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          userEmail: user.email,
          plan: plan.id,
          interval: billingPeriod,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors de la creation du checkout");
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error("Erreur lors du paiement. Veuillez reessayer.");
    } finally {
      setIsLoading(null);
    }
  };

  const getYearlySavings = (plan: PlanConfig) => {
    if (plan.price === 0) return 0;
    const monthlyTotal = plan.price * 12;
    const savings = monthlyTotal - plan.priceYearly;
    return Math.round(savings);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-dark-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-text-secondary hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Retour
            </button>
            <div className="text-lg font-semibold text-white">Offres & Abonnements</div>
            <div className="w-20" />
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
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
            Choisissez votre plan
          </h1>
          <p className="text-lg text-text-secondary max-w-2xl mx-auto mb-8">
            Debloquez tout le potentiel de Posty avec nos offres Premium.
            Creez du contenu LinkedIn qui convertit, sans limites.
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4 mb-12">
            <span className={`text-sm ${billingPeriod === "monthly" ? "text-white" : "text-text-secondary"}`}>
              Mensuel
            </span>
            <button
              onClick={() => setBillingPeriod(billingPeriod === "monthly" ? "yearly" : "monthly")}
              className="relative w-14 h-7 bg-dark-hover rounded-full transition-colors"
            >
              <motion.div
                className="absolute top-1 w-5 h-5 bg-primary rounded-full"
                animate={{ left: billingPeriod === "monthly" ? "4px" : "calc(100% - 24px)" }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            </button>
            <span className={`text-sm ${billingPeriod === "yearly" ? "text-white" : "text-text-secondary"}`}>
              Annuel
            </span>
            <span className="ml-2 px-2 py-1 bg-primary/20 text-primary text-xs font-medium rounded-full">
              -17%
            </span>
          </div>
        </motion.div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {SUBSCRIPTION_PLANS.map((plan, index) => (
            <PricingCard
              key={plan.id}
              plan={plan}
              billingPeriod={billingPeriod}
              isCurrentPlan={plan.id === currentPlan}
              yearlySavings={getYearlySavings(plan)}
              onSelect={() => handleSelectPlan(plan)}
              isLoading={isLoading === plan.id}
              index={index}
            />
          ))}
        </div>

        {/* FAQ Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-20"
        >
          <h2 className="text-2xl font-bold text-white text-center mb-8">
            Questions frequentes
          </h2>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <FAQItem
              question="Puis-je changer de plan a tout moment ?"
              answer="Oui, vous pouvez passer a un plan superieur a tout moment. Le changement prend effet immediatement et vous ne payez que la difference au prorata."
            />
            <FAQItem
              question="Comment fonctionne la limite quotidienne ?"
              answer="Le compteur de messages se reinitialise chaque jour a minuit. Les plans Pro et Max+ offrent des messages illimites."
            />
            <FAQItem
              question="Qu'est-ce que l'IA avec memoire ?"
              answer="L'IA avec memoire (Max+) retient vos preferences, votre style d'ecriture et le contexte de vos conversations pour des suggestions toujours plus pertinentes."
            />
            <FAQItem
              question="Puis-je annuler mon abonnement ?"
              answer="Oui, vous pouvez annuler a tout moment. Vous conservez l'acces jusqu'a la fin de votre periode de facturation."
            />
          </div>
        </motion.div>

        {/* Trust badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-16 flex flex-wrap items-center justify-center gap-8 text-text-secondary text-sm"
        >
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Paiement securise
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Annulation facile
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Support reactif
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  );
}

export default function PricingPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <PricingContent />
    </Suspense>
  );
}

interface PricingCardProps {
  plan: PlanConfig;
  billingPeriod: "monthly" | "yearly";
  isCurrentPlan: boolean;
  yearlySavings: number;
  onSelect: () => void;
  isLoading?: boolean;
  index: number;
}

function PricingCard({ plan, billingPeriod, isCurrentPlan, yearlySavings, onSelect, isLoading = false, index }: PricingCardProps) {
  const price = billingPeriod === "monthly" ? plan.price : Math.round(plan.priceYearly / 12 * 100) / 100;
  const isPopular = plan.popular;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`
        relative rounded-2xl p-6 lg:p-8
        ${isPopular
          ? "bg-gradient-to-b from-primary/20 to-dark-card border-2 border-primary shadow-glow"
          : "bg-dark-card border border-dark-border"
        }
        ${isCurrentPlan ? "ring-2 ring-green-500/50" : ""}
      `}
    >
      {/* Popular badge */}
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary text-white text-sm font-medium rounded-full">
          Populaire
        </div>
      )}

      {/* Current plan badge */}
      {isCurrentPlan && (
        <div className="absolute -top-3 right-4 px-3 py-1 bg-green-500/20 text-green-400 text-xs font-medium rounded-full border border-green-500/30">
          Plan actuel
        </div>
      )}

      {/* Plan header */}
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold text-white mb-1">{plan.name}</h3>
        <p className="text-sm text-text-secondary">{plan.tagline}</p>
      </div>

      {/* Price */}
      <div className="text-center mb-6">
        <div className="flex items-baseline justify-center gap-1">
          <span className="text-4xl lg:text-5xl font-bold text-white">
            {price === 0 ? "Gratuit" : `${price.toFixed(2).replace(".", ",")}€`}
          </span>
          {price > 0 && (
            <span className="text-text-secondary">/mois</span>
          )}
        </div>
        {billingPeriod === "yearly" && yearlySavings > 0 && (
          <p className="text-sm text-primary mt-2">
            Economisez {yearlySavings}€ par an
          </p>
        )}
      </div>

      {/* CTA Button */}
      <Button
        variant={isCurrentPlan ? "ghost" : isPopular ? "primary" : "secondary"}
        fullWidth
        onClick={onSelect}
        disabled={isCurrentPlan || isLoading}
        isLoading={isLoading}
        className={isPopular && !isCurrentPlan ? "shadow-glow" : ""}
      >
        {isCurrentPlan ? "Plan actuel" : plan.ctaLabel}
      </Button>

      {/* Features list */}
      <ul className="mt-8 space-y-4">
        {plan.features.map((feature) => (
          <li key={feature.id} className="flex items-start gap-3">
            {feature.included ? (
              <svg
                className={`w-5 h-5 flex-shrink-0 mt-0.5 ${feature.highlight ? "text-primary" : "text-green-500"}`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg
                className="w-5 h-5 flex-shrink-0 mt-0.5 text-text-secondary/50"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            )}
            <span
              className={`text-sm ${
                feature.included
                  ? feature.highlight
                    ? "text-white font-medium"
                    : "text-text-secondary"
                  : "text-text-secondary/50 line-through"
              }`}
            >
              {feature.label}
            </span>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

interface FAQItemProps {
  question: string;
  answer: string;
}

function FAQItem({ question, answer }: FAQItemProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-dark-card border border-dark-border rounded-xl p-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full text-left"
      >
        <span className="font-medium text-white">{question}</span>
        <svg
          className={`w-5 h-5 text-text-secondary transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <motion.div
        initial={false}
        animate={{ height: isOpen ? "auto" : 0, opacity: isOpen ? 1 : 0 }}
        className="overflow-hidden"
      >
        <p className="mt-3 text-sm text-text-secondary">{answer}</p>
      </motion.div>
    </div>
  );
}
