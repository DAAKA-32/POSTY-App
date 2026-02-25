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

// Read the theme that was already applied by the inline script in layout.tsx
// This avoids a flash by matching what's already on the DOM
function getInitialTheme(): Theme {
  if (typeof document !== "undefined") {
    // The inline script already set the class — read from it
    if (document.documentElement.classList.contains("light")) return "light";
    if (document.documentElement.classList.contains("dark")) return "dark";
  }
  return "dark";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);
  const [mounted, setMounted] = useState(false);

  // Sync with localStorage on mount (inline script already applied the correct theme)
  useEffect(() => {
    setMounted(true);

    // Check localStorage to ensure React state matches what the inline script applied
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;

    if (storedTheme && (storedTheme === "light" || storedTheme === "dark")) {
      setThemeState(storedTheme);
      // No need to call applyTheme — the inline script already did it
    } else {
      // No stored theme: keep whatever the inline script set (defaults to dark)
      // Don't check system preference here — it could override the user's choice
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
