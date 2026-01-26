"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import BillingToggle from "@/components/ui/BillingToggle";
import {
  getAllPlans,
  PlanConfig,
  PlanType,
  getSavingsText,
  PLAN_TAGLINES,
  getPlanFeaturesUnified,
  getPlanCoreFeatures,
  getPlanSecondaryFeatures,
  getCTALabel,
  FeatureItem,
} from "@/lib/plans";

// ============================================================
// UNIFIED PRICING SECTION COMPONENT
// Single source of truth for Landing Page & Subscription Page
// ============================================================

const PLANS = getAllPlans();

// Smooth animation easing
const smoothEase = [0.22, 1, 0.36, 1] as const;

interface PricingSectionProps {
  /** Whether the user is authenticated (shows "current plan" badges) */
  isAuthenticated?: boolean;
  /** Current user's plan (if authenticated) */
  currentPlan?: PlanType | null;
  /** Loading state for a specific plan */
  loadingPlan?: PlanType | null;
  /** Callback when a plan is selected (for authenticated flow) */
  onSelectPlan?: (plan: PlanConfig, billingPeriod: "monthly" | "yearly") => void;
  /** Whether to show the section header */
  showHeader?: boolean;
  /** Custom className for the container */
  className?: string;
}

export default function PricingSection({
  isAuthenticated = false,
  currentPlan = null,
  loadingPlan = null,
  onSelectPlan,
  showHeader = true,
  className = "",
}: PricingSectionProps) {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("yearly");
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

  const getYearlyMonthlyPrice = (plan: PlanConfig) => {
    if (plan.price.yearly === 0) return 0;
    return Math.round((plan.price.yearly / 12) * 100) / 100;
  };

  const getYearlySavings = (plan: PlanConfig) => {
    if (plan.price.monthly === 0) return 0;
    const monthlyTotal = plan.price.monthly * 12;
    const savings = monthlyTotal - plan.price.yearly;
    return Math.round(savings * 100) / 100;
  };

  return (
    <div className={className}>
      {/* Optional Header */}
      {showHeader && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: smoothEase }}
          className="text-center mb-10 lg:mb-12"
        >
          <motion.span
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1, ease: smoothEase }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full mb-6"
          >
            <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            <span className="text-sm text-primary font-medium">ROI garanti</span>
          </motion.span>
          <h2 className="text-3xl lg:text-4xl xl:text-5xl font-bold text-gray-900 mb-4">
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Un client signé</span> = <span className="bg-gradient-to-r from-accent via-pink-400 to-orange-300 bg-clip-text text-transparent">abonnement rentabilisé</span>
          </h2>
          <p className="text-gray-600 text-base lg:text-lg max-w-2xl mx-auto">
            Posty n&apos;est pas une dépense, c&apos;est un <span className="font-semibold text-accent">investissement dans votre croissance</span>.{" "}
            <span className="font-medium text-pink-400">Commencez gratuitement.</span>
          </p>
        </motion.div>
      )}

      {/* Billing Toggle */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.1, ease: smoothEase }}
        className="flex justify-center mb-10 lg:mb-12"
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

      {/* Pricing Cards - Unified Grid Layout */}
      <div className="max-w-5xl mx-auto px-2 sm:px-4 md:px-0">
        {/* Mobile: Free plan banner */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, ease: smoothEase }}
          className="sm:hidden mb-4 p-3 bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 border border-primary/20 rounded-xl"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h4 className="text-sm font-bold text-gray-900 mb-0.5">Gratuit</h4>
              <p className="text-[10px] text-gray-600">Idéal pour découvrir Posty</p>
            </div>
            <Link
              href={isAuthenticated ? "#" : "/login"}
              onClick={(e) => {
                if (isAuthenticated) {
                  e.preventDefault();
                  onSelectPlan?.(PLANS[0], billingPeriod);
                }
              }}
              className="px-3 py-1.5 bg-gradient-to-r from-primary to-accent text-white text-[10px] font-semibold rounded-lg shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-center"
            >
              Commencer
            </Link>
          </div>
        </motion.div>

        {/* Grid layout - 2 cols on mobile (Pro + Max), 3 cols on desktop */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4 md:gap-6 lg:gap-8 items-start">
          {PLANS.map((plan, index) => (
            <div
              key={plan.id}
              className={plan.price.monthly === 0 ? "hidden sm:block" : ""}
            >
              <PricingCard
                plan={plan}
                billingPeriod={billingPeriod}
                isCurrentPlan={isAuthenticated && plan.id === currentPlan}
                yearlySavings={getYearlySavings(plan)}
                yearlyMonthlyPrice={getYearlyMonthlyPrice(plan)}
                onSelect={() => onSelectPlan?.(plan, billingPeriod)}
                isLoading={loadingPlan === plan.id}
                index={index}
                isAuthenticated={isAuthenticated}
                isMobile={false}
                isActiveInCarousel={true}
                isFeaturesExpanded={expandedCardIds.includes(plan.id)}
                onToggleFeatures={() => handleToggleFeatures(plan.id)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Trust badges */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.5 }}
        className="mt-12 flex flex-wrap items-center justify-center gap-8 text-gray-600 text-sm"
      >
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
          </svg>
          Paiement sécurisé
        </div>
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          Sans engagement
        </div>
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
            <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
          </svg>
          Support réactif
        </div>
      </motion.div>

      {/* Bottom Note */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.4, ease: smoothEase }}
        className="text-center text-gray-500 text-sm mt-8"
      >
        Tous les prix sont en euros, hors taxes. Annulation possible à tout moment.
      </motion.p>
    </div>
  );
}

// ============================================================
// PRICING CARD COMPONENT
// ============================================================

interface PricingCardProps {
  plan: PlanConfig;
  billingPeriod: "monthly" | "yearly";
  isCurrentPlan: boolean;
  yearlySavings: number;
  yearlyMonthlyPrice: number;
  onSelect: () => void;
  isLoading?: boolean;
  index: number;
  isAuthenticated: boolean;
  isMobile: boolean;
  isActiveInCarousel?: boolean;
  /** Whether the secondary features are expanded (controlled by parent) */
  isFeaturesExpanded?: boolean;
  /** Callback to toggle the features expansion (controlled by parent) */
  onToggleFeatures?: () => void;
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
  isAuthenticated,
  isMobile,
  isActiveInCarousel = true,
  isFeaturesExpanded = false,
  onToggleFeatures,
}: PricingCardProps) {
  const displayPrice = billingPeriod === "monthly" ? plan.price.monthly : yearlyMonthlyPrice;
  const isPopular = plan.highlight;
  const isPremium = plan.premium;
  const isFree = plan.price.monthly === 0;
  const coreFeatures = getPlanCoreFeatures(plan);
  const secondaryFeatures = getPlanSecondaryFeatures(plan);
  const includedSecondaryCount = secondaryFeatures.filter(f => f.included).length;
  const planInfo = PLAN_TAGLINES[plan.id] || { tagline: plan.description, idealFor: "" };
  const [isHovered, setIsHovered] = useState(false);

  // Use controlled state from parent (multi-open accordion - up to 3 cards can be expanded)
  const showMoreFeatures = isFeaturesExpanded;
  const toggleShowMoreFeatures = () => onToggleFeatures?.();

  const handleClick = () => {
    if (isAuthenticated) {
      onSelect();
    }
  };

  // Link destination for non-authenticated users
  const ctaHref = isAuthenticated ? undefined : "/login";

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{
        delay: isMobile ? 0 : index * 0.15,
        duration: 0.5,
        ease: smoothEase,
      }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className={`
        relative rounded-2xl overflow-hidden h-full
        transition-all duration-300
        ${isPopular
          ? isMobile
            ? isActiveInCarousel
              ? "scale-100 z-20 ring-2 ring-primary/70 shadow-2xl shadow-primary/40"
              : "scale-100 z-20 ring-2 ring-primary/40 shadow-xl shadow-primary/20"
            : "scale-[1.02] md:scale-105 z-20"
          : isMobile
            ? isActiveInCarousel
              ? "z-10 shadow-xl"
              : "z-10 shadow-lg opacity-90"
            : "z-10"
        }
        ${isCurrentPlan ? "ring-2 ring-green-500/50" : ""}
      `}
    >
      {/* Animated gradient border for popular plan */}
      {isPopular && (
        <div className="absolute inset-0 rounded-2xl p-[2px] bg-gradient-to-br from-primary via-accent to-primary bg-[length:200%_200%] animate-gradient-slow">
          <div className="absolute inset-[2px] rounded-[14px] bg-white" />
        </div>
      )}

      {/* Premium glow effect */}
      {isPremium && (
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-amber-500/20 via-transparent to-orange-500/20 opacity-60" />
      )}

      {/* Subtle shimmer effect on hover */}
      <motion.div
        className="absolute inset-0 rounded-2xl pointer-events-none overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: isHovered ? 1 : 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/[0.04] dark:via-white/[0.06] to-transparent animate-shimmer" />
      </motion.div>

      {/* Card background */}
      <div
        className={`
        relative p-2 sm:p-4 md:p-6 lg:p-8 rounded-lg sm:rounded-xl md:rounded-2xl h-full flex flex-col
        ${
          isPopular
            ? "bg-gradient-to-b from-primary/10 via-white to-white"
            : isPremium
            ? "bg-gradient-to-b from-amber-500/5 via-white to-white border sm:border-2 border-amber-500/30"
            : isFree
            ? "bg-white border border-primary/25"
            : "bg-white border border-gray-200"
        }
      `}
      >
        {/* ZONE 0: Badges section (inside card, top area) */}
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
                  <path
                    fillRule="evenodd"
                    d="M5 2a2 2 0 00-2 2v14l3.5-2 3.5 2 3.5-2 3.5 2V4a2 2 0 00-2-2H5zm2.5 3a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm6.207.293a1 1 0 00-1.414 0l-6 6a1 1 0 101.414 1.414l6-6a1 1 0 000-1.414zM12.5 10a1.5 1.5 0 100 3 1.5 1.5 0 000-3z"
                    clipRule="evenodd"
                  />
                </svg>
                Elite
              </div>
            </motion.div>
          )}

          {/* Current plan badge - positioned at top right */}
          {isCurrentPlan && (
            <div className="absolute top-0 right-0 px-1.5 sm:px-2 md:px-3 py-0.5 sm:py-1 bg-green-500/20 text-green-400 text-[9px] sm:text-[10px] md:text-xs font-medium rounded-full border border-green-500/30 flex items-center gap-0.5 sm:gap-1">
              <svg className="w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="hidden sm:inline">Actuel</span>
            </div>
          )}
        </div>

        {/* ZONE 1: Plan header (responsive height for alignment) */}
        <div className="h-[50px] sm:h-[60px] md:h-[80px] text-center flex flex-col justify-center">
          <h3
            className={`text-sm sm:text-lg md:text-2xl font-bold mb-0.5 sm:mb-1 ${
              isPremium ? "text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400" : "text-gray-900"
            }`}
          >
            {plan.name}
          </h3>
          <p className="text-[10px] sm:text-xs md:text-sm text-gray-600 line-clamp-1 sm:line-clamp-2">{planInfo.tagline}</p>
          <p className={`text-[9px] sm:text-[10px] md:text-xs mt-0.5 sm:mt-1 hidden sm:block ${isPopular ? "text-primary" : isPremium ? "text-amber-400" : "text-gray-500"}`}>
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
                <span className="text-lg sm:text-2xl md:text-4xl lg:text-5xl font-bold text-gray-900">Gratuit</span>
              ) : (
                <>
                  <span
                    className={`text-lg sm:text-2xl md:text-4xl lg:text-5xl font-bold tabular-nums ${
                      isPremium ? "text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400" : "text-gray-900"
                    }`}
                  >
                    {displayPrice.toFixed(2).replace(".", ",")}
                  </span>
                  <span className="text-sm sm:text-base md:text-xl text-gray-900 font-medium">€</span>
                  <span className="text-gray-600 text-[10px] sm:text-xs md:text-sm">/mois</span>
                </>
              )}
            </motion.div>
          </div>

          {/* Savings badge (responsive height for alignment) */}
          <div
            className={`h-[32px] sm:h-[42px] md:h-[56px] flex flex-col items-center justify-center transition-opacity duration-200 ${
              billingPeriod === "yearly" && !isFree ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          >
            <div className="inline-flex items-center gap-0.5 sm:gap-1 md:gap-1.5 px-1.5 sm:px-2 md:px-3 py-0.5 sm:py-1 bg-green-500/10 rounded-full border border-green-500/20">
              <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-4 md:h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-[10px] sm:text-xs md:text-sm text-green-400 font-semibold">{getSavingsText(plan.id) || `${yearlySavings.toFixed(0)}€`}</span>
            </div>
            <p className="text-[9px] sm:text-[10px] md:text-xs text-gray-500 mt-0.5 sm:mt-1 hidden sm:block">Facturé {plan.price.yearly}€/an</p>
          </div>
        </div>

        {/* ZONE 3: CTA Button (responsive height) */}
        <div className="h-[32px] sm:h-[42px] md:h-[56px] relative flex items-center justify-center mb-2 sm:mb-4 md:mb-6">
          {/* Glow effect behind button for popular plan */}
          {isPopular && !isCurrentPlan && <div className="absolute inset-0 bg-primary/30 rounded-lg sm:rounded-xl blur-md sm:blur-xl" />}
          {isPremium && !isCurrentPlan && <div className="absolute inset-0 bg-amber-500/20 rounded-lg sm:rounded-xl blur-md sm:blur-xl" />}

          {isAuthenticated ? (
            <motion.button
              whileHover={{ scale: isCurrentPlan ? 1 : 1.02 }}
              whileTap={{ scale: isCurrentPlan ? 1 : 0.98 }}
              onClick={handleClick}
              disabled={isCurrentPlan || isLoading}
              className={`
                relative w-full h-full flex items-center justify-center px-2 sm:px-3 md:px-4 rounded-lg sm:rounded-xl font-semibold text-[10px] sm:text-xs md:text-sm
                transition-all duration-300 overflow-hidden
                disabled:opacity-50 disabled:cursor-not-allowed
                ${
                  isCurrentPlan
                    ? "bg-gray-100 text-gray-500"
                    : isPopular
                    ? "bg-gradient-to-r from-primary to-accent text-white shadow-md sm:shadow-lg shadow-primary/30 hover:shadow-lg sm:hover:shadow-xl hover:shadow-primary/40"
                    : isPremium
                    ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md sm:shadow-lg shadow-amber-500/30 hover:shadow-lg sm:hover:shadow-xl hover:shadow-amber-500/40"
                    : "bg-gray-100 hover:bg-gray-200 text-gray-900 border border-gray-200 hover:border-primary/50"
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
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    <span className="hidden sm:inline">Redirection...</span>
                  </>
                ) : isCurrentPlan ? (
                  <>
                    <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-4 md:h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="hidden sm:inline">Plan actuel</span>
                    <span className="inline sm:hidden">Actuel</span>
                  </>
                ) : (
                  <>
                    {getCTALabel(plan.id, billingPeriod === "yearly")}
                    <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-4 md:h-4 hidden sm:inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </>
                )}
              </span>
            </motion.button>
          ) : (
            <Link
              href={ctaHref || "/login"}
              className={`
                relative w-full h-full flex items-center justify-center px-2 sm:px-3 md:px-4 rounded-lg sm:rounded-xl font-semibold text-[10px] sm:text-xs md:text-sm
                transition-all duration-300 overflow-hidden
                ${
                  isPopular
                    ? "bg-gradient-to-r from-primary to-accent text-white shadow-md sm:shadow-lg shadow-primary/30 hover:shadow-lg sm:hover:shadow-xl hover:shadow-primary/40 hover:scale-[1.02]"
                    : isPremium
                    ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md sm:shadow-lg shadow-amber-500/30 hover:shadow-lg sm:hover:shadow-xl hover:shadow-amber-500/40 hover:scale-[1.02]"
                    : "bg-gray-100 hover:bg-gray-200 text-gray-900 border border-gray-200 hover:border-primary/50"
                }
              `}
            >
              <span className="relative flex items-center justify-center gap-1 sm:gap-2">
                {getCTALabel(plan.id, billingPeriod === "yearly")}
                <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-4 md:h-4 hidden sm:inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            </Link>
          )}
        </div>

        {/* ZONE 4: Features list (flexible, grows to fill) */}
        <div className="flex-1 pt-2 sm:pt-3 md:pt-4 border-t border-gray-200">
          {/* Core features */}
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
                  w-full flex items-center justify-center gap-1 sm:gap-2 py-1.5 sm:py-2 md:py-2.5 px-2 sm:px-3
                  text-[10px] sm:text-xs md:text-sm font-medium rounded-md sm:rounded-lg
                  transition-all duration-200
                  ${showMoreFeatures
                    ? isPopular
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : isPremium
                        ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                        : "bg-primary/10 text-primary border border-primary/20"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200"
                  }
                `}
              >
                <span className="hidden sm:inline">
                  {showMoreFeatures ? "Voir moins" : `Voir toutes les fonctionnalités (+${includedSecondaryCount})`}
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
                    <ul className="space-y-1 sm:space-y-1.5 md:space-y-2.5 mt-2 sm:mt-3 md:mt-4 pt-2 sm:pt-3 md:pt-4 border-t border-gray-200">
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

        {/* ZONE 5: Trust badge (responsive height) */}
        <div className="h-8 sm:h-10 md:h-12 mt-auto pt-2 sm:pt-2.5 md:pt-3 border-t border-gray-200 flex items-center justify-center">
          {!isFree ? (
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.6 }}
              className="text-[9px] sm:text-[10px] md:text-xs text-gray-500 flex items-center justify-center gap-0.5 sm:gap-1 md:gap-1.5"
            >
              <svg className="w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3.5 md:h-3.5 text-green-500 hidden sm:inline" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="hidden md:inline">Sans engagement • Annulation à tout moment</span>
              <span className="inline md:hidden">Sans engagement</span>
            </motion.p>
          ) : (
            <p className="text-[9px] sm:text-[10px] md:text-xs text-gray-500">
              <span className="hidden sm:inline">Idéal pour découvrir Posty</span>
              <span className="inline sm:hidden">Gratuit</span>
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Feature item component
function FeatureListItem({ feature, index }: { feature: FeatureItem; index: number }) {
  return (
    <motion.li
      initial={{ opacity: 0, x: -10 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ delay: 0.3 + index * 0.05 }}
      className="flex items-start gap-1.5 sm:gap-2 md:gap-3"
    >
      <div
        className={`
        flex-shrink-0 w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 rounded-full flex items-center justify-center mt-0.5
        ${feature.included ? "bg-green-500/20 text-green-400" : "bg-red-500/15 text-red-400"}
      `}
      >
        {feature.included ? (
          <svg className="w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        ) : (
          <svg className="w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </div>
      <span className={`text-[10px] sm:text-xs md:text-sm ${feature.included ? "text-gray-600" : "text-gray-400 line-through"}`}>
        {feature.text}
      </span>
    </motion.li>
  );
}

// Export for use elsewhere
export { PricingCard, FeatureListItem };
