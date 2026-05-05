#!/usr/bin/env node
/**
 * generate-strategist-avatar-portrait.mjs
 * ────────────────────────────────────────────────────────────────────────────
 * Generates the Strategist's HUMAN PORTRAIT via OpenAI's gpt-image-1 API.
 *
 * One-time generation — the asset is committed and reused everywhere
 * (drawer header + FAB + tooltip). Re-run anytime to:
 *   - Get a different result with the same prompt (re-roll)
 *   - Get a tuned result by editing PROMPT below first
 *
 * REQUIREMENTS:
 *   - Node 18+ (built-in fetch)
 *   - OPENAI_API_KEY in .env.local
 *
 * USAGE:
 *   npm run generate-strategist-avatar-portrait
 *   # or
 *   node scripts/generate-strategist-avatar-portrait.mjs
 *
 * COST: ~$0.04 per generation (gpt-image-1, high quality, 1024×1024)
 *
 * OUTPUT: public/strategist/avatar-portrait.png
 * ────────────────────────────────────────────────────────────────────────────
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Manually parse .env.local (no dotenv dep) ───────────────────────────
function loadEnvLocal() {
  const envPath = resolve(__dirname, "../.env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!process.env[m[1]]) process.env[m[1]] = v;
  }
}
loadEnvLocal();

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error("✗ OPENAI_API_KEY missing.");
  console.error("  Add it to .env.local:");
  console.error("    OPENAI_API_KEY=sk-...");
  process.exit(1);
}

// ── PROMPT — single source of truth, edit to retune ─────────────────────
const PROMPT = `Bold flat 2D vector illustration portrait of a friendly marketing strategist character. Modern editorial cartoon style — clean simplified shapes, bold confident outlines, warm flat color fills with minimal cel-shading, NO photorealism whatsoever. Slightly stylized proportions: larger expressive eyes, rounded cheeks, friendly smile. Smart-casual attire (charcoal blazer over cream knit, simplified to flat color shapes). Solid warm cream background (single color, no blur, no depth). Square 1:1 crop, head-and-shoulders framing, face centered slightly above middle for circular crop. Premium SaaS brand illustration aesthetic — think Notion website illustrations, Mailchimp characters, Stripe illustrations, Slack people art. Clean vector lines, distinct cartoon character, not realistic, not 3D rendered. Flat shapes, limited color palette (warm neutrals + amber accent), no gradients except minimal subtle shading. No text, no logos. Tasteful contemporary editorial cartoon.`;

const OUT_DIR = resolve(__dirname, "../public/strategist");
const OUT_FILE = resolve(OUT_DIR, "avatar-portrait.png");

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

console.log("→ Generating Strategist portrait via OpenAI gpt-image-1");
console.log("  (~10-15s, ~$0.04 per generation)");

const res = await fetch("https://api.openai.com/v1/images/generations", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  },
  body: JSON.stringify({
    model: "gpt-image-1",
    prompt: PROMPT,
    n: 1,
    size: "1024x1024",
    quality: "high",
  }),
});

if (!res.ok) {
  const errText = await res.text();
  console.error(`✗ OpenAI API ${res.status}:`);
  console.error(`  ${errText}`);
  process.exit(1);
}

const data = await res.json();
const b64 = data?.data?.[0]?.b64_json;
if (!b64) {
  console.error("✗ No image data returned by OpenAI.");
  console.error(JSON.stringify(data, null, 2));
  process.exit(1);
}

const buffer = Buffer.from(b64, "base64");
writeFileSync(OUT_FILE, buffer);

console.log("");
console.log(`✓ Portrait saved (${(buffer.length / 1024).toFixed(0)} KB)`);
console.log(`  ${OUT_FILE}`);
console.log("");
console.log("→ Refresh the app — the Strategist now has a face.");
console.log("→ Re-run for a different roll. Edit PROMPT to retune the look.");
