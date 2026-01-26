"use client";

import { useState } from "react";

interface DashboardOnboardingProps {
  onComplete: () => void;
}

const steps = [
  {
    title: "Bienvenue sur votre Dashboard",
    description: "Votre espace personnel pour suivre votre progression et optimiser votre presence LinkedIn.",
    icon: (
      <svg className="w-12 h-12 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    title: "Vos statistiques en un coup d'oeil",
    description: "Les cartes en haut affichent vos KPIs : posts generes, publies, et votre activite recente.",
    icon: (
      <svg className="w-12 h-12 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
      </svg>
    ),
  },
  {
    title: "Analysez votre progression",
    description: "Les graphiques montrent l'evolution de votre activite et la repartition de vos styles de contenu.",
    icon: (
      <svg className="w-12 h-12 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
  },
  {
    title: "Des conseils personnalises",
    description: "Les Insights analysent vos donnees pour vous donner des recommandations adaptees a votre profil.",
    icon: (
      <svg className="w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
  },
];

export default function DashboardOnboarding({ onComplete }: DashboardOnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const step = steps[currentStep];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop - effet premium avec léger flou */}
      <div className="absolute inset-0 bg-background/95 backdrop-blur-md" />

      {/* Modal - Design premium dark mode */}
      <div className="relative w-full max-w-md mx-4 bg-dashboard-card border border-dashboard-card-border rounded-2xl shadow-elevated overflow-hidden animate-scale-in">
        {/* Progress bar avec glow effect */}
        <div className="h-1.5 bg-dashboard-surface-1">
          <div
            className="h-full bg-gradient-to-r from-primary via-accent to-primary-light transition-all duration-500 shadow-[0_0_10px_rgba(232,147,77,0.5)]"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>

        {/* Content */}
        <div className="p-8 text-center">
          {/* Icon container avec effet de profondeur */}
          <div className="mb-6 flex justify-center">
            <div className="w-24 h-24 bg-dashboard-surface-1 rounded-2xl flex items-center justify-center border border-dashboard-card-border shadow-inner">
              {step.icon}
            </div>
          </div>

          {/* Step indicator */}
          <p className="text-xs text-text-muted mb-2 font-medium">
            Etape {currentStep + 1} sur {steps.length}
          </p>

          {/* Title */}
          <h2 className="text-xl font-bold text-text-primary mb-3">{step.title}</h2>

          {/* Description */}
          <p className="text-text-secondary text-sm leading-relaxed mb-8">
            {step.description}
          </p>

          {/* Dots - Plus grands et mieux espacés */}
          <div className="flex justify-center gap-2.5 mb-8">
            {steps.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={`h-2.5 rounded-full transition-all duration-300 ${
                  index === currentStep
                    ? "w-8 bg-gradient-to-r from-primary to-accent shadow-[0_0_8px_rgba(232,147,77,0.4)]"
                    : index < currentStep
                    ? "w-2.5 bg-primary/60"
                    : "w-2.5 bg-dashboard-surface-2 hover:bg-dashboard-surface-3"
                }`}
                aria-label={`Aller à l'étape ${index + 1}`}
              />
            ))}
          </div>

          {/* Actions - Meilleure hiérarchie visuelle */}
          <div className="flex gap-3">
            <button
              onClick={handleSkip}
              className="flex-1 py-3 text-text-muted hover:text-text-secondary transition-colors duration-200 text-sm font-medium"
            >
              Passer
            </button>
            <button
              onClick={handleNext}
              className="flex-1 py-3 bg-gradient-to-r from-primary to-primary-hover hover:from-primary-hover hover:to-primary text-slate-50 font-medium rounded-xl shadow-glow hover:shadow-glow-lg transition-all duration-300"
            >
              {currentStep === steps.length - 1 ? "Commencer" : "Suivant"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
