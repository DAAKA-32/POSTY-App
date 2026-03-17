"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import { useScrollLock } from "@/hooks/ui/useScrollLock";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  trigger?: "quota" | "feature" | "welcome";
}

/**
 * UpgradeModal - Respectful upgrade prompt
 * Value-focused, no pressure, easy to dismiss
 */
export default function UpgradeModal({ isOpen, onClose, trigger = "quota" }: UpgradeModalProps) {
  const { t } = useLanguage();
  useScrollLock(isOpen);

  // Different messaging based on trigger
  const content = {
    quota: {
      title: t.conversion?.quotaUsed || "3 posts cette semaine, c'est déjà bien !",
      subtitle: t.conversion?.resetInfo || "Vos posts se réinitialiseront lundi",
      valueProps: [
        { icon: "unlimited", text: t.conversion?.upgradeValueProp1 || "Publiez autant que vous voulez" },
        { icon: "support", text: t.conversion?.upgradeValueProp2 || "Support prioritaire sous 24h" },
        { icon: "style", text: t.conversion?.upgradeValueProp3 || "Personnalisation avancée du style" },
      ],
      cta: t.conversion?.unlockUnlimited || "Passer en illimité",
      secondary: t.conversion?.takeYourTime || "Comparer les plans",
    },
    feature: {
      title: t.conversion?.upgradeTitle || "Débloquez tout le potentiel de Posty",
      subtitle: t.conversion?.upgradeSubtitle || "Générations illimitées, support prioritaire, fonctionnalités avancées",
      valueProps: [
        { icon: "unlimited", text: t.conversion?.upgradeValueProp1 || "Publiez autant que vous voulez" },
        { icon: "support", text: t.conversion?.upgradeValueProp2 || "Support prioritaire sous 24h" },
        { icon: "style", text: t.conversion?.upgradeValueProp3 || "Personnalisation avancée du style" },
      ],
      cta: t.conversion?.upgradeCta || "Découvrir Pro",
      secondary: t.conversion?.upgradeCtaSecondary || "Comparer les plans",
    },
    welcome: {
      title: t.conversion?.welcomeNew || "Bienvenue sur POSTY",
      subtitle: t.conversion?.welcomeNewDesc || "Votre assistant IA pour LinkedIn",
      valueProps: [
        { icon: "time", text: t.conversion?.saveTimeHook || "Gagnez 2h par semaine" },
        { icon: "visibility", text: t.conversion?.visibilityHook || "Améliorez votre visibilité" },
        { icon: "credibility", text: t.conversion?.credibilityHook || "Renforcez votre crédibilité" },
      ],
      cta: t.conversion?.tryFirstPost || "Créez votre premier post",
      secondary: null,
    },
  };

  const currentContent = content[trigger];

  const icons = {
    unlimited: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    support: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
    style: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
      </svg>
    ),
    time: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    visibility: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    ),
    credibility: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  };

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
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-md mx-auto"
          >
            <div className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden shadow-2xl">
              {/* Header with gradient */}
              <div className="bg-gradient-to-r from-primary/20 to-accent/20 p-6 text-center relative">
                {/* Close button - perfectly centered, easy to find */}
                <button
                  onClick={onClose}
                  className="absolute top-3 right-3 w-9 h-9 flex items-center justify-center rounded-full text-text-muted hover:text-white bg-dark-card/40 hover:bg-dark-hover/80 backdrop-blur-sm transition-all duration-200"
                  aria-label={t.common.close}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 6L18 18M6 18L18 6" />
                  </svg>
                </button>

                {/* Icon */}
                <div className="w-14 h-14 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>

                <h2 className="text-xl font-semibold text-white mb-2">
                  {currentContent.title}
                </h2>
                <p className="text-sm text-text-secondary">
                  {currentContent.subtitle}
                </p>
              </div>

              {/* Value propositions */}
              <div className="p-6 space-y-4">
                {currentContent.valueProps.map((prop, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary flex-shrink-0">
                      {icons[prop.icon as keyof typeof icons]}
                    </div>
                    <span className="text-sm text-white">
                      {prop.text}
                    </span>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="p-6 pt-0 space-y-3">
                {/* Primary CTA */}
                <Link
                  href="/subscription"
                  className="block w-full py-3 bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white font-medium rounded-xl text-center transition-opacity"
                >
                  {currentContent.cta}
                </Link>

                {/* Secondary action or info */}
                {currentContent.secondary && (
                  <Link
                    href="/pricing"
                    className="block w-full py-3 bg-dark-elevated hover:bg-dark-hover text-text-secondary hover:text-white font-medium rounded-xl text-center transition-colors border border-dark-border"
                  >
                    {currentContent.secondary}
                  </Link>
                )}

                {/* No commitment reminder */}
                <p className="text-xs text-text-muted text-center">
                  {t.conversion?.upgradeNoCommitment || "Sans engagement, annulez quand vous voulez"}
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/**
 * QuotaExhaustedOverlay - Soft overlay when quota is reached
 * Non-blocking, informative
 */
export function QuotaExhaustedOverlay({ onClose }: { onClose: () => void }) {
  const { t } = useLanguage();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-dark-card border border-dark-border rounded-xl p-4 shadow-lg"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-warning/10 rounded-lg flex items-center justify-center text-warning flex-shrink-0">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-white">
            {t.conversion?.quotaUsed || "Quota de la semaine atteint"}
          </p>
          <p className="text-xs text-text-muted mt-1">
            {t.conversion?.resetInfo || "Vos posts se réinitialiseront lundi"}
          </p>
          <div className="flex gap-2 mt-3">
            <Link
              href="/subscription"
              className="text-xs font-medium text-primary hover:text-primary-hover transition-colors"
            >
              {t.conversion?.unlockUnlimited || "Passer en illimité"}
            </Link>
            <span className="text-dark-border">|</span>
            <button
              onClick={onClose}
              className="text-xs text-text-muted hover:text-white transition-colors"
            >
              {t.common?.close || "Fermer"}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
