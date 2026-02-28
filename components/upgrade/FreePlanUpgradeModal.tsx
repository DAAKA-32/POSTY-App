"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

export type FreePlanUpgradeTrigger =
  | "platform"
  | "scheduling"
  | "mode"
  | "quota"
  | "files"
  | "analysis"
  | "improve";

interface FreePlanUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  trigger?: FreePlanUpgradeTrigger;
}

const TRIGGER_CONTENT: Record<
  FreePlanUpgradeTrigger,
  { title: string; description: string; icon: "lock" | "zap" | "calendar" | "image" | "chart" }
> = {
  platform: {
    title: "Débloquez la connexion multi-plateformes",
    description:
      "Le plan Gratuit permet uniquement la publication sur LinkedIn. Passez au plan Pro ou Max pour connecter plusieurs réseaux et automatiser votre stratégie.",
    icon: "lock",
  },
  scheduling: {
    title: "La programmation nécessite un plan supérieur",
    description:
      "La planification automatique des posts est disponible uniquement avec les plans Pro et Max. Automatisez votre visibilité et gagnez du temps.",
    icon: "calendar",
  },
  mode: {
    title: "Débloquez les modes avancés",
    description:
      "Les modes Storytelling, Business et Double réponse sont disponibles avec le plan Pro ou Max. Créez du contenu varié et engageant.",
    icon: "zap",
  },
  quota: {
    title: "Limite mensuelle atteinte",
    description:
      "Vous avez atteint la limite du plan gratuit (3 posts/mois). Passez au plan Pro pour publier sans limite et débloquer les modes avancés.",
    icon: "zap",
  },
  files: {
    title: "Les fichiers joints nécessitent un plan supérieur",
    description:
      "Les images, vidéos et PDF sont disponibles avec le plan Pro ou Max. Enrichissez vos publications.",
    icon: "image",
  },
  analysis: {
    title: "L'analyse de post nécessite un plan supérieur",
    description:
      "L'analyse détaillée de vos posts (hook, structure, CTA) est disponible avec le plan Pro ou Max.",
    icon: "chart",
  },
  improve: {
    title: "L'amélioration de post nécessite un plan supérieur",
    description:
      "Réécrivez et améliorez vos posts existants avec le plan Pro ou Max.",
    icon: "zap",
  },
};

const icons = {
  lock: (
    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  ),
  zap: (
    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  calendar: (
    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  image: (
    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  chart: (
    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
};

export default function FreePlanUpgradeModal({
  isOpen,
  onClose,
  trigger = "quota",
}: FreePlanUpgradeModalProps) {
  const content = TRIGGER_CONTENT[trigger];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-md mx-auto"
          >
            <div className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden shadow-2xl">
              {/* Header */}
              <div className="bg-gradient-to-r from-primary/20 to-accent/20 p-6 text-center relative">
                {/* Close button */}
                <button
                  onClick={onClose}
                  className="absolute top-3 right-3 w-9 h-9 flex items-center justify-center rounded-full text-text-muted hover:text-white bg-dark-card/40 hover:bg-dark-hover/80 backdrop-blur-sm transition-all duration-200"
                  aria-label="Fermer"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 6L18 18M6 18L18 6" />
                  </svg>
                </button>

                {/* Icon */}
                <div className="w-14 h-14 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center mx-auto mb-4">
                  {icons[content.icon]}
                </div>

                <h2 className="text-xl font-semibold text-white mb-2">
                  {content.title}
                </h2>
                <p className="text-sm text-text-secondary leading-relaxed">
                  {content.description}
                </p>
              </div>

              {/* Actions */}
              <div className="p-6 space-y-3">
                {/* Primary CTA */}
                <Link
                  href="/subscription"
                  className="block w-full py-3 bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white font-medium rounded-xl text-center transition-opacity"
                >
                  Passer au Pro
                </Link>

                {/* Secondary CTA */}
                <Link
                  href="/subscription"
                  className="block w-full py-3 bg-dark-elevated hover:bg-dark-hover text-text-secondary hover:text-white font-medium rounded-xl text-center transition-colors border border-dark-border"
                >
                  Voir les plans
                </Link>

                {/* Dismiss */}
                <button
                  onClick={onClose}
                  className="block w-full py-2 text-xs text-text-muted hover:text-text-secondary text-center transition-colors"
                >
                  Plus tard
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
