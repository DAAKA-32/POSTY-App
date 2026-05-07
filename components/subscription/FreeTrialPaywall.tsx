"use client";

import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
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
  const reduceMotion = useReducedMotion();

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

            {/* Headline — argented metallic shimmer.
                Background gradient sweeps slowly across to mimic brushed
                silver catching the light. Reduced-motion users get a
                static silver gradient with the same hue range. */}
            <motion.h2
              id="free-trial-paywall-title"
              variants={itemVariants}
              className="mt-5 text-center text-2xl sm:text-[1.85rem] lg:text-3xl font-bold tracking-tight"
              style={{
                backgroundImage:
                  "linear-gradient(110deg, #475569 0%, #94A3B8 18%, #E2E8F0 38%, #F8FAFC 50%, #E2E8F0 62%, #94A3B8 82%, #475569 100%)",
                backgroundSize: reduceMotion ? "100% 100%" : "260% 100%",
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                color: "transparent",
                WebkitTextFillColor: "transparent",
                filter: "drop-shadow(0 1px 0 rgba(15,23,42,0.08))",
              }}
              animate={
                reduceMotion
                  ? undefined
                  : { backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }
              }
              transition={{
                duration: 7,
                repeat: Infinity,
                ease: "linear",
              }}
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
                reduceMotion={!!reduceMotion}
              />
              <PlanCard
                name={copy.maxName}
                tagline={copy.maxTagline}
                price={maxPrice}
                perMonth={copy.perMonth}
                perks={copy.maxPerks}
                cta={copy.maxCta}
                href="/subscription?reason=free_trial_expired&plan=max"
                variant="premium"
                reduceMotion={!!reduceMotion}
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
//   • "recommended" → Pro variant, brand orange/accent (POSTY primary CTA)
//   • "premium"     → Max variant, gold/amber treatment matching the rest
//                     of POSTY (PricingCard.tsx, PlanInfoCard.tsx)
// ─────────────────────────────────────────────────────────────────────────────

interface PlanCardProps {
  name: string;
  tagline: string;
  price: string;
  perMonth: string;
  perks: string[];
  cta: string;
  href: string;
  variant: "recommended" | "premium";
  recommendedLabel?: string;
  reduceMotion: boolean;
}

/** Deterministic sparkle positions for the Max card — feels organic without
 *  burning random() each render. */
const SPARKLE_SLOTS: Array<{
  top: string;
  left: string;
  size: number;
  delay: number;
  duration: number;
}> = [
  { top: "12%", left: "8%",  size: 10, delay: 0,    duration: 2.4 },
  { top: "30%", left: "92%", size: 8,  delay: 0.7,  duration: 2.8 },
  { top: "62%", left: "6%",  size: 9,  delay: 1.4,  duration: 2.6 },
  { top: "78%", left: "78%", size: 11, delay: 0.4,  duration: 3.0 },
  { top: "45%", left: "50%", size: 7,  delay: 2.1,  duration: 2.5 },
];

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
  reduceMotion,
}: PlanCardProps) {
  const isRecommended = variant === "recommended";
  const isPremium = variant === "premium";

  return (
    <motion.article
      className={`
        group relative overflow-hidden rounded-xl p-5 sm:p-6
        transition-shadow duration-300 ease-out
        will-change-transform
        ${
          isRecommended
            ? "bg-white dark:bg-dark-elevated border-2 border-primary shadow-[0_8px_28px_-8px_rgba(248,147,93,0.35)]"
            : "bg-gradient-to-b from-white to-amber-50/40 dark:from-dark-elevated dark:to-amber-950/10 border border-amber-200/70 dark:border-amber-400/20 shadow-[0_8px_28px_-10px_rgba(251,191,36,0.28)]"
        }
      `}
      whileHover={
        reduceMotion ? undefined : { y: -3, scale: 1.005 }
      }
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* ─── Premium card decorative effects (Max only) ─────────────────── */}
      {isPremium && !reduceMotion && (
        <>
          {/* Shimmer sweep — diagonal highlight that travels across the
              card every ~5s. Soft, never aggressive. */}
          <motion.span
            aria-hidden
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "linear-gradient(110deg, transparent 30%, rgba(255,236,179,0.55) 48%, rgba(255,255,255,0.7) 50%, rgba(255,236,179,0.55) 52%, transparent 70%)",
              backgroundSize: "220% 100%",
              mixBlendMode: "screen",
            }}
            animate={{ backgroundPosition: ["-100% 0%", "200% 0%"] }}
            transition={{
              duration: 2.8,
              repeat: Infinity,
              ease: "easeInOut",
              repeatDelay: 2.2,
            }}
          />

          {/* Animated sparkles — 5 deterministic slots, twinkle in & out */}
          {SPARKLE_SLOTS.map((s, i) => (
            <motion.svg
              key={i}
              aria-hidden
              className="absolute pointer-events-none text-amber-400 drop-shadow-[0_0_4px_rgba(251,191,36,0.8)]"
              style={{ top: s.top, left: s.left, width: s.size, height: s.size }}
              viewBox="0 0 24 24"
              fill="currentColor"
              animate={{
                scale: [0, 1, 0],
                rotate: [0, 90, 180],
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: s.duration,
                repeat: Infinity,
                delay: s.delay,
                ease: "easeInOut",
              }}
            >
              <path d="M12 0L13.5 9L24 12L13.5 15L12 24L10.5 15L0 12L10.5 9Z" />
            </motion.svg>
          ))}

          {/* Ambient golden glow that breathes */}
          <motion.span
            aria-hidden
            className="absolute -inset-px rounded-xl pointer-events-none"
            style={{
              boxShadow: "0 0 0 1px rgba(251,191,36,0.0) inset",
            }}
            animate={{
              boxShadow: [
                "0 0 0 1px rgba(251,191,36,0.0) inset, 0 0 0 0 rgba(251,191,36,0)",
                "0 0 0 1px rgba(251,191,36,0.35) inset, 0 0 24px 0 rgba(251,191,36,0.18)",
                "0 0 0 1px rgba(251,191,36,0.0) inset, 0 0 0 0 rgba(251,191,36,0)",
              ],
            }}
            transition={{
              duration: 3.4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </>
      )}

      {/* ─── Recommended card breathing glow (Pro) ──────────────────────── */}
      {isRecommended && !reduceMotion && (
        <motion.span
          aria-hidden
          className="absolute -inset-px rounded-xl pointer-events-none"
          animate={{
            boxShadow: [
              "0 0 0 0 rgba(248,147,93,0)",
              "0 0 28px 0 rgba(248,147,93,0.22)",
              "0 0 0 0 rgba(248,147,93,0)",
            ],
          }}
          transition={{
            duration: 3.2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      )}

      {/* Recommended pill (Pro) */}
      {isRecommended && recommendedLabel && (
        <motion.span
          className="absolute -top-2.5 right-5 z-10 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gradient-to-r from-primary to-accent text-white shadow-[0_4px_12px_-2px_rgba(248,147,93,0.55)]"
          animate={
            reduceMotion
              ? undefined
              : {
                  boxShadow: [
                    "0 4px 12px -2px rgba(248,147,93,0.55)",
                    "0 6px 18px 0px rgba(248,147,93,0.85)",
                    "0 4px 12px -2px rgba(248,147,93,0.55)",
                  ],
                }
          }
          transition={{
            duration: 2.2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <svg
            className="w-2.5 h-2.5"
            viewBox="0 0 16 16"
            fill="currentColor"
            aria-hidden
          >
            <path d="M8 0l2 5h6l-5 4 2 6-5-3-5 3 2-6-5-4h6z" />
          </svg>
          {recommendedLabel}
        </motion.span>
      )}

      {/* Premium crown badge (Max) — pulsing gold disc */}
      {isPremium && (
        <motion.span
          aria-hidden
          className="absolute -top-2.5 right-5 z-10 inline-flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-amber-300 via-yellow-400 to-yellow-500 ring-2 ring-white dark:ring-dark-card"
          animate={
            reduceMotion
              ? undefined
              : {
                  boxShadow: [
                    "0 3px 10px -2px rgba(245,158,11,0.55), 0 0 0 0 rgba(251,191,36,0)",
                    "0 5px 20px 0px rgba(245,158,11,0.9),  0 0 0 6px rgba(251,191,36,0.18)",
                    "0 3px 10px -2px rgba(245,158,11,0.55), 0 0 0 0 rgba(251,191,36,0)",
                  ],
                  rotate: [0, 8, -6, 0],
                }
          }
          transition={{
            duration: 2.6,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <svg
            className="w-4 h-4 text-gray-900"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M5 16L3 6l5.5 4L12 4l3.5 6L21 6l-2 10H5zm0 2h14v2H5v-2z" />
          </svg>
        </motion.span>
      )}

      {/* Header: name + price */}
      <div className="relative z-[1] flex items-baseline justify-between gap-2">
        {isPremium ? (
          <motion.h3
            className="text-xl font-bold tracking-tight"
            style={{
              backgroundImage:
                "linear-gradient(110deg, #B45309 0%, #D97706 18%, #FBBF24 38%, #FEF3C7 50%, #FBBF24 62%, #D97706 82%, #B45309 100%)",
              backgroundSize: reduceMotion ? "100% 100%" : "260% 100%",
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              color: "transparent",
              WebkitTextFillColor: "transparent",
            }}
            animate={
              reduceMotion
                ? undefined
                : { backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }
            }
            transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
          >
            {name}
          </motion.h3>
        ) : (
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            {name}
          </h3>
        )}

        <div className="text-right whitespace-nowrap">
          {isPremium ? (
            <motion.span
              className="text-2xl font-bold inline-block tracking-tight"
              style={{
                backgroundImage:
                  "linear-gradient(110deg, #B45309 0%, #D97706 18%, #FBBF24 38%, #FEF3C7 50%, #FBBF24 62%, #D97706 82%, #B45309 100%)",
                backgroundSize: reduceMotion ? "100% 100%" : "260% 100%",
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                color: "transparent",
                WebkitTextFillColor: "transparent",
              }}
              animate={
                reduceMotion
                  ? undefined
                  : { backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }
              }
              transition={{ duration: 6, repeat: Infinity, ease: "linear", delay: 0.3 }}
            >
              {price}
            </motion.span>
          ) : (
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              {price}
            </span>
          )}
          <span
            className={`text-xs ml-0.5 ${
              isPremium
                ? "text-amber-600/70 dark:text-amber-400/60"
                : "text-gray-500 dark:text-gray-400"
            }`}
          >
            {perMonth}
          </span>
        </div>
      </div>

      {/* Tagline */}
      <p
        className={`relative z-[1] mt-1 text-xs ${
          isPremium
            ? "text-amber-700/80 dark:text-amber-300/70"
            : "text-gray-600 dark:text-gray-300"
        }`}
      >
        {tagline}
      </p>

      {/* Perks list */}
      <ul className="relative z-[1] mt-5 space-y-2.5">
        {perks.map((perk, idx) => (
          <li
            key={idx}
            className="flex items-start gap-2.5 text-sm text-gray-900 dark:text-gray-100"
          >
            <svg
              className={`shrink-0 w-4 h-4 mt-0.5 ${
                isPremium ? "text-amber-500" : "text-emerald-500"
              }`}
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

      {/* CTA — inline shimmer sweep on the button itself */}
      <Link
        href={href}
        className={`
          relative z-[1] mt-6 group/btn w-full inline-flex items-center justify-center gap-2
          overflow-hidden
          px-4 py-3 rounded-xl text-sm font-semibold
          transition-all duration-200 ease-out
          active:scale-[0.985]
          ${
            isRecommended
              ? "bg-gradient-to-r from-primary to-accent text-white shadow-[0_6px_18px_-4px_rgba(248,147,93,0.45)] hover:shadow-[0_10px_24px_-4px_rgba(248,147,93,0.6)] hover:-translate-y-0.5"
              : "bg-gradient-to-r from-amber-400 via-yellow-400 to-yellow-500 text-gray-900 shadow-[0_6px_18px_-4px_rgba(245,158,11,0.45)] hover:shadow-[0_10px_24px_-4px_rgba(245,158,11,0.6)] hover:-translate-y-0.5"
          }
        `}
      >
        {!reduceMotion && (
          <motion.span
            aria-hidden
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "linear-gradient(110deg, transparent 35%, rgba(255,255,255,0.55) 50%, transparent 65%)",
              backgroundSize: "220% 100%",
            }}
            animate={{ backgroundPosition: ["-100% 0%", "200% 0%"] }}
            transition={{
              duration: 1.8,
              repeat: Infinity,
              ease: "easeInOut",
              repeatDelay: isPremium ? 1.6 : 2.4,
            }}
          />
        )}
        <span className="relative">{cta}</span>
        <svg
          className="relative w-4 h-4 transition-transform duration-200 group-hover/btn:translate-x-0.5"
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
    </motion.article>
  );
}

