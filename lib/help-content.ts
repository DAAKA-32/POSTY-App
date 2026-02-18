// Centralized help content configuration
// Maps route paths to help page config (translation keys + visual theme)
// To add a new page: add an entry here + translations in fr.ts/en.ts

export interface PageHelpConfig {
  /** Key matching the help.pages translation key */
  translationKey: "chat" | "history" | "schedule" | "analytics";
  /** Accent color for the help popover */
  accentColor: string;
  /** Glow/shadow color for animations */
  glowColor: string;
}

export const PAGE_HELP_CONFIG: Record<string, PageHelpConfig> = {
  "/app": {
    translationKey: "chat",
    accentColor: "#F8935D",
    glowColor: "rgba(248, 147, 93, 0.35)",
  },
  "/history": {
    translationKey: "history",
    accentColor: "#06B6D4",
    glowColor: "rgba(6, 182, 212, 0.35)",
  },
  "/schedule": {
    translationKey: "schedule",
    accentColor: "#8B5CF6",
    glowColor: "rgba(139, 92, 246, 0.35)",
  },
  "/analytics": {
    translationKey: "analytics",
    accentColor: "#10B981",
    glowColor: "rgba(16, 185, 129, 0.35)",
  },
};

export function getPageHelpConfig(pathname: string): PageHelpConfig | null {
  return PAGE_HELP_CONFIG[pathname] || null;
}
