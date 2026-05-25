"use client";

/**
 * WhatsNewModal — once-per-release announcement of the latest features.
 *
 * Shown automatically the first time an authenticated user lands on the app
 * after the release, then suppressed via localStorage until the next
 * `RELEASE_KEY` bump. Bumping the constant ships a new round for everyone.
 *
 * Visual: centered modal, sober list of 4-5 features with branded icons,
 * single primary CTA ("C'est noté"). No upsell content here — that lives
 * on /subscription. The modal is informational and dismissable in one tap.
 */

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, ImageIcon, Compass, Wand2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import StrategistMark from "@/components/strategist/StrategistMark";

/** Bump this string when shipping a new release-notes round so users see
 *  the modal again. Format: ISO date of the release. */
const RELEASE_KEY = "posty-whatsnew-2026-05-25";

interface Feature {
  Icon: React.ComponentType<{ className?: string }>;
  iconClass: string;
  iconBg: string;
  title: string;
  description: string;
}

const FEATURES: Feature[] = [
  {
    Icon: StrategistMark,
    iconClass: "text-amber-600 dark:text-amber-400",
    iconBg: "bg-amber-50 dark:bg-amber-400/15",
    title: "Stratège — agent marketing autonome",
    description:
      "Pour les comptes entreprise sur invitation : un agent IA qui analyse ton profil, planifie ta semaine, rédige les posts et programme la publication LinkedIn. Tu valides d'un clic.",
  },
  {
    Icon: ImageIcon,
    iconClass: "text-[#F8935D]",
    iconBg: "bg-[#FFF1E8] dark:bg-[#F8935D]/15",
    title: "Visuels — choisis 1, 2 ou 3 variantes",
    description:
      "Sous chaque post, un sélecteur 1/2/3 te laisse décider combien de variantes générer. Même coût quel que soit ton choix — trade-off vitesse vs. variété.",
  },
  {
    Icon: Compass,
    iconClass: "text-blue-600 dark:text-blue-400",
    iconBg: "bg-blue-50 dark:bg-blue-400/15",
    title: "Détection d'intention intelligente",
    description:
      "Écris « fais un post avec des images » : Posty génère le post ET les visuels en parallèle, sans étape supplémentaire. Le routage post/visuel/mixte est désormais détecté automatiquement.",
  },
  {
    Icon: Wand2,
    iconClass: "text-emerald-600 dark:text-emerald-400",
    iconBg: "bg-emerald-50 dark:bg-emerald-400/15",
    title: "Quotas visuels clarifiés",
    description:
      "Pro : 3 visuels/jour. Max : visuels quasi illimités. Quand tu atteins la limite, le bouton de régénération disparaît et un message t'invite à revenir demain.",
  },
];

export default function WhatsNewModal() {
  const { user, loading } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (loading || !user) return;
    // SSR guard — localStorage isn't available during prerender. We're in
    // a "use client" component but Next still renders this on the server
    // for hydration purposes.
    if (typeof window === "undefined") return;
    try {
      const seen = window.localStorage.getItem(RELEASE_KEY);
      if (!seen) {
        // Small delay so the modal doesn't fight with auth loading state
        // and feels like an intentional reveal, not a render race.
        const t = setTimeout(() => setIsOpen(true), 800);
        return () => clearTimeout(t);
      }
    } catch {
      /* localStorage disabled — skip the modal silently */
    }
  }, [user, loading]);

  const close = () => {
    setIsOpen(false);
    try {
      window.localStorage.setItem(RELEASE_KEY, new Date().toISOString());
    } catch {
      /* ignore — modal won't reappear in-session anyway */
    }
  };

  // Portal escape: render directly into document.body so the modal's
  // `position: fixed` is relative to the viewport, NOT to whichever ancestor
  // has a `transform` / `filter` / `perspective` (drawer, motion components,
  // layout wrappers — any of those creates a containing block that traps
  // fixed positioning).
  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Centering wrapper — fixed + flex center is more robust than
              translate-50% because it doesn't break when the ancestor adds
              an unexpected transform later. */}
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 pointer-events-none">
            {/* Backdrop — pointer-events back on so clicks dismiss. */}
            <motion.div
              key="whatsnew-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={close}
              className="absolute inset-0 bg-gray-900/40 dark:bg-black/60 backdrop-blur-sm pointer-events-auto"
            />

            {/* Modal */}
            <motion.div
              key="whatsnew-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="whatsnew-title"
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.97 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="
                relative pointer-events-auto
                w-[min(560px,100%)] max-h-[calc(100vh-2rem)]
                bg-white dark:bg-dark-card
                border border-gray-200 dark:border-dark-border
                rounded-2xl
                shadow-[0_30px_80px_-20px_rgba(15,23,42,0.35)]
                dark:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)]
                overflow-hidden
                flex flex-col
              "
            >
            {/* Header */}
            <header className="relative flex items-start gap-3 px-6 pt-6 pb-4 border-b border-gray-100 dark:border-dark-border/40">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-400/15 text-amber-600 dark:text-amber-400 flex-shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0 pr-8">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-text-muted mb-1">
                  Nouveautés
                </p>
                <h2
                  id="whatsnew-title"
                  className="text-[18px] font-semibold text-gray-900 dark:text-white leading-tight"
                >
                  Ce qui change cette semaine
                </h2>
                <p className="text-[13px] text-text-secondary mt-1 leading-snug">
                  Quatre nouveautés majeures viennent de débarquer sur Posty.
                </p>
              </div>
              <button
                type="button"
                onClick={close}
                aria-label="Fermer"
                className="
                  absolute top-4 right-4
                  flex items-center justify-center w-8 h-8 rounded-lg
                  text-text-muted hover:text-gray-900 dark:hover:text-white
                  hover:bg-gray-100 dark:hover:bg-dark-hover
                  transition-colors
                "
              >
                <X className="w-4 h-4" />
              </button>
            </header>

            {/* Features list — scrollable on small screens */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3.5">
              {FEATURES.map((f, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25, delay: 0.08 + i * 0.06 }}
                  className="flex items-start gap-3"
                >
                  <div
                    className={`flex items-center justify-center w-9 h-9 rounded-lg flex-shrink-0 ${f.iconBg} ${f.iconClass}`}
                  >
                    <f.Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[13.5px] font-semibold text-gray-900 dark:text-white leading-snug">
                      {f.title}
                    </h3>
                    <p className="text-[12.5px] text-text-secondary leading-relaxed mt-0.5">
                      {f.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* CTA footer */}
            <footer className="px-6 py-4 border-t border-gray-100 dark:border-dark-border/40 flex items-center justify-end">
              <button
                type="button"
                onClick={close}
                className="
                  inline-flex items-center justify-center
                  px-4 py-2 rounded-lg
                  bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100
                  text-white dark:text-gray-900
                  text-[13px] font-semibold
                  transition-colors shadow-sm
                "
              >
                C'est noté
              </button>
            </footer>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
