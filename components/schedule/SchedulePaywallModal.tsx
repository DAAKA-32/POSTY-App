"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Modal from "@/components/ui/Modal";
import BottomSheet from "@/components/ui/BottomSheet";
import Button from "@/components/ui/Button";

interface SchedulePaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SchedulePaywallModal({
  isOpen,
  onClose,
}: SchedulePaywallModalProps) {
  const router = useRouter();
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < 768;
  });

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleUpgrade = () => {
    onClose();
    router.push("/pricing");
  };

  const content = (
    <div className="py-2">
      {/* Lock icon */}
      <div className="flex justify-center mb-5">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 via-accent/15 to-primary/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
        </div>
      </div>

      <h3 className="text-lg font-semibold text-gray-900 dark:text-white text-center mb-2">
        Fonctionnalite Pro
      </h3>

      <p className="text-sm text-gray-600 dark:text-text-secondary text-center mb-6 max-w-sm mx-auto leading-relaxed">
        La programmation de posts est reservee aux plans <span className="font-semibold text-primary">Pro</span> et <span className="font-semibold text-primary">Max</span>.
        Passez a un plan superieur pour programmer vos publications automatiquement.
      </p>

      {/* Benefits */}
      <div className="bg-gray-50 dark:bg-dark-elevated rounded-xl p-4 mb-6 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 dark:bg-primary/20 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">Programmation automatique</p>
            <p className="text-xs text-gray-500 dark:text-text-muted">Publiez aux heures optimales</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent/10 dark:bg-accent/20 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">Meilleur engagement</p>
            <p className="text-xs text-gray-500 dark:text-text-muted">Preparez vos posts a l'avance</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">Multi-plateformes</p>
            <p className="text-xs text-gray-500 dark:text-text-muted">LinkedIn, Facebook, Threads, Reddit</p>
          </div>
        </div>
      </div>

      {/* CTA Buttons */}
      <div className="flex gap-3">
        <Button variant="ghost" onClick={onClose} className="flex-1">
          Plus tard
        </Button>
        <motion.div className="flex-1" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button
            onClick={handleUpgrade}
            className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Decouvrir les plans
          </Button>
        </motion.div>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <BottomSheet
        isOpen={isOpen}
        onClose={onClose}
        title="Programmation Premium"
      >
        {content}
      </BottomSheet>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Programmation Premium"
      size="sm"
      description="La programmation est reservee aux plans Pro et Max"
    >
      {content}
    </Modal>
  );
}
