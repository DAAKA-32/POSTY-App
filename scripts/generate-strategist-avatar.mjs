#!/usr/bin/env node
/**
 * generate-strategist-avatar.mjs
 * ────────────────────────────────────────────────────────────────────────────
 * Generates the "Strategist Mark" avatar as static SVG files.
 *
 * The mark: a 4-point sparkle in deep amber on a cream disc, with a tiny
 * secondary sparkle satellite. Evokes strategic insight + AI assistant
 * signature (sparkle is the de-facto AI mark of the OpenAI/Notion era).
 *
 *   - Light variant : cream disc + amber-600 sparkle  → daytime UI, OG image
 *   - Dark variant  : gray-800 disc + amber-400 spark → dark mode UI
 *
 * The same paths are duplicated inline inside StrategistAvatar.tsx so the
 * component can render in React with theme-aware classes (no extra HTTP).
 * If you redesign the mark, change the paths HERE *and* in StrategistAvatar.tsx
 * (a small comment in that file points back to this script).
 *
 * USAGE:
 *   node scripts/generate-strategist-avatar.mjs
 *
 * OUTPUT:
 *   public/strategist/avatar.svg        (light)
 *   public/strategist/avatar-dark.svg   (dark)
 *   public/strategist/avatar-128.svg    (light, fixed 128×128 — for OG/social)
 * ────────────────────────────────────────────────────────────────────────────
 */

import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, "../public/strategist");

// ── Design constants ──────────────────────────────────────────────────────
const PALETTES = {
  light: {
    bg: "#fef3c7",        // amber-100 (cream)
    ring: "#fde68a",      // amber-200 (subtle gold border)
    sparkleMain: "#d97706", // amber-600 (rich gold)
    sparkleAlt: "#f59e0b",  // amber-500 (lighter gold)
  },
  dark: {
    bg: "#1f2937",        // gray-800
    ring: "#374151",      // gray-700
    sparkleMain: "#fbbf24", // amber-400
    sparkleAlt: "#f59e0b",  // amber-500
  },
};

// ── SVG builder ───────────────────────────────────────────────────────────
//
// 64×64 viewBox. The mark scales perfectly from 16px (favicon) to 256px (OG).
// Built from primitives (circles + 2 sparkle paths) so it stays under 1KB.

function buildSvg(palette, { width = null, height = null } = {}) {
  const sizeAttrs =
    width && height ? ` width="${width}" height="${height}"` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none"${sizeAttrs} aria-hidden="true">
  <!-- Background disc -->
  <circle cx="32" cy="32" r="32" fill="${palette.bg}"/>
  <!-- Subtle border ring (gives the avatar a clean edge at small sizes) -->
  <circle cx="32" cy="32" r="31.5" fill="none" stroke="${palette.ring}" stroke-width="0.7" opacity="0.8"/>
  <!-- Main 4-point sparkle (vertical/horizontal arms longer than diagonals) -->
  <path d="M 32 13 L 33.5 30.5 L 51 32 L 33.5 33.5 L 32 51 L 30.5 33.5 L 13 32 L 30.5 30.5 Z" fill="${palette.sparkleMain}"/>
  <!-- Satellite mini-sparkle, top-right — adds character -->
  <path d="M 47 17 L 47.7 20 L 50.7 20.7 L 47.7 21.4 L 47 24.4 L 46.3 21.4 L 43.3 20.7 L 46.3 20 Z" fill="${palette.sparkleAlt}" opacity="0.85"/>
</svg>
`;
}

// ── Run ───────────────────────────────────────────────────────────────────
if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

writeFileSync(resolve(OUT_DIR, "avatar.svg"), buildSvg(PALETTES.light));
writeFileSync(resolve(OUT_DIR, "avatar-dark.svg"), buildSvg(PALETTES.dark));
writeFileSync(
  resolve(OUT_DIR, "avatar-128.svg"),
  buildSvg(PALETTES.light, { width: 128, height: 128 })
);

console.log("✓ Strategist avatar generated:");
console.log("  public/strategist/avatar.svg       (light, fluid)");
console.log("  public/strategist/avatar-dark.svg  (dark, fluid)");
console.log("  public/strategist/avatar-128.svg   (light, 128×128)");
