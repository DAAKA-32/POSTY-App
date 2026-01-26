"use client";

import { useEffect, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Hook pour sauvegarder et restaurer la position de scroll
 * Permet une navigation fluide sans perte de position
 *
 * FONCTIONNEMENT:
 * - Sauvegarde automatiquement la position de scroll lors des changements de route
 * - Restaure la position lors du retour via navigation back (swipe ou bouton)
 * - Utilise sessionStorage pour persister entre les navigations
 */

const SCROLL_STORAGE_KEY = "posty_scroll_positions";
const SCROLL_RESTORE_DELAY = 50; // Délai pour laisser le DOM se stabiliser

// Type pour le cache de positions
interface ScrollPositions {
  [pathname: string]: {
    x: number;
    y: number;
    timestamp: number;
  };
}

/**
 * Récupère les positions de scroll sauvegardées
 */
function getScrollPositions(): ScrollPositions {
  if (typeof window === "undefined") return {};

  try {
    const stored = sessionStorage.getItem(SCROLL_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

/**
 * Sauvegarde les positions de scroll
 */
function saveScrollPositions(positions: ScrollPositions): void {
  if (typeof window === "undefined") return;

  try {
    // Nettoyer les entrées anciennes (> 30 min)
    const now = Date.now();
    const cleanedPositions: ScrollPositions = {};

    for (const [key, value] of Object.entries(positions)) {
      if (now - value.timestamp < 30 * 60 * 1000) {
        cleanedPositions[key] = value;
      }
    }

    sessionStorage.setItem(SCROLL_STORAGE_KEY, JSON.stringify(cleanedPositions));
  } catch {
    // Ignorer les erreurs de stockage
  }
}

/**
 * Sauvegarde la position de scroll actuelle pour une route
 */
export function saveScrollPosition(pathname: string): void {
  if (typeof window === "undefined") return;

  const positions = getScrollPositions();
  positions[pathname] = {
    x: window.scrollX,
    y: window.scrollY,
    timestamp: Date.now(),
  };
  saveScrollPositions(positions);
}

/**
 * Restaure la position de scroll pour une route
 */
export function restoreScrollPosition(pathname: string): boolean {
  if (typeof window === "undefined") return false;

  const positions = getScrollPositions();
  const position = positions[pathname];

  if (position) {
    // Attendre que le DOM soit stable avant de restaurer
    setTimeout(() => {
      window.scrollTo({
        top: position.y,
        left: position.x,
        behavior: "instant",
      });
    }, SCROLL_RESTORE_DELAY);

    return true;
  }

  return false;
}

/**
 * Efface la position de scroll pour une route
 */
export function clearScrollPosition(pathname: string): void {
  if (typeof window === "undefined") return;

  const positions = getScrollPositions();
  delete positions[pathname];
  saveScrollPositions(positions);
}

/**
 * Hook principal pour la restauration automatique du scroll
 */
export function useScrollRestoration() {
  const pathname = usePathname();
  const previousPathRef = useRef<string | null>(null);
  const isBackNavigationRef = useRef(false);

  // Détecter la navigation back via popstate
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handlePopState = () => {
      isBackNavigationRef.current = true;
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  // Sauvegarder la position quand on quitte une page
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Si le pathname a changé
    if (previousPathRef.current && previousPathRef.current !== pathname) {
      // Si c'était une navigation back, restaurer la position de la nouvelle page
      if (isBackNavigationRef.current) {
        restoreScrollPosition(pathname);
        isBackNavigationRef.current = false;
      }
    }

    // Mettre à jour le pathname précédent
    previousPathRef.current = pathname;
  }, [pathname]);

  // Sauvegarder la position de scroll avant de quitter
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleBeforeUnload = () => {
      saveScrollPosition(pathname);
    };

    // Sauvegarder périodiquement pendant le scroll
    let scrollTimeout: NodeJS.Timeout | null = null;

    const handleScroll = () => {
      if (scrollTimeout) clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        saveScrollPosition(pathname);
      }, 100);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("scroll", handleScroll);
      if (scrollTimeout) clearTimeout(scrollTimeout);

      // Sauvegarder une dernière fois avant le démontage
      saveScrollPosition(pathname);
    };
  }, [pathname]);

  // Fonction pour forcer la restauration
  const forceRestore = useCallback(() => {
    restoreScrollPosition(pathname);
  }, [pathname]);

  // Fonction pour sauvegarder manuellement
  const forceSave = useCallback(() => {
    saveScrollPosition(pathname);
  }, [pathname]);

  return {
    forceRestore,
    forceSave,
  };
}

/**
 * Hook pour préparer la navigation back (à utiliser dans SwipeBackProvider)
 * Sauvegarde la position AVANT la navigation
 */
export function useNavigationPrep() {
  const pathname = usePathname();

  const prepareForNavigation = useCallback(() => {
    saveScrollPosition(pathname);
  }, [pathname]);

  const restoreAfterNavigation = useCallback((targetPathname: string) => {
    // Petit délai pour laisser le DOM se stabiliser
    requestAnimationFrame(() => {
      setTimeout(() => {
        restoreScrollPosition(targetPathname);
      }, SCROLL_RESTORE_DELAY);
    });
  }, []);

  return {
    prepareForNavigation,
    restoreAfterNavigation,
  };
}

export default useScrollRestoration;
