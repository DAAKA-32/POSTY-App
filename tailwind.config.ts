import type { Config } from "tailwindcss";

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // THYNK Design System - Option A: Performance & Haute confiance
        background: "#0B0E11",
        foreground: "#FFFFFF",

        // Primary - Action color (CTA, links, focus)
        primary: {
          DEFAULT: "#2F80ED",
          hover: "#1E6FD9",
          light: "#5A9DF4",
          dark: "#1A5BBF",
        },

        // Accent - Secondary (success, interactive elements)
        accent: {
          DEFAULT: "#00D1C1",
          hover: "#00B8AA",
          light: "#33DDD0",
          dark: "#009E93",
        },

        // Text colors
        text: {
          primary: "#FFFFFF",
          secondary: "#A1A7B5",
          muted: "#6B7280",
        },

        // Warning / Alert
        warning: {
          DEFAULT: "#FF8A00",
          hover: "#E67A00",
          light: "#FFB347",
        },

        // Error / Danger
        error: {
          DEFAULT: "#EF4444",
          hover: "#DC2626",
          light: "#FCA5A5",
        },

        // Success
        success: {
          DEFAULT: "#00D1C1",
          hover: "#00B8AA",
        },

        // Dark theme surfaces
        dark: {
          bg: "#0B0E11",
          card: "#12161B",
          elevated: "#181D24",
          border: "#1E2530",
          hover: "#232A36",
          active: "#2A3342",
        },
      },

      borderRadius: {
        DEFAULT: "12px",
        md: "12px",
        lg: "16px",
        xl: "20px",
        "2xl": "24px",
      },

      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
      },

      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "0.875rem" }],
      },

      boxShadow: {
        "glow": "0 0 20px rgba(47, 128, 237, 0.3)",
        "glow-accent": "0 0 20px rgba(0, 209, 193, 0.3)",
        "soft": "0 2px 15px rgba(0, 0, 0, 0.3)",
        "elevated": "0 8px 30px rgba(0, 0, 0, 0.4)",
        "inner-soft": "inset 0 1px 2px rgba(0, 0, 0, 0.2)",
      },

      animation: {
        // Fade animations
        "fade-in": "fadeIn 0.2s ease-out forwards",
        "fade-in-up": "fadeInUp 0.3s ease-out forwards",
        "fade-in-down": "fadeInDown 0.3s ease-out forwards",
        "fade-out": "fadeOut 0.2s ease-out forwards",

        // Slide animations
        "slide-in-left": "slideInLeft 0.3s ease-out forwards",
        "slide-in-right": "slideInRight 0.3s ease-out forwards",
        "slide-in-up": "slideInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "slide-in-down": "slideInDown 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards",

        // Scale animations
        "scale-in": "scaleIn 0.2s ease-out forwards",
        "scale-in-bounce": "scaleInBounce 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
        "pop": "pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",

        // Utility animations
        "pulse-soft": "pulseSoft 2s ease-in-out infinite",
        "shake": "shake 0.5s ease-in-out",
        "bounce-subtle": "bounceSubtle 0.6s ease-out",
        "wiggle": "wiggle 0.5s ease-in-out",

        // Skeleton loader
        "shimmer": "shimmer 2s linear infinite",
        "skeleton-pulse": "skeletonPulse 1.5s ease-in-out infinite",

        // Page transitions
        "page-enter": "pageEnter 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "page-exit": "pageExit 0.3s ease-in forwards",

        // Stagger support
        "stagger-1": "fadeInUp 0.4s ease-out 0.1s forwards",
        "stagger-2": "fadeInUp 0.4s ease-out 0.2s forwards",
        "stagger-3": "fadeInUp 0.4s ease-out 0.3s forwards",
        "stagger-4": "fadeInUp 0.4s ease-out 0.4s forwards",
        "stagger-5": "fadeInUp 0.4s ease-out 0.5s forwards",

        // Spin
        "spin-slow": "spin 3s linear infinite",

        // Glow effect
        "glow-pulse": "glowPulse 2s ease-in-out infinite",
      },

      keyframes: {
        // Fade keyframes
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeOut: {
          "0%": { opacity: "1" },
          "100%": { opacity: "0" },
        },
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeInDown: {
          "0%": { opacity: "0", transform: "translateY(-20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },

        // Slide keyframes
        slideInLeft: {
          "0%": { opacity: "0", transform: "translateX(-30px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        slideInRight: {
          "0%": { opacity: "0", transform: "translateX(30px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        slideInUp: {
          "0%": { opacity: "0", transform: "translateY(100%)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideInDown: {
          "0%": { opacity: "0", transform: "translateY(-100%)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },

        // Scale keyframes
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        scaleInBounce: {
          "0%": { opacity: "0", transform: "scale(0.3)" },
          "50%": { transform: "scale(1.05)" },
          "70%": { transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        pop: {
          "0%": { transform: "scale(0.9)", opacity: "0" },
          "50%": { transform: "scale(1.02)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },

        // Utility keyframes
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "10%, 30%, 50%, 70%, 90%": { transform: "translateX(-4px)" },
          "20%, 40%, 60%, 80%": { transform: "translateX(4px)" },
        },
        bounceSubtle: {
          "0%": { transform: "translateY(0)" },
          "30%": { transform: "translateY(-8px)" },
          "50%": { transform: "translateY(-4px)" },
          "70%": { transform: "translateY(-2px)" },
          "100%": { transform: "translateY(0)" },
        },
        wiggle: {
          "0%, 100%": { transform: "rotate(0deg)" },
          "25%": { transform: "rotate(-3deg)" },
          "75%": { transform: "rotate(3deg)" },
        },

        // Skeleton keyframes
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        skeletonPulse: {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "0.7" },
        },

        // Page transition keyframes
        pageEnter: {
          "0%": { opacity: "0", transform: "translateY(20px) scale(0.98)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        pageExit: {
          "0%": { opacity: "1", transform: "translateY(0)" },
          "100%": { opacity: "0", transform: "translateY(-10px)" },
        },

        // Glow keyframes
        glowPulse: {
          "0%, 100%": { boxShadow: "0 0 20px rgba(47, 128, 237, 0.3)" },
          "50%": { boxShadow: "0 0 40px rgba(47, 128, 237, 0.6)" },
        },
      },

      transitionTimingFunction: {
        "smooth": "cubic-bezier(0.4, 0, 0.2, 1)",
      },
    },
  },
  plugins: [],
} satisfies Config;
