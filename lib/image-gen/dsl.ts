/**
 * Image Generation DSL — the contract the AI fills in, NOT raw SVG/code.
 *
 * Why a JSON DSL and not free-form output: letting the model emit raw SVG or
 * JSX means we'd have to either (a) eval untrusted strings (XSS / RCE) or
 * (b) parse + sanitize, which is endless. Constraining the model to a Zod
 * schema means: predictable shape, no template injection, every field is
 * validated server-side, and rendering becomes a pure function of safe data.
 *
 * Each `template` slot maps to a Satori JSX component that draws using only
 * primitive elements (divs + spans). The model picks a template, fills the
 * copy, and chooses an accent from a fixed palette.
 */

import { z } from "zod";

// ─── Brand palette ──────────────────────────────────────────────────────────
// Mirrors Posty's marketing system. Locked so the AI can't drift into
// off-brand neon. Three families, each backed by a soft + hard hex pair.

export const ACCENT_KEYS = ["coral", "midnight", "moss", "amber", "iris"] as const;
export type AccentKey = (typeof ACCENT_KEYS)[number];

/**
 * Per-palette colour roles. Splitting them by role (text vs. accent text vs.
 * chip fill) instead of generic light/dark pairs is what guarantees legibility
 * on the dark palette (midnight). Previously templates hardcoded `#1A1D21`
 * for body text, which on midnight's `#0F1115` background read as black-on-
 * black — invisible. With explicit `text` / `textMuted` / `accentText` per
 * palette we get correct contrast on every palette automatically.
 *
 *   - `text`        : body copy color on this palette's background
 *   - `textMuted`   : secondary / supporting copy color
 *   - `accentText`  : large display copy (KPI stat, opening quote mark, etc.)
 *                     where we want the brand colour to pop against the bg
 *   - `chipBg`      : background fill for accent chips / pills (CTA, dividers)
 *   - `chipText`    : text rendered ON `chipBg`
 *   - `soft/hard/on/bg/bgEnd` are kept for back-compat (used by the avatar
 *     generation script and a few decorative elements).
 */
export const ACCENT_PALETTE: Record<
  AccentKey,
  {
    soft: string; hard: string; on: string; bg: string; bgEnd: string;
    text: string; textMuted: string; accentText: string;
    chipBg: string; chipText: string;
  }
> = {
  coral: {
    soft: "#FBB9AD", hard: "#F76B54", on: "#1A1D21",
    bg: "#FFF7F3", bgEnd: "#FFE8DE",
    text: "#1A1D21", textMuted: "#5A6068", accentText: "#F76B54",
    chipBg: "#F76B54", chipText: "#FFFFFF",
  },
  midnight: {
    // Dark palette — `text` MUST be light or copy disappears against `bg`.
    // `accentText` stays white (full pop on dark) rather than `hard` which
    // would be `#1A1D21` and merge with the gradient.
    soft: "#A3AED0", hard: "#1A1D21", on: "#FFFFFF",
    bg: "#0F1115", bgEnd: "#1A1D21",
    text: "#FFFFFF", textMuted: "#A3AED0", accentText: "#FFFFFF",
    // CTA pill: light blue-grey fill with dark text — actually pops against
    // the near-black gradient. Using `hard` here (= bg) would render the
    // pill invisible.
    chipBg: "#A3AED0", chipText: "#1A1D21",
  },
  moss: {
    soft: "#B7D7B0", hard: "#3F7A4F", on: "#FFFFFF",
    bg: "#F2F7F2", bgEnd: "#E2EFE3",
    text: "#1A1D21", textMuted: "#5A6068", accentText: "#3F7A4F",
    chipBg: "#3F7A4F", chipText: "#FFFFFF",
  },
  amber: {
    soft: "#F8E0A1", hard: "#C9831D", on: "#1A1D21",
    bg: "#FFFBEF", bgEnd: "#FBF1D3",
    text: "#1A1D21", textMuted: "#5A6068", accentText: "#C9831D",
    chipBg: "#C9831D", chipText: "#FFFFFF",
  },
  iris: {
    soft: "#C6BBF0", hard: "#5A4FCF", on: "#FFFFFF",
    bg: "#F3F1FB", bgEnd: "#E5E0F8",
    text: "#1A1D21", textMuted: "#5A6068", accentText: "#5A4FCF",
    chipBg: "#5A4FCF", chipText: "#FFFFFF",
  },
};

// ─── Template-specific schemas ──────────────────────────────────────────────

const baseFields = {
  accent: z.enum(ACCENT_KEYS).default("coral"),
  brand: z.string().max(24).default("Posty"),
};

export const KpiCardSchema = z.object({
  template: z.literal("kpi-card"),
  ...baseFields,
  /** The headline KPI value, e.g. "+312%", "27M€", "× 4.8" — kept short for impact. */
  stat: z.string().min(1).max(12),
  /** What the stat measures, 4–10 words. */
  statLabel: z.string().min(4).max(80),
  /** Context line above the stat. Short, punchy. */
  eyebrow: z.string().min(2).max(40),
  /** Optional caption / source under the label. */
  footer: z.string().max(80).optional(),
});

export const QuoteCardSchema = z.object({
  template: z.literal("quote-card"),
  ...baseFields,
  /** The quote body. Single sentence, ideally < 140 chars. */
  quote: z.string().min(8).max(220),
  /** Author or persona — e.g. "Emilien · Posty". */
  attribution: z.string().min(2).max(48),
  /** Optional eyebrow (topic / category). */
  eyebrow: z.string().max(40).optional(),
});

export const AnnouncementCardSchema = z.object({
  template: z.literal("announcement-card"),
  ...baseFields,
  /** Short headline, ≤ 50 chars. Max impact. */
  headline: z.string().min(4).max(50),
  /** Supporting sentence under the headline, ≤ 140 chars. */
  body: z.string().min(8).max(160),
  /** CTA-style label, e.g. "Disponible aujourd'hui". */
  cta: z.string().min(2).max(40),
  /** Optional context line above the headline. */
  eyebrow: z.string().max(40).optional(),
});

/**
 * Photo-clean template — the PREMIUM DEFAULT. A real photo from Unsplash /
 * Pexels fills the whole frame, with NO heavy text slab. At most a discreet
 * one-line caption and/or a small uppercase eyebrow anchored bottom-left over
 * a soft scrim. This is what makes a visual read as "real editorial content"
 * instead of "AI/Canva card with text". Prefer this whenever the brief evokes
 * any concrete subject (a person, place, object, scene). The post itself
 * carries the message — the image carries credibility and emotion.
 *
 * `searchQuery` is 2-5 CONCRETE English keywords. English performs much better
 * than French on both Unsplash and Pexels search.
 */
export const PhotoCleanSchema = z.object({
  template: z.literal("photo-clean"),
  ...baseFields,
  /** 2-5 English keywords describing a REAL, concrete subject to photograph.
   *  Name the actual thing ("french parliament chamber", "paris haussmann
   *  street", "founder coworking laptop"), never an abstract concept. */
  searchQuery: z.string().min(3).max(80),
  /** Optional discreet caption — a SINGLE short line, rendered small + subtle.
   *  Often best left empty so the photo stands alone. ≤ 70 chars. */
  caption: z.string().max(70).optional(),
  /** Optional tiny uppercase label above the caption (e.g. "PARIS 2026"). */
  eyebrow: z.string().max(40).optional(),
});

/**
 * Photo-hero template — uses a real photo from Unsplash / Pexels as a
 * full-bleed background, overlaid with a dark gradient + editorial headline.
 * Use this (over photo-clean) ONLY when the post genuinely needs a strong
 * statement burned onto the image — a manifesto line, a launch claim. The
 * headline stays editorial and refined, never a giant marketing slab.
 * The AI fills `searchQuery` with 2-5 concrete English keywords.
 */
export const PhotoHeroSchema = z.object({
  template: z.literal("photo-hero"),
  ...baseFields,
  /** 2-5 English keywords used to find a matching photo. Concrete subjects
   *  beat abstract concepts ("laptop coffee desk" > "productivity"). */
  searchQuery: z.string().min(3).max(80),
  /** Editorial headline overlaid on the photo, ≤ 60 chars. Keep it tight. */
  headline: z.string().min(4).max(60),
  /** Optional supporting line under the headline, ≤ 120 chars. */
  body: z.string().max(140).optional(),
  /** Optional eyebrow above the headline (uppercase label). */
  eyebrow: z.string().max(40).optional(),
});

// Discriminated union — `template` field steers Zod to the right schema.
export const ImageDSLSchema = z.discriminatedUnion("template", [
  PhotoCleanSchema,
  PhotoHeroSchema,
  KpiCardSchema,
  QuoteCardSchema,
  AnnouncementCardSchema,
]);

export type ImageDSL = z.infer<typeof ImageDSLSchema>;
export type TemplateId = ImageDSL["template"];

// Order matters: photo templates first so any "freshness" rotation defaults to
// them — the system is photo-first, text cards are the minority fallback.
export const TEMPLATE_IDS = [
  "photo-clean",
  "photo-hero",
  "kpi-card",
  "quote-card",
  "announcement-card",
] as const;

/**
 * Templates backed by a real stock photo. These are the DEFAULT. They are
 * exempt from the anti-repetition penalty (their variety comes from the photo
 * itself, not the layout) and may repeat across variants of a single call.
 * Both require a configured stock-photo provider key to be offered to the AI.
 */
export const PHOTO_TEMPLATES = ["photo-clean", "photo-hero"] as const;

export function isPhotoTemplate(t: TemplateId): boolean {
  return (PHOTO_TEMPLATES as readonly string[]).includes(t);
}

/** Human-readable list of templates, used in the AI system prompt. */
export const TEMPLATE_GUIDE: Record<TemplateId, string> = {
  "photo-clean":
    "DEFAULT. A real, credible photo filling the frame, with little or no text (an optional discreet caption). Use this whenever the brief evokes ANY concrete subject — a person, place, object, team, scene. This is what makes the visual look like real professional content, not an AI card. Provide a searchQuery in ENGLISH naming the concrete subject.",
  "photo-hero":
    "Real-photo background + a single editorial headline burned on it. Use ONLY when the post needs a strong statement ON the image (a manifesto line, a launch claim). Otherwise prefer photo-clean. Provide a concrete ENGLISH searchQuery.",
  "kpi-card":
    "MINORITY. Typography-only big-number card. Use ONLY when the post genuinely hinges on a specific metric/percentage and no photo could convey it. Stat goes huge, label explains it.",
  "quote-card":
    "MINORITY. Typography-only pull-quote card. Use ONLY for a verbatim quote / sharp one-liner where the words ARE the visual. Single short sentence + attribution.",
  "announcement-card":
    "MINORITY. Typography-only launch card (headline + body + CTA label). Use ONLY for a formal product/event announcement where no real photo fits.",
};
