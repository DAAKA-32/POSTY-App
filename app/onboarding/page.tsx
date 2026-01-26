"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { completeOnboarding } from "@/lib/firestore";
import { SECTORS, LINKEDIN_STYLES, OBJECTIVES, OnboardingData } from "@/types";
import Button from "@/components/ui/Button";
import toast from "@/components/ui/Toast";

// Thank You Screen Component with ultra-modern animations
function ThankYouScreen({ onComplete }: { onComplete: () => void }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 3500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-dark-bg"
    >
      {/* Animated background gradient */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1, ease: [0.25, 0.1, 0.25, 1] }}
        className="absolute inset-0 overflow-hidden"
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px]">
          <motion.div
            animate={{
              rotate: 360,
              scale: [1, 1.1, 1],
            }}
            transition={{
              rotate: { duration: 20, repeat: Infinity, ease: "linear" },
              scale: { duration: 4, repeat: Infinity, ease: "easeInOut" },
            }}
            className="absolute inset-0 rounded-full blur-3xl"
            style={{
              background: "conic-gradient(from 0deg, rgba(232, 147, 77, 0.2), rgba(248, 163, 93, 0.1), rgba(232, 147, 77, 0.2))",
            }}
          />
        </div>
      </motion.div>

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            initial={{
              opacity: 0,
              left: `${(i * 5) % 100}%`,
              bottom: "-20px",
            }}
            animate={{
              opacity: [0, 1, 0],
              bottom: "110%",
              left: `${((i * 7) + 10) % 100}%`,
            }}
            transition={{
              duration: 3 + (i % 3),
              delay: (i % 5) * 0.4,
              repeat: Infinity,
              ease: "easeOut",
            }}
            className={`absolute w-2 h-2 rounded-full ${
              i % 3 === 0 ? "bg-primary" : i % 3 === 1 ? "bg-accent" : "bg-white/50"
            }`}
          />
        ))}
      </div>

      {/* Main content */}
      <div className="relative z-10 text-center px-6">
        {/* Logo animation */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{
            type: "spring",
            stiffness: 200,
            damping: 15,
            delay: 0.2,
          }}
          className="mb-8"
        >
          <div className="relative inline-block">
            <motion.div
              animate={{
                boxShadow: [
                  "0 0 30px rgba(232, 147, 77, 0.3)",
                  "0 0 60px rgba(232, 147, 77, 0.5)",
                  "0 0 30px rgba(232, 147, 77, 0.3)",
                ],
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-20 h-20 lg:w-24 lg:h-24 rounded-2xl overflow-hidden"
            >
              <img
                src="/logo.jpg"
                alt="Posty Logo"
                className="w-full h-full object-contain"
              />
            </motion.div>
            {/* Sparkle effects */}
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.8 }}
              className="absolute -top-2 -right-2"
            >
              <motion.svg
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className="w-6 h-6 text-primary"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
              </motion.svg>
            </motion.div>
          </div>
        </motion.div>

        {/* Text animations */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <motion.h1
            className="text-3xl lg:text-5xl font-bold mb-4"
            initial={{ opacity: 0, filter: "blur(10px)" }}
            animate={{ opacity: 1, filter: "blur(0px)" }}
            transition={{ delay: 0.6, duration: 0.8 }}
          >
            <span className="bg-gradient-to-r from-white via-primary to-accent bg-clip-text text-transparent">
              L'équipe Posty
            </span>
          </motion.h1>

          <motion.p
            className="text-xl lg:text-2xl text-white font-medium mb-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.6 }}
          >
            vous remercie
          </motion.p>

          <motion.p
            className="text-gray-400 text-base lg:text-lg max-w-md mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.6 }}
          >
            Votre aventure LinkedIn commence maintenant
          </motion.p>
        </motion.div>

        {/* Loading indicator */}
        <motion.div
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ delay: 1.5, duration: 2 }}
          className="mt-12 mx-auto w-48 h-1 bg-dark-card rounded-full overflow-hidden"
        >
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="w-1/2 h-full bg-gradient-to-r from-transparent via-primary to-transparent"
          />
        </motion.div>
      </div>
    </motion.div>
  );
}

const STEPS = [
  {
    id: "sector",
    title: "Quel est votre secteur d'activité ?",
    subtitle: "Cela nous aide a personnaliser vos posts",
  },
  {
    id: "role",
    title: "Quel est votre rôle / métier ?",
    subtitle: "Par exemple : CEO, Développeur, Marketing Manager...",
  },
  {
    id: "style",
    title: "Quel style de post LinkedIn préférez-vous ?",
    subtitle: "Choisissez le ton qui vous correspond le mieux",
  },
  {
    id: "objective",
    title: "Quel est votre objectif principal sur LinkedIn ?",
    subtitle: "Nous adapterons nos suggestions en conséquence",
  },
];

export default function OnboardingPage() {
  const { user, userProfile, loading, refreshUserProfile, needsOnboarding, clearOnboardingFlag } = useAuth();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);
  const [data, setData] = useState<OnboardingData>({
    sector: "",
    role: "",
    linkedinStyle: "",
    objective: "",
  });

  // Check if onboarding is needed (robust check with localStorage backup)
  const shouldShowOnboarding = needsOnboarding();

  // Redirect logic:
  // - Not logged in -> /login
  // - Onboarding already complete -> /app
  // - Not a new user (came from login, not signup) -> /app
  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/login");
      } else if (userProfile?.onboardingComplete) {
        // Already completed onboarding, go to app
        router.push("/app");
      } else if (!shouldShowOnboarding && userProfile) {
        // Existing user who logged in (not signup) - skip onboarding
        // This prevents the "flash" when logging in
        router.push("/app");
      }
    }
  }, [user, userProfile, loading, router, shouldShowOnboarding]);

  // Prevent pull-to-refresh on touch devices while allowing normal scroll
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

  const handleSelect = (field: keyof OnboardingData, value: string) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSubmit = async () => {
    if (!user) return;

    setIsSubmitting(true);
    try {
      await completeOnboarding(user.uid, data);
      await refreshUserProfile();
      // Clear all onboarding flags (memory + localStorage) after completing
      clearOnboardingFlag();
      // Show thank you screen instead of toast
      setShowThankYou(true);
    } catch (error) {
      console.error("Onboarding error:", error);
      toast.error("Une erreur est survenue");
      setIsSubmitting(false);
    }
  };

  const handleThankYouComplete = () => {
    router.push("/app");
  };

  const currentStepData = STEPS[currentStep];
  const isLastStep = currentStep === STEPS.length - 1;

  const getCurrentOptions = () => {
    switch (currentStep) {
      case 0:
        return SECTORS;
      case 2:
        return LINKEDIN_STYLES;
      case 3:
        return OBJECTIVES;
      default:
        return [];
    }
  };

  const getCurrentValue = () => {
    switch (currentStep) {
      case 0:
        return data.sector;
      case 1:
        return data.role;
      case 2:
        return data.linkedinStyle;
      case 3:
        return data.objective;
      default:
        return "";
    }
  };

  const getCurrentField = (): keyof OnboardingData => {
    switch (currentStep) {
      case 0:
        return "sector";
      case 1:
        return "role";
      case 2:
        return "linkedinStyle";
      case 3:
        return "objective";
      default:
        return "sector";
    }
  };

  const canProceed = () => {
    return getCurrentValue().trim().length > 0;
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Show thank you screen after onboarding completion
  if (showThankYou) {
    return (
      <AnimatePresence mode="wait">
        <ThankYouScreen onComplete={handleThankYouComplete} />
      </AnimatePresence>
    );
  }

  return (
    <div className="min-h-screen max-h-screen bg-dark-bg flex flex-col overflow-y-auto overflow-x-hidden overscroll-contain no-pull-refresh">
      {/* Header */}
      <header className="p-4 lg:p-6 flex items-center justify-between max-w-4xl mx-auto w-full flex-shrink-0">
        <Link href="/" className="inline-flex items-center gap-2">
          <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-xl overflow-hidden flex items-center justify-center">
            <img
              src="/logo.jpg"
              alt="Posty Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <span className="font-semibold text-gray-900 dark:text-white text-lg lg:text-xl">POSTY</span>
        </Link>
        <span className="text-sm lg:text-base text-gray-500">
          Étape {currentStep + 1} sur {STEPS.length}
        </span>
      </header>

      {/* Progress bar */}
      <div className="px-4 lg:px-8 max-w-2xl mx-auto w-full flex-shrink-0">
        <div className="h-1 lg:h-1.5 bg-dark-card rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-300"
            style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-start px-4 lg:px-8 py-8 lg:py-12 min-h-0">
        <div className="w-full max-w-lg lg:max-w-xl my-auto">
          <div className="text-center mb-8 lg:mb-12">
            <h1 className="text-2xl lg:text-3xl xl:text-4xl font-bold text-white mb-2 lg:mb-4">
              {currentStepData.title}
            </h1>
            <p className="text-gray-400">{currentStepData.subtitle}</p>
          </div>

          {/* Step 1: Role (text input) */}
          {currentStep === 1 ? (
            <div className="mb-8">
              <input
                type="text"
                value={data.role}
                onChange={(e) => handleSelect("role", e.target.value)}
                placeholder="Entrez votre rôle..."
                className="w-full px-4 py-3 bg-dark-card border border-dark-border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          ) : (
            /* Other steps: Options selection */
            <div className="grid gap-3 mb-8">
              {getCurrentOptions().map((option) => (
                <button
                  key={option}
                  onClick={() => handleSelect(getCurrentField(), option)}
                  className={`
                    p-4 text-left rounded-xl border transition-all duration-200
                    ${
                      getCurrentValue() === option
                        ? "bg-primary/10 border-primary text-white"
                        : "bg-dark-card border-dark-border text-gray-300 hover:bg-dark-hover hover:border-gray-600"
                    }
                  `}
                >
                  <div className="flex items-center justify-between">
                    <span>{option}</span>
                    {getCurrentValue() === option && (
                      <svg
                        className="w-5 h-5 text-primary"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex gap-3">
            {currentStep > 0 && (
              <Button variant="secondary" onClick={handleBack} className="flex-1">
                Retour
              </Button>
            )}
            {isLastStep ? (
              <Button
                onClick={handleSubmit}
                disabled={!canProceed()}
                isLoading={isSubmitting}
                className="flex-1"
              >
                Terminer
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                disabled={!canProceed()}
                className="flex-1"
              >
                Suivant
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
