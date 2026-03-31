import type { Config } from "tailwindcss";

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  safelist: [
    // Brand primary colors - used dynamically in sidebar, profile, components
    'bg-primary', 'bg-primary/5', 'bg-primary/10', 'bg-primary/20',
    'text-primary', 'hover:text-primary', 'hover:bg-primary/5',
    'border-primary', 'border-primary/20', 'border-primary/30',
    // Brand primary-hover for premium variants
    'bg-primary-hover', 'text-primary-hover',
    'bg-primary-hover/5', 'bg-primary-hover/10', 'bg-primary-hover/20',
    // Semantic colors (kept for status indicators)
    'text-success', 'bg-success/10',
    'text-error', 'bg-error/10',
    'text-warning', 'bg-warning/10',
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // POSTY Design System - Premium SaaS Light Mode First
        // Brand palette: Corail vif + Rose pêche = Premium & Engageant
        // Using CSS variables for theme-aware colors
        background: "var(--background)",
        "background-warm": "var(--background-warm)",
        "background-peach": "var(--background-peach)",
        "background-cream": "var(--background-cream)",
        foreground: "var(--foreground)",

        // Primary - Orange clair (couleur principale CTA)
        // Plus lumineux et engageant pour les boutons
        primary: {
          DEFAULT: "#F8935D",  // Orange clair - CTA principal
          hover: "#F76B54",    // Corail vif au hover
          light: "#FBB9AD",    // Rose pêche clair (fond léger)
          dark: "#E8834D",     // Orange profond (pour contraste)
          muted: "rgba(248, 147, 93, 0.12)", // For subtle backgrounds
        },

        // Secondary - Corail moyen (accents secondaires)
        // Extrait de la palette brand: #F89E85
        secondary: {
          DEFAULT: "#F89E85",  // Corail moyen
          hover: "#F76B54",    // Vers corail vif au hover
          light: "#FBB9AD",    // Rose pêche clair
          dark: "#E8886F",     // Corail moyen foncé
        },

        // Accent - Rouge/rose intense (pour badges, notifications)
        // Extrait de la palette brand: #F13452
        accent: {
          DEFAULT: "#F13452",  // Rouge/rose intense
          hover: "#D91E3D",    // Rouge plus profond
          light: "#FBB9AD",    // Rose pêche clair
          dark: "#C41E3A",     // Rouge foncé
        },

        // Text colors - Using CSS variables for theme-aware text
        // Automatically switches between light/dark mode
        text: {
          primary: "var(--text-primary)",     // Theme-aware primary text
          secondary: "var(--text-secondary)", // Theme-aware secondary text
          muted: "var(--text-muted)",         // Theme-aware muted text
          subtle: "var(--text-subtle)",       // Theme-aware subtle text
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

        // Light theme surfaces (default)
        light: {
          bg: "#FAFBFC",       // Fond principal - blanc cassé
          card: "#FFFFFF",     // Cards blanches
          elevated: "#F8FAFC", // Éléments élevés
          border: "#E5E7EB",   // Bordures subtiles
          hover: "#F3F4F6",    // Hover state
          active: "#E5E7EB",   // Active/pressed state
          highlight: "#FEF3F0", // Highlight rose pêche léger
        },

        // Dark theme surfaces (for dark mode override)
        dark: {
          bg: "#0F1115",       // Fond principal - plus profond
          card: "#16191F",     // Cards et conteneurs
          elevated: "#1C2027", // Éléments élevés
          border: "#262B35",   // Bordures subtiles
          hover: "#2A3040",    // Hover state
          active: "#333B4D",   // Active/pressed state
          highlight: "#3D465A", // Highlight pour sélection
        },

        // Dashboard - Theme-aware colors using CSS variables
        dashboard: {
          bg: "var(--background)",                    // Fond principal dashboard
          card: "var(--dashboard-card-bg)",           // Cartes
          "card-border": "var(--dashboard-card-border)", // Bordure visible mais subtile
          "card-hover": "var(--dashboard-card-hover)", // Hover state des cartes
          elevated: "var(--dashboard-elevated)",      // Éléments élevés (tooltips, dropdowns)
          "grid-line": "var(--dashboard-grid-line)", // Lignes de grille graphiques
          "surface-1": "var(--dashboard-card-bg)",   // Surface niveau 1
          "surface-2": "var(--dashboard-card-hover)", // Surface niveau 2
          "surface-3": "var(--dashboard-elevated)",  // Surface niveau 3
        },

        // Chart colors - Theme-aware using CSS variables
        chart: {
          bar: "var(--chart-bar-active)",            // Barre active
          "bar-muted": "var(--chart-bar-inactive)",  // Barre inactive
          grid: "var(--chart-grid)",                 // Grilles
          label: "var(--chart-label)",               // Labels axes
          accent: "#F85751",                         // Corail (logo)
          success: "#34D399",                        // Vert pour charts
        },

        // Premium additions
        premium: {
          purple: "#8B5CF6",   // Violet pour badges premium
          pink: "#EC4899",     // Rose pour notifications
          gold: "#EAB308",     // Or pour achievements
        },

        // Brand colors - Palette orange/corail premium
        brand: {
          orange: "#F8935D",    // Orange clair - PRIMARY
          coral: "#F76B54",     // Corail vif - HOVER
          coralMedium: "#F89E85", // Corail moyen - SECONDARY
          peach: "#FBB9AD",     // Rose pêche clair - LIGHT
          rose: "#F13452",      // Rouge/rose intense - ACCENT
          orangeDark: "#E8834D", // Orange profond
          roseDark: "#D91E3D",  // Rose foncé
        },

        // Warm accent colors - Tons chauds harmonisés
        warm: {
          orange: "#F8935D",   // Orange clair (brand primary)
          coral: "#F76B54",    // Corail vif
          coralMedium: "#F89E85", // Corail moyen
          peach: "#FBB9AD",    // Rose pêche clair
          rose: "#F13452",     // Rose framboise intense
          salmon: "#F89E85",   // Salmon (alias coral medium)
          sunset: "#E8834D",   // Orange profond
          amber: "#FCD34D",    // Doré chaleureux
        },

        // Vibrant accent colors - Couleurs vives pour impact visuel
        vibrant: {
          cyan: "#06B6D4",     // Cyan-500 - Moderne et énergique
          emerald: "#10B981",  // Emerald-500 - Frais et dynamique
          violet: "#8B5CF6",   // Violet-500 - Premium et élégant
          rose: "#F43F5E",     // Rose-500 - Audacieux et engageant
          sky: "#0EA5E9",      // Sky-500 - Confiance et clarté
          amber: "#F59E0B",    // Amber-500 - Chaleureux et lumineux
          lime: "#84CC16",     // Lime-500 - Frais et innovant
          fuchsia: "#D946EF",  // Fuchsia-500 - Créatif et moderne
        },

        // Gradient combinations (palette brand orange/corail)
        gradient: {
          "brand-start": "#F8935D",    // Orange clair (primary)
          "brand-end": "#F76B54",      // Corail vif (hover)
          "soft-start": "#FBB9AD",     // Rose pêche clair
          "soft-end": "#F89E85",       // Corail moyen
          "premium-start": "#F8935D",  // Orange clair
          "premium-end": "#8B5CF6",    // Violet premium
          "sunset-start": "#F8935D",   // Orange clair
          "sunset-end": "#F13452",     // Rose intense
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
        display: ["var(--font-display)", "Playfair Display", "Georgia", "serif"],
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
        // Light mode elevation shadows (subtle, professional)
        "sm": "0 1px 2px rgba(0, 0, 0, 0.05)",
        "DEFAULT": "0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04)",
        "md": "0 4px 6px rgba(0, 0, 0, 0.07), 0 2px 4px rgba(0, 0, 0, 0.04)",
        "lg": "0 10px 15px rgba(0, 0, 0, 0.08), 0 4px 6px rgba(0, 0, 0, 0.04)",
        "xl": "0 20px 25px rgba(0, 0, 0, 0.1), 0 8px 10px rgba(0, 0, 0, 0.04)",
        // Glow effects - Orange brand (F8935D = rgb 248, 147, 93)
        "glow": "0 0 20px rgba(248, 147, 93, 0.25)",
        "glow-lg": "0 0 40px rgba(248, 147, 93, 0.35)",
        "glow-accent": "0 0 20px rgba(241, 52, 82, 0.25)", // Rose F13452
        "glow-success": "0 0 20px rgba(16, 185, 129, 0.25)",
        "glow-error": "0 0 20px rgba(239, 68, 68, 0.25)",
        // Premium card shadows
        "soft": "0 2px 8px rgba(0, 0, 0, 0.06)",
        "elevated": "0 8px 24px rgba(0, 0, 0, 0.1)",
        "card": "0 2px 8px rgba(0, 0, 0, 0.04), 0 4px 16px rgba(0, 0, 0, 0.06)",
        "card-hover": "0 4px 12px rgba(0, 0, 0, 0.08), 0 8px 24px rgba(0, 0, 0, 0.08)",
        "dropdown": "0 10px 30px rgba(0, 0, 0, 0.12)",
        // Inner shadows
        "inner-soft": "inset 0 1px 2px rgba(0, 0, 0, 0.06)",
        "inner-glow": "inset 0 0 20px rgba(248, 147, 93, 0.08)",
        // Button shadows - subtle glow on hover
        "btn-primary": "0 4px 14px rgba(248, 147, 93, 0.3)",
        "btn-primary-hover": "0 6px 20px rgba(247, 107, 84, 0.4)",
        "btn-success": "0 4px 14px rgba(16, 185, 129, 0.3)",
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

        // Utility animations - Optimized durations (200-400ms for UI interactions)
        "pulse-soft": "pulseSoft 400ms ease-in-out infinite",
        "shake": "shake 300ms ease-in-out",
        "bounce-subtle": "bounceSubtle 400ms ease-out",
        "wiggle": "wiggle 300ms ease-in-out",

        // Skeleton loader - Slightly longer for visibility
        "shimmer": "shimmer 800ms linear infinite",
        "skeleton-pulse": "skeletonPulse 600ms ease-in-out infinite",

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

        // Premium landing page animations
        "gradient-x": "gradientX 8s ease infinite",
        "gradient-y": "gradientY 8s ease infinite",
        "text-shimmer": "textShimmer 3s ease-in-out infinite",
        "border-beam": "borderBeam 4s linear infinite",
        "spotlight": "spotlight 2s ease-in-out infinite",
        "marquee": "marquee 30s linear infinite",
        "marquee-reverse": "marquee 30s linear infinite reverse",
        "marquee-value": "marqueeValue 25s linear infinite",
        "reveal-up": "revealUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "reveal-left": "revealLeft 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "blur-in": "blurIn 0.5s ease-out forwards",

        // Glow effects - Optimized for subtle but responsive feedback
        "glow-pulse": "glowPulse 400ms ease-in-out infinite",
        "glow-pulse-accent": "glowPulseAccent 400ms ease-in-out infinite",
        "glow-pulse-success": "glowPulseSuccess 400ms ease-in-out infinite",

        // Auth page animations - Optimized for perceived performance
        "auth-form-enter": "authFormEnter 300ms cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "gradient-shift": "gradientShift 1s ease-in-out infinite",
        "float": "float 400ms ease-in-out infinite",
        "logo-float": "logoFloat 400ms ease-in-out infinite",
        "scroll-bounce": "scrollBounce 400ms ease-in-out infinite",
        "icon-pop": "iconPop 200ms ease-out forwards",
        "shimmer-cta": "shimmerCta 800ms ease-in-out infinite",
        "particle-float": "particleFloat 600ms ease-in-out infinite",

        // Premium subscription page animations
        "gradient-slow": "gradientSlow 3s ease infinite",
        "shimmer-slide": "shimmerSlide 2s ease-in-out infinite",

        // Premium Hero shimmer - ultra smooth gradient animation
        "shimmer-slow": "shimmerSlow 4s ease-in-out infinite",

        // NEW POST BUTTON - Enhanced visibility animations (orange AUTOSCROLL)
        "pulse-glow": "pulseGlow 2s ease-in-out infinite",
        "shimmer-enhanced": "shimmerEnhanced 2s ease-in-out infinite",
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

        // Glow keyframes - Orange brand (F8935D = rgb 248, 147, 93)
        glowPulse: {
          "0%, 100%": { boxShadow: "0 0 20px rgba(248, 147, 93, 0.25)" },
          "50%": { boxShadow: "0 0 40px rgba(248, 147, 93, 0.45)" },
        },
        // Additional glow animations - Rose F13452 = rgb 241, 52, 82
        glowPulseAccent: {
          "0%, 100%": { boxShadow: "0 0 20px rgba(241, 52, 82, 0.25)" },
          "50%": { boxShadow: "0 0 40px rgba(241, 52, 82, 0.5)" },
        },
        glowPulseSuccess: {
          "0%, 100%": { boxShadow: "0 0 20px rgba(16, 185, 129, 0.25)" },
          "50%": { boxShadow: "0 0 40px rgba(16, 185, 129, 0.5)" },
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

        // Premium landing page keyframes
        gradientX: {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        gradientY: {
          "0%, 100%": { backgroundPosition: "50% 0%" },
          "50%": { backgroundPosition: "50% 100%" },
        },
        textShimmer: {
          "0%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
        borderBeam: {
          "0%": { offsetDistance: "0%" },
          "100%": { offsetDistance: "100%" },
        },
        spotlight: {
          "0%, 100%": { opacity: "0.5", transform: "scale(1)" },
          "50%": { opacity: "0.8", transform: "scale(1.05)" },
        },
        marquee: {
          "0%": { transform: "translateX(0%)" },
          "100%": { transform: "translateX(-100%)" },
        },
        marqueeValue: {
          "0%": { transform: "translate3d(0, 0, 0)" },
          "100%": { transform: "translate3d(-50%, 0, 0)" },
        },
        revealUp: {
          "0%": { opacity: "0", transform: "translateY(30px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        revealLeft: {
          "0%": { opacity: "0", transform: "translateX(30px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        blurIn: {
          "0%": { opacity: "0", filter: "blur(12px)" },
          "100%": { opacity: "1", filter: "blur(0)" },
        },

        // Premium subscription page keyframes
        gradientSlow: {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        shimmerSlide: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        // Premium hero shimmer - ultra smooth subtle gradient shift
        shimmerSlow: {
          "0%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
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
