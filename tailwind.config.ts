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
        // POSTY Design System - Option A: Évolution Subtile
        // Bleu moderne + Teal = Familier mais raffiné
        background: "#0B0E11",
        foreground: "#FFFFFF",

        // Primary - Blue moderne (Tailwind Blue-500)
        // Plus vibrant que l'ancien, reste professionnel
        primary: {
          DEFAULT: "#3B82F6",  // Blue-500 (moderne, confiance)
          hover: "#2563EB",    // Blue-600 (darker on hover)
          light: "#60A5FA",    // Blue-400
          dark: "#1D4ED8",     // Blue-700
          muted: "#3B82F6/20", // For subtle backgrounds
        },

        // Accent - Teal (légèrement désaturé, élégant)
        // Plus subtil que le turquoise original
        accent: {
          DEFAULT: "#14B8A6",  // Teal-500
          hover: "#0D9488",    // Teal-600
          light: "#2DD4BF",    // Teal-400
          dark: "#0F766E",     // Teal-700
        },

        // Text colors - Palette slate harmonisée
        text: {
          primary: "#F8FAFC",   // Slate-50 (blanc cassé)
          secondary: "#94A3B8", // Slate-400
          muted: "#64748B",     // Slate-500
          subtle: "#475569",    // Slate-600
        },

        // Warning - Ambre doux (moins agressif que l'orange)
        warning: {
          DEFAULT: "#F59E0B",  // Amber-500
          hover: "#D97706",    // Amber-600
          light: "#FBBF24",    // Amber-400
          dark: "#B45309",     // Amber-700
        },

        // Error / Danger - Rouge standard
        error: {
          DEFAULT: "#EF4444",  // Red-500
          hover: "#DC2626",    // Red-600
          light: "#F87171",    // Red-400
          dark: "#B91C1C",     // Red-700
        },

        // Success - Emerald distinct (différent de l'accent)
        success: {
          DEFAULT: "#10B981",  // Emerald-500
          hover: "#059669",    // Emerald-600
          light: "#34D399",    // Emerald-400
          dark: "#047857",     // Emerald-700
        },

        // Info - Pour notifications neutres
        info: {
          DEFAULT: "#0EA5E9",  // Sky-500
          hover: "#0284C7",    // Sky-600
          light: "#38BDF8",    // Sky-400
        },

        // Dark theme surfaces
        dark: {
          bg: "#0B0E11",       // Fond principal
          card: "#12161B",     // Cards et conteneurs
          elevated: "#181D24", // Éléments élevés
          border: "#1E2530",   // Bordures subtiles
          hover: "#232A36",    // Hover state
          active: "#2A3342",   // Active/pressed state
          highlight: "#313B4D", // Highlight pour sélection
        },

        // Premium additions
        premium: {
          purple: "#8B5CF6",   // Violet pour badges premium
          pink: "#EC4899",     // Rose pour notifications
          gold: "#EAB308",     // Or pour achievements
        },
      },

      borderRadius: {
        // Professional, subtle rounded corners - SaaS Premium style
        none: "0",
        sm: "4px",
        DEFAULT: "6px",
        md: "8px",
        lg: "10px",
        xl: "12px",
        "2xl": "14px",
        "3xl": "16px",
        full: "9999px",
      },

      fontFamily: {
        sans: ["var(--font-poppins)", "Poppins", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "Fira Code", "monospace"],
      },

      // Mobile-first typography scale (Poppins)
      fontSize: {
        // Extra small - Legal/RGPD text
        "2xs": ["0.6875rem", { lineHeight: "1rem", letterSpacing: "0" }], // 11px
        // Small - Captions, meta info
        "xs": ["0.75rem", { lineHeight: "1.125rem", letterSpacing: "0" }], // 12px
        // Body small
        "sm": ["0.875rem", { lineHeight: "1.375rem", letterSpacing: "-0.01em" }], // 14px
        // Body default (conversational)
        "base": ["0.9375rem", { lineHeight: "1.5rem", letterSpacing: "-0.01em" }], // 15px mobile
        // Body large / CTA
        "lg": ["1rem", { lineHeight: "1.625rem", letterSpacing: "-0.01em" }], // 16px
        // Sub-headings H3
        "xl": ["1.125rem", { lineHeight: "1.75rem", letterSpacing: "-0.02em" }], // 18px
        // Headings H2
        "2xl": ["1.25rem", { lineHeight: "1.875rem", letterSpacing: "-0.02em" }], // 20px
        // Headings H1 mobile
        "3xl": ["1.375rem", { lineHeight: "1.75rem", letterSpacing: "-0.02em" }], // 22px
        // Large H1 mobile
        "4xl": ["1.5rem", { lineHeight: "2rem", letterSpacing: "-0.02em" }], // 24px
        // Desktop H1
        "5xl": ["1.75rem", { lineHeight: "2.25rem", letterSpacing: "-0.03em" }], // 28px
        // Hero desktop
        "6xl": ["2rem", { lineHeight: "2.5rem", letterSpacing: "-0.03em" }], // 32px
        // Display
        "7xl": ["2.5rem", { lineHeight: "3rem", letterSpacing: "-0.03em" }], // 40px
        "8xl": ["3rem", { lineHeight: "3.5rem", letterSpacing: "-0.03em" }], // 48px
      },

      letterSpacing: {
        tighter: "-0.03em",
        tight: "-0.02em",
        snug: "-0.01em",
        normal: "0",
        wide: "0.01em",
        wider: "0.02em",
        widest: "0.05em",
      },

      lineHeight: {
        none: "1",
        tight: "1.1",
        snug: "1.25",
        normal: "1.4",
        relaxed: "1.5",
        loose: "1.6",
      },

      fontWeight: {
        extralight: "200",
        light: "300",
        normal: "400",
        medium: "500",
        semibold: "600",
        bold: "700",
        extrabold: "800",
      },

      boxShadow: {
        // Glow effects - Option A: Blue primary
        "glow": "0 0 20px rgba(59, 130, 246, 0.35)",
        "glow-lg": "0 0 40px rgba(59, 130, 246, 0.4)",
        "glow-accent": "0 0 20px rgba(20, 184, 166, 0.35)",
        "glow-success": "0 0 20px rgba(16, 185, 129, 0.35)",
        "glow-error": "0 0 20px rgba(239, 68, 68, 0.35)",
        // Elevation shadows
        "soft": "0 2px 15px rgba(0, 0, 0, 0.3)",
        "elevated": "0 8px 30px rgba(0, 0, 0, 0.4)",
        "card": "0 4px 20px rgba(0, 0, 0, 0.25)",
        "dropdown": "0 10px 40px rgba(0, 0, 0, 0.5)",
        // Inner shadows
        "inner-soft": "inset 0 1px 2px rgba(0, 0, 0, 0.2)",
        "inner-glow": "inset 0 0 20px rgba(59, 130, 246, 0.1)",
        // Button shadows
        "btn-primary": "0 4px 14px rgba(59, 130, 246, 0.4)",
        "btn-success": "0 4px 14px rgba(16, 185, 129, 0.4)",
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

        // Glow effects
        "glow-pulse": "glowPulse 2s ease-in-out infinite",
        "glow-pulse-accent": "glowPulseAccent 2s ease-in-out infinite",
        "glow-pulse-success": "glowPulseSuccess 2s ease-in-out infinite",

        // Auth page animations
        "auth-form-enter": "authFormEnter 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "gradient-shift": "gradientShift 4s ease-in-out infinite",
        "float": "float 3s ease-in-out infinite",
        "logo-float": "logoFloat 4s ease-in-out infinite",
        "scroll-bounce": "scrollBounce 2s ease-in-out infinite",
        "icon-pop": "iconPop 0.3s ease-out forwards",
        "shimmer-cta": "shimmerCta 2s ease-in-out infinite",
        "particle-float": "particleFloat 6s ease-in-out infinite",
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

        // Glow keyframes - Option A: Blue primary
        glowPulse: {
          "0%, 100%": { boxShadow: "0 0 20px rgba(59, 130, 246, 0.35)" },
          "50%": { boxShadow: "0 0 40px rgba(59, 130, 246, 0.6)" },
        },
        // Additional glow animations
        glowPulseAccent: {
          "0%, 100%": { boxShadow: "0 0 20px rgba(20, 184, 166, 0.35)" },
          "50%": { boxShadow: "0 0 40px rgba(20, 184, 166, 0.6)" },
        },
        glowPulseSuccess: {
          "0%, 100%": { boxShadow: "0 0 20px rgba(16, 185, 129, 0.35)" },
          "50%": { boxShadow: "0 0 40px rgba(16, 185, 129, 0.6)" },
        },

        // Auth page keyframes
        authFormEnter: {
          "0%": { opacity: "0", transform: "scale(0.95) translateY(10px)" },
          "100%": { opacity: "1", transform: "scale(1) translateY(0)" },
        },
        gradientShift: {
          "0%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        logoFloat: {
          "0%, 100%": { transform: "translateY(0) rotate(0deg)" },
          "25%": { transform: "translateY(-5px) rotate(1deg)" },
          "75%": { transform: "translateY(-5px) rotate(-1deg)" },
        },
        scrollBounce: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(8px)" },
        },
        iconPop: {
          "0%": { transform: "scale(0.5) rotate(-180deg)", opacity: "0" },
          "50%": { transform: "scale(1.2) rotate(0deg)" },
          "100%": { transform: "scale(1) rotate(0deg)", opacity: "1" },
        },
        shimmerCta: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        particleFloat: {
          "0%, 100%": { transform: "translate(0, 0) scale(1)", opacity: "0.3" },
          "25%": { transform: "translate(10px, -10px) scale(1.05)", opacity: "0.5" },
          "50%": { transform: "translate(0, -20px) scale(1.1)", opacity: "0.4" },
          "75%": { transform: "translate(-10px, -10px) scale(1.05)", opacity: "0.5" },
        },
      },

      transitionTimingFunction: {
        "smooth": "cubic-bezier(0.4, 0, 0.2, 1)",
      },

      // GPU Acceleration utilities
      willChange: {
        "transform": "transform",
        "opacity": "opacity",
        "transform-opacity": "transform, opacity",
        "scroll": "scroll-position",
        "contents": "contents",
      },
    },
  },
  plugins: [
    // GPU Acceleration plugin
    function({ addUtilities }: { addUtilities: (utilities: Record<string, Record<string, string>>) => void }) {
      addUtilities({
        // Force GPU acceleration
        ".gpu-accelerated": {
          "transform": "translateZ(0)",
          "backface-visibility": "hidden",
          "-webkit-backface-visibility": "hidden",
        },
        // GPU layer for animations
        ".gpu-layer": {
          "will-change": "transform, opacity",
          "transform": "translate3d(0, 0, 0)",
        },
        // Smooth scrolling with GPU
        ".gpu-scroll": {
          "-webkit-overflow-scrolling": "touch",
          "transform": "translateZ(0)",
        },
        // Prevent layout thrashing
        ".contain-layout": {
          "contain": "layout",
        },
        ".contain-paint": {
          "contain": "paint",
        },
        ".contain-strict": {
          "contain": "strict",
        },
        // Optimized for animation
        ".animate-gpu": {
          "will-change": "transform",
          "transform": "translateZ(0)",
        },
      });
    },
  ],
} satisfies Config;
