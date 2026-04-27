/**
 * Capture the 5 "Aperçu produit" previews shown on the landing page.
 *
 * Strategy: persistent Chromium context (`.preview-browser/`) keeps Firebase
 * auth between runs. First run is headed — log in manually once. Subsequent
 * runs reuse the session and can be headless.
 *
 * Usage:
 *   1. Terminal A:  npm run dev
 *   2. Terminal B:  npm run generate-previews            (headed, manual login)
 *                   npm run generate-previews:headless   (after first login)
 *
 * Outputs replace public/images/screenshots/{app,chat,history,schedule,dashboard}.png
 */

import { chromium } from "playwright";
import { mkdir, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const OUTPUT_DIR = path.join(ROOT, "public", "images", "screenshots");
const USER_DATA_DIR = path.join(ROOT, ".preview-browser");

/* Aspect ratio matches AnimatedMacBook carousel (96:45 ≈ 1920×900). */
const VIEWPORT = { width: 1920, height: 900 };

/* Screen ID → route. Filenames follow MockupScreens.tsx mapping. */
const PAGES = [
  { id: "app",       route: "/app",       file: "app.png"       },
  { id: "chat",      route: "/chat",      file: "chat.png"      },
  { id: "history",   route: "/history",   file: "history.png"   },
  { id: "schedule",  route: "/schedule",  file: "schedule.png"  },
  { id: "dashboard", route: "/dashboard", file: "dashboard.png" },
];

const headless = process.argv.includes("--headless");
const LOGIN_TIMEOUT_MS = 5 * 60 * 1000;
const NETWORK_IDLE_MS = 1500;
const SETTLE_MS = 1800;

/**
 * Capture language. Default "en" so the landing page shows English UI.
 * The user's Firestore profile is updated to this value (the Settings UI does
 * both — local state + Firestore — so the change persists across runs).
 * Override with `PREVIEW_LANG=fr npm run generate-previews`.
 */
const LANGUAGE = (process.env.PREVIEW_LANG || "en").toLowerCase();
/* Must match `languageNames` in lib/i18n/index.ts (used as button labels). */
const LANGUAGE_LABELS = {
  en: "English (US)",
  fr: "Français",
  es: "Español",
  de: "Deutsch",
  it: "Italiano",
  pt: "Português",
  nl: "Nederlands",
  zh: "中文",
  ja: "日本語",
  ko: "한국어",
};

async function ensureDevServerRunning() {
  try {
    const res = await fetch(BASE_URL, { signal: AbortSignal.timeout(3000) });
    if (!res.ok && res.status !== 404 && res.status !== 307) {
      throw new Error(`Dev server returned ${res.status}`);
    }
  } catch (err) {
    console.error(`\n✗ Dev server unreachable at ${BASE_URL}`);
    console.error(`  Start it first: npm run dev\n  (${err.message})`);
    process.exit(1);
  }
}

async function isLoggedIn(page) {
  const url = page.url();
  return !url.includes("/login") && !url.includes("/signup") && !url.endsWith("/");
}

async function waitForManualLogin(page) {
  console.log("\n→ Not logged in. Log in manually in the opened browser.");
  console.log("  Waiting up to 5 minutes for redirect away from /login…\n");
  await page.waitForURL(
    (url) => !url.pathname.startsWith("/login") && !url.pathname.startsWith("/signup"),
    { timeout: LOGIN_TIMEOUT_MS },
  );
  console.log("✓ Logged in.\n");
}

async function setLanguage(page, lang) {
  const label = LANGUAGE_LABELS[lang];
  if (!label) {
    console.warn(`  ! Unknown language "${lang}", skipping switch`);
    return;
  }
  console.log(`  · setting language → ${label}`);
  await page.goto(`${BASE_URL}/settings`, { waitUntil: "domcontentloaded" });
  try {
    await page.waitForLoadState("networkidle", { timeout: 10000 });
  } catch {}
  await page.waitForTimeout(800);

  /* Each language button has the localized name as text (e.g. "English (US)"). */
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const button = page.locator("button").filter({ hasText: new RegExp(escaped) }).first();
  await button.waitFor({ state: "attached", timeout: 8000 });
  await button.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await button.click();
  /* Wait for the Firestore write + toast confirmation to settle. */
  await page.waitForTimeout(2000);
}

async function captureOne(page, { id, route, file }) {
  const dest = path.join(OUTPUT_DIR, file);
  process.stdout.write(`  · ${id.padEnd(10)} → ${route} `);

  await page.goto(`${BASE_URL}${route}`, { waitUntil: "domcontentloaded" });

  /* Wait for network idle, then a settle delay so charts/animations finish. */
  try {
    await page.waitForLoadState("networkidle", { timeout: 15000 });
  } catch {
    /* Some pages keep a long-poll open (e.g. Firestore listener) — fine. */
  }
  await page.waitForTimeout(SETTLE_MS);

  /* Hide scrollbars to match the existing screenshots' clean look. */
  await page.addStyleTag({
    content: `
      ::-webkit-scrollbar { display: none !important; }
      * { scrollbar-width: none !important; }
      html, body { overflow: hidden !important; }
    `,
  });

  await page.screenshot({
    path: dest,
    type: "png",
    clip: { x: 0, y: 0, width: VIEWPORT.width, height: VIEWPORT.height },
  });

  console.log("✓");
}

async function main() {
  await ensureDevServerRunning();
  await mkdir(OUTPUT_DIR, { recursive: true });
  await mkdir(USER_DATA_DIR, { recursive: true });

  const firstRun = await access(path.join(USER_DATA_DIR, "Default"))
    .then(() => false)
    .catch(() => true);

  if (firstRun && headless) {
    console.error("\n✗ First run cannot be headless — manual login required.");
    console.error("  Run: npm run generate-previews\n");
    process.exit(1);
  }

  console.log(`\n📸 Generating 5 previews ${headless ? "(headless)" : "(headed)"}`);
  console.log(`   Source : ${BASE_URL}`);
  console.log(`   Output : ${path.relative(ROOT, OUTPUT_DIR)}\n`);

  const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless,
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
    /* Disable cache between runs so fresh data is rendered. */
    bypassCSP: true,
  });

  const page = context.pages()[0] || (await context.newPage());

  /* Bootstrap: visit /app, prompt login if needed. */
  await page.goto(`${BASE_URL}/app`, { waitUntil: "domcontentloaded" }).catch(() => {});
  await page.waitForTimeout(NETWORK_IDLE_MS);

  if (!(await isLoggedIn(page))) {
    if (headless) {
      console.error("\n✗ Session expired. Re-run headed: npm run generate-previews\n");
      await context.close();
      process.exit(1);
    }
    await waitForManualLogin(page);
  }

  /* Force the requested language before capturing — the Settings click also
   * persists `language` to the Firestore profile, so subsequent page loads
   * render in this language. */
  try {
    await setLanguage(page, LANGUAGE);
  } catch (err) {
    console.warn(`  ! Language switch failed: ${err.message}`);
  }

  for (const target of PAGES) {
    try {
      await captureOne(page, target);
    } catch (err) {
      console.log("✗");
      console.error(`    ${err.message}`);
    }
  }

  await context.close();
  console.log("\n✓ Done. 5 previews saved to public/images/screenshots/\n");
}

main().catch((err) => {
  console.error("\n✗ Fatal:", err);
  process.exit(1);
});
