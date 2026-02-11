"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
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
// UPSELL SCREEN
// =============================================================================
function UpsellScreen({ onContinue, onUpgrade }: { onContinue: () => void; onUpgrade: (plan: "pro" | "max") => void }) {
  const [showReassurance, setShowReassurance] = useState(false);

  // Auto-redirect after reassurance message
  useEffect(() => {
    if (!showReassurance) return;
    const timeout = setTimeout(() => {
      onContinue();
    }, 2500);
    return () => clearTimeout(timeout);
  }, [showReassurance, onContinue]);

  const proFeatures = [
    { text: "Personnalisation IA (secteur, rôle, style)", included: true },
    { text: "Posts illimités", included: true },
    { text: "Historique complet", included: true },
    { text: "Ciblage audience avancé", included: false },
    { text: "Ton de communication personnalisé", included: false },
  ];

  const maxFeatures = [
    { text: "Tout le plan Pro inclus", included: true },
    { text: "Ciblage audience avancé", included: true },
    { text: "Ton de communication personnalisé", included: true },
    { text: "Double génération (Storytelling + Business)", included: true },
    { text: "Support prioritaire", included: true },
  ];

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
            {/* Green checkmark */}
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
              Vos données sont sauvegardées
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.4, ease: smoothEase }}
              className="text-gray-500 text-base"
            >
              Vous pourrez activer la personnalisation IA a tout moment dans vos parametres.
            </motion.p>

            {/* Loading indicator */}
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
            {/* Success check */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
              className="mx-auto w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center mb-6"
            >
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </motion.div>

            {/* Title */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2, ease: smoothEase }}
              className="text-center mb-8"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 text-xs font-semibold rounded-full mb-4 border border-emerald-200">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Félicitations
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">
                Tout est prêt.{" "}
                <span className="text-primary">
                  Activez la personnalisation IA.
                </span>
              </h1>
              <p className="text-gray-500 text-sm sm:text-base max-w-lg mx-auto">
                Posty va utiliser vos réponses pour générer des posts calibrés sur votre audience et votre marché.
              </p>
            </motion.div>

            {/* Plan cards side by side */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.35, ease: smoothEase }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6"
            >
              {/* Pro card */}
              <div className="relative bg-white rounded-2xl border-2 border-primary/30 p-5 shadow-sm hover:shadow-md hover:border-primary/50 transition-all duration-200">
                {/* Popular badge */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary text-white text-xs font-semibold rounded-full shadow-sm">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    Populaire
                  </span>
                </div>

                <div className="text-center mt-2 mb-4">
                  <h3 className="text-lg font-bold text-gray-900">Pro</h3>
                  <div className="flex items-baseline justify-center gap-1 mt-1">
                    <span className="text-3xl font-bold text-gray-900">12,90</span>
                    <span className="text-gray-900 font-medium">€</span>
                    <span className="text-gray-400 text-sm">/mois</span>
                  </div>
                </div>

                {/* Features */}
                <ul className="space-y-2.5 mb-5">
                  {proFeatures.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2">
                      {feature.included ? (
                        <svg className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 text-gray-300 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" />
                        </svg>
                      )}
                      <span className={`text-sm ${feature.included ? "text-gray-700" : "text-gray-400"}`}>
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => onUpgrade("pro")}
                  className="w-full py-3 px-4 bg-primary hover:bg-primary-hover text-white font-semibold rounded-xl shadow-sm hover:shadow-md transition-all duration-200 text-sm"
                >
                  Activer le Pro
                </button>
              </div>

              {/* Max card */}
              <div className="relative bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-200">
                <div className="text-center mb-4">
                  <h3 className="text-lg font-bold text-amber-600">Max</h3>
                  <div className="flex items-baseline justify-center gap-1 mt-1">
                    <span className="text-3xl font-bold text-gray-900">19,90</span>
                    <span className="text-gray-900 font-medium">€</span>
                    <span className="text-gray-400 text-sm">/mois</span>
                  </div>
                </div>

                {/* Features */}
                <ul className="space-y-2.5 mb-5">
                  {maxFeatures.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <svg className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm text-gray-700">{feature.text}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => onUpgrade("max")}
                  className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl shadow-sm hover:shadow-md transition-all duration-200 text-sm"
                >
                  Activer le Max
                </button>
              </div>
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
                Peut-être plus tard
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
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  // Redirect logic
  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/login");
      } else if (userProfile?.onboardingComplete && !showUpsell) {
        router.push("/app");
      } else if (!shouldShowOnboarding && userProfile) {
        router.push("/app");
      }
    }
  }, [user, userProfile, loading, router, shouldShowOnboarding, showUpsell]);

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

  // Prevent pull-to-refresh
  const preventPullToRefresh = useCallback((e: TouchEvent) => {
    const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
    if (scrollTop <= 0 && e.touches.length === 1) {
      const touch = e.touches[0];
      const startY = (e.target as HTMLElement & { touchStartY?: number })?.touchStartY || 0;
      if (touch.clientY > startY) {
        e.preventDefault();
      }
    }
  }, []);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (e.touches.length === 1 && e.target) {
      (e.target as HTMLElement & { touchStartY?: number }).touchStartY = e.touches[0].clientY;
    }
  }, []);

  useEffect(() => {
    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchmove", preventPullToRefresh, { passive: false });
    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", preventPullToRefresh);
    };
  }, [handleTouchStart, preventPullToRefresh]);

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
      await refreshUserProfile();
      clearOnboardingFlag();
      setShowUpsell(true);
    } catch (error) {
      console.error("Onboarding error:", error);
      toast.error("Une erreur est survenue");
      setIsSubmitting(false);
    }
  };

  const handleUpsellContinue = () => {
    router.push("/app");
  };

  const handleUpsellUpgrade = (plan: "pro" | "max") => {
    router.push(`/subscription?plan=${plan}`);
  };

  const step = STEPS[currentStep];
  const isLastStep = currentStep === STEPS.length - 1;
  const currentValue = data[step.id as keyof OnboardingData];
  const canProceed = currentValue.trim().length > 0;

  // Keyboard navigation: Enter key advances to next step (or submits on last step)
  useEffect(() => {
    if (showUpsell) return;

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

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[#FFF8F5] flex items-center justify-center">
        <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen max-h-screen bg-[#FFF8F5] flex flex-col overflow-y-auto overflow-x-hidden overscroll-contain">
      {/* Header */}
      <header className="p-4 sm:p-6 flex items-center justify-between max-w-2xl mx-auto w-full flex-shrink-0">
        <Link href="/" className="inline-flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl overflow-hidden shadow-sm">
            <Image src="/logo-avec fond.jpg" alt="Posty" width={36} height={36} className="w-full h-full object-cover" />
          </div>
          <span className="font-bold text-gray-900 text-lg">Posty</span>
        </Link>
        {!showUpsell && (
          <span className="text-sm text-gray-400 font-medium">
            {currentStep + 1} / {STEPS.length}
          </span>
        )}
      </header>

      {/* Progress bar */}
      {!showUpsell && (
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
      <main className="flex-1 flex flex-col items-center justify-start min-h-0">
        {showUpsell ? (
          <UpsellScreen onContinue={handleUpsellContinue} onUpgrade={handleUpsellUpgrade} />
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
