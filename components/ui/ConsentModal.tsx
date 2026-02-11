"use client";

import { useState } from "react";
import Link from "next/link";
import Button from "./Button";
import Toggle from "./Toggle";

interface ConsentModalProps {
  isOpen: boolean;
  onAccept: (consent: {
    privacyPolicy: boolean;
    termsOfService: boolean;
    analytics: boolean;
    marketing: boolean;
  }) => void;
}

export default function ConsentModal({ isOpen, onAccept }: ConsentModalProps) {
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [analyticsAccepted, setAnalyticsAccepted] = useState(false);
  const [marketingAccepted, setMarketingAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = privacyAccepted && termsAccepted;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setIsSubmitting(true);
    try {
      await onAccept({
        privacyPolicy: privacyAccepted,
        termsOfService: termsAccepted,
        analytics: analyticsAccepted,
        marketing: marketingAccepted,
      });
      // Parent component handles closing/navigation after consent
    } catch (error) {
      console.error("Error submitting consent:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-dark-card border border-dark-border rounded-2xl shadow-2xl animate-scale-in overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-dark-border">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Protection de vos données</h2>
              <p className="text-sm text-gray-400">Conformément au RGPD</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          <p className="text-gray-300 text-sm mb-6">
            Avant de continuer, veuillez prendre connaissance de nos conditions et indiquer vos préférences.
            Les cases marquées d&apos;un asterisque (*) sont obligatoires.
          </p>

          {/* Required consents */}
          <div className="space-y-4 mb-6">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
              Consentements obligatoires *
            </h3>

            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="relative mt-0.5">
                <input
                  type="checkbox"
                  checked={privacyAccepted}
                  onChange={(e) => setPrivacyAccepted(e.target.checked)}
                  className="sr-only"
                />
                <div
                  className={`
                    w-5 h-5 rounded border-2 flex items-center justify-center transition-colors
                    ${privacyAccepted
                      ? "bg-primary border-primary"
                      : "border-gray-500 group-hover:border-gray-400"
                    }
                  `}
                >
                  {privacyAccepted && (
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>
              <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
                J&apos;ai lu et j&apos;accepte la{" "}
                <Link href="/legal/privacy" target="_blank" className="text-primary hover:underline">
                  Politique de confidentialité
                </Link>
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="relative mt-0.5">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="sr-only"
                />
                <div
                  className={`
                    w-5 h-5 rounded border-2 flex items-center justify-center transition-colors
                    ${termsAccepted
                      ? "bg-primary border-primary"
                      : "border-gray-500 group-hover:border-gray-400"
                    }
                  `}
                >
                  {termsAccepted && (
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>
              <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
                J&apos;accepte les{" "}
                <Link href="/legal/terms" target="_blank" className="text-primary hover:underline">
                  Conditions Générales d&apos;Utilisation
                </Link>
              </span>
            </label>
          </div>

          {/* Optional consents */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
              Consentements optionnels
            </h3>

            <div className="flex items-center justify-between p-3 bg-dark-bg rounded-xl">
              <div className="flex-1 pr-4">
                <span className="text-sm text-gray-300">
                  Autoriser les analytics
                </span>
                <p className="text-xs text-gray-500 mt-0.5">
                  Nous aide a ameliorer l&apos;application en analysant son utilisation
                </p>
              </div>
              <Toggle
                checked={analyticsAccepted}
                onChange={setAnalyticsAccepted}
                size="md"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-dark-bg rounded-xl">
              <div className="flex-1 pr-4">
                <span className="text-sm text-gray-300">
                  Recevoir des communications marketing
                </span>
                <p className="text-xs text-gray-500 mt-0.5">
                  Nouveautes, conseils et offres spéciales par email
                </p>
              </div>
              <Toggle
                checked={marketingAccepted}
                onChange={setMarketingAccepted}
                size="md"
              />
            </div>
          </div>

          {/* Info box */}
          <div className="mt-6 p-4 bg-primary/10 border border-primary/20 rounded-lg">
            <p className="text-xs text-gray-300">
              <strong className="text-white">Vos droits :</strong> Vous pouvez à tout moment
              modifier vos préférences ou supprimer vos données dans les{" "}
              <span className="text-primary">Paramètres de confidentialité</span> de l&apos;application.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-dark-border bg-dark-bg/50">
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            isLoading={isSubmitting}
            fullWidth
          >
            {canSubmit ? "Continuer" : "Veuillez accepter les conditions obligatoires"}
          </Button>
          <p className="text-xs text-gray-500 text-center mt-3">
            En continuant, vous confirmez avoir au moins 18 ans.
          </p>
        </div>
      </div>
    </div>
  );
}
