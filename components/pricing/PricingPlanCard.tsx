"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  PlanConfig,
  getLocalizedPlanTaglines,
  getLocalizedPlanFeaturesUnified,
  getLocalizedCTALabel,
  getLocalizedSavingsText,
  getYearlyMonthlyEquivalent,
  GUARANTEE_PERIOD_DAYS,
} from "@/lib/config/plans";
import { useLanguage } from "@/contexts/LanguageContext";
import { trackPlanClick, trackPlanView } from "@/lib/analytics/tracker";

// =============================================================================
// PRICING PLAN CARD — single source of truth for the plan cards.
// Conversion-first design born on the landing (hierarchy does the selling: Pro
// is a filled-gradient "hero" card that pops among the lighter Free / Max cards)
// and reused verbatim on the authenticated /subscription page. The only thing
// that differs between the two surfaces is the CTA:
//   • landing  → a <Link> to /signup (no auth context);
//   • /subscription → a <button> wired to the parent's checkout handler, with
//     the current-plan / loading / downgrade / free-active / expired states.
// The visual is identical in both contexts.
// =============================================================================

const EASE = [0.22, 1, 0.36, 1] as const;

export interface PricingPlanCardProps {
  plan: PlanConfig;
  billingPeriod: "monthly" | "yearly";
  index: number;
  /** Name of the next-lower tier, for the "+ everything in X" line. */
  previousPlanName?: string;
  /** Analytics surface — drives trackPlanView / trackPlanClick. */
  surface?: "landing" | "subscription";
  /** CTA link for unauthenticated pages (used when onSelect is not provided). */
  ctaHref?: string;
  /** When provided, the CTA becomes an action <button> (authenticated page). */
  onSelect?: () => void;
  isCurrentPlan?: boolean;
  isLoading?: boolean;
  /** Pass true for the Free plan when the 30-day trial has expired. */
  isFreeTrialExpired?: boolean;
  /**
   * Pass true on the Free card when the authenticated user is currently on a
   * paid plan (Pro / Max). Repaints the Free CTA as a subdued "downgrade"
   * affordance; the parent handler opens the DowngradeConfirmModal on click.
   */
  freeAsDowngrade?: boolean;
}

function Check({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5l3.5 3.5 7.5-8" />
    </svg>
  );
}

function ArrowRight({ className = "" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
    </svg>
  );
}

export default function PricingPlanCard({
  plan,
  billingPeriod,
  index,
  previousPlanName,
  surface = "landing",
  ctaHref = "/signup",
  onSelect,
  isCurrentPlan = false,
  isLoading = false,
  isFreeTrialExpired = false,
  freeAsDowngrade = false,
}: PricingPlanCardProps) {
  const { t, language } = useLanguage();

  const isFree = plan.id === "free";
  const isPro = plan.highlight; // hero / recommended
  const isMax = plan.premium; // premium tier
  const tier: "free" | "pro" | "max" = isPro ? "pro" : isMax ? "max" : "free";

  // Authenticated surface → the CTA is an action button with all plan states.
  const isAction = typeof onSelect === "function";

  // The Free card on a paid user becomes a downgrade affordance: parent opens a
  // confirmation modal that schedules `cancel_at_period_end`.
  const isDowngradeFreeCta = freeAsDowngrade && isFree && !isCurrentPlan;
  const downgradeLabel = language === "fr" ? "Rétrograder vers Free" : "Downgrade to Free";

  // Active free plan → green "open app". Expired free / current paid → disabled.
  const isFreeActive = isAction && isCurrentPlan && isFree && !isFreeTrialExpired;
  const isFreeExpired = isAction && isCurrentPlan && isFree && isFreeTrialExpired;
  const isPaidCurrent = isAction && isCurrentPlan && !isFree;
  const ctaDisabled = isLoading || isPaidCurrent || isFreeExpired;

  // Analytics: one plan_view per plan when its CTA scrolls into view.
  const ctaRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ctaRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          trackPlanView(plan.id, surface);
          io.disconnect();
        }
      },
      { threshold: 0.6 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [plan.id, surface]);

  const taglines = getLocalizedPlanTaglines(t);
  const tagline = (taglines[plan.id] || { tagline: plan.description }).tagline;

  const features = getLocalizedPlanFeaturesUnified(plan, t)
    .filter((f) => f.included)
    .slice(0, isFree ? 4 : 5);

  const displayPrice = isFree
    ? 0
    : billingPeriod === "monthly"
      ? plan.price.monthly
      : getYearlyMonthlyEquivalent(plan.id);

  const savingsText = getLocalizedSavingsText(plan.id, t);
  const showSavings = !isFree && billingPeriod === "yearly" && !!savingsText;

  const plusLowerLine =
    !isFree && previousPlanName
      ? t.landing.pricingPlusLower.replace("{plan}", previousPlanName)
      : null;

  // ── Per-tier styling ───────────────────────────────────────────────────────
  // Pro = the app's signature salmon orange (#F8935D), centered on the orange
  // family rather than drifting into the redder coral (#F76B54).
  const cardBg =
    tier === "pro"
      ? "bg-gradient-to-b from-[#F49A6F] to-[#E97A42] text-white"
      : tier === "max"
        ? "bg-gradient-to-b from-[#FFFCF4] to-[#FFF4DE] ring-1 ring-amber-300/80"
        : "bg-white ring-1 ring-gray-200/80";

  const cardShadow =
    tier === "pro"
      ? "shadow-[0_30px_60px_-22px_rgba(240,121,74,0.5),0_10px_24px_-12px_rgba(15,23,42,0.12)]"
      : tier === "max"
        ? "shadow-[0_26px_52px_-22px_rgba(217,119,6,0.42),0_8px_20px_-12px_rgba(180,83,9,0.18)]"
        : "shadow-[0_12px_30px_-18px_rgba(15,23,42,0.18)]";

  // NB: bare `.text-white` is force-darkened in light mode by a global rule
  // (html.light .text-white { color:#1A1D21 !important }), meant for dark-mode
  // components. This card is a dark surface in light mode, so we use the
  // opacity variant `text-white/100`, which the override doesn't match.
  const nameColor =
    tier === "pro"
      ? "text-white/100"
      : tier === "max"
        ? "bg-gradient-to-r from-amber-700 to-amber-500 bg-clip-text text-transparent"
        : "text-gray-900";
  const taglineColor = tier === "pro" ? "text-white/85" : "text-gray-500";
  const priceColor = tier === "pro" ? "text-white/100" : "text-gray-900";
  const perMonthColor = tier === "pro" ? "text-white/85" : "text-gray-500";
  const dividerColor = tier === "pro" ? "border-white/30" : "border-gray-100";
  const featureText = tier === "pro" ? "text-white/100" : "text-gray-700";
  const trustColor = tier === "pro" ? "text-white/90" : "text-gray-400";

  // ── CTA appearance ──────────────────────────────────────────────────────────
  // Base per-tier look (landing identity), kept for the default / loading state.
  const ctaBase =
    tier === "pro"
      ? "bg-white text-[#E8783C] shadow-lg shadow-black/5 hover:shadow-xl hover:brightness-[1.02]"
      : tier === "max"
        ? "bg-gradient-to-r from-amber-400 to-yellow-500 text-gray-900 shadow-lg shadow-amber-500/25 hover:shadow-xl hover:shadow-amber-500/40"
        : "bg-white text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 hover:text-gray-900";

  // State overrides for the authenticated action button.
  const ctaStateClass = isDowngradeFreeCta
    ? "bg-gray-50 text-gray-600 ring-1 ring-inset ring-gray-200 hover:bg-gray-100 hover:text-gray-800"
    : isFreeActive
      ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20 hover:bg-emerald-600"
      : isFreeExpired
        ? "bg-gray-100 text-gray-400 ring-1 ring-inset ring-gray-200"
        : isPaidCurrent && tier === "pro"
          ? "bg-white/25 text-white/90"
          : isPaidCurrent && tier === "max"
            ? "bg-amber-100 text-amber-600"
            : ctaBase;

  const ctaClass = `group relative mt-5 flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl px-4 py-3.5 text-[15px] font-semibold transition-all duration-200 disabled:cursor-not-allowed ${ctaStateClass}`;

  // CTA inner content (shared between <Link> and <button>).
  const ctaContent = isLoading ? (
    <span className="relative z-10 flex items-center gap-2">
      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
      </svg>
      {t.pricingCard.redirecting}
    </span>
  ) : isDowngradeFreeCta ? (
    <span className="relative z-10 flex items-center gap-2">
      <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
      </svg>
      {downgradeLabel}
    </span>
  ) : isFreeActive ? (
    <span className="relative z-10 flex items-center gap-2">
      {t.pricingCard.openApp}
      <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
    </span>
  ) : isPaidCurrent || isFreeExpired ? (
    <span className="relative z-10 flex items-center gap-2">
      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
      {t.pricingCard.currentPlan}
    </span>
  ) : (
    <span className="relative z-10 flex items-center gap-2">
      {getLocalizedCTALabel(plan.id, t)}
      <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
    </span>
  );

  // Luxury shine sweep on the premium (Max) CTA — only in the default state.
  const showShine = isMax && !ctaDisabled && !isDowngradeFreeCta && !isFreeActive;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ delay: index * 0.1, duration: 0.5, ease: EASE }}
      className={`notranslate relative h-full ${isPro ? "lg:-my-3 lg:z-10" : ""}`}
      translate="no"
    >
      {/* Soft outer glow — orange for the hero, gold for the premium tier. */}
      {isPro && (
        <div aria-hidden className="pointer-events-none absolute -inset-3 -z-10 rounded-[2rem] bg-[#F8935D]/25 blur-2xl" />
      )}
      {isMax && (
        <div aria-hidden className="pointer-events-none absolute -inset-2.5 -z-10 rounded-[2rem] bg-amber-400/25 blur-2xl" />
      )}

      <div className={`relative isolate flex h-full flex-col overflow-hidden rounded-[1.5rem] p-6 sm:p-7 ${cardBg} ${cardShadow} ${isCurrentPlan ? "ring-2 ring-offset-2 ring-offset-transparent" : ""} ${isCurrentPlan ? (tier === "pro" ? "ring-white/70" : tier === "max" ? "ring-amber-400/70" : "ring-emerald-400/70") : ""}`}>
        {/* Premium gloss — a soft corner sheen (white on the hero, gold on the
            premium tier) gives the surface depth; sits behind the content. */}
        {(isPro || isMax) && (
          <div
            aria-hidden
            className={`pointer-events-none absolute -top-1/4 -right-[8%] -z-10 h-1/2 w-2/3 rounded-full blur-3xl ${
              isPro ? "bg-white/15" : "bg-amber-200/50"
            }`}
          />
        )}
        {/* Gold hairline crowning the premium card. */}
        {isMax && (
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-amber-400/80 to-transparent" />
        )}

        {/* "Current plan" pill — authenticated surface only. */}
        {isAction && isCurrentPlan && (
          <span
            className={`absolute right-5 top-5 z-10 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide shadow-sm ${
              tier === "pro"
                ? "bg-white/90 text-[#E8783C]"
                : tier === "max"
                  ? "bg-amber-100 text-amber-700 ring-1 ring-amber-300/60"
                  : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/70"
            }`}
          >
            <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            {t.pricingCard.current}
          </span>
        )}

        {/* ── Badge ── */}
        <div className="mb-5 flex h-7 items-center">
          {isPro && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-[#E8783C] shadow-sm">
              <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              {t.pricingCard.recommended}
            </span>
          )}
          {isMax && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-gray-900 shadow-sm shadow-amber-500/20">
              <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.381z" clipRule="evenodd" />
              </svg>
              {t.pricingCard.mostPowerful}
            </span>
          )}
        </div>

        {/* ── Name + tagline ── */}
        <h3 className={`text-2xl font-extrabold tracking-tight ${nameColor}`}>{plan.name}</h3>
        <p className={`mt-1.5 min-h-[2.5rem] text-[13.5px] leading-snug ${taglineColor}`}>{tagline}</p>

        {/* ── Price ── */}
        <div className="mt-5 flex items-end gap-1">
          {isFree ? (
            <span className={`text-4xl font-extrabold tracking-tight ${priceColor}`}>{t.pricingCard.free}</span>
          ) : (
            <>
              <span className={`text-4xl font-extrabold tabular-nums tracking-tight ${priceColor}`}>
                {displayPrice.toFixed(2).replace(".", ",")}
              </span>
              <span className={`pb-1 text-lg font-bold ${priceColor}`}>€</span>
              <span className={`pb-1.5 text-sm font-medium ${perMonthColor}`}>{t.pricingCard.perMonth}</span>
            </>
          )}
        </div>

        {/* Savings — fixed height so prices line up across cards */}
        <div className="mt-2.5 h-6">
          {showSavings && (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                tier === "pro"
                  ? "bg-white text-[#E2702F]"
                  : tier === "max"
                    ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200/70"
                    : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60"
              }`}
            >
              <Check className="h-3 w-3" />
              {savingsText}
            </span>
          )}
        </div>

        {/* ── CTA ── */}
        <div ref={ctaRef}>
          {isAction ? (
            <button
              type="button"
              onClick={() => {
                trackPlanClick(plan.id, surface, billingPeriod);
                onSelect?.();
              }}
              disabled={ctaDisabled}
              className={ctaClass}
            >
              {showShine && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 -translate-x-[120%] bg-gradient-to-r from-transparent via-white/45 to-transparent transition-transform duration-[900ms] ease-out group-hover:translate-x-[120%]"
                />
              )}
              {ctaContent}
            </button>
          ) : (
            <Link
              href={ctaHref}
              onClick={() => trackPlanClick(plan.id, surface, billingPeriod)}
              className={ctaClass}
            >
              {showShine && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 -translate-x-[120%] bg-gradient-to-r from-transparent via-white/45 to-transparent transition-transform duration-[900ms] ease-out group-hover:translate-x-[120%]"
                />
              )}
              {ctaContent}
            </Link>
          )}
        </div>

        {/* ── Features ── */}
        <div className={`mt-6 border-t pt-5 ${dividerColor}`}>
          {plusLowerLine && (
            <p className={`mb-3 text-[13px] font-semibold ${tier === "pro" ? "text-white/100" : tier === "max" ? "text-amber-700" : "text-gray-900"}`}>
              {plusLowerLine}
            </p>
          )}
          <ul className="space-y-2.5">
            {features.map((feature, idx) => (
              <li key={idx} className="flex items-start gap-2.5">
                <span
                  className={`mt-0.5 flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-full ${
                    tier === "pro"
                      ? "bg-white text-[#E2702F]"
                      : tier === "max"
                        ? "bg-amber-100 text-amber-600"
                        : "bg-emerald-50 text-emerald-600"
                  }`}
                >
                  <Check className="h-2.5 w-2.5" />
                </span>
                <span className={`text-[13.5px] leading-snug ${featureText}`}>{feature.text}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* ── Trust footer ── */}
        <div className={`mt-auto flex items-center justify-center gap-1.5 border-t pt-4 ${dividerColor}`}>
          <svg className={`h-3.5 w-3.5 ${tier === "pro" ? "text-white/90" : "text-emerald-500"}`} fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
          </svg>
          <p className={`text-[11px] ${trustColor}`}>
            {isFree ? (
              t.pricingCard.noCardRequired
            ) : (
              <>
                {GUARANTEE_PERIOD_DAYS}
                {t.pricingCard.guaranteeDays} &middot; {t.pricingCard.noCommitment}
              </>
            )}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
