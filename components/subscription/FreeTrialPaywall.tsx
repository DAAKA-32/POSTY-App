"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useScrollLock } from "@/hooks/ui/useScrollLock";
import {
  FREE_TRIAL_DURATION_DAYS,
  formatPlanPrice,
} from "@/lib/config/plans";

type Lang = "fr" | "en";

interface PaywallCopy {
  badge: string;
  headline: string;
  subtitle: string;
  bodyPrefix: string;
  bodyHighlight: string;
  bodySuffix: string;
  recommended: string;
  perMonth: string;
  proName: string;
  proTagline: string;
  proCta: string;
  proPerks: string[];
  maxName: string;
  maxTagline: string;
  maxCta: string;
  maxPerks: string[];
  footerNote: string;
}

const COPY: Record<Lang, PaywallCopy> = {
  fr: {
    badge: `Essai de ${FREE_TRIAL_DURATION_DAYS} jours terminé`,
    headline: "Votre essai gratuit est terminé.",
    subtitle:
      "Pour continuer à utiliser Posty, choisissez le plan qui vous correspond.",
    bodyPrefix: "Vous avez profité de ",
    bodyHighlight: `${FREE_TRIAL_DURATION_DAYS} jours d'accès complet`,
    bodySuffix:
      ". Reprenez là où vous vous êtes arrêté — sans interruption, sans perte de données.",
    recommended: "Recommandé",
    perMonth: "/mois",
    proName: "Pro",
    proTagline: "Pour publier régulièrement et convertir.",
    proCta: "Continuer avec Pro",
    proPerks: [
      "60 créations IA par jour",
      "Programmation de posts",
      "Mode Storytelling + Business",
      "Multi-plateformes",
    ],
    maxName: "Max",
    maxTagline: "Puissance maximale, zéro limite.",
    maxCta: "Passer en Max",
    maxPerks: [
      "Créations illimitées",
      "IA ultra-précise",
      "6 plateformes + publication simultanée",
      "Strategist marketing IA",
    ],
    footerNote:
      "Sans engagement. Annulable à tout moment. Garantie satisfait ou remboursé 7 jours.",
  },
  en: {
    badge: `${FREE_TRIAL_DURATION_DAYS}-day trial ended`,
    headline: "Your free trial has ended.",
    subtitle: "To keep using Posty, pick the plan that fits you best.",
    bodyPrefix: "You've enjoyed ",
    bodyHighlight: `${FREE_TRIAL_DURATION_DAYS} days of full access`,
    bodySuffix:
      ". Pick up right where you left off — no interruption, no data loss.",
    recommended: "Recommended",
    perMonth: "/mo",
    proName: "Pro",
    proTagline: "For consistent publishing & conversion.",
    proCta: "Continue with Pro",
    proPerks: [
      "60 AI creations per day",
      "Post scheduling",
      "Storytelling + Business mode",
      "Multi-platform publishing",
    ],
    maxName: "Max",
    maxTagline: "Full power, zero limits.",
    maxCta: "Go Max",
    maxPerks: [
      "Unlimited creations",
      "Ultra-precise AI",
      "6 platforms + simultaneous publishing",
      "AI marketing strategist",
    ],
    footerNote:
      "No commitment. Cancel anytime. 7-day money-back guarantee.",
  },
};

const SMOOTH_EASE = [0.22, 1, 0.36, 1] as const;

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.12 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: SMOOTH_EASE },
  },
};

/**
 * FreeTrialPaywall — full-screen overlay rendered when a Free user's
 * trial has expired. Uses the canonical POSTY modal pattern: light blur
 * backdrop, brand-token surfaces, Inter typography, theme-aware colors.
 *
 * Reads `freeTrialExpired` from SubscriptionContext. Renders nothing for
 * everyone else.
 */
export default function FreeTrialPaywall() {
  const { freeTrialExpired } = useSubscription();
  const { language } = useLanguage();

  // Canonical POSTY scroll-lock — same hook used by every other modal.
  useScrollLock(freeTrialExpired);

  const copy = COPY[language === "en" ? "en" : "fr"];

  if (!freeTrialExpired) return null;

  const proPrice = formatPlanPrice("pro", "monthly");
  const maxPrice = formatPlanPrice("max", "monthly");

  return (
    <AnimatePresence>
      <motion.div
        key="free-trial-paywall"
        role="dialog"
        aria-modal="true"
        aria-labelledby="free-trial-paywall-title"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-6"
      >
        {/* Light blur backdrop — POSTY canonical pattern */}
        <div
          aria-hidden
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal panel — fits within viewport, body scrolls internally if needed */}
        <motion.article
          initial={{ opacity: 0, y: 16, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4, ease: SMOOTH_EASE }}
          className="
            relative w-full max-w-3xl
            max-h-[calc(100vh-3rem)] overflow-y-auto
            bg-light-card dark:bg-dark-card
            border border-light-border dark:border-dark-border
            rounded-2xl shadow-2xl
            ring-1 ring-primary/10
          "
        >
          {/* Brand gradient sliver — top edge, on brand */}
          <span
            aria-hidden
            className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary-hover to-accent rounded-t-2xl"
          />

          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="px-6 sm:px-10 pt-9 sm:pt-11 pb-8"
          >
            {/* Badge — clock icon + label, brand orange */}
            <motion.div variants={itemVariants} className="flex justify-center">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/25">
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                {copy.badge}
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h2
              id="free-trial-paywall-title"
              variants={itemVariants}
              className="mt-5 text-center text-2xl sm:text-[1.85rem] lg:text-3xl font-bold tracking-tight text-text-primary"
            >
              {copy.headline}
            </motion.h2>

            <motion.p
              variants={itemVariants}
              className="mt-3 text-center text-sm sm:text-base text-text-secondary max-w-xl mx-auto"
            >
              {copy.subtitle}
            </motion.p>

            <motion.p
              variants={itemVariants}
              className="mt-2 text-center text-sm text-text-muted max-w-xl mx-auto"
            >
              {copy.bodyPrefix}
              <span className="font-semibold text-text-primary">
                {copy.bodyHighlight}
              </span>
              {copy.bodySuffix}
            </motion.p>

            {/* Plan cards */}
            <motion.div
              variants={itemVariants}
              className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              <PlanCard
                name={copy.proName}
                tagline={copy.proTagline}
                price={proPrice}
                perMonth={copy.perMonth}
                perks={copy.proPerks}
                cta={copy.proCta}
                href="/subscription?reason=free_trial_expired&plan=pro"
                variant="recommended"
                recommendedLabel={copy.recommended}
              />
              <PlanCard
                name={copy.maxName}
                tagline={copy.maxTagline}
                price={maxPrice}
                perMonth={copy.perMonth}
                perks={copy.maxPerks}
                cta={copy.maxCta}
                href="/subscription?reason=free_trial_expired&plan=max"
                variant="default"
              />
            </motion.div>

          </motion.div>

          {/* Long-form trust line for screen readers (footerNote key kept) */}
          <span className="sr-only">{copy.footerNote}</span>
        </motion.article>
      </motion.div>
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PlanCard
// ─────────────────────────────────────────────────────────────────────────────

interface PlanCardProps {
  name: string;
  tagline: string;
  price: string;
  perMonth: string;
  perks: string[];
  cta: string;
  href: string;
  variant: "recommended" | "default";
  recommendedLabel?: string;
}

function PlanCard({
  name,
  tagline,
  price,
  perMonth,
  perks,
  cta,
  href,
  variant,
  recommendedLabel,
}: PlanCardProps) {
  const isRecommended = variant === "recommended";

  return (
    <article
      className={`
        group relative rounded-xl p-5 sm:p-6
        transition-all duration-200 ease-out
        ${
          isRecommended
            ? "bg-white dark:bg-dark-elevated border-2 border-primary shadow-[0_8px_28px_-8px_rgba(248,147,93,0.35)] hover:shadow-[0_12px_36px_-8px_rgba(248,147,93,0.5)]"
            : "bg-light-elevated dark:bg-dark-elevated border border-light-border dark:border-dark-border hover:border-primary/30"
        }
      `}
    >
      {/* Recommended pill — anchored top-right inside the card border, no overlap */}
      {isRecommended && recommendedLabel && (
        <span className="absolute -top-2.5 right-5 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gradient-to-r from-primary to-accent text-white shadow-sm">
          <svg
            className="w-2.5 h-2.5"
            viewBox="0 0 16 16"
            fill="currentColor"
            aria-hidden
          >
            <path d="M8 0l2 5h6l-5 4 2 6-5-3-5 3 2-6-5-4h6z" />
          </svg>
          {recommendedLabel}
        </span>
      )}

      {/* Header: name + price */}
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
          {name}
        </h3>
        <div className="text-right whitespace-nowrap">
          <span className="text-2xl font-bold text-gray-900 dark:text-white">
            {price}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400 ml-0.5">
            {perMonth}
          </span>
        </div>
      </div>

      {/* Tagline */}
      <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">{tagline}</p>

      {/* Perks list — plain emerald checkmarks for max contrast on any
          background. Text classes are explicit (no theme variable) so we
          can never hit a cascade/resolution edge case again. */}
      <ul className="mt-5 space-y-2.5">
        {perks.map((perk, idx) => (
          <li
            key={idx}
            className="flex items-start gap-2.5 text-sm text-gray-900 dark:text-gray-100"
          >
            <svg
              className="shrink-0 w-4 h-4 mt-0.5 text-emerald-500"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span>{perk}</span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <Link
        href={href}
        className={`
          mt-6 group/btn relative w-full inline-flex items-center justify-center gap-2
          px-4 py-3 rounded-xl text-sm font-semibold
          transition-all duration-200 ease-out
          active:scale-[0.985]
          ${
            isRecommended
              ? "bg-gradient-to-r from-primary to-accent text-white shadow-[0_6px_18px_-4px_rgba(248,147,93,0.45)] hover:shadow-[0_10px_24px_-4px_rgba(248,147,93,0.6)] hover:-translate-y-0.5"
              : "bg-text-primary text-light-card dark:text-dark-card hover:opacity-90"
          }
        `}
      >
        <span>{cta}</span>
        <svg
          className="w-4 h-4 transition-transform duration-200 group-hover/btn:translate-x-0.5"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M17 8l4 4m0 0l-4 4m4-4H3"
          />
        </svg>
      </Link>
    </article>
  );
}

