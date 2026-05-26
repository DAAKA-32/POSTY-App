"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from "react";

/**
 * SidebarContext - Contexte unifié pour la gestion de la sidebar
 *
 * Ce contexte centralise l'état de la sidebar pour éviter toute duplication
 * et désynchronisation entre les versions mobile et desktop.
 *
 * PRINCIPE DE BASE:
 * - `isOpen` contrôle l'ouverture/fermeture du menu mobile
 * - `isCollapsed` contrôle le mode replié/déplié de la sidebar desktop
 * - Le CSS gère l'affichage responsive (mobile vs desktop)
 * - Les états sont persistés dans localStorage
 *
 * NOTE: On n'utilise plus useAuth() ici pour éviter les problèmes de build statique
 * et de dépendance circulaire. L'état est simplement persisté globalement.
 */

interface SidebarContextType {
  // État mobile (menu ouvert/fermé)
  isOpen: boolean;
  // État desktop (sidebar repliée/dépliée)
  isCollapsed: boolean;
  // Actions mobile
  open: () => void;
  close: () => void;
  toggle: () => void;
  // Actions desktop
  collapse: () => void;
  expand: () => void;
  toggleCollapse: () => void;
  // État de chargement (pour éviter le flash au montage)
  isReady: boolean;
}

const SidebarContext = createContext<SidebarContextType>({
  isOpen: false,
  isCollapsed: false,
  open: () => {},
  close: () => {},
  toggle: () => {},
  collapse: () => {},
  expand: () => {},
  toggleCollapse: () => {},
  isReady: false,
});

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
}

// Clés localStorage pour persister les états
const SIDEBAR_STORAGE_KEY = "posty_sidebar_open";
const SIDEBAR_COLLAPSED_KEY = "posty_sidebar_collapsed";

interface SidebarProviderProps {
  children: ReactNode;
  defaultOpen?: boolean;
  defaultCollapsed?: boolean;
}

export function SidebarProvider({
  children,
  defaultOpen = false,
  defaultCollapsed = false,
}: SidebarProviderProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [isReady, setIsReady] = useState(false);

  // Restaurer les états depuis localStorage au montage (client-side only)
  useEffect(() => {
    if (typeof window !== "undefined") {
      // État mobile
      const savedOpen = localStorage.getItem(SIDEBAR_STORAGE_KEY);
      if (savedOpen !== null) {
        setIsOpen(savedOpen === "true");
      }
      // État desktop (collapsed)
      const savedCollapsed = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
      if (savedCollapsed !== null) {
        setIsCollapsed(savedCollapsed === "true");
      }
      // Marquer comme prêt après la première restauration
      setIsReady(true);
    }
  }, []);

  // Sauvegarder l'état isOpen dans localStorage quand il change
  useEffect(() => {
    if (typeof window !== "undefined" && isReady) {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(isOpen));
    }
  }, [isOpen, isReady]);

  // Sauvegarder l'état isCollapsed dans localStorage quand il change
  useEffect(() => {
    if (typeof window !== "undefined" && isReady) {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(isCollapsed));
    }
  }, [isCollapsed, isReady]);

  // Auto-fermer la sidebar mobile quand on passe en mode desktop
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleResize = () => {
      // Si on est sur desktop (lg breakpoint = 1024px) et que la sidebar mobile est ouverte
      if (window.innerWidth >= 1024 && isOpen) {
        // Fermer la sidebar mobile (pas besoin de feedback haptique ici)
        setIsOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    // Vérifier aussi au montage
    handleResize();

    return () => window.removeEventListener("resize", handleResize);
  }, [isOpen]);

  // Toggle `body.mobile-sidebar-open` whenever the mobile drawer opens/closes.
  // This drives the global CSS rule (globals.css) that blurs the page
  // content (header, banners, page portals) so the drawer feels like it
  // actively pushes everything else into the background. Scoped to mobile
  // via the resize check — desktop has its own permanent sidebar and must
  // never be blurred.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const apply = () => {
      const isMobile = window.innerWidth < 1024;
      if (isOpen && isMobile) {
        document.body.classList.add("mobile-sidebar-open");
      } else {
        document.body.classList.remove("mobile-sidebar-open");
      }
    };
    apply();
    window.addEventListener("resize", apply);
    return () => {
      window.removeEventListener("resize", apply);
      document.body.classList.remove("mobile-sidebar-open");
    };
  }, [isOpen]);

  // Actions mobile avec haptic feedback
  const open = useCallback(() => {
    setIsOpen(true);
    // Haptic feedback sur mobile
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(10);
    }
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const toggle = useCallback(() => {
    setIsOpen((prev) => {
      const newState = !prev;
      // Haptic feedback quand on ouvre
      if (newState && typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(10);
      }
      return newState;
    });
  }, []);

  // Actions desktop (collapse/expand)
  const collapse = useCallback(() => {
    setIsCollapsed(true);
  }, []);

  const expand = useCallback(() => {
    setIsCollapsed(false);
  }, []);

  const toggleCollapse = useCallback(() => {
    setIsCollapsed((prev) => !prev);
  }, []);

  return (
    <SidebarContext.Provider
      value={{
        isOpen,
        isCollapsed,
        open,
        close,
        toggle,
        collapse,
        expand,
        toggleCollapse,
        isReady,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export default SidebarContext;
