/**
 * Single source of truth for brand / app names that must NEVER be translated
 * by Google Translate, browser auto-translate, or extension translators.
 *
 * Adding a brand here makes it eligible for autoProtect() detection and
 * documents which strings the UI considers proper nouns.
 *
 * Order matters: longer/more-specific names come first so multi-word matches
 * win over single-word ones during regex scanning ("Posty AI" before "Posty").
 */
export const PROTECTED_BRAND_NAMES = [
  "Posty AI",
  "POSTY",
  "Posty",
  "LinkedIn",
  "Discord",
  "Threads",
  "Bluesky",
  "Mastodon",
  "Facebook",
  "Instagram",
  "TikTok",
  "YouTube",
  "Twitter",
  "Pinterest",
  "WhatsApp",
  "Telegram",
  "Snapchat",
  "Reddit",
  "Slack",
  "Notion",
  "Stripe",
  "Google",
  "Apple",
  "Microsoft",
  "OpenAI",
  "ChatGPT",
  "Claude",
  "Anthropic",
  "Firebase",
  "Vercel",
  "GitHub",
  "MetaMask",
] as const;

export type ProtectedBrandName = (typeof PROTECTED_BRAND_NAMES)[number];

/**
 * Cached regex matching any protected brand name as a whole word (no partial
 * matches inside other words). Built once at module load.
 *
 * Escapes regex metacharacters so brand names that introduce special chars
 * later (e.g. "X.com") stay literal.
 */
const escapeForRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const PROTECTED_BRAND_REGEX = new RegExp(
  `(${PROTECTED_BRAND_NAMES.map(escapeForRegex).join("|")})`,
  "g",
);
