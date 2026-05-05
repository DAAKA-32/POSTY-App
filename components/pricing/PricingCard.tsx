"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  PlanConfig,
  PlanType,
  getLocalizedPlanTaglines,
  getLocalizedPlanFeaturesUnified,
  getLocalizedCTALabel,
  getLocalizedSavingsText,
  getYearlyMonthlyEquivalent,
  GUARANTEE_PERIOD_DAYS,
} from "@/lib/config/plans";
import { useLanguage } from "@/contexts/LanguageContext";
import PricingFeatureItem from "./PricingFeatureItem";

// ============================================================
// SHARED PRICING CARD — Single source of truth
// Used by app/page.tsx (landing) and app/subscription/page.tsx
// ============================================================

export interface PricingCardProps {
  plan: PlanConfig;
  billingPeriod: "monthly" | "yearly";
  index: number;
  /** Auth context (omit for unauthenticated pages) */
  isAuthenticated?: boolean;
  isCurrentPlan?: boolean;
  isLoading?: boolean;
  onSelect?: () => void;
  /** CTA link for unauthenticated pages (used when onSelect is not provided) */
  ctaHref?: string;
  /**
   * Compact landing-page variant: only shows the top 5 *included* features
   * (no excluded-with-strikethrough rows), drops the "ideal for" sub-line,
   * and tightens the features header. Used by the marketing landing so the
   * pricing block reads as a quick scan rather than a comparison sheet.
   */
  compact?: boolean;
}

export default function PricingCard({
  plan,
  billingPeriod,
  index,
  isAuthenticated = false,
  isCurrentPlan = false,
  isLoading = false,
  onSelect,
  ctaHref,
  compact = false,
}: PricingCardProps) {
  const { t } = useLanguage();
  const isFree = plan.id === "free";
  const isPopular = plan.highlight;
  const isPremium = plan.premium;
  const allFeaturesFull = getLocalizedPlanFeaturesUnified(plan, t);
  // Compact mode: only the top 5 included features, no excluded items.
  const allFeatures = compact
    ? allFeaturesFull.filter((f) => f.included).slice(0, 5)
    : allFeaturesFull;
  const localizedTaglines = getLocalizedPlanTaglines(t);
  const planInfo = localizedTaglines[plan.id] || { tagline: plan.description, idealFor: "" };

  const displayPrice = isFree
    ? 0
    : billingPeriod === "monthly"
      ? plan.price.monthly
      : getYearlyMonthlyEquivalent(plan.id);

  const savingsText = isFree ? null : getLocalizedSavingsText(plan.id, t);
  const showSavings = billingPeriod === "yearly" && !!savingsText;

  // Max card = gold premium variant
  const isGoldCard = isPremium;
  const featureVariant = isGoldCard ? "gold" as const : "light" as const;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ delay: index * 0.08, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={`relative group ${isPopular ? "md:scale-[1.03] md:z-10" : ""}`}
    >
      {/* Border glow — all cards get a gradient border ring */}
      <div
        className={`
          absolute -inset-[1.5px] rounded-2xl sm:rounded-[1.25rem] md:rounded-[1.375rem]
          transition-opacity duration-300
          ${isPopular
            ? "bg-[length:200%_200%] animate-shimmer-slow opacity-100 group-hover:opacity-100"
            : isGoldCard
              ? "bg-[length:200%_200%] animate-shimmer-slow opacity-100 group-hover:opacity-100"
              : "opacity-60 group-hover:opacity-100"
          }
        `}
        style={{
          backgroundImage: isPopular
            ? "linear-gradient(135deg, rgba(248,147,93,0.4), rgba(247,107,84,0.6), rgba(248,147,93,0.4), rgba(247,107,84,0.6))"
            : isGoldCard
              ? "linear-gradient(135deg, rgba(251,191,36,0.35), rgba(245,158,11,0.55), rgba(251,191,36,0.35), rgba(217,119,6,0.5))"
              : "linear-gradient(135deg, rgba(209,213,219,0.6), rgba(156,163,175,0.4), rgba(209,213,219,0.6), rgba(156,163,175,0.4))",
        }}
      />

      <div className={`
        relative rounded-xl sm:rounded-2xl overflow-hidden h-full flex flex-col
        transition-all duration-300 ease-out
        ${isPopular
          ? "bg-gradient-to-b from-white to-orange-50/30 dark:from-dark-card dark:to-primary/5 shadow-xl shadow-primary/10 group-hover:shadow-2xl group-hover:shadow-primary/20"
          : isGoldCard
            ? "bg-gradient-to-b from-white to-amber-50/40 dark:from-dark-card dark:to-amber-950/10 shadow-lg shadow-amber-400/10 group-hover:shadow-xl group-hover:shadow-amber-400/20"
            : "bg-white dark:bg-dark-card shadow-sm group-hover:shadow-lg"
        }
        ${isCurrentPlan ? "ring-2 ring-emerald-500/40" : ""}
      `}>

        {/* ── Badge ── */}
        <div className="flex justify-center items-start pt-3 sm:pt-4 md:pt-5 relative">
          {isPopular && (
            <span className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 md:px-4 py-1 sm:py-1.5 bg-gradient-to-r from-primary to-accent text-white text-[10px] sm:text-xs md:text-sm font-semibold rounded-full shadow-sm">
              <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="hidden sm:inline">{t.pricingCard.recommended}</span>
              <span className="sm:hidden">{t.pricingCard.recommendedShort}</span>
            </span>
          )}
          {isGoldCard && !isPopular && (
            <span className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 md:px-4 py-1 sm:py-1.5 bg-gradient-to-r from-amber-400 to-yellow-500 text-gray-900 text-[10px] sm:text-xs md:text-sm font-semibold rounded-full shadow-sm shadow-amber-500/20">
              <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.381z" clipRule="evenodd" />
              </svg>
              <span className="hidden sm:inline">{t.pricingCard.mostPowerful}</span>
              <span className="sm:hidden">{t.pricingCard.mostPowerfulShort}</span>
            </span>
          )}
          {!isPopular && !isGoldCard && <div className="h-6 sm:h-7" />}

          {/* Current plan indicator */}
          {isCurrentPlan && (
            <div className={`
              absolute top-3 sm:top-4 md:top-5 right-3 sm:right-4 md:right-5
              px-2 sm:px-2.5 py-0.5 sm:py-1
              text-[9px] sm:text-[10px] md:text-xs font-medium rounded-full
              flex items-center gap-1
              ${isGoldCard
                ? "bg-amber-100 text-amber-700 border border-amber-300/50 dark:bg-amber-400/15 dark:text-amber-400 dark:border-amber-400/25"
                : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25"
              }
            `}>
              <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="hidden sm:inline">{t.pricingCard.current}</span>
            </div>
          )}
        </div>

        {/* ── Plan name + tagline ── */}
        <div className="text-center px-3 sm:px-5 md:px-6 pt-3 sm:pt-4 md:pt-5">
          <h3 className={`text-base sm:text-xl md:text-2xl font-bold mb-1 ${
            isGoldCard ? "text-amber-700 dark:text-amber-300" : "text-gray-900 dark:text-white"
          }`}>
            {plan.name}
          </h3>
          <p className={`text-[11px] sm:text-xs md:text-sm leading-snug line-clamp-2 ${
            isGoldCard ? "text-gray-500 dark:text-gray-400" : "text-gray-500 dark:text-gray-400"
          }`}>
            {planInfo.tagline}
          </p>
          {/* "Ideal for…" sub-line — hidden in compact landing mode */}
          {!compact && (
            <p className={`text-[10px] sm:text-[11px] md:text-xs mt-1 hidden sm:block font-medium ${
              isPopular ? "text-primary" : isGoldCard ? "text-amber-600 dark:text-amber-400/60" : "text-gray-400 dark:text-gray-500"
            }`}>
              {planInfo.idealFor}
            </p>
          )}
        </div>

        {/* ── Price ── */}
        <div className="text-center px-3 sm:px-5 md:px-6 pt-4 sm:pt-5 md:pt-6 pb-1 sm:pb-2">
          {isFree ? (
            <div className="flex items-baseline justify-center gap-0.5 sm:gap-1">
              <span className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight text-gray-900 dark:text-white">
                {t.pricingCard.free}
              </span>
            </div>
          ) : (
            <motion.div
              key={`${plan.id}-${billingPeriod}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.15 }}
              className="flex items-baseline justify-center gap-0.5 sm:gap-1"
            >
              <span className={`text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold tabular-nums tracking-tight ${
                isGoldCard ? "text-gray-900 dark:text-white" : "text-gray-900 dark:text-white"
              }`}>
                {displayPrice.toFixed(2).replace(".", ",")}
              </span>
              <span className={`text-sm sm:text-base md:text-lg font-semibold ${
                isGoldCard ? "text-gray-900 dark:text-white" : "text-gray-900 dark:text-white"
              }`}>€</span>
              <span className={`text-[10px] sm:text-xs md:text-sm font-medium ${
                isGoldCard ? "text-gray-500 dark:text-gray-400" : "text-gray-500 dark:text-gray-400"
              }`}>{t.pricingCard.perMonth}</span>
            </motion.div>
          )}

          {/* Savings badge — always rendered (fixed height) for vertical alignment across cards */}
          <div className="mt-2 sm:mt-3">
            <span className={`
              inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 md:px-3 py-0.5 sm:py-1
              rounded-full text-[10px] sm:text-xs md:text-sm font-semibold
              transition-opacity duration-200
              ${!isFree && showSavings ? "opacity-100" : "opacity-0 pointer-events-none"}
              ${isGoldCard
                ? "bg-amber-50 text-amber-700 border border-amber-200/60 dark:bg-amber-400/15 dark:text-amber-400 dark:border-amber-400/20"
                : "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-500/20"
              }
            `}>
              <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              {savingsText || "\u00A0"}
            </span>
          </div>
        </div>

        {/* ── CTA Button ── */}
        <div className="px-3 sm:px-5 md:px-6 pb-4 sm:pb-5 md:pb-6">
          {isAuthenticated && onSelect ? (
            <motion.button
              onClick={onSelect}
              /* Free's "current" state stays clickable so the user has a path
                 back to /app from /subscription — the parent handler turns
                 the click into a navigation when the trial is live, and an
                 upgrade prompt when it has expired. Paid plans stay disabled
                 when they're already current to avoid accidental re-checkout. */
              disabled={(isCurrentPlan && !isFree) || isLoading}
              className={`
                w-full text-center px-4 py-3 sm:py-3.5 md:py-4 rounded-xl font-semibold text-xs sm:text-sm md:text-base
                transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
                ${isCurrentPlan
                  ? isFree
                    /* Clickable Free-current: hover affordance + pointer cursor
                       so the user understands the button still does something. */
                    ? "bg-gray-100 dark:bg-dark-elevated text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-dark-hover border border-gray-200 dark:border-dark-border"
                    : isGoldCard
                    ? "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-500"
                    : "bg-gray-100 dark:bg-dark-border text-gray-500 dark:text-gray-400"
                  : isGoldCard
                    ? "bg-gradient-to-r from-amber-400 to-yellow-500 text-gray-900 shadow-lg shadow-amber-500/20 hover:shadow-xl hover:shadow-amber-500/30"
                    : isPopular
                      ? "bg-gradient-to-r from-primary to-accent text-white shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/35"
                      : "bg-gray-100 dark:bg-dark-elevated text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-dark-hover border border-gray-200 dark:border-dark-border"
                }
              `}
            >
              <span className="flex items-center justify-center gap-1.5 sm:gap-2">
                {isLoading ? (
                  <>
                    <svg className="animate-spin w-3.5 h-3.5 sm:w-4 sm:h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span className="hidden sm:inline">{t.pricingCard.redirecting}</span>
                  </>
                ) : isCurrentPlan ? (
                  <>
                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="hidden sm:inline">{t.pricingCard.currentPlan}</span>
                    <span className="sm:hidden">{t.pricingCard.current}</span>
                  </>
                ) : (
                  <>
                    {getLocalizedCTALabel(plan.id, t)}
                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 hidden sm:inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </>
                )}
              </span>
            </motion.button>
          ) : (
            <div>
              <Link
                href={ctaHref || "/login?mode=signup"}
                className={`
                  block w-full text-center px-4 py-3 sm:py-3.5 md:py-4 rounded-xl font-semibold text-xs sm:text-sm md:text-base
                  transition-all duration-200
                  ${isGoldCard
                    ? "bg-gradient-to-r from-amber-400 to-yellow-500 text-gray-900 shadow-lg shadow-amber-500/20 hover:shadow-xl hover:shadow-amber-500/30"
                    : isPopular
                      ? "bg-gradient-to-r from-primary to-accent text-white shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/35"
                      : "bg-gray-100 text-gray-900 hover:bg-gray-200 border border-gray-200"
                  }
                `}
              >
                <span className="flex items-center justify-center gap-1.5 sm:gap-2">
                  {getLocalizedCTALabel(plan.id, t)}
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 hidden sm:inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
              </Link>
            </div>
          )}
        </div>

        {/* ── Features — full comparison (or compact top-5 on landing) ── */}
        <div className={`flex-1 px-3 sm:px-5 md:px-6 pb-4 sm:pb-5 md:pb-6 border-t ${
          isGoldCard ? "border-amber-200/50 dark:border-amber-400/15" : "border-gray-100 dark:border-dark-border/50"
        }`}>
          {!compact && (
            <p className={`text-[10px] sm:text-xs md:text-sm font-semibold pt-3 sm:pt-4 pb-2 sm:pb-3 ${
              isGoldCard ? "text-amber-700 dark:text-amber-300/80" : "text-gray-900 dark:text-white"
            }`}>
              {t.pricingCard.featuresIncluded}
            </p>
          )}
          {compact && <div className="pt-3 sm:pt-4" />}
          <ul className="space-y-1.5 sm:space-y-2 md:space-y-2.5">
            {allFeatures.map((feature, idx) => (
              <PricingFeatureItem
                key={idx}
                text={feature.text}
                index={idx}
                included={feature.included}
                variant={featureVariant}
              />
            ))}
          </ul>
        </div>

        {/* ── Trust footer ── */}
        <div className={`mt-auto px-3 sm:px-5 md:px-6 py-3 sm:py-3.5 md:py-4 border-t text-center ${
          isGoldCard ? "border-amber-200/50 dark:border-amber-400/15" : "border-gray-100 dark:border-dark-border/50"
        }`}>
          <p className={`text-[9px] sm:text-[10px] md:text-xs flex items-center justify-center gap-1 sm:gap-1.5 ${
            isGoldCard ? "text-amber-600/70 dark:text-amber-400/50" : "text-gray-400 dark:text-gray-500"
          }`}>
            <svg className={`w-3 h-3 sm:w-3.5 sm:h-3.5 hidden sm:inline ${
              isGoldCard ? "text-amber-500 dark:text-amber-400/60" : "text-emerald-500"
            }`} fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            {isFree ? (
              <span>{t.pricingCard.noCardRequired}</span>
            ) : (
              <>
                <span className="hidden md:inline">{GUARANTEE_PERIOD_DAYS}{t.pricingCard.guaranteeDays} &middot; {t.pricingCard.noCommitment}</span>
                <span className="md:hidden">{GUARANTEE_PERIOD_DAYS}{t.pricingCard.guaranteeDays}</span>
              </>
            )}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
