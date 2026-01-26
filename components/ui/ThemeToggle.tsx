"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/contexts/ThemeContext";

interface ThemeToggleProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export default function ThemeToggle({
  className = "",
  size = "md",
  showLabel = false,
}: ThemeToggleProps) {
  const { theme, toggleTheme, isDark } = useTheme();

  const sizeClasses = {
    sm: "w-9 h-9",
    md: "w-11 h-11",
    lg: "w-12 h-12",
  };

  const iconSizeClasses = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  return (
    <motion.button
      onClick={toggleTheme}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={`
        ${sizeClasses[size]}
        flex items-center justify-center gap-2
        rounded-xl
        bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border
        hover:bg-light-hover dark:hover:bg-dark-hover hover:border-primary/30
        text-text-secondary hover:text-primary
        shadow-lg hover:shadow-glow
        transition-all duration-300
        ${className}
      `}
      aria-label={isDark ? "Passer en mode jour" : "Passer en mode nuit"}
      title={isDark ? "Mode jour" : "Mode nuit"}
    >
      <AnimatePresence mode="wait">
        {isDark ? (
          <motion.svg
            key="sun"
            initial={{ opacity: 0, rotate: -90, scale: 0.5 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: 90, scale: 0.5 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className={iconSizeClasses[size]}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
            />
          </motion.svg>
        ) : (
          <motion.svg
            key="moon"
            initial={{ opacity: 0, rotate: 90, scale: 0.5 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: -90, scale: 0.5 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className={iconSizeClasses[size]}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
            />
          </motion.svg>
        )}
      </AnimatePresence>

      {showLabel && (
        <span className="text-sm font-medium whitespace-nowrap">
          {isDark ? "Jour" : "Nuit"}
        </span>
      )}
    </motion.button>
  );
}

// Floating toggle for bottom-right position
export function FloatingThemeToggle() {
  const { isDark } = useTheme();

  return (
    <div className="fixed bottom-6 right-6 z-50 lg:bottom-8 lg:right-8">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.8 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.5, duration: 0.3, ease: "easeOut" }}
      >
        <ThemeToggle
          size="lg"
          className={`
            shadow-elevated
            ${isDark
              ? "bg-dark-card/95 backdrop-blur-xl"
              : "bg-white/95 backdrop-blur-xl border-gray-200"
            }
          `}
        />
      </motion.div>
    </div>
  );
}

// Compact toggle for header/sidebar
export function CompactThemeToggle({ className = "" }: { className?: string }) {
  const { toggleTheme, isDark } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`
        relative w-14 h-7
        bg-light-hover dark:bg-dark-hover border border-light-border dark:border-dark-border
        rounded-full
        transition-all duration-300
        hover:border-primary/30
        ${className}
      `}
      aria-label={isDark ? "Passer en mode jour" : "Passer en mode nuit"}
    >
      {/* Track icons */}
      <div className="absolute inset-0 flex items-center justify-between px-1.5">
        <svg
          className={`w-3.5 h-3.5 transition-opacity duration-200 ${
            isDark ? "opacity-30" : "opacity-100 text-warning"
          }`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" />
        </svg>
        <svg
          className={`w-3.5 h-3.5 transition-opacity duration-200 ${
            isDark ? "opacity-100 text-primary" : "opacity-30"
          }`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
        </svg>
      </div>

      {/* Sliding ball */}
      <motion.div
        initial={false}
        animate={{
          x: isDark ? 28 : 2,
        }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className={`
          absolute top-1 w-5 h-5
          rounded-full shadow-md
          ${isDark
            ? "bg-gradient-to-br from-primary to-accent"
            : "bg-gradient-to-br from-warning to-warning-hover"
          }
        `}
      />
    </button>
  );
}
