"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect } from "react";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  FREE_TRIAL_DURATION_DAYS,
  formatPlanPrice,
} from "@/lib/config/plans";

type Lang = "fr" | "en";

interface PaywallCopy {
  badge: string;
  headline: string;
  /** Word inside `headline` that gets the italic + gradient treatment. Match is case-insensitive. */
  headlineAccent: string;
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
  // —— additions for the editorial layout ——
  brandMark: string;
  edition: string;
  eyebrow: string;
  trustNoCommitment: string;
  trustCancelAnytime: string;
  trustGuarantee: string;
}

const COPY: Record<Lang, PaywallCopy> = {
  fr: {
    badge: `Essai de ${FREE_TRIAL_DURATION_DAYS} jours terminé`,
    headline: "Votre essai gratuit est terminé.",
    headlineAccent: "essai",
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
    brandMark: "Posty · Access Review",
    edition: "Édition limitée",
    eyebrow: `${FREE_TRIAL_DURATION_DAYS} JOURS · ACCÈS COMPLET`,
    trustNoCommitment: "Sans engagement",
    trustCancelAnytime: "Résiliable en 1 clic",
    trustGuarantee: "Remboursé 7 jours",
  },
  en: {
    badge: `${FREE_TRIAL_DURATION_DAYS}-day trial ended`,
    headline: "Your free trial has ended.",
    headlineAccent: "trial",
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
    brandMark: "Posty · Access Review",
    edition: "Limited edition",
    eyebrow: `${FREE_TRIAL_DURATION_DAYS} DAYS · FULL ACCESS`,
    trustNoCommitment: "No commitment",
    trustCancelAnytime: "Cancel in 1 click",
    trustGuarantee: "7-day refund",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Style primitives
// ─────────────────────────────────────────────────────────────────────────────

/** Editorial display serif — uses system stacks (Charter on macOS, Cambria on
 *  Windows, Georgia universally). Zero font loading, instantly available. */
const SERIF_STYLE: React.CSSProperties = {
  fontFamily:
    'Charter, "Bitstream Charter", "Sitka Text", Cambria, Georgia, "Times New Roman", serif',
};

/** Inline SVG noise pattern for paper-grain feel. Encoded as a data URI so the
 *  modal stays self-contained — no asset pipeline, no extra request. */
const NOISE_BG_LIGHT =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.1 0 0 0 0 0.06 0 0 0 0 0.04 0 0 0 0.06 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";

const NOISE_BG_DARK =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.98 0 0 0 0 0.96 0 0 0 0 0.94 0 0 0 0.05 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";

// ─────────────────────────────────────────────────────────────────────────────
// Motion variants
// ─────────────────────────────────────────────────────────────────────────────

// Cubic-bezier tuple kept `as const` so framer-motion's strict types accept it
// as a 4-tuple Easing instead of a generic number[].
const SMOOTH_EASE = [0.22, 1, 0.36, 1] as const;

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.18 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: SMOOTH_EASE },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// FreeTrialPaywall
// ─────────────────────────────────────────────────────────────────────────────

/**
 * FreeTrialPaywall — full-screen overlay rendered when a Free user's
 * 30-day trial has expired. Editorial luxury direction: serif display,
 * paper grain, ambient orbs, two-card layout that visually opposes the
 * recommended plan (warm) to the premium plan (deep dark) — clear hierarchy
 * without aggressive "best deal" pop-ups.
 *
 * Reads `freeTrialExpired` from SubscriptionContext. Renders nothing
 * otherwise. Founder/gift overrides resolve `freeTrialExpired` to false
 * upstream so we never see this for them.
 */
export default function FreeTrialPaywall() {
  const { freeTrialExpired } = useSubscription();
  const { language } = useLanguage();

  const copy = COPY[language === "en" ? "en" : "fr"];

  // Lock body scroll while the paywall is up.
  useEffect(() => {
    if (!freeTrialExpired) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [freeTrialExpired]);

  if (!freeTrialExpired) return null;

  const proPrice = formatPlanPrice("pro", "monthly");
  const maxPrice = formatPlanPrice("max", "monthly");

  // Split the headline around the accent word so it can wear the italic
  // gradient treatment. Case-insensitive so "Trial" and "trial" both match.
  const headlineParts = copy.headline.split(
    new RegExp(`(${escapeRegex(copy.headlineAccent)})`, "i"),
  );

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
        transition={{ duration: 0.4 }}
        className="fixed inset-0 z-[100] overflow-y-auto"
      >
        {/* Backdrop: warm dark base + heavy blur */}
        <div
          aria-hidden
          className="fixed inset-0 bg-[#0B0907]/78"
          style={{
            backdropFilter: "blur(20px) saturate(125%)",
            WebkitBackdropFilter: "blur(20px) saturate(125%)",
          }}
        />

        {/* Ambient orange orb top-left */}
        <div
          aria-hidden
          className="fixed -top-32 -left-32 w-[460px] h-[460px] rounded-full opacity-40 blur-[130px] pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at center, #F8935D 0%, rgba(248,147,93,0) 65%)",
          }}
        />
        {/* Ambient red-orange orb bottom-right */}
        <div
          aria-hidden
          className="fixed -bottom-44 -right-44 w-[560px] h-[560px] rounded-full opacity-30 blur-[150px] pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at center, #F13452 0%, rgba(241,52,82,0) 65%)",
          }}
        />

        {/* Modal panel container */}
        <div className="relative min-h-full flex items-center justify-center px-4 py-8 sm:py-12">
          <motion.article
            initial={{ opacity: 0, y: 28, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, ease: SMOOTH_EASE }}
            className="relative w-full max-w-4xl overflow-hidden rounded-[28px] bg-[#FBF6EF] dark:bg-[#1A1410] shadow-[0_50px_120px_-30px_rgba(11,9,7,0.7)] ring-1 ring-[#F8935D]/15 dark:ring-[#F8935D]/25"
          >
            {/* Paper grain overlay — light & dark variants */}
            <div
              aria-hidden
              className="absolute inset-0 opacity-50 dark:opacity-0 mix-blend-multiply pointer-events-none"
              style={{ backgroundImage: NOISE_BG_LIGHT }}
            />
            <div
              aria-hidden
              className="absolute inset-0 opacity-0 dark:opacity-60 mix-blend-screen pointer-events-none"
              style={{ backgroundImage: NOISE_BG_DARK }}
            />

            {/* Top header bar — editorial micro-meta */}
            <div className="relative px-6 sm:px-10 pt-6 sm:pt-7 pb-4 flex items-center justify-between border-b border-dashed border-[#F8935D]/25 dark:border-[#F8935D]/25">
              <div className="flex items-center gap-2.5">
                <div
                  aria-hidden
                  className="relative w-7 h-7 rounded-md bg-gradient-to-br from-[#F8935D] to-[#F13452] flex items-center justify-center shadow-[0_4px_12px_-2px_rgba(248,147,93,0.5)]"
                >
                  <span
                    className="text-white text-[11px] font-black tracking-tight"
                    style={SERIF_STYLE}
                  >
                    P
                  </span>
                </div>
                <span className="text-[10px] sm:text-[11px] uppercase tracking-[0.22em] font-semibold text-[#1A1410]/70 dark:text-[#FBF6EF]/70">
                  {copy.brandMark}
                </span>
              </div>
              <span
                className="hidden sm:inline-block text-[12px] tracking-tight text-[#1A1410]/55 dark:text-[#FBF6EF]/55 italic"
                style={SERIF_STYLE}
              >
                {copy.edition}
              </span>
            </div>

            {/* Main editorial content */}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="px-6 sm:px-10 pt-8 sm:pt-12 pb-8"
            >
              {/* Eyebrow with rule */}
              <motion.div
                variants={itemVariants}
                className="flex items-center gap-3"
              >
                <span
                  aria-hidden
                  className="block w-8 h-px bg-gradient-to-r from-[#F8935D] to-[#F13452]"
                />
                <span className="text-[11px] uppercase tracking-[0.24em] font-bold text-[#F8935D]">
                  {copy.eyebrow}
                </span>
              </motion.div>

              {/* Display headline — serif w/ italic gradient accent */}
              <motion.h2
                id="free-trial-paywall-title"
                variants={itemVariants}
                style={{
                  ...SERIF_STYLE,
                  fontWeight: 300,
                  letterSpacing: "-0.025em",
                  lineHeight: 1.02,
                }}
                className="mt-5 text-[2.25rem] sm:text-[3rem] lg:text-[3.75rem] text-[#1A1410] dark:text-[#FBF6EF]"
              >
                {headlineParts.map((part, i) =>
                  part.toLowerCase() === copy.headlineAccent.toLowerCase() ? (
                    <em
                      key={i}
                      className="italic bg-gradient-to-br from-[#F8935D] via-[#F76B54] to-[#F13452] bg-clip-text text-transparent pr-1"
                      style={{ fontWeight: 400 }}
                    >
                      {part}
                    </em>
                  ) : (
                    <span key={i}>{part}</span>
                  ),
                )}
              </motion.h2>

              {/* Subtitle */}
              <motion.p
                variants={itemVariants}
                className="mt-5 max-w-xl text-base sm:text-lg leading-relaxed text-[#1A1410]/75 dark:text-[#FBF6EF]/75"
              >
                {copy.subtitle}
              </motion.p>

              {/* Body context with italic highlight */}
              <motion.p
                variants={itemVariants}
                className="mt-3 max-w-xl text-sm leading-relaxed text-[#1A1410]/55 dark:text-[#FBF6EF]/55"
              >
                {copy.bodyPrefix}
                <span
                  className="italic font-medium text-[#1A1410] dark:text-[#FBF6EF]"
                  style={SERIF_STYLE}
                >
                  {copy.bodyHighlight}
                </span>
                {copy.bodySuffix}
              </motion.p>

              {/* Plan cards */}
              <motion.div
                variants={itemVariants}
                className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5"
              >
                <PlanCard
                  number="01"
                  recommendedLabel={copy.recommended}
                  name={copy.proName}
                  tagline={copy.proTagline}
                  price={proPrice}
                  perMonth={copy.perMonth}
                  perks={copy.proPerks}
                  cta={copy.proCta}
                  href="/subscription?reason=free_trial_expired&plan=pro"
                  variant="recommended"
                />
                <PlanCard
                  number="02"
                  name={copy.maxName}
                  tagline={copy.maxTagline}
                  price={maxPrice}
                  perMonth={copy.perMonth}
                  perks={copy.maxPerks}
                  cta={copy.maxCta}
                  href="/subscription?reason=free_trial_expired&plan=max"
                  variant="dark"
                />
              </motion.div>

              {/* Trust strip — proeminent, 3 anchors with hairline icons */}
              <motion.div
                variants={itemVariants}
                className="mt-9 pt-6 border-t border-dashed border-[#F8935D]/25 dark:border-[#F8935D]/25"
              >
                <ul className="flex flex-col sm:flex-row sm:items-center sm:justify-center gap-3 sm:gap-0">
                  <TrustItem icon="lock" label={copy.trustNoCommitment} />
                  <TrustDivider />
                  <TrustItem icon="lightning" label={copy.trustCancelAnytime} />
                  <TrustDivider />
                  <TrustItem icon="shield" label={copy.trustGuarantee} />
                </ul>
              </motion.div>
            </motion.div>

            {/* Long-form fallback — hidden visually but kept for accessibility
                and historical compatibility (footerNote key is still wired). */}
            <span className="sr-only">{copy.footerNote}</span>
          </motion.article>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PlanCard
// ─────────────────────────────────────────────────────────────────────────────

interface PlanCardProps {
  number: string;
  recommendedLabel?: string;
  name: string;
  tagline: string;
  price: string;
  perMonth: string;
  perks: string[];
  cta: string;
  href: string;
  variant: "recommended" | "dark";
}

function PlanCard({
  number,
  recommendedLabel,
  name,
  tagline,
  price,
  perMonth,
  perks,
  cta,
  href,
  variant,
}: PlanCardProps) {
  const isRecommended = variant === "recommended";
  const isDark = variant === "dark";

  return (
    <article
      className={`
        group relative overflow-hidden rounded-2xl p-6 sm:p-7
        transition-all duration-300 ease-out
        ${
          isRecommended
            ? "bg-[#FFF8F0] dark:bg-[#221913] border-[1.5px] border-[#F8935D] shadow-[0_18px_50px_-18px_rgba(248,147,93,0.45)] hover:shadow-[0_24px_60px_-18px_rgba(248,147,93,0.6)] hover:-translate-y-0.5"
            : "bg-[#1A1410] text-[#FBF6EF] border border-[#1A1410] dark:border-[#FBF6EF]/10 shadow-[0_18px_50px_-18px_rgba(11,9,7,0.45)] hover:shadow-[0_24px_60px_-18px_rgba(11,9,7,0.6)] hover:-translate-y-0.5"
        }
      `}
    >
      {/* Recommended top sliver */}
      {isRecommended && (
        <span
          aria-hidden
          className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#F8935D] via-[#F76B54] to-[#F13452]"
        />
      )}

      {/* Decorative corner ornament for the dark card */}
      {isDark && (
        <span
          aria-hidden
          className="absolute -top-12 -right-12 w-40 h-40 rounded-full opacity-30 blur-3xl pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, rgba(248,147,93,0.5) 0%, rgba(248,147,93,0) 70%)",
          }}
        />
      )}

      {/* Card header — editorial number + recommended pill */}
      <div className="relative flex items-center justify-between">
        <div className="flex items-baseline gap-3">
          <span
            className={`italic text-[2.25rem] leading-none ${
              isRecommended
                ? "bg-gradient-to-br from-[#F8935D] to-[#F13452] bg-clip-text text-transparent"
                : "text-[#F8935D]"
            }`}
            style={{ ...SERIF_STYLE, fontWeight: 300 }}
          >
            {number}
          </span>
          {recommendedLabel && (
            <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.2em] font-bold text-[#F8935D] bg-[#F8935D]/10 px-2 py-1 rounded-full border border-[#F8935D]/30">
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
        </div>
      </div>

      {/* Plan name */}
      <h3
        className={`relative mt-4 text-3xl sm:text-[2.25rem] tracking-tight ${
          isDark
            ? "text-[#FBF6EF]"
            : "text-[#1A1410] dark:text-[#FBF6EF]"
        }`}
        style={{ ...SERIF_STYLE, fontWeight: 300, lineHeight: 1.05 }}
      >
        {name}
      </h3>

      {/* Tagline */}
      <p
        className={`relative mt-1 italic text-sm ${
          isDark
            ? "text-[#FBF6EF]/65"
            : "text-[#1A1410]/65 dark:text-[#FBF6EF]/65"
        }`}
        style={SERIF_STYLE}
      >
        {tagline}
      </p>

      {/* Price block */}
      <div
        className={`relative mt-5 pb-5 flex items-baseline gap-1 border-b border-dashed ${
          isDark ? "border-[#FBF6EF]/15" : "border-[#1A1410]/15"
        }`}
      >
        <span
          className={`text-4xl tracking-tight ${
            isDark ? "text-[#FBF6EF]" : "text-[#1A1410] dark:text-[#FBF6EF]"
          }`}
          style={{ ...SERIF_STYLE, fontWeight: 300 }}
        >
          {price}
        </span>
        <span
          className={`text-sm ${
            isDark
              ? "text-[#FBF6EF]/50"
              : "text-[#1A1410]/50 dark:text-[#FBF6EF]/50"
          }`}
        >
          {perMonth}
        </span>
      </div>

      {/* Perks list */}
      <ul className="relative mt-5 space-y-2.5">
        {perks.map((perk, idx) => (
          <li
            key={idx}
            className={`flex items-start gap-3 text-[14px] leading-snug ${
              isDark
                ? "text-[#FBF6EF]/85"
                : "text-[#1A1410]/85 dark:text-[#FBF6EF]/85"
            }`}
          >
            <svg
              className="shrink-0 w-4 h-4 mt-0.5 text-[#F8935D]"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.6}
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.5 8.5l3 3 6-7"
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
          relative mt-7 group/btn w-full inline-flex items-center justify-between gap-2
          px-5 py-3.5 rounded-xl text-[14px] font-semibold
          transition-all duration-200 ease-out
          active:scale-[0.985]
          ${
            isRecommended
              ? "bg-gradient-to-br from-[#F8935D] to-[#F13452] text-white shadow-[0_8px_22px_-6px_rgba(248,147,93,0.5)] hover:shadow-[0_12px_28px_-6px_rgba(248,147,93,0.65)]"
              : "bg-[#FBF6EF] text-[#1A1410] hover:bg-white"
          }
        `}
      >
        <span>{cta}</span>
        <svg
          className="w-4 h-4 transition-transform duration-200 group-hover/btn:translate-x-1"
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

// ─────────────────────────────────────────────────────────────────────────────
// Trust strip primitives
// ─────────────────────────────────────────────────────────────────────────────

type TrustIcon = "lock" | "lightning" | "shield";

const TRUST_ICON_PATHS: Record<TrustIcon, string> = {
  lock: "M16 11V8a4 4 0 00-8 0v3M6 11h12a1 1 0 011 1v8a1 1 0 01-1 1H6a1 1 0 01-1-1v-8a1 1 0 011-1z",
  lightning: "M13 10V3L4 14h7v7l9-11h-7z",
  shield:
    "M12 2.5l7.5 3v6c0 4.5-3.2 8.7-7.5 10C7.7 20.2 4.5 16 4.5 11.5v-6L12 2.5zM9 12l2 2 4-4",
};

function TrustItem({ icon, label }: { icon: TrustIcon; label: string }) {
  return (
    <li className="flex items-center justify-center gap-2 sm:px-6">
      <span
        aria-hidden
        className="flex items-center justify-center w-5 h-5 rounded-full bg-[#F8935D]/10 ring-1 ring-[#F8935D]/30"
      >
        <svg
          className="w-3 h-3 text-[#F8935D]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d={TRUST_ICON_PATHS[icon]}
          />
        </svg>
      </span>
      <span className="text-[12px] font-medium text-[#1A1410]/80 dark:text-[#FBF6EF]/80 tracking-wide">
        {label}
      </span>
    </li>
  );
}

function TrustDivider() {
  return (
    <span
      aria-hidden
      className="hidden sm:inline-block w-1 h-1 rounded-full bg-[#F8935D]/45"
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Escapes a string for safe insertion into a RegExp source. */
function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
