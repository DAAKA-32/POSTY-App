"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useLayoutEffect,
  useCallback,
  ReactNode,
} from "react";
import { usePathname } from "next/navigation";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  isDark: boolean;
  isLight: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = "posty-theme";

// useLayoutEffect applies the theme class to <html> BEFORE the browser paints,
// so client-side route changes never flash the wrong theme. Falls back to
// useEffect during SSR to silence React's "useLayoutEffect does nothing on the
// server" warning (the reconciliation is client-only anyway).
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

// Public / marketing pages always render in light mode. This MIRRORS the
// inline boot script's isPublicPage check in app/layout.tsx — that script only
// runs on full page loads, so we re-apply the same rule here on every client
// navigation to keep the DOM in sync (no stale theme after login / logout /
// SPA navigation between a forced-light public page and an app page).
// ⚠️ Keep this list in sync with the isPublicPage check in app/layout.tsx.
function isPublicThemePath(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname.startsWith("/about") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/legal") ||
    pathname.startsWith("/pricing") ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/subscription") ||
    pathname.startsWith("/ai-linkedin") ||
    pathname.startsWith("/write-linkedin") ||
    pathname.startsWith("/linkedin-post") ||
    pathname.startsWith("/generate-linkedin")
  );
}

// The user's stored preference (defaults to light when unset/unavailable).
function readStoredTheme(): Theme {
  if (typeof localStorage === "undefined") return "light";
  return localStorage.getItem(THEME_STORAGE_KEY) === "dark" ? "dark" : "light";
}

// The theme a given route should display: public pages are always light,
// app pages honor the user's stored preference.
function resolveThemeForPath(pathname: string): Theme {
  return isPublicThemePath(pathname) ? "light" : readStoredTheme();
}

// Read the theme the inline boot script already applied to <html>, so the
// first React render matches the DOM (no hydration mismatch, no flash).
function getInitialTheme(): Theme {
  if (typeof document !== "undefined") {
    if (document.documentElement.classList.contains("dark")) return "dark";
    if (document.documentElement.classList.contains("light")) return "light";
  }
  return "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);

  // Apply theme to <html>. Instant by default; smooth transition only when
  // explicitly requested (user-initiated toggle).
  const applyTheme = useCallback((newTheme: Theme, withTransition: boolean = false) => {
    const root = document.documentElement;

    if (withTransition) {
      root.classList.add("theme-transitioning");
    }

    if (newTheme === "dark") {
      root.classList.remove("light");
      root.classList.add("dark");
      root.style.colorScheme = "dark";
      root.setAttribute("data-theme", "dark");
    } else {
      root.classList.remove("dark");
      root.classList.add("light");
      root.style.colorScheme = "light";
      root.setAttribute("data-theme", "light");
    }

    if (withTransition) {
      setTimeout(() => {
        root.classList.remove("theme-transitioning");
      }, 400);
    }
  }, []);

  // Reconcile the DOM theme with what the current route should show, BEFORE the
  // browser paints. On a correct full load (the inline boot script already
  // applied the right theme) this is a no-op → zero flash, zero cost. It only
  // does work when the DOM is stale — e.g. client-side navigation across the
  // forced-light-public ↔ app boundary, which the inline script cannot catch
  // because it never re-runs on SPA navigation. Applied instantly (no animated
  // transition) so there is never a visible wrong-theme frame.
  useIsomorphicLayoutEffect(() => {
    const resolved = resolveThemeForPath(pathname);
    const domTheme = document.documentElement.classList.contains("dark")
      ? "dark"
      : "light";
    if (domTheme !== resolved) {
      applyTheme(resolved, false);
    }
    setThemeState(resolved);
  }, [pathname, applyTheme]);

  // Set theme (with optional smooth transition for user-initiated changes).
  // Persists the choice so the inline boot script + route reconciliation pick
  // it up on the next load / navigation.
  const setTheme = useCallback(
    (newTheme: Theme, withTransition: boolean = true) => {
      setThemeState(newTheme);
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
      applyTheme(newTheme, withTransition);
    },
    [applyTheme]
  );

  // Toggle theme with smooth transition.
  const toggleTheme = useCallback(() => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme, true);
  }, [theme, setTheme]);

  // NOTE: No automatic system-theme listener — theme changes ONLY via explicit
  // user action (Settings / toggle). This prevents unexpected switches on
  // mobile OS auto dark mode.

  const value: ThemeContextType = {
    theme,
    toggleTheme,
    setTheme,
    isDark: theme === "dark",
    isLight: theme === "light",
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

export default ThemeContext;
