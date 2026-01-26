"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";

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

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  // Load theme from localStorage on mount
  useEffect(() => {
    setMounted(true);

    // Check localStorage first
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;

    if (storedTheme && (storedTheme === "light" || storedTheme === "dark")) {
      setThemeState(storedTheme);
      applyTheme(storedTheme);
    } else {
      // Check system preference - respect user's OS setting, default to dark if no preference
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const systemTheme = prefersDark ? "dark" : "light"; // Respect system preference
      setThemeState(systemTheme);
      applyTheme(systemTheme);
    }
  }, []);

  // Apply theme to document with smooth transition
  const applyTheme = useCallback((newTheme: Theme, withTransition: boolean = false) => {
    const root = document.documentElement;

    // Add transition class for smooth theme change (only when explicitly requested)
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

    // Remove transition class after animation completes (400ms)
    if (withTransition) {
      setTimeout(() => {
        root.classList.remove("theme-transitioning");
      }, 400);
    }
  }, []);

  // Set theme (with optional smooth transition for user-initiated changes)
  const setTheme = useCallback((newTheme: Theme, withTransition: boolean = true) => {
    setThemeState(newTheme);
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    applyTheme(newTheme, withTransition);
  }, [applyTheme]);

  // Toggle theme with smooth transition
  const toggleTheme = useCallback(() => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme, true); // Always use smooth transition for toggle
  }, [theme, setTheme]);

  // REMOVED: Automatic system theme change listener
  // Theme now ONLY changes via explicit user action in Settings page
  // This prevents unexpected theme changes on mobile (iOS/Android auto dark mode, etc.)

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
