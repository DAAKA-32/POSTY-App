"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { completeOnboarding } from "@/lib/firestore";
import { SECTORS, LINKEDIN_STYLES, OBJECTIVES, OnboardingData } from "@/types";
import Button from "@/components/ui/Button";
import toast from "react-hot-toast";

const STEPS = [
  {
    id: "sector",
    title: "Quel est votre secteur d'activite ?",
    subtitle: "Cela nous aide a personnaliser vos posts",
  },
  {
    id: "role",
    title: "Quel est votre role / metier ?",
    subtitle: "Par exemple : CEO, Developpeur, Marketing Manager...",
  },
  {
    id: "style",
    title: "Quel style de post LinkedIn preferez-vous ?",
    subtitle: "Choisissez le ton qui vous correspond le mieux",
  },
  {
    id: "objective",
    title: "Quel est votre objectif principal sur LinkedIn ?",
    subtitle: "Nous adapterons nos suggestions en consequence",
  },
];

export default function OnboardingPage() {
  const { user, userProfile, loading, refreshUserProfile } = useAuth();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [data, setData] = useState<OnboardingData>({
    sector: "",
    role: "",
    linkedinStyle: "",
    objective: "",
  });

  // Redirect if not logged in or already completed onboarding
  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/login");
      } else if (userProfile?.onboardingComplete) {
        router.push("/app");
      }
    }
  }, [user, userProfile, loading, router]);

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
      toast.success("Profil complete !");
      router.push("/app");
    } catch (error) {
      console.error("Onboarding error:", error);
      toast.error("Une erreur est survenue");
    } finally {
      setIsSubmitting(false);
    }
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

  return (
    <div className="min-h-screen bg-dark-bg flex flex-col">
      {/* Header */}
      <header className="p-4 lg:p-6 flex items-center justify-between max-w-4xl mx-auto w-full">
        <Link href="/" className="inline-flex items-center gap-2">
          <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gradient-to-br from-primary to-accent rounded-lg overflow-hidden flex items-center justify-center">
            <img
              src="/logo.png"
              alt="POSTY Logo"
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const sibling = e.currentTarget.nextElementSibling as HTMLElement | null; if (sibling) sibling.style.display = 'flex';
              }}
            />
            <span className="text-white font-bold lg:text-lg hidden">P</span>
          </div>
          <span className="font-semibold text-white text-lg lg:text-xl">POSTY</span>
        </Link>
        <span className="text-sm lg:text-base text-gray-500">
          Etape {currentStep + 1} sur {STEPS.length}
        </span>
      </header>

      {/* Progress bar */}
      <div className="px-4 lg:px-8 max-w-2xl mx-auto w-full">
        <div className="h-1 lg:h-1.5 bg-dark-card rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-300"
            style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center px-4 lg:px-8 py-12 lg:py-16">
        <div className="w-full max-w-lg lg:max-w-xl">
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
                placeholder="Entrez votre role..."
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
