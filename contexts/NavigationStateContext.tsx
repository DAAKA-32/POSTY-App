"use client";

import { createContext, useContext, useState, useCallback, ReactNode, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * NavigationStateContext - Gestion de l'état de navigation
 *
 * Permet de préserver l'état des pages lors de la navigation back
 * pour une expérience fluide sans rechargement visible
 *
 * FONCTIONNEMENT:
 * - Sauvegarde l'état des pages avant la navigation
 * - Restaure l'état lors du retour via back navigation
 * - Gère automatiquement le nettoyage des anciennes entrées
 */

// Types
interface PageState {
  data: Record<string, unknown>;
  timestamp: number;
}

interface NavigationStateContextType {
  // Sauvegarder l'état d'une page
  savePageState: (pathname: string, key: string, value: unknown) => void;

  // Récupérer l'état d'une page
  getPageState: <T>(pathname: string, key: string) => T | undefined;

  // Vérifier si un état existe
  hasPageState: (pathname: string, key: string) => boolean;

  // Effacer l'état d'une page
  clearPageState: (pathname: string, key?: string) => void;

  // Marquer une navigation comme "back"
  setIsBackNavigation: (value: boolean) => void;

  // Vérifier si c'est une navigation back
  isBackNavigation: boolean;

  // Historique de navigation
  navigationHistory: string[];
}

const NavigationStateContext = createContext<NavigationStateContextType>({
  savePageState: () => {},
  getPageState: () => undefined,
  hasPageState: () => false,
  clearPageState: () => {},
  setIsBackNavigation: () => {},
  isBackNavigation: false,
  navigationHistory: [],
});

// Durée de vie du cache (30 minutes)
const CACHE_TTL = 30 * 60 * 1000;

// Taille maximale de l'historique
const MAX_HISTORY_SIZE = 50;

export function NavigationStateProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [pageStates, setPageStates] = useState<Record<string, PageState>>({});
  const [isBackNavigation, setIsBackNavigation] = useState(false);
  const [navigationHistory, setNavigationHistory] = useState<string[]>([]);

  const previousPathnameRef = useRef<string | null>(null);

  // Détecter les changements de route
  useEffect(() => {
    if (previousPathnameRef.current !== null && previousPathnameRef.current !== pathname) {
      // Ajouter à l'historique (sauf si c'est une navigation back)
      if (!isBackNavigation) {
        setNavigationHistory((prev) => {
          const newHistory = [...prev, pathname];
          // Limiter la taille de l'historique
          if (newHistory.length > MAX_HISTORY_SIZE) {
            return newHistory.slice(-MAX_HISTORY_SIZE);
          }
          return newHistory;
        });
      } else {
        // Navigation back - retirer la dernière entrée
        setNavigationHistory((prev) => prev.slice(0, -1));
      }

      // Reset le flag de back navigation après le changement de route
      setIsBackNavigation(false);
    }

    previousPathnameRef.current = pathname;
  }, [pathname, isBackNavigation]);

  // Nettoyer les états expirés périodiquement
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setPageStates((prev) => {
        const cleaned: Record<string, PageState> = {};
        for (const [key, state] of Object.entries(prev)) {
          if (now - state.timestamp < CACHE_TTL) {
            cleaned[key] = state;
          }
        }
        return cleaned;
      });
    }, 60000); // Nettoyer toutes les minutes

    return () => clearInterval(interval);
  }, []);

  // Sauvegarder l'état d'une page
  const savePageState = useCallback((pagePath: string, key: string, value: unknown) => {
    setPageStates((prev) => {
      const existingState = prev[pagePath] || { data: {}, timestamp: Date.now() };
      return {
        ...prev,
        [pagePath]: {
          data: {
            ...existingState.data,
            [key]: value,
          },
          timestamp: Date.now(),
        },
      };
    });
  }, []);

  // Récupérer l'état d'une page
  const getPageState = useCallback(<T,>(pagePath: string, key: string): T | undefined => {
    const state = pageStates[pagePath];
    if (!state) return undefined;

    // Vérifier si le cache est encore valide
    if (Date.now() - state.timestamp > CACHE_TTL) {
      return undefined;
    }

    return state.data[key] as T | undefined;
  }, [pageStates]);

  // Vérifier si un état existe
  const hasPageState = useCallback((pagePath: string, key: string): boolean => {
    const state = pageStates[pagePath];
    if (!state) return false;

    // Vérifier si le cache est encore valide
    if (Date.now() - state.timestamp > CACHE_TTL) {
      return false;
    }

    return key in state.data;
  }, [pageStates]);

  // Effacer l'état d'une page
  const clearPageState = useCallback((pagePath: string, key?: string) => {
    setPageStates((prev) => {
      if (key) {
        // Effacer une clé spécifique
        const state = prev[pagePath];
        if (!state) return prev;

        const newData = { ...state.data };
        delete newData[key];

        return {
          ...prev,
          [pagePath]: {
            ...state,
            data: newData,
          },
        };
      } else {
        // Effacer tout l'état de la page
        const newStates = { ...prev };
        delete newStates[pagePath];
        return newStates;
      }
    });
  }, []);

  return (
    <NavigationStateContext.Provider
      value={{
        savePageState,
        getPageState,
        hasPageState,
        clearPageState,
        setIsBackNavigation,
        isBackNavigation,
        navigationHistory,
      }}
    >
      {children}
    </NavigationStateContext.Provider>
  );
}

/**
 * Hook pour utiliser le contexte de navigation
 */
export function useNavigationState() {
  return useContext(NavigationStateContext);
}

/**
 * Hook pour sauvegarder/restaurer automatiquement un état spécifique
 * Utilisation simplifiée pour les composants
 */
export function usePersistedState<T>(
  key: string,
  defaultValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const pathname = usePathname();
  const { savePageState, getPageState, isBackNavigation } = useNavigationState();

  // Récupérer la valeur initiale du cache si navigation back
  const cachedValue = isBackNavigation ? getPageState<T>(pathname, key) : undefined;
  const [value, setValue] = useState<T>(cachedValue ?? defaultValue);

  // Synchroniser avec le cache
  useEffect(() => {
    savePageState(pathname, key, value);
  }, [pathname, key, value, savePageState]);

  // Setter personnalisé qui met à jour la valeur et le cache
  const setPersistedValue = useCallback((newValue: T | ((prev: T) => T)) => {
    setValue((prev) => {
      const resolved = typeof newValue === "function" ? (newValue as (prev: T) => T)(prev) : newValue;
      return resolved;
    });
  }, []);

  return [value, setPersistedValue];
}

export default NavigationStateContext;
