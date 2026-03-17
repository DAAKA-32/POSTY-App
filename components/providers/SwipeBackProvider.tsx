"use client";

import { createContext, useContext, useEffect, useState, useRef, ReactNode, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { saveScrollPosition, restoreScrollPosition } from "@/hooks/scroll/useScrollRestoration";
import { triggerHaptic } from "@/hooks/ui/useHapticFeedback";

/**
 * SwipeBackProvider - Navigation gestuelle "glisser pour revenir en arrière"
 *
 * COMPORTEMENT :
 * - Swipe gauche -> droite depuis le bord gauche = retour à la page précédente
 * - Animation fluide et feedback visuel iOS-like
 * - Préservation de la position de scroll lors du retour
 * - Compatible mobile et tablette uniquement (touch devices)
 * - Ne se déclenche pas si un scroll horizontal est en cours
 *
 * USAGE :
 * Envelopper les pages sans sidebar (Settings, Profile, Subscription, Dashboard)
 */

interface SwipeBackContextType {
  isSwipingBack: boolean;
  swipeProgress: number;
  isEnabled: boolean;
  disable: () => void;
  enable: () => void;
}

const SwipeBackContext = createContext<SwipeBackContextType>({
  isSwipingBack: false,
  swipeProgress: 0,
  isEnabled: true,
  disable: () => {},
  enable: () => {},
});

export function useSwipeBack() {
  return useContext(SwipeBackContext);
}

interface SwipeBackProviderProps {
  children: ReactNode;
  /** Désactiver le swipe back (ex: pendant une animation ou modal ouverte) */
  disabled?: boolean;
}

// Configuration du geste
const SWIPE_EDGE_ZONE = 30; // Zone de départ du swipe (bord gauche)
const MIN_SWIPE_DISTANCE = 100; // Distance minimum pour déclencher le retour
const MAX_SWIPE_TIME = 500; // Temps maximum pour le swipe (ms)
const SWIPE_THRESHOLD_VELOCITY = 0.5; // Vélocité minimum (px/ms)

export default function SwipeBackProvider({ children, disabled = false }: SwipeBackProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [swipeProgress, setSwipeProgress] = useState(0);
  const [isSwipingBack, setIsSwipingBack] = useState(false);
  const [isEnabled, setIsEnabled] = useState(!disabled);

  // Refs pour éviter les stale closures
  const isEnabledRef = useRef(isEnabled);
  const routerRef = useRef(router);
  const pathnameRef = useRef(pathname);

  // Synchroniser les refs
  useEffect(() => {
    isEnabledRef.current = isEnabled;
  }, [isEnabled]);

  useEffect(() => {
    routerRef.current = router;
  }, [router]);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    setIsEnabled(!disabled);
  }, [disabled]);

  const disable = useCallback(() => setIsEnabled(false), []);
  const enable = useCallback(() => setIsEnabled(true), []);

  // Ajouter une classe sur le body pour signaler que swipe-back est actif
  // Cela permet à MobileGestureProvider de ne pas bloquer les edge swipes
  useEffect(() => {
    if (typeof window === "undefined") return;

    document.body.classList.add("swipe-back-enabled");

    return () => {
      document.body.classList.remove("swipe-back-enabled");
    };
  }, []);

  // Désactiver la gestion automatique du scroll par le navigateur
  // Nous gérons manuellement la restauration pour une expérience fluide
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Demander au navigateur de ne pas gérer automatiquement le scroll
    if ("scrollRestoration" in history) {
      const originalScrollRestoration = history.scrollRestoration;
      history.scrollRestoration = "manual";

      return () => {
        history.scrollRestoration = originalScrollRestoration;
      };
    }
  }, []);

  // Écouter les événements popstate pour restaurer le scroll lors de la navigation back
  useEffect(() => {
    if (typeof window === "undefined") return;

    let isBackNavigation = false;

    const handlePopState = () => {
      // Marquer que c'est une navigation back
      isBackNavigation = true;

      // Restaurer la position de scroll après un court délai
      // pour laisser le DOM se stabiliser
      requestAnimationFrame(() => {
        setTimeout(() => {
          if (isBackNavigation) {
            restoreScrollPosition(pathnameRef.current);
            isBackNavigation = false;
          }
        }, 100);
      });
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  // Sauvegarder la position de scroll pendant le scroll et avant de quitter la page
  useEffect(() => {
    if (typeof window === "undefined") return;

    let scrollTimeout: NodeJS.Timeout | null = null;

    // Sauvegarder périodiquement pendant le scroll
    const handleScroll = () => {
      if (scrollTimeout) clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        saveScrollPosition(pathnameRef.current);
      }, 150); // Debounce pour éviter trop de sauvegardes
    };

    // Sauvegarder avant de quitter la page
    const handleBeforeUnload = () => {
      saveScrollPosition(pathnameRef.current);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (scrollTimeout) clearTimeout(scrollTimeout);
      // Sauvegarder une dernière fois avant le démontage
      saveScrollPosition(pathnameRef.current);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Détecter si c'est un appareil tactile
    const isTouchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    if (!isTouchDevice) return;

    let startX = 0;
    let startY = 0;
    let startTime = 0;
    let isTracking = false;
    let isHorizontalSwipe = false;

    const handleTouchStart = (e: TouchEvent) => {
      if (!isEnabledRef.current) return;

      const touch = e.touches[0];

      // Vérifier si le touch commence dans la zone de bord gauche
      if (touch.clientX <= SWIPE_EDGE_ZONE) {
        // Vérifier qu'on ne touche pas un élément interactif
        const target = e.target as HTMLElement;
        const isInteractive = target.closest("button, a, input, textarea, select, [role='button'], [data-swipe-ignore]");

        if (!isInteractive) {
          startX = touch.clientX;
          startY = touch.clientY;
          startTime = Date.now();
          isTracking = true;
          isHorizontalSwipe = false;
        }
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isTracking || !isEnabledRef.current) return;

      const touch = e.touches[0];
      const deltaX = touch.clientX - startX;
      const deltaY = touch.clientY - startY;

      // Déterminer si c'est un swipe horizontal (une seule fois)
      if (!isHorizontalSwipe && (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10)) {
        isHorizontalSwipe = Math.abs(deltaX) > Math.abs(deltaY) * 1.5;

        if (!isHorizontalSwipe) {
          // C'est un scroll vertical, arrêter le tracking
          isTracking = false;
          setSwipeProgress(0);
          setIsSwipingBack(false);
          return;
        }
      }

      // Swipe vers la droite uniquement
      if (isHorizontalSwipe && deltaX > 0) {
        e.preventDefault();
        e.stopPropagation();

        const progress = Math.min(deltaX / MIN_SWIPE_DISTANCE, 1);
        setSwipeProgress(progress);
        setIsSwipingBack(true);
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!isTracking || !isEnabledRef.current) {
        resetSwipeState();
        return;
      }

      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - startX;
      const elapsedTime = Date.now() - startTime;
      const velocity = deltaX / elapsedTime;

      // Vérifier si le swipe est valide
      const isValidSwipe =
        isHorizontalSwipe &&
        deltaX > 0 &&
        (deltaX >= MIN_SWIPE_DISTANCE || (velocity >= SWIPE_THRESHOLD_VELOCITY && deltaX > 50)) &&
        elapsedTime < MAX_SWIPE_TIME;

      if (isValidSwipe) {
        // Animation de sortie puis navigation
        setSwipeProgress(1);

        // Haptic feedback pour confirmer le swipe
        triggerHaptic("light");

        // Sauvegarder la position de scroll de la page actuelle avant la navigation
        saveScrollPosition(pathnameRef.current);

        // Petit délai pour l'animation fluide
        setTimeout(() => {
          // Navigation back - Next.js gère la restauration du scroll via popstate
          routerRef.current.back();
          resetSwipeState();
        }, 150);
      } else {
        // Animation de retour - swipe annulé
        resetSwipeState();
      }
    };

    const handleTouchCancel = () => {
      resetSwipeState();
    };

    const resetSwipeState = () => {
      isTracking = false;
      isHorizontalSwipe = false;
      setSwipeProgress(0);
      setIsSwipingBack(false);
    };

    // Ajouter les event listeners
    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("touchend", handleTouchEnd, { passive: true });
    document.addEventListener("touchcancel", handleTouchCancel, { passive: true });

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
      document.removeEventListener("touchcancel", handleTouchCancel);
    };
  }, []);

  return (
    <SwipeBackContext.Provider
      value={{
        isSwipingBack,
        swipeProgress,
        isEnabled,
        disable,
        enable,
      }}
    >
      {/* Overlay de feedback visuel */}
      <SwipeBackIndicator />

      {/* Contenu de la page avec effet de translation */}
      <motion.div
        className="min-h-screen"
        animate={{
          x: isSwipingBack ? swipeProgress * 80 : 0,
          scale: isSwipingBack ? 1 - swipeProgress * 0.03 : 1,
        }}
        transition={{
          type: "spring",
          stiffness: 400,
          damping: 40,
          mass: 0.5,
        }}
        style={{
          transformOrigin: "center left",
        }}
      >
        {children}
      </motion.div>
    </SwipeBackContext.Provider>
  );
}

/**
 * SwipeBackIndicator - Indicateur visuel pendant le swipe
 * Style iOS-like avec effet de peek et flèche de retour
 */
function SwipeBackIndicator() {
  const { isSwipingBack, swipeProgress } = useSwipeBack();

  return (
    <AnimatePresence>
      {isSwipingBack && (
        <>
          {/* Bande latérale gauche (preview de la page précédente) */}
          <motion.div
            initial={{ opacity: 0, x: -60 }}
            animate={{
              opacity: swipeProgress * 0.6,
              x: swipeProgress * 60 - 60,
            }}
            exit={{ opacity: 0, x: -60 }}
            transition={{ duration: 0.1 }}
            className="fixed inset-y-0 left-0 w-16 z-[9998] pointer-events-none"
            style={{
              background: "linear-gradient(to right, rgba(139, 92, 246, 0.15), transparent)",
            }}
          />

          {/* Indicateur flèche */}
          <motion.div
            initial={{ opacity: 0, x: -20, scale: 0.8 }}
            animate={{
              opacity: Math.min(swipeProgress * 1.5, 1),
              x: swipeProgress * 30,
              scale: 0.9 + swipeProgress * 0.1,
            }}
            exit={{ opacity: 0, x: -20, scale: 0.8 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed top-1/2 -translate-y-1/2 left-2 z-[9999] pointer-events-none"
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg"
              style={{
                background: `linear-gradient(135deg,
                  rgba(139, 92, 246, ${0.2 + swipeProgress * 0.6}),
                  rgba(168, 85, 247, ${0.15 + swipeProgress * 0.5})
                )`,
                backdropFilter: "blur(8px)",
                border: `1px solid rgba(139, 92, 246, ${0.3 + swipeProgress * 0.4})`,
                boxShadow: `0 4px 20px rgba(139, 92, 246, ${swipeProgress * 0.3})`,
              }}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                style={{
                  color: `rgba(139, 92, 246, ${0.7 + swipeProgress * 0.3})`,
                }}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </div>
          </motion.div>

          {/* Ombre portée sur le contenu */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: swipeProgress * 0.15 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9997] pointer-events-none bg-black"
          />
        </>
      )}
    </AnimatePresence>
  );
}

/**
 * Hook pour désactiver temporairement le swipe back
 * Utile pour les modales, bottom sheets, etc.
 */
export function useDisableSwipeBack(shouldDisable: boolean) {
  const { disable, enable } = useSwipeBack();

  useEffect(() => {
    if (shouldDisable) {
      disable();
    } else {
      enable();
    }

    return () => {
      enable();
    };
  }, [shouldDisable, disable, enable]);
}
