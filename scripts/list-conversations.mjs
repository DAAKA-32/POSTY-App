/**
 * Quick diagnostic — dump every /app/c/* link visible on /app.
 * Use to find the exact title of a conversation when capture-conversation.mjs
 * fails to match.
 */
import { chromium } from "playwright";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const USER_DATA_DIR = path.join(ROOT, ".preview-browser");

const ctx = await chromium.launchPersistentContext(USER_DATA_DIR, {
  headless: true,
  viewport: { width: 1920, height: 900 },
});

const page = ctx.pages()[0] || (await ctx.newPage());
await page.goto(`${BASE_URL}/app`, { waitUntil: "domcontentloaded" });
try {
  await page.waitForLoadState("networkidle", { timeout: 10000 });
} catch {}
await page.waitForTimeout(2000);

// Try clicking every plausible menu trigger so the sidebar shows.
const triggers = [
  'button[aria-label*="menu" i]',
  'button[aria-label*="open" i]',
  'button[aria-label*="conversations" i]',
  'button[aria-label*="historique" i]',
  'button[aria-label*="sidebar" i]',
  'header button:has(svg)',
];
for (const sel of triggers) {
  const btns = await page.locator(sel).all();
  for (const btn of btns) {
    await btn.click({ trial: false, timeout: 1000 }).catch(() => {});
    await page.waitForTimeout(300);
  }
}
await page.waitForTimeout(1500);

// Dump every /app/c/* link's visible text.
const links = await page.locator('a[href^="/app/c/"]').all();
console.log(`\nFound ${links.length} conversation link(s):\n`);
for (let i = 0; i < links.length; i++) {
  const href = await links[i].getAttribute("href");
  const text = (await links[i].innerText()).replace(/\s+/g, " ").trim();
  console.log(`  [${i}] ${href}  →  "${text}"`);
}

// Also dump any element whose text contains "patron" or "cac" (case-insensitive).
console.log("\nMatches for /patron|cac/i anywhere on page:");
const matches = await page
  .locator('body')
  .getByText(/patron|cac/i)
  .all();
for (let i = 0; i < Math.min(matches.length, 20); i++) {
  const t = (await matches[i].innerText().catch(() => "")).replace(/\s+/g, " ").trim();
  if (t) console.log(`  · "${t.slice(0, 120)}"`);
}

await ctx.close();
