"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import MainLayout from "@/components/layout/MainLayout";
import Button from "@/components/ui/Button";
import confetti from "canvas-confetti";

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const { refreshUserProfile, userProfile } = useAuth();
  const sessionId = searchParams.get("session_id");

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Trigger confetti animation
    const triggerConfetti = () => {
      const duration = 3000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

      const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

      const interval = setInterval(() => {
        const timeLeft = animationEnd - Date.now();
        if (timeLeft <= 0) {
          clearInterval(interval);
          return;
        }

        const particleCount = 50 * (timeLeft / duration);
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
          colors: ["#6366F1", "#8B5CF6", "#10B981", "#F59E0B"],
        });
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
          colors: ["#6366F1", "#8B5CF6", "#10B981", "#F59E0B"],
        });
      }, 250);
    };

    // Refresh user profile to get updated subscription
    const refreshAndCelebrate = async () => {
      try {
        await refreshUserProfile();
        triggerConfetti();
      } catch (error) {
        console.error("Error refreshing profile:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (sessionId) {
      // Small delay to allow webhook to process
      const timeout = setTimeout(refreshAndCelebrate, 1500);
      return () => clearTimeout(timeout);
    } else {
      setIsLoading(false);
    }
  }, [sessionId, refreshUserProfile]);

  const planName = userProfile?.subscription?.plan === "max" ? "Max+" :
                   userProfile?.subscription?.plan === "pro" ? "Pro" : "Free";

  return (
    <div className="max-w-xl mx-auto px-4 py-12 lg:py-20">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] as const }}
        className="text-center"
      >
        {/* Success Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 15 }}
          className="w-24 h-24 mx-auto mb-8 rounded-full bg-accent/20 flex items-center justify-center"
        >
          <motion.svg
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="w-12 h-12 text-accent"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <motion.path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M5 13l4 4L19 7"
            />
          </motion.svg>
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-3xl lg:text-4xl font-bold text-white mb-4"
        >
          Bienvenue dans {planName} !
        </motion.h1>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-lg text-text-muted mb-8"
        >
          Votre abonnement a ete active avec succes.
          Vous avez maintenant acces a toutes les fonctionnalites premium.
        </motion.p>

        {/* Benefits */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-dark-card border border-dark-border rounded-2xl p-6 mb-8 text-left"
        >
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" clipRule="evenodd" />
            </svg>
            Vos nouveaux avantages
          </h3>
          <ul className="space-y-3">
            <li className="flex items-center gap-3 text-sm text-text-secondary">
              <svg className="w-4 h-4 text-accent flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Messages IA illimites
            </li>
            <li className="flex items-center gap-3 text-sm text-text-secondary">
              <svg className="w-4 h-4 text-accent flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Historique illimite
            </li>
            <li className="flex items-center gap-3 text-sm text-text-secondary">
              <svg className="w-4 h-4 text-accent flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Templates premium
            </li>
            <li className="flex items-center gap-3 text-sm text-text-secondary">
              <svg className="w-4 h-4 text-accent flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Support prioritaire
            </li>
          </ul>
        </motion.div>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <Link href="/chat">
            <Button className="w-full sm:w-auto">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Commencer a creer
            </Button>
          </Link>
          <Link href="/profile">
            <Button variant="secondary" className="w-full sm:w-auto">
              Voir mon profil
            </Button>
          </Link>
        </motion.div>

        {/* Receipt info */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-8 text-sm text-text-muted"
        >
          Un email de confirmation a ete envoye a votre adresse.
          Vous pouvez gerer votre abonnement depuis votre profil.
        </motion.p>
      </motion.div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="max-w-xl mx-auto px-4 py-12 lg:py-20 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <MainLayout showMobileHeader={true} headerTitle="Confirmation">
      <div className="h-full overflow-y-auto">
        <Suspense fallback={<LoadingFallback />}>
          <CheckoutSuccessContent />
        </Suspense>
      </div>
    </MainLayout>
  );
}
