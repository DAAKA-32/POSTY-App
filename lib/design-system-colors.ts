/**
 * POSTY Design System - Premium Color Palette
 *
 * This file extends the autoscroll template colors to the entire application.
 * Inspired by the warm, dynamic, and engaging colors of PostTemplates.
 *
 * Philosophy:
 * - Warm, inviting colors that guide users naturally
 * - Educational and professional tone
 * - High contrast for accessibility
 * - Consistent across light/dark modes
 */

// =============================================================================
// TEMPLATE-INSPIRED COLOR CATEGORIES
// =============================================================================

/**
 * Storytelling Colors - Purple & Indigo
 * Use for: Content creation, narrative elements, creative features
 */
export const storytellingColors = {
  gradient: "from-purple-500 to-indigo-500",
  bg: "bg-purple-50 dark:bg-purple-500/10",
  bgHover: "hover:bg-purple-100 dark:hover:bg-purple-500/20",
  border: "border-purple-200 dark:border-purple-500/30",
  text: "text-purple-600 dark:text-purple-400",
  textMuted: "text-purple-500/70 dark:text-purple-400/70",
  icon: "text-purple-500 dark:text-purple-400",
  badge: "bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300",
  glow: "shadow-[0_0_20px_rgba(168,85,247,0.25)]", // purple-500 glow
  ring: "ring-purple-500/30",
};

/**
 * Tips & Advice Colors - Amber & Orange
 * Use for: Helpful tips, practical advice, productivity features
 */
export const tipsColors = {
  gradient: "from-amber-500 to-orange-500",
  bg: "bg-amber-50 dark:bg-amber-500/10",
  bgHover: "hover:bg-amber-100 dark:hover:bg-amber-500/20",
  border: "border-amber-200 dark:border-amber-500/30",
  text: "text-amber-600 dark:text-amber-400",
  textMuted: "text-amber-500/70 dark:text-amber-400/70",
  icon: "text-amber-500 dark:text-amber-400",
  badge: "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300",
  glow: "shadow-[0_0_20px_rgba(245,158,11,0.25)]", // amber-500 glow
  ring: "ring-amber-500/30",
};

/**
 * Opinion & Bold Colors - Red & Pink
 * Use for: Strong statements, important alerts, bold CTAs
 */
export const opinionColors = {
  gradient: "from-red-500 to-pink-500",
  bg: "bg-red-50 dark:bg-red-500/10",
  bgHover: "hover:bg-red-100 dark:hover:bg-red-500/20",
  border: "border-red-200 dark:border-red-500/30",
  text: "text-red-600 dark:text-red-400",
  textMuted: "text-red-500/70 dark:text-red-400/70",
  icon: "text-red-500 dark:text-red-400",
  badge: "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300",
  glow: "shadow-[0_0_20px_rgba(239,68,68,0.25)]", // red-500 glow
  ring: "ring-red-500/30",
};

/**
 * Success & Victory Colors - Emerald & Teal
 * Use for: Achievements, successful actions, positive results
 */
export const victoryColors = {
  gradient: "from-emerald-500 to-teal-500",
  bg: "bg-emerald-50 dark:bg-emerald-500/10",
  bgHover: "hover:bg-emerald-100 dark:hover:bg-emerald-500/20",
  border: "border-emerald-200 dark:border-emerald-500/30",
  text: "text-emerald-600 dark:text-emerald-400",
  textMuted: "text-emerald-500/70 dark:text-emerald-400/70",
  icon: "text-emerald-500 dark:text-emerald-400",
  badge: "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300",
  glow: "shadow-[0_0_20px_rgba(16,185,129,0.25)]", // emerald-500 glow
  ring: "ring-emerald-500/30",
};

/**
 * Learning & Lesson Colors - Blue & Cyan
 * Use for: Educational content, lessons, information displays
 */
export const lessonColors = {
  gradient: "from-blue-500 to-cyan-500",
  bg: "bg-blue-50 dark:bg-blue-500/10",
  bgHover: "hover:bg-blue-100 dark:hover:bg-blue-500/20",
  border: "border-blue-200 dark:border-blue-500/30",
  text: "text-blue-600 dark:text-blue-400",
  textMuted: "text-blue-500/70 dark:text-blue-400/70",
  icon: "text-blue-500 dark:text-blue-400",
  badge: "bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300",
  glow: "shadow-[0_0_20px_rgba(59,130,246,0.25)]", // blue-500 glow
  ring: "ring-blue-500/30",
};

/**
 * Engagement Colors - Violet & Purple
 * Use for: Interactive elements, questions, community features
 */
export const engagementColors = {
  gradient: "from-violet-500 to-purple-500",
  bg: "bg-violet-50 dark:bg-violet-500/10",
  bgHover: "hover:bg-violet-100 dark:hover:bg-violet-500/20",
  border: "border-violet-200 dark:border-violet-500/30",
  text: "text-violet-600 dark:text-violet-400",
  textMuted: "text-violet-500/70 dark:text-violet-400/70",
  icon: "text-violet-500 dark:text-violet-400",
  badge: "bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300",
  glow: "shadow-[0_0_20px_rgba(139,92,246,0.25)]", // violet-500 glow
  ring: "ring-violet-500/30",
};

// =============================================================================
// SEMANTIC COLOR MAPPING
// =============================================================================

/**
 * Map semantic intent to template colors
 */
export const semanticColors = {
  // Primary actions - Use brand colors
  primary: "from-primary to-accent",

  // Creative & content
  creative: storytellingColors.gradient,
  content: storytellingColors,

  // Helpful & informative
  helpful: tipsColors.gradient,
  info: lessonColors,

  // Success & achievement
  success: victoryColors.gradient,
  achievement: victoryColors,

  // Warning - Use tips colors (warm, not aggressive)
  warning: tipsColors.gradient,

  // Error - Use opinion colors (strong but not alarming)
  error: opinionColors.gradient,
  danger: opinionColors,

  // Engagement & interaction
  interactive: engagementColors.gradient,
  community: engagementColors,
};

// =============================================================================
// SHIMMER & GLOW EFFECTS
// =============================================================================

/**
 * Shimmer effects for premium elements
 * Compatible with dark mode and accessible
 */
export const shimmerEffects = {
  // Text shimmer - for headings and important text
  textShimmer: `
    bg-clip-text text-transparent
    bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500
    bg-[length:200%_auto]
    animate-shimmer-slow
  `,

  // Border shimmer - for cards and containers
  borderShimmer: `
    relative
    before:absolute before:inset-0 before:-z-10
    before:rounded-[inherit]
    before:bg-gradient-to-r before:from-purple-500 before:via-pink-500 before:to-orange-500
    before:bg-[length:200%_auto]
    before:animate-shimmer-slow
    before:p-[2px]
    before:[mask:linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)]
    before:[mask-composite:exclude]
  `,

  // Background shimmer - for hero sections
  bgShimmer: `
    bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-orange-500/10
    bg-[length:200%_auto]
    animate-shimmer-slow
  `,

  // Glow pulse - for buttons and CTAs
  glowPulse: "animate-glow-pulse",
  glowPulseAccent: "animate-glow-pulse-accent",
  glowPulseSuccess: "animate-glow-pulse-success",
};

/**
 * Gradient combinations for backgrounds
 */
export const gradientBackgrounds = {
  // Warm gradients
  warmSunset: "bg-gradient-to-br from-amber-50 via-orange-50 to-pink-50 dark:from-amber-950/20 dark:via-orange-950/20 dark:to-pink-950/20",
  warmGlow: "bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 dark:from-purple-950/20 dark:via-pink-950/20 dark:to-orange-950/20",

  // Cool gradients
  coolBreeze: "bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 dark:from-blue-950/20 dark:via-cyan-950/20 dark:to-teal-950/20",
  coolMist: "bg-gradient-to-br from-indigo-50 via-blue-50 to-cyan-50 dark:from-indigo-950/20 dark:via-blue-950/20 dark:to-cyan-950/20",

  // Success gradients
  successGlow: "bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 dark:from-emerald-950/20 dark:via-teal-950/20 dark:to-cyan-950/20",

  // Premium gradients
  premiumViolet: "bg-gradient-to-br from-violet-50 via-purple-50 to-pink-50 dark:from-violet-950/20 dark:via-purple-950/20 dark:to-pink-950/20",
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get color scheme by category
 */
export function getColorScheme(category: "storytelling" | "tips" | "opinion" | "victory" | "lesson" | "engagement") {
  const schemes = {
    storytelling: storytellingColors,
    tips: tipsColors,
    opinion: opinionColors,
    victory: victoryColors,
    lesson: lessonColors,
    engagement: engagementColors,
  };
  return schemes[category];
}

/**
 * Get gradient by intent
 */
export function getGradient(intent: "creative" | "helpful" | "success" | "warning" | "error" | "interactive") {
  const gradients = {
    creative: storytellingColors.gradient,
    helpful: tipsColors.gradient,
    success: victoryColors.gradient,
    warning: tipsColors.gradient,
    error: opinionColors.gradient,
    interactive: engagementColors.gradient,
  };
  return `bg-gradient-to-r ${gradients[intent]}`;
}

/**
 * Get glow effect by category
 */
export function getGlow(category: "storytelling" | "tips" | "opinion" | "victory" | "lesson" | "engagement") {
  const scheme = getColorScheme(category);
  return scheme.glow;
}

// =============================================================================
// COMPONENT PRESETS
// =============================================================================

/**
 * Pre-configured component styles using template colors
 */
export const componentPresets = {
  // Buttons
  button: {
    storytelling: `bg-gradient-to-r ${storytellingColors.gradient} text-white ${storytellingColors.glow} hover:shadow-lg`,
    tips: `bg-gradient-to-r ${tipsColors.gradient} text-white ${tipsColors.glow} hover:shadow-lg`,
    victory: `bg-gradient-to-r ${victoryColors.gradient} text-white ${victoryColors.glow} hover:shadow-lg`,
    lesson: `bg-gradient-to-r ${lessonColors.gradient} text-white ${lessonColors.glow} hover:shadow-lg`,
    engagement: `bg-gradient-to-r ${engagementColors.gradient} text-white ${engagementColors.glow} hover:shadow-lg`,
  },

  // Badges
  badge: {
    storytelling: storytellingColors.badge,
    tips: tipsColors.badge,
    opinion: opinionColors.badge,
    victory: victoryColors.badge,
    lesson: lessonColors.badge,
    engagement: engagementColors.badge,
  },

  // Cards
  card: {
    storytelling: `${storytellingColors.bg} ${storytellingColors.border} border ${storytellingColors.bgHover}`,
    tips: `${tipsColors.bg} ${tipsColors.border} border ${tipsColors.bgHover}`,
    opinion: `${opinionColors.bg} ${opinionColors.border} border ${opinionColors.bgHover}`,
    victory: `${victoryColors.bg} ${victoryColors.border} border ${victoryColors.bgHover}`,
    lesson: `${lessonColors.bg} ${lessonColors.border} border ${lessonColors.bgHover}`,
    engagement: `${engagementColors.bg} ${engagementColors.border} border ${engagementColors.bgHover}`,
  },

  // Icons
  icon: {
    storytelling: storytellingColors.icon,
    tips: tipsColors.icon,
    opinion: opinionColors.icon,
    victory: victoryColors.icon,
    lesson: lessonColors.icon,
    engagement: engagementColors.icon,
  },
};

// All exports are already declared above with export const
// No need for re-export block
