"use client";

import { useState, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCanHover } from "@/hooks/useCanHover";
import Link from "next/link";
import { getAvailablePlansForNewUsers, PLAN_TAGLINES, getPlanFeaturesUnified, getYearlyMonthlyEquivalent, getSavingsText, PlanConfig, FeatureItem, TRIAL_PERIOD_DAYS } from "@/lib/plans";
import BillingToggle from "@/components/ui/BillingToggle";

// Get available plans for new users (excludes deprecated free plan)
const PLANS = getAvailablePlansForNewUsers();

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      delay,
      ease: [0.0, 0.0, 0.2, 1] as const,
    },
  }),
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1,
    },
  },
};

const staggerItem = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.6,
      ease: [0.0, 0.0, 0.2, 1] as const,
    },
  },
};

// Plan card color schemes
function getPlanColors(plan: PlanConfig) {
  if (plan.highlight) {
    return {
      gradient: "from-primary to-accent",
      borderColor: "border-primary",
    };
  }
  if (plan.premium) {
    return {
      gradient: "from-amber-500 to-orange-500",
      borderColor: "border-amber-500/50",
    };
  }
  return {
    gradient: "from-gray-600 to-gray-700",
    borderColor: "border-gray-200",
  };
}

// Feature item component — unified across all plans
function FeatureItemDisplay({ feature }: { feature: FeatureItem }) {
  return (
    <li className="flex items-start gap-3">
      {feature.included ? (
        <svg className="w-5 h-5 text-accent shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      ) : (
        <svg className="w-5 h-5 text-gray-300 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
      )}
      <span className={`text-sm leading-relaxed ${
        feature.included ? 'text-gray-700' : 'text-gray-400'
      }`}>
        {feature.text}
      </span>
    </li>
  );
}

// Plan card component — all features visible, uniform structure
function PlanCard({
  plan,
  billingPeriod,
  index,
  canHover,
  isInView,
}: {
  plan: PlanConfig;
  billingPeriod: "monthly" | "yearly";
  index: number;
  canHover: boolean;
  isInView: boolean;
}) {
  const colors = getPlanColors(plan);
  const planInfo = PLAN_TAGLINES[plan.id] || { tagline: plan.description, idealFor: "" };
  // Single unified feature list — ALL features, same order across all plans
  const allFeatures = getPlanFeaturesUnified(plan);

  const displayPrice = billingPeriod === "monthly"
    ? plan.price.monthly
    : getYearlyMonthlyEquivalent(plan.id);
  const savingsText = getSavingsText(plan.id);

  // Conditional hover animations - desktop only
  const getHoverAnimation = () => {
    if (!canHover) return {};
    return { y: -8 };
  };

  return (
    <motion.div
      variants={staggerItem}
      whileHover={getHoverAnimation()}
      className="group relative no-hover-mobile"
    >
      {/* Popular badge */}
      {plan.highlight && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: -20 }}
          transition={{ delay: 0.5 }}
          className="absolute -top-4 left-1/2 -translate-x-1/2 z-10"
        >
          <div className="px-4 py-1.5 bg-gradient-to-r from-primary to-accent text-white text-xs font-semibold rounded-full shadow-glow flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            Le plus populaire
          </div>
        </motion.div>
      )}

      {/* Elite badge */}
      {plan.premium && !plan.highlight && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: -20 }}
          transition={{ delay: 0.5 }}
          className="absolute -top-4 left-1/2 -translate-x-1/2 z-10"
        >
          <div className="px-4 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-semibold rounded-full shadow-lg shadow-amber-500/30 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 2a2 2 0 00-2 2v14l3.5-2 3.5 2 3.5-2 3.5 2V4a2 2 0 00-2-2H5zm2.5 3a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm6.207.293a1 1 0 00-1.414 0l-6 6a1 1 0 101.414 1.414l6-6a1 1 0 000-1.414zM12.5 10a1.5 1.5 0 100 3 1.5 1.5 0 000-3z" clipRule="evenodd" />
            </svg>
            Elite
          </div>
        </motion.div>
      )}

      {/* Card */}
      <div
        className={`
          relative h-full bg-white rounded-3xl overflow-hidden flex flex-col
          border-2 transition-all duration-300
          group-hover:shadow-xl group-hover:shadow-gray-200/60 group-hover:-translate-y-1
          ${plan.highlight
            ? 'border-[#F8935D]/60 shadow-lg shadow-[#F8935D]/10'
            : plan.premium
              ? 'border-amber-500/30 shadow-md'
              : 'border-gray-200 shadow-sm'
          }
        `}
      >
        {/* ZONE 1: Header with gradient */}
        <div className={`relative px-6 md:px-8 pt-8 pb-4 bg-gradient-to-br ${colors.gradient} flex flex-col`}>
          {/* Plan name and tagline */}
          <div className="min-h-[60px]">
            <h3 className="text-2xl md:text-3xl font-bold text-white mb-1">
              {plan.name}
            </h3>
            <p className="text-white/80 text-sm line-clamp-1">
              {planInfo.tagline}
            </p>
          </div>

          {/* ZONE 2: Price */}
          <div className="min-h-[80px] flex flex-col justify-center">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl md:text-5xl font-bold text-white tabular-nums">
                {displayPrice.toFixed(2).replace(".", ",")}€
              </span>
              <span className="text-white/70 text-base">/ mois</span>
            </div>
          </div>

          {/* Savings badge */}
          <div className={`h-[44px] flex items-center ${billingPeriod === "yearly" && savingsText ? "opacity-100" : "opacity-0"}`}>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full border border-white/30">
              <svg className="w-4 h-4 text-green-300" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-sm text-white font-semibold">{savingsText || "—"}</span>
            </div>
          </div>
        </div>

        {/* CTA Button */}
        <div className="px-6 md:px-8 py-4">
          <Link
            href={plan.trialDays > 0 ? `/subscription?plan=${plan.id}&trial=true` : `/subscription?plan=${plan.id}`}
            className={`
              block w-full px-6 py-3.5 rounded-xl font-semibold text-center transition-all duration-300
              focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-white
              ${plan.highlight
                ? 'bg-gradient-to-r from-primary to-accent text-white shadow-lg shadow-[#F8935D]/25 hover:shadow-xl hover:shadow-[#F8935D]/35'
                : plan.premium
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/20 hover:shadow-xl hover:shadow-amber-500/30'
                  : 'bg-gray-100 border border-gray-200 text-gray-900 hover:bg-gray-200'
              }
            `}
            aria-label={plan.trialDays > 0 ? `Essayer ${plan.name} gratuitement pendant ${plan.trialDays} jours` : `Choisir le plan ${plan.name}`}
          >
            {plan.trialDays > 0
              ? `Essayer ${TRIAL_PERIOD_DAYS} jours gratuit`
              : "Choisir ce plan"
            }
          </Link>
        </div>

        {/* "Ce qui est inclus" divider */}
        <div className="px-6 md:px-8">
          <div className="border-t border-gray-200" />
          <p className="text-sm font-semibold text-gray-900 pt-4 pb-2">Ce qui est inclus</p>
        </div>

        {/* ZONE: ALL features — unified list, no "Voir plus" */}
        <div className="flex-1 px-6 md:px-8 pb-6">
          <ul className="space-y-3" role="list" aria-label={`Fonctionnalités du plan ${plan.name}`}>
            {allFeatures.map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
                transition={{ delay: 0.3 + index * 0.1 + i * 0.03 }}
              >
                <FeatureItemDisplay feature={feature} />
              </motion.div>
            ))}
          </ul>
        </div>
      </div>
    </motion.div>
  );
}

export default function PricingSection() {
  const { t } = useLanguage();
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });
  const canHover = useCanHover();
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("yearly");

  return (
    <section
      id="pricing"
      ref={sectionRef}
      className="relative py-16 md:py-24 px-4 md:px-8 overflow-hidden bg-gradient-to-b from-gray-50 to-white"
    >
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-accent/30 to-transparent" />
        <div className="absolute top-1/2 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          variants={fadeInUp}
          custom={0}
          className="text-center mb-12 md:mb-16"
        >
          <motion.h2
            variants={fadeInUp}
            custom={0.1}
            className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4"
          >
            Des tarifs{" "}
            <span className="text-gradient bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              transparents
            </span>
          </motion.h2>
          <motion.p
            variants={fadeInUp}
            custom={0.2}
            className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto mb-8"
          >
            Choisissez le plan qui correspond à vos ambitions
          </motion.p>

          {/* Billing Toggle */}
          <motion.div
            variants={fadeInUp}
            custom={0.3}
          >
            <BillingToggle
              isYearly={billingPeriod === "yearly"}
              onChange={(isYearly) => setBillingPeriod(isYearly ? "yearly" : "monthly")}
              monthlyLabel="Mensuel"
              yearlyLabel="Annuel"
              savingsLabel="-17%"
              showSavings={true}
              size="md"
            />
          </motion.div>
        </motion.div>

        {/* Pricing Cards */}
        <motion.div
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          variants={staggerContainer}
          className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 max-w-4xl mx-auto mb-12 items-start"
        >
          {PLANS.map((plan, index) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              billingPeriod={billingPeriod}
              index={index}
              canHover={canHover}
              isInView={isInView}
            />
          ))}
        </motion.div>

        {/* Maintenance Banner - Threads & Facebook */}
        <div className="flex items-center justify-center gap-3 p-4 mt-8 mb-8 mx-auto max-w-2xl bg-red-50 border-2 border-red-300 rounded-2xl shadow-sm">
          <svg className="w-5 h-5 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-sm text-red-600 font-medium">
            Threads & Facebook sont en maintenance temporaire. Le service sera rétabli sous peu.
          </p>
        </div>

        {/* Bottom note */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="text-center"
        >
          <div className="inline-flex flex-col md:flex-row items-center gap-4 md:gap-8 px-6 py-4 bg-gray-50/80 border border-gray-200 rounded-2xl">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <svg className="w-5 h-5 text-accent" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Sans engagement</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <svg className="w-5 h-5 text-accent" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Annulation à tout moment</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <svg className="w-5 h-5 text-accent" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Paiement sécurisé</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
