"use client";

import { useState } from "react";

interface DashboardOnboardingProps {
  onComplete: () => void;
}

const steps = [
  {
    title: "Bienvenue sur votre Dashboard",
    description: "Votre espace personnel pour suivre votre progression et optimiser votre présence LinkedIn.",
    icon: (
      <svg className="w-12 h-12 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    title: "Vos statistiques en un coup d'œil",
    description: "Les cartes en haut affichent vos KPIs : posts générés, publiés, et votre activité récente.",
    icon: (
      <svg className="w-12 h-12 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
      </svg>
    ),
  },
  {
    title: "Analysez votre progression",
    description: "Les graphiques montrent l'évolution de votre activité et la répartition de vos styles de contenu.",
    icon: (
      <svg className="w-12 h-12 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
  },
  {
    title: "Des conseils personnalisés",
    description: "Les Insights analysent vos données pour vous donner des recommandations adaptées à votre profil.",
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

      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-2xl shadow-lg overflow-hidden animate-scale-in">
        {/* Progress bar */}
        <div className="h-1.5 bg-gray-100 dark:bg-dark-elevated">
          <div
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>

        {/* Content */}
        <div className="p-8 text-center">
          {/* Icon container */}
          <div className="mb-6 flex justify-center">
            <div className="w-24 h-24 bg-gray-50 dark:bg-dark-elevated rounded-2xl flex items-center justify-center border border-gray-200 dark:border-dark-border">
              {step.icon}
            </div>
          </div>

          {/* Step indicator */}
          <p className="text-xs text-gray-500 dark:text-text-muted mb-2 font-medium">
            Etape {currentStep + 1} sur {steps.length}
          </p>

          {/* Title */}
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{step.title}</h2>

          {/* Description */}
          <p className="text-gray-600 dark:text-text-secondary text-sm leading-relaxed mb-8">
            {step.description}
          </p>

          {/* Dots */}
          <div className="flex justify-center gap-2.5 mb-8">
            {steps.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={`h-2.5 rounded-full transition-all duration-200 ${
                  index === currentStep
                    ? "w-8 bg-primary"
                    : index < currentStep
                    ? "w-2.5 bg-primary/40"
                    : "w-2.5 bg-gray-200 dark:bg-dark-elevated hover:bg-gray-300 dark:hover:bg-dark-hover"
                }`}
                aria-label={`Aller à l'étape ${index + 1}`}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleSkip}
              className="flex-1 py-3 text-gray-500 dark:text-text-muted hover:text-gray-700 dark:hover:text-text-secondary transition-colors duration-200 text-sm font-medium"
            >
              Passer
            </button>
            <button
              onClick={handleNext}
              className="flex-1 py-3 bg-primary hover:bg-primary-hover text-white font-medium rounded-xl shadow-sm hover:shadow-md transition-all duration-200"
            >
              {currentStep === steps.length - 1 ? "Commencer" : "Suivant"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
