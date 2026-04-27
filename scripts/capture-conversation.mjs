/**
 * Capture a single conversation page as `chat.png` for the landing carousel.
 *
 * Reuses the persistent Chromium context from generate-previews.mjs so the
 * Firebase session is shared (no re-login needed).
 *
 * Usage:
 *   node scripts/capture-conversation.mjs "patron du cac 40"
 *   node scripts/capture-conversation.mjs "patron du cac 40" --headed
 */

import { chromium } from "playwright";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const USER_DATA_DIR = path.join(ROOT, ".preview-browser");
const OUTPUT = path.join(ROOT, "public/images/screenshots/chat.png");
const VIEWPORT = { width: 1920, height: 900 };

const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const TARGET = args[0] || "patron du cac 40";
const headless = !process.argv.includes("--headed");

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function main() {
  const ctx = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless,
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
    bypassCSP: true,
  });

  const page = ctx.pages()[0] || (await ctx.newPage());

  console.log(`→ Opening ${BASE_URL}/app`);
  await page.goto(`${BASE_URL}/app`, { waitUntil: "domcontentloaded" });
  try {
    await page.waitForLoadState("networkidle", { timeout: 10000 });
  } catch {}
  await page.waitForTimeout(1500);

  if (page.url().includes("/login") || page.url().includes("/signup")) {
    console.error("✗ Not logged in. Run `npm run generate-previews` once headed to log in.");
    await ctx.close();
    process.exit(1);
  }

  const titleRegex = new RegExp(escapeRegex(TARGET), "i");

  // Click every plausible menu trigger so the slide-menu populates its DOM.
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
      await btn.click({ timeout: 1000 }).catch(() => {});
      await page.waitForTimeout(250);
    }
  }
  await page.waitForTimeout(1000);

  // Collect every /app/c/* link's text and find the matching one in JS —
  // Playwright's `filter({ hasText })` was returning 0 hits on hidden text,
  // so we match manually against the innerText.
  const allLinks = await page.locator('a[href^="/app/c/"]').all();
  console.log(`  · scanned ${allLinks.length} conversation link(s)`);
  let link = null;
  for (const candidate of allLinks) {
    const text = (await candidate.innerText().catch(() => "")).replace(/\s+/g, " ").trim();
    if (titleRegex.test(text)) {
      link = candidate;
      break;
    }
  }

  if (!link) {
    console.error(`✗ Could not find a conversation matching "${TARGET}".`);
    console.error(`  Run scripts/list-conversations.mjs to see exact titles.`);
    await ctx.close();
    process.exit(1);
  }

  // The link may live in a closed slide-menu (rendered but not visible).
  // Read its href and navigate directly — more reliable than trying to open
  // every menu variant.
  const href = await link.getAttribute("href");
  if (!href) {
    console.error(`✗ Found a matching link but it has no href.`);
    await ctx.close();
    process.exit(1);
  }
  console.log(`→ Navigating to ${href}`);
  await page.goto(`${BASE_URL}${href}`, { waitUntil: "domcontentloaded" });
  try {
    await page.waitForLoadState("networkidle", { timeout: 15000 });
  } catch {}
  await page.waitForTimeout(2000);

  // Match generate-previews.mjs behaviour: hide scrollbars for clean shot.
  await page.addStyleTag({
    content: `
      ::-webkit-scrollbar { display: none !important; }
      * { scrollbar-width: none !important; }
      html, body { overflow: hidden !important; }
    `,
  });

  await page.screenshot({
    path: OUTPUT,
    type: "png",
    clip: { x: 0, y: 0, width: VIEWPORT.width, height: VIEWPORT.height },
  });

  console.log(`✓ Saved → ${path.relative(ROOT, OUTPUT)}`);
  console.log(`  Final URL: ${page.url()}`);
  console.log(`  Reminder: bump PREVIEWS_VERSION in MockupScreens.tsx so the cache busts.`);

  await ctx.close();
}

main().catch((err) => {
  console.error("✗ Fatal:", err);
  process.exit(1);
});
