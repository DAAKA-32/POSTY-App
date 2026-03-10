"use client";

import { useState, useEffect, useRef } from "react";
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
import toast from "@/components/ui/Toast";
import { usePageTitle } from "@/hooks/usePageTitle";

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
// ONBOARDING PROGRESS PERSISTENCE
// =============================================================================
const ONBOARDING_PROGRESS_KEY = "posty_onboarding_progress";

interface OnboardingProgress {
  currentStep: number;
  data: OnboardingData;
}

function saveOnboardingProgress(step: number, data: OnboardingData): void {
  try {
    localStorage.setItem(ONBOARDING_PROGRESS_KEY, JSON.stringify({ currentStep: step, data }));
  } catch { /* localStorage full or unavailable — ignore */ }
}

function loadOnboardingProgress(): OnboardingProgress | null {
  try {
    const raw = localStorage.getItem(ONBOARDING_PROGRESS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OnboardingProgress;
    if (typeof parsed.currentStep !== "number" || !parsed.data) return null;
    // Clamp step to valid range
    parsed.currentStep = Math.max(0, Math.min(parsed.currentStep, STEPS.length - 1));
    return parsed;
  } catch {
    return null;
  }
}

function clearOnboardingProgress(): void {
  try {
    localStorage.removeItem(ONBOARDING_PROGRESS_KEY);
  } catch { /* ignore */ }
}

// =============================================================================
// ANIMATION VARIANTS
// =============================================================================
const smoothEase = [0.22, 1, 0.36, 1] as const;

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 60 : -60,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 60 : -60,
    opacity: 0,
  }),
};

// =============================================================================
// PROFILE RECAP SCREEN — styled like the landing page mockup
// =============================================================================
function ProfileRecapScreen({
  data,
  userName,
  onRedirect,
}: {
  data: OnboardingData;
  userName: string;
  onRedirect: () => void;
}) {
  // Auto-redirect to subscription page after animations complete
  useEffect(() => {
    const timeout = setTimeout(() => {
      onRedirect();
    }, 2800);
    return () => clearTimeout(timeout);
  }, [onRedirect]);
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
              transition={{ delay: 0.2 + i * 0.04, duration: 0.3, ease: smoothEase }}
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
              transition={{ delay: 0.5, duration: 0.6, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full"
            />
          </div>
        </div>
      </motion.div>

      {/* Redirect indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.3 }}
        className="mt-6 flex items-center justify-center gap-2 text-sm text-gray-400"
      >
        <div className="w-4 h-4 border-2 border-gray-300 border-t-[#F8935D] rounded-full animate-spin" />
        Redirection...
      </motion.div>
    </div>
  );
}

// =============================================================================
// MAIN ONBOARDING PAGE
// =============================================================================
export default function OnboardingPage() {
  const { user, userProfile, loading, refreshUserProfile, clearOnboardingFlag } = useAuth();
  const { subscription, loading: subscriptionLoading } = useSubscription();
  usePageTitle("onboarding");
  const router = useRouter();
  // Restore saved progress from localStorage (if any)
  const savedProgress = useRef(loadOnboardingProgress());

  const [currentStep, setCurrentStep] = useState(savedProgress.current?.currentStep ?? 0);
  const [direction, setDirection] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRecap, setShowRecap] = useState(false);

  // Read ?edit=true from URL on client only (avoids useSearchParams + Suspense hydration issues)
  // Lazy initializer runs synchronously on first render, before any useEffect
  const isExplicitEdit = useRef(
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("edit") === "true"
      : false
  );

  const [data, setData] = useState<OnboardingData>(
    savedProgress.current?.data ?? {
      profileType: "",
      sector: "",
      role: "",
      objective: "",
      targetAudience: "",
      communicationTone: "",
      publishingFrequency: "",
    }
  );

  const hasActiveSubscription =
    subscription.status === "active" || subscription.status === "trialing";

  // Edit mode: user already completed onboarding but hasn't paid yet
  // Also true when explicitly navigated with ?edit=true from subscription page
  const isEditMode = (userProfile?.onboardingComplete === true && !hasActiveSubscription) || isExplicitEdit.current;

  // Persist progress to localStorage on every step/data change
  useEffect(() => {
    if (!showRecap && !isEditMode) {
      saveOnboardingProgress(currentStep, data);
    }
  }, [currentStep, data, showRecap, isEditMode]);

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

    // Explicit edit mode from subscription page — NEVER redirect away
    if (isExplicitEdit.current) return;

    // Recap screen is active — never redirect away
    if (showRecap) return;

    if (userProfile?.onboardingComplete) {
      if (hasActiveSubscription) {
        // PAID user → cannot access onboarding, go to app
        router.push("/app");
      }
      // UNPAID user → stay on onboarding to edit choices
      return;
    }

    // Onboarding NOT complete → always stay on this page.
    // Never redirect to /app here — that would create a redirect loop
    // with ProtectedRoute which sends incomplete users back to /onboarding.
  }, [user, userProfile, loading, subscriptionLoading, router, showRecap, hasActiveSubscription]);

  // Enable scrolling on Onboarding page
  // Strategy: The page uses a fixed scroll container (position:fixed + overflow-y:auto)
  // so it doesn't depend on body scroll. We still add classes as fallback and remove
  // any conflicting classes from other pages/providers.
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    html.classList.add("onboarding-scroll-enabled");
    body.classList.add("onboarding-scroll-enabled");

    // Remove ALL classes that could block scroll (from other pages, modals, PWA shell)
    const blocking = ["pwa-mobile", "no-scroll", "scroll-locked", "modal-open", "bottomsheet-open", "no-bounce", "page-fixed"];
    blocking.forEach(cls => {
      html.classList.remove(cls);
      body.classList.remove(cls);
    });

    return () => {
      html.classList.remove("onboarding-scroll-enabled");
      body.classList.remove("onboarding-scroll-enabled");
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
      clearOnboardingProgress();

      if (isEditMode) {
        // Returning user editing their profile — go straight to subscription
        await refreshUserProfile();
        router.replace("/subscription");
      } else {
        // First-time onboarding — show recap then auto-redirect to subscription
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

  const handleRedirectToSubscription = () => {
    router.replace("/subscription");
  };

  const step = STEPS[currentStep];
  const isLastStep = currentStep === STEPS.length - 1;
  const currentValue = data[step.id as keyof OnboardingData];
  const canProceed = currentValue.trim().length > 0;

  // Keyboard navigation: Enter key advances to next step (or submits on last step)
  useEffect(() => {
    if (showRecap) return;

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
  }, [canProceed, isSubmitting, isLastStep, showRecap]);

  if (loading || subscriptionLoading || !user) {
    return (
      <div className="min-h-screen bg-[#FFF8F5] flex items-center justify-center">
        <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Render guard: user already completed onboarding with active subscription.
  // Show loader instead of onboarding form while the useEffect redirect to /app fires.
  // This prevents any visual flash of the onboarding UI for existing users.
  if (
    userProfile?.onboardingComplete &&
    hasActiveSubscription &&
    !isExplicitEdit.current &&
    !showRecap
  ) {
    return (
      <div className="min-h-screen bg-[#FFF8F5] flex items-center justify-center">
        <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 overflow-y-auto overflow-x-hidden bg-[#FFF8F5]">
    <div className="min-h-full flex flex-col">
      {/* Header */}
      <header className="p-4 sm:p-6 flex items-center justify-between max-w-2xl mx-auto w-full flex-shrink-0">
        <Link href="/" className="inline-flex items-center gap-2.5">
          <Image src="/logo.png" alt="Posty" width={36} height={36} className="w-9 h-9 rounded-xl" />
          <span className="font-bold text-gray-900 text-lg">Posty</span>
        </Link>
        {!showRecap && (
          <span className="text-sm text-gray-400 font-medium">
            {currentStep + 1} / {STEPS.length}
          </span>
        )}
      </header>

      {/* Progress bar */}
      {!showRecap && (
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
        {showRecap ? (
          <ProfileRecapScreen
            data={data}
            userName={user.displayName || user.email?.split("@")[0] || "Utilisateur"}
            onRedirect={handleRedirectToSubscription}
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
    </div>
  );
}


