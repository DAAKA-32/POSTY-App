"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { completeOnboarding } from "@/lib/firestore";
import {
  PROFILE_TYPES,
  SECTORS,
  OBJECTIVES,
  TARGET_AUDIENCES,
  COMMUNICATION_TONES,
  PUBLISHING_FREQUENCIES,
  OnboardingData,
} from "@/types";
import {
  TRIAL_PERIOD_DAYS,
  getPaidPlans,
  getPlanCoreFeatures,
  PLAN_TAGLINES,
  getCTALabel,
  isPlanTrialEligible,
  PlanConfig,
  PlanType,
} from "@/lib/plans";
import toast from "@/components/ui/Toast";

// =============================================================================
// STEP CONFIGURATION
// =============================================================================
const STEPS = [
  {
    id: "profileType" as const,
    title: "Quel est votre profil ?",
    subtitle: "Pour que Posty parle comme vous",
    options: PROFILE_TYPES,
    type: "select" as const,
  },
  {
    id: "sector" as const,
    title: "Dans quel secteur exercez-vous ?",
    subtitle: "Pour que chaque post touche votre cible",
    options: SECTORS,
    type: "select" as const,
  },
  {
    id: "role" as const,
    title: "Quel est votre rôle ?",
    subtitle: "Pour calibrer le ton et la crédibilité de vos posts",
    options: [] as readonly string[],
    type: "input" as const,
  },
  {
    id: "objective" as const,
    title: "Quel est votre objectif numéro 1 ?",
    subtitle: "Chaque post sera optimisé pour cet objectif",
    options: OBJECTIVES,
    type: "select" as const,
  },
  {
    id: "targetAudience" as const,
    title: "Qui souhaitez-vous atteindre ?",
    subtitle: "Pour des posts qui parlent à vos futurs clients",
    options: TARGET_AUDIENCES,
    type: "select" as const,
  },
  {
    id: "communicationTone" as const,
    title: "Quel ton vous correspond le mieux ?",
    subtitle: "Vos mots, amplifiés par l'IA",
    options: COMMUNICATION_TONES,
    type: "select" as const,
  },
  {
    id: "publishingFrequency" as const,
    title: "À quelle fréquence souhaitez-vous publier ?",
    subtitle: "Posty s'adapte à votre rythme",
    options: PUBLISHING_FREQUENCIES,
    type: "select" as const,
  },
];

type StepId = typeof STEPS[number]["id"];

// =============================================================================
// ANIMATION VARIANTS
// =============================================================================
const smoothEase = [0.22, 1, 0.36, 1] as const;

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 80 : -80,
    opacity: 0,
    filter: "blur(6px)",
  }),
  center: {
    x: 0,
    opacity: 1,
    filter: "blur(0px)",
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 80 : -80,
    opacity: 0,
    filter: "blur(6px)",
  }),
};

// =============================================================================
// PROFILE RECAP SCREEN — styled like the landing page mockup
// =============================================================================
function ProfileRecapScreen({
  data,
  userName,
  onContinue,
}: {
  data: OnboardingData;
  userName: string;
  onContinue: () => void;
}) {
  const initials = userName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?";

  const fields = [
    { label: "Profil", value: data.profileType, icon: "briefcase" },
    { label: "Secteur", value: data.sector, icon: "building" },
    { label: "Rôle", value: data.role, icon: "user" },
    { label: "Objectif", value: data.objective, icon: "target" },
    { label: "Audience", value: data.targetAudience, icon: "users" },
    { label: "Ton", value: data.communicationTone, icon: "mic" },
    { label: "Fréquence", value: data.publishingFrequency, icon: "calendar" },
  ];

  const iconMap: Record<string, React.ReactNode> = {
    briefcase: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
    ),
    building: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
    ),
    user: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
    ),
    target: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
    ),
    users: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
    ),
    mic: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
    ),
    calendar: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
    ),
  };

  return (
    <div className="w-full max-w-lg px-4 sm:px-6 py-6 sm:py-10 my-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: smoothEase }}
        className="text-center mb-6"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.15, type: "spring", stiffness: 200, damping: 15 }}
          className="w-14 h-14 mx-auto mb-4 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center"
        >
          <svg className="w-7 h-7 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </motion.div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">
          Votre profil est prêt
        </h1>
        <p className="text-gray-400 text-sm">
          L&apos;IA va personnaliser chaque post selon vos choix
        </p>
      </motion.div>

      {/* Light card */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.2, duration: 0.6, ease: smoothEase }}
        className="relative bg-white rounded-2xl p-5 sm:p-6 overflow-hidden shadow-sm border border-gray-200/80 ring-1 ring-black/[0.03]"
      >
        {/* Avatar + name */}
        <div className="flex items-center gap-3 mb-5 pb-4 border-b border-gray-100">
          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#F8935D] to-[#F76B54] flex items-center justify-center text-white font-bold text-sm shadow-sm flex-shrink-0">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[15px] text-gray-900 font-semibold truncate">{userName}</div>
            <div className="text-[12px] text-gray-400 truncate">{data.profileType} &middot; {data.sector}</div>
          </div>
          <span className="text-[11px] text-emerald-500 font-medium flex items-center gap-1 flex-shrink-0">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
            Complet
          </span>
        </div>

        {/* Profile fields */}
        <div className="space-y-1.5">
          {fields.map((field, i) => (
            <motion.div
              key={field.label}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.35 + i * 0.06, duration: 0.35, ease: smoothEase }}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-gray-50/80 transition-colors"
            >
              <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 flex-shrink-0">
                {iconMap[field.icon]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] text-gray-400 uppercase tracking-wider leading-none mb-0.5">{field.label}</div>
                <div className="text-[13px] text-gray-900 font-medium truncate">{field.value}</div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Completion bar */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] text-gray-400 font-medium">Personnalisation</span>
            <span className="text-[11px] text-emerald-500 font-semibold">100%</span>
          </div>
          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{ delay: 0.8, duration: 0.8, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full"
            />
          </div>
        </div>
      </motion.div>

      {/* CTA */}
      <motion.button
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9, duration: 0.4 }}
        onClick={onContinue}
        className="w-full mt-6 py-3.5 px-4 bg-primary hover:bg-primary-hover text-white font-semibold rounded-xl shadow-sm transition-colors duration-200 text-sm"
      >
        Continuer
      </motion.button>
    </div>
  );
}

// =============================================================================
// UPSELL SCREEN
// =============================================================================
function UpsellScreen({ onContinue, onUpgrade }: { onContinue: () => void; onUpgrade: (plan: "pro" | "max") => void }) {
  const [showReassurance, setShowReassurance] = useState(false);
  const plans = getPaidPlans();

  // Auto-redirect after reassurance message
  useEffect(() => {
    if (!showReassurance) return;
    const timeout = setTimeout(() => {
      onContinue();
    }, 2500);
    return () => clearTimeout(timeout);
  }, [showReassurance, onContinue]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="flex-1 flex flex-col items-center justify-center px-4 py-8"
    >
      <AnimatePresence mode="wait">
        {showReassurance ? (
          <motion.div
            key="reassurance"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4, ease: smoothEase }}
            className="w-full max-w-md text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
              className="mx-auto w-20 h-20 rounded-full bg-emerald-500 flex items-center justify-center mb-6"
            >
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4, ease: smoothEase }}
              className="text-2xl font-bold text-gray-900 mb-3"
            >
              Profil sauvegardé
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.4, ease: smoothEase }}
              className="text-gray-500 text-base"
            >
              Choisissez votre plan pour commencer à créer des posts.
            </motion.p>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-8 flex items-center justify-center gap-2 text-sm text-gray-400"
            >
              <div className="w-4 h-4 border-2 border-gray-300 border-t-[#F8935D] rounded-full animate-spin" />
              Redirection...
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            key="upsell"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-2xl"
          >
            {/* Title */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1, ease: smoothEase }}
              className="text-center mb-8"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 text-xs font-semibold rounded-full mb-4 border border-emerald-200">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Profil configuré
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                Choisissez votre plan
              </h1>
              <p className="text-gray-400 text-sm sm:text-base max-w-md mx-auto">
                Un seul client signé rembourse votre abonnement.
              </p>
            </motion.div>

            {/* Plan cards */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.25, ease: smoothEase }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 mb-6"
            >
              {plans.map((plan, index) => {
                const isPopular = plan.highlight;
                const isPremium = plan.premium;
                const coreFeatures = getPlanCoreFeatures(plan);
                const planInfo = PLAN_TAGLINES[plan.id];
                const trialEligible = isPlanTrialEligible(plan.id);

                return (
                  <motion.div
                    key={plan.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + index * 0.12, duration: 0.45, ease: smoothEase }}
                    className={`
                      relative rounded-2xl overflow-hidden
                      ${isPopular ? "ring-2 ring-[#F8935D]/60" : ""}
                    `}
                  >
                    {/* Glow for popular */}
                    {isPopular && (
                      <>
                        <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-[#F8935D] via-[#F76B54] to-[#F8935D] opacity-40 blur-lg" />
                        <div className="absolute inset-0 rounded-2xl p-[2px] bg-gradient-to-br from-[#F8935D] via-[#F76B54] to-[#F8935D]">
                          <div className="absolute inset-[2px] rounded-[14px] bg-white" />
                        </div>
                      </>
                    )}

                    {/* Glow for premium */}
                    {isPremium && (
                      <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 opacity-15 blur-md" />
                    )}

                    {/* Card content */}
                    <div className={`
                      relative p-5 sm:p-6 rounded-2xl flex flex-col h-full
                      ${isPopular
                        ? "bg-gradient-to-b from-[#F8935D]/8 via-white to-white"
                        : isPremium
                          ? "bg-gradient-to-b from-amber-500/5 via-white to-white border-2 border-amber-500/25"
                          : "bg-white border border-gray-200"
                      }
                    `}>
                      {/* Badge */}
                      <div className="h-8 flex items-start justify-center mb-1">
                        {isPopular && (
                          <div className="relative">
                            <div className="absolute inset-0 bg-[#F8935D] rounded-full blur-md opacity-40" />
                            <div className="relative px-3 py-1 bg-gradient-to-r from-[#F8935D] to-[#F76B54] text-white text-xs font-semibold rounded-full shadow-md shadow-[#F8935D]/25 flex items-center gap-1.5">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                              Le plus populaire
                            </div>
                          </div>
                        )}
                        {isPremium && !isPopular && (
                          <div className="px-3 py-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-semibold rounded-full shadow-md shadow-amber-500/25 flex items-center gap-1.5">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M5 2a2 2 0 00-2 2v14l3.5-2 3.5 2 3.5-2 3.5 2V4a2 2 0 00-2-2H5zm2.5 3a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm6.207.293a1 1 0 00-1.414 0l-6 6a1 1 0 101.414 1.414l6-6a1 1 0 000-1.414zM12.5 10a1.5 1.5 0 100 3 1.5 1.5 0 000-3z" clipRule="evenodd" />
                            </svg>
                            Elite
                          </div>
                        )}
                      </div>

                      {/* Plan name + tagline */}
                      <div className="text-center mb-3">
                        <h3 className={`text-xl font-bold mb-0.5 ${
                          isPremium ? "text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400" : "text-gray-900"
                        }`}>
                          {plan.name}
                        </h3>
                        <p className="text-xs text-gray-500 line-clamp-1">{planInfo?.tagline}</p>
                      </div>

                      {/* Price */}
                      <div className="text-center mb-4">
                        <div className="flex items-baseline justify-center gap-0.5">
                          <span className={`text-3xl sm:text-4xl font-bold tabular-nums ${
                            isPremium ? "text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400" : "text-gray-900"
                          }`}>
                            {plan.price.monthly.toFixed(2).replace(".", ",")}
                          </span>
                          <span className="text-base text-gray-900 font-medium">€</span>
                          <span className="text-gray-400 text-sm">/mois</span>
                        </div>
                      </div>

                      {/* CTA button */}
                      <button
                        onClick={() => onUpgrade(plan.id as "pro" | "max")}
                        className={`
                          w-full py-3 px-4 font-semibold rounded-xl shadow-sm hover:shadow-md transition-all duration-200 text-sm mb-4
                          ${isPopular
                            ? "bg-gradient-to-r from-[#F8935D] to-[#F76B54] text-white shadow-[#F8935D]/20 hover:shadow-lg hover:shadow-[#F8935D]/30"
                            : isPremium
                              ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-amber-500/20 hover:shadow-lg hover:shadow-amber-500/30"
                              : "bg-gray-100 text-gray-900 hover:bg-gray-200"
                          }
                        `}
                      >
                        {getCTALabel(plan.id, false, trialEligible)}
                      </button>

                      {/* Trial / guarantee badge */}
                      {trialEligible && (
                        <p className="text-center text-xs text-gray-400 mb-4">
                          Sans engagement · Annulation à tout moment
                        </p>
                      )}
                      {!trialEligible && (
                        <p className="text-center text-xs text-gray-400 mb-4">
                          Sans engagement · Annulation à tout moment
                        </p>
                      )}

                      {/* Features list */}
                      <div className="pt-4 border-t border-gray-100 flex-1">
                        <ul className="space-y-2.5">
                          {coreFeatures.map((feature, idx) => (
                            <li key={idx} className="flex items-start gap-2.5">
                              {feature.included ? (
                                <div className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5 bg-green-500/15 text-green-600">
                                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                </div>
                              ) : (
                                <div className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5 bg-gray-100 text-gray-300">
                                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" />
                                  </svg>
                                </div>
                              )}
                              <span className={`text-sm ${feature.included ? "text-gray-700" : "text-gray-400"}`}>
                                {feature.text}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>

            {/* Later CTA */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.7 }}
              className="text-center"
            >
              <button
                onClick={() => setShowReassurance(true)}
                className="py-3 px-6 text-gray-400 hover:text-gray-600 font-medium text-sm transition-colors duration-200"
              >
                Voir tous les plans
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// =============================================================================
// MAIN ONBOARDING PAGE
// =============================================================================
export default function OnboardingPage() {
  const { user, userProfile, loading, refreshUserProfile, needsOnboarding, clearOnboardingFlag } = useAuth();
  const { subscription, loading: subscriptionLoading } = useSubscription();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRecap, setShowRecap] = useState(false);
  const [showUpsell, setShowUpsell] = useState(false);
  const [data, setData] = useState<OnboardingData>({
    profileType: "",
    sector: "",
    role: "",
    objective: "",
    targetAudience: "",
    communicationTone: "",
    publishingFrequency: "",
  });

  const shouldShowOnboarding = needsOnboarding();
  const hasActiveSubscription =
    subscription.status === "active" || subscription.status === "trialing";

  // Edit mode: user already completed onboarding but hasn't paid yet
  const isEditMode = userProfile?.onboardingComplete === true && !hasActiveSubscription;

  // Pre-fill onboarding data when returning to edit (unpaid user)
  useEffect(() => {
    if (isEditMode && userProfile?.profile) {
      const profile = userProfile.profile;
      setData({
        profileType: profile.profileType || "",
        sector: profile.sector || "",
        role: profile.role || "",
        objective: profile.objective || "",
        targetAudience: profile.targetAudience || "",
        communicationTone: profile.communicationTone || "",
        publishingFrequency: profile.publishingFrequency || "",
      });
    }
  }, [isEditMode, userProfile]);

  // Redirect logic — subscription-aware
  useEffect(() => {
    if (loading || subscriptionLoading) return;

    if (!user) {
      router.push("/login");
      return;
    }

    // Recap or upsell screen is active — never redirect away
    if (showRecap || showUpsell) return;

    if (userProfile?.onboardingComplete) {
      if (hasActiveSubscription) {
        // PAID user → cannot access onboarding, go to app
        router.push("/app");
      }
      // UNPAID user → stay on onboarding to edit choices
      return;
    }

    if (!shouldShowOnboarding && userProfile) {
      router.push("/app");
    }
  }, [user, userProfile, loading, subscriptionLoading, router, shouldShowOnboarding, showUpsell, showRecap, hasActiveSubscription]);

  // Enable full scrolling on Onboarding page (mouse wheel, trackpad, touch, keyboard)
  useEffect(() => {
    document.documentElement.classList.add("onboarding-scroll-enabled");
    document.body.classList.add("onboarding-scroll-enabled");
    document.body.classList.remove("pwa-mobile", "no-scroll", "scroll-locked", "modal-open");

    return () => {
      document.documentElement.classList.remove("onboarding-scroll-enabled");
      document.body.classList.remove("onboarding-scroll-enabled");
    };
  }, []);

  const handleSelect = (field: StepId, value: string) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setDirection(1);
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSubmit = async () => {
    if (!user) return;

    setIsSubmitting(true);
    try {
      await completeOnboarding(user.uid, data);

      if (isEditMode) {
        // Returning user editing their profile — go straight to subscription
        await refreshUserProfile();
        router.replace("/subscription");
      } else {
        // First-time onboarding — show recap then upsell
        // CRITICAL: Set showRecap BEFORE refreshUserProfile/clearOnboardingFlag
        // to prevent the redirect useEffect from navigating to /app
        // during intermediate renders where onboardingComplete=true but showRecap=false
        setShowRecap(true);
        await refreshUserProfile();
        clearOnboardingFlag();
      }
    } catch (error) {
      console.error("Onboarding error:", error);
      toast.error("Une erreur est survenue");
      setShowRecap(false);
      setIsSubmitting(false);
    }
  };

  const handleRecapContinue = () => {
    setShowRecap(false);
    setShowUpsell(true);
  };

  const handleUpsellContinue = () => {
    // New users must choose a paid plan — redirect to subscription page
    // Use replace to prevent back-navigation bypass
    router.replace("/subscription");
  };

  const handleUpsellUpgrade = (plan: "pro" | "max") => {
    router.replace(`/subscription?plan=${plan}`);
  };

  const step = STEPS[currentStep];
  const isLastStep = currentStep === STEPS.length - 1;
  const currentValue = data[step.id as keyof OnboardingData];
  const canProceed = currentValue.trim().length > 0;

  // Keyboard navigation: Enter key advances to next step (or submits on last step)
  useEffect(() => {
    if (showRecap || showUpsell) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Enter") return;
      if (!canProceed || isSubmitting) return;

      e.preventDefault();

      if (isLastStep) {
        handleSubmit();
      } else {
        handleNext();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [canProceed, isSubmitting, isLastStep, showUpsell]);

  if (loading || subscriptionLoading || !user) {
    return (
      <div className="min-h-screen bg-[#FFF8F5] flex items-center justify-center">
        <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#FFF8F5] flex flex-col">
      {/* Header */}
      <header className="p-4 sm:p-6 flex items-center justify-between max-w-2xl mx-auto w-full flex-shrink-0">
        <Link href="/" className="inline-flex items-center gap-2.5">
          <Image src="/logo.png" alt="Posty" width={36} height={36} className="w-9 h-9 rounded-xl" />
          <span className="font-bold text-gray-900 text-lg">Posty</span>
        </Link>
        {!showRecap && !showUpsell && (
          <span className="text-sm text-gray-400 font-medium">
            {currentStep + 1} / {STEPS.length}
          </span>
        )}
      </header>

      {/* Progress bar */}
      {!showRecap && !showUpsell && (
        <div className="px-4 sm:px-8 max-w-2xl mx-auto w-full flex-shrink-0">
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
              transition={{ duration: 0.4, ease: smoothEase }}
            />
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-start">
        {showUpsell ? (
          <UpsellScreen onContinue={handleUpsellContinue} onUpgrade={handleUpsellUpgrade} />
        ) : showRecap ? (
          <ProfileRecapScreen
            data={data}
            userName={user.displayName || user.email?.split("@")[0] || "Utilisateur"}
            onContinue={handleRecapContinue}
          />
        ) : (
          <div className="w-full max-w-lg px-4 sm:px-6 py-8 sm:py-12 my-auto">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={currentStep}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.35, ease: smoothEase }}
              >
                {/* Question */}
                <div className="text-center mb-8 sm:mb-10">
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                    {step.title}
                  </h1>
                  <p className="text-gray-400 text-sm sm:text-base">{step.subtitle}</p>
                </div>

                {/* Input or Selection */}
                {step.type === "input" ? (
                  <div className="mb-8">
                    <input
                      type="text"
                      value={currentValue}
                      onChange={(e) => handleSelect(step.id, e.target.value)}
                      placeholder="Ex : CEO, Developpeur, Marketing Manager..."
                      className="w-full px-5 py-4 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#F8935D]/30 focus:border-[#F8935D]/50 transition-all duration-200 text-[15px] shadow-sm"
                      autoFocus
                    />
                  </div>
                ) : (
                  <div className="grid gap-2.5 mb-8">
                    {step.options.map((option, i) => {
                      const isSelected = currentValue === option;
                      return (
                        <motion.button
                          key={option}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.25, delay: i * 0.04, ease: smoothEase }}
                          onClick={() => handleSelect(step.id, option)}
                          className={`
                            p-4 text-left rounded-xl border transition-colors duration-200
                            ${isSelected
                              ? "bg-primary/5 border-primary text-gray-900 shadow-sm"
                              : "bg-white border-gray-200 text-gray-600 hover:border-primary/40"
                            }
                          `}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[15px] font-medium">{option}</span>
                            {isSelected && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                              >
                                <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                </div>
                              </motion.div>
                            )}
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                )}

                {/* Navigation */}
                <div className="flex gap-3">
                  {currentStep > 0 && (
                    <button
                      onClick={handleBack}
                      className="flex-1 py-3.5 px-4 bg-white border border-gray-200 text-gray-600 font-medium rounded-xl hover:bg-gray-50 transition-colors duration-200 text-sm"
                    >
                      Retour
                    </button>
                  )}
                  {isLastStep ? (
                    <button
                      onClick={handleSubmit}
                      disabled={!canProceed || isSubmitting}
                      className={`
                        flex-1 py-3.5 px-4 font-semibold rounded-xl transition-colors duration-200 text-sm
                        ${canProceed && !isSubmitting
                          ? "bg-primary hover:bg-primary-hover text-white shadow-sm"
                          : "bg-gray-100 text-gray-300 cursor-not-allowed"
                        }
                      `}
                    >
                      {isSubmitting ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                          <span>Enregistrement...</span>
                        </div>
                      ) : (
                        "Terminer"
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={handleNext}
                      disabled={!canProceed}
                      className={`
                        flex-1 py-3.5 px-4 font-semibold rounded-xl transition-colors duration-200 text-sm
                        ${canProceed
                          ? "bg-primary hover:bg-primary-hover text-white shadow-sm"
                          : "bg-gray-100 text-gray-300 cursor-not-allowed"
                        }
                      `}
                    >
                      Suivant
                    </button>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  );
}
