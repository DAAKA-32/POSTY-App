"use client";

import { motion } from "framer-motion";
import { PlanConfig, SubscriptionPlan } from "@/types";

interface PricingCardProps {
  plan: PlanConfig;
  currentPlan?: SubscriptionPlan;
  isYearly?: boolean;
  onSelect: (planId: SubscriptionPlan) => void;
  isLoading?: boolean;
  index?: number;
}

export default function PricingCard({
  plan,
  currentPlan,
  isYearly = false,
  onSelect,
  isLoading = false,
  index = 0,
}: PricingCardProps) {
  const isCurrentPlan = currentPlan === plan.id;
  const isPopular = plan.popular;
  const isFree = plan.id === "free";
  const price = isYearly ? plan.priceYearly / 12 : plan.price;
  const yearlyTotal = plan.priceYearly;
  const savings = isYearly && !isFree ? Math.round((1 - yearlyTotal / (plan.price * 12)) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4, ease: [0.22, 1, 0.36, 1] as const }}
      className={`
        relative flex flex-col
        bg-dark-card border rounded-2xl
        overflow-hidden
        transition-all duration-300
        ${isPopular
          ? "border-primary shadow-lg shadow-primary/10 scale-105 lg:scale-110 z-10"
          : "border-dark-border hover:border-dark-hover"
        }
        ${isCurrentPlan ? "ring-2 ring-primary/50" : ""}
      `}
    >
      {/* Popular Badge */}
      {isPopular && (
        <div className="absolute top-0 left-0 right-0 bg-primary py-1.5">
          <p className="text-center text-xs font-semibold text-white tracking-wide uppercase">
            Le plus populaire
          </p>
        </div>
      )}

      {/* Savings Badge */}
      {savings > 0 && isYearly && (
        <div className="absolute top-3 right-3 bg-accent/20 text-accent px-2 py-0.5 rounded-full">
          <span className="text-xs font-medium">-{savings}%</span>
        </div>
      )}

      {/* Card Content */}
      <div className={`p-6 lg:p-8 ${isPopular ? "pt-12" : ""}`}>
        {/* Plan Name */}
        <div className="mb-4">
          <h3 className="text-xl font-bold text-white">{plan.name}</h3>
          <p className="text-sm text-text-muted mt-1">{plan.tagline}</p>
        </div>

        {/* Price */}
        <div className="mb-6">
          <div className="flex items-baseline gap-1">
            <span className="text-4xl lg:text-5xl font-bold text-white">
              {isFree ? "Gratuit" : `${price.toFixed(2).replace(".", ",")}€`}
            </span>
            {!isFree && (
              <span className="text-text-muted text-sm">/mois</span>
            )}
          </div>
          {isYearly && !isFree && (
            <p className="text-sm text-text-muted mt-1">
              Facture {yearlyTotal}€/an
            </p>
          )}
        </div>

        {/* CTA Button */}
        <button
          onClick={() => onSelect(plan.id)}
          disabled={isCurrentPlan || isLoading}
          className={`
            w-full py-3 px-4 rounded-xl font-semibold text-sm
            transition-all duration-200
            disabled:opacity-50 disabled:cursor-not-allowed
            ${isCurrentPlan
              ? "bg-dark-border text-text-muted cursor-default"
              : isPopular
                ? "bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20"
                : "bg-dark-elevated hover:bg-dark-hover text-white border border-dark-border"
            }
          `}
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Chargement...
            </span>
          ) : isCurrentPlan ? (
            "Plan actuel"
          ) : (
            plan.ctaLabel
          )}
        </button>

        {/* Features List */}
        <ul className="mt-6 space-y-3">
          {plan.features.map((feature) => (
            <li key={feature.id} className="flex items-start gap-3">
              <span className={`
                flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5
                ${feature.included
                  ? feature.highlight
                    ? "bg-primary/20 text-primary"
                    : "bg-accent/20 text-accent"
                  : "bg-dark-border text-text-muted"
                }
              `}>
                {feature.included ? (
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                )}
              </span>
              <span className={`text-sm ${
                feature.included
                  ? feature.highlight
                    ? "text-white font-medium"
                    : "text-text-secondary"
                  : "text-text-muted line-through"
              }`}>
                {feature.label}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
}
