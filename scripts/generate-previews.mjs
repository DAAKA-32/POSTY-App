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

/* The "Conversation" slide shows a REAL conversation (a generated LinkedIn post)
 * instead of the empty /chat welcome — "Posty in action". This path is specific
 * to the capture account (emilien's); override with PREVIEW_CONVERSATION_PATH
 * when capturing from a different account. */
const CONVERSATION_PATH =
  process.env.PREVIEW_CONVERSATION_PATH || "/app/c/VPD4C0wyHjwAHRAjsIGy";

/* Screen ID → route. Filenames follow MockupScreens.tsx mapping.
 *
 * `fullBleed`: these pages cap their content with a centered `max-w-*`
 * container (history → max-w-5xl, schedule → max-w-6xl, dashboard → max-w-7xl).
 * At the 1920-wide capture viewport that leaves huge side gutters where the
 * page's ambient gradient shows through, so the screenshot looks tiny inside
 * the MacBook mockup. We neutralize that cap at capture time (see captureOne)
 * so the content fills the frame edge-to-edge like /app and /chat. We do NOT
 * set it on /app or /chat — their welcome content is intentionally centered. */
const PAGES = [
  { id: "app",       route: "/app",            file: "app.png"                   },
  { id: "chat",      route: CONVERSATION_PATH, file: "chat.png"                  },
  { id: "history",   route: "/history",   file: "history.png",   fullBleed: true },
  { id: "schedule",  route: "/schedule",  file: "schedule.png",  fullBleed: true },
  // Dashboard is NOT full-bleed: its layout (PageHeader + <main>) is capped at
  // max-w-7xl=1280 and the KPI cards look wrong stretched across 1920 (sparse,
  // unlike the real page). Instead capture at a 1440-wide viewport (still 96/45)
  // where the real centered layout naturally fills the frame with only thin
  // laptop-bezel margins. `waitForText` guards against the "Loading your
  // dashboard…" state (the page fetches stats before it renders).
  { id: "dashboard", route: "/dashboard", file: "dashboard.png",
    viewport: { width: 1440, height: 675 }, waitForText: "Generation activity" },
];

/* CSS injected (only for fullBleed pages) to drop the centered max-width cap on
 * the top-level content wrapper so it spans the full frame. Scoped to the large
 * `max-w-{2..7}xl` + `mx-auto` wrappers these pages use — narrow inner elements
 * (e.g. empty-state `max-w-sm mx-auto`) are untouched. */
const FULL_BLEED_CSS = `
  .mx-auto[class*="max-w-2xl"],
  .mx-auto[class*="max-w-3xl"],
  .mx-auto[class*="max-w-4xl"],
  .mx-auto[class*="max-w-5xl"],
  .mx-auto[class*="max-w-6xl"],
  .mx-auto[class*="max-w-7xl"] { max-width: 100% !important; }
`;

const headless = process.argv.includes("--headless");
const LOGIN_TIMEOUT_MS = 5 * 60 * 1000;
const NETWORK_IDLE_MS = 1500;
const SETTLE_MS = 1800;

/**
 * Capture language. Default "en" so the previews match the English-first
 * landing page. Applied by pre-seeding localStorage `posty-language`, which
 * wins over the account's profile language in LanguageContext — so no fragile
 * Settings-page click is needed. Override with `PREVIEW_LANG=fr …`.
 */
const LANGUAGE = (process.env.PREVIEW_LANG || "en").toLowerCase();

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

/**
 * Non-interactive login via PREVIEW_EMAIL / PREVIEW_PASSWORD env vars. Lets the
 * whole run go headless+autonomous (no manual first login). Credentials come
 * from the environment only — never hardcoded here. Returns false when no creds
 * are provided so the caller can fall back to manual login.
 */
async function autoLogin(page) {
  const email = process.env.PREVIEW_EMAIL;
  const password = process.env.PREVIEW_PASSWORD;
  if (!email || !password) return false;

  console.log(`→ Auto-login as ${email}…`);
  await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" });

  /* Two AuthPanel instances live in the DOM (mobile `md:hidden` + desktop
   * `hidden md:block`). At the 1920px capture viewport only the desktop one is
   * visible, so `:visible` avoids a strict-mode match on both copies. */
  const emailInput = page.locator('input[type="email"]:visible').first();
  await emailInput.waitFor({ state: "visible", timeout: 20000 });
  await emailInput.fill(email);
  await page.locator('input[type="password"]:visible').first().fill(password);
  await page.locator('button[type="submit"]:visible').first().click();

  /* On success AuthContext sets `user`; the login page's effect then
   * router.push()es away from /login (to /app or /onboarding). */
  await page.waitForURL(
    (url) => !url.pathname.startsWith("/login") && !url.pathname.startsWith("/signup"),
    { timeout: 60000 },
  );

  /* Firebase persists the auth user to IndexedDB (browserLocalPersistence).
   * Wait for that write to flush BEFORE any full-page navigation — otherwise a
   * reload rehydrates auth as null and ProtectedRoute bounces to /login, which
   * is how an entire run can silently capture the login page. */
  await waitForAuthPersisted(page).catch(() => {
    console.warn("  ! Auth-persist check timed out (will verify before capture).");
  });

  console.log("✓ Logged in (auto).\n");
  return true;
}

/**
 * Block until Firebase has written the signed-in user into its IndexedDB store
 * (`firebaseLocalStorageDb` → `firebaseLocalStorage`, key `firebase:authUser:*`).
 * Only inspects the DB once it actually exists, so it never races/creates a
 * malformed store ahead of Firebase.
 */
async function waitForAuthPersisted(page, timeoutMs = 20000) {
  await page.waitForFunction(
    async () => {
      let dbs = [];
      try {
        dbs = (await indexedDB.databases()) || [];
      } catch {
        return false;
      }
      if (!dbs.some((d) => d && d.name === "firebaseLocalStorageDb")) return false;
      return await new Promise((resolve) => {
        let req;
        try {
          req = indexedDB.open("firebaseLocalStorageDb");
        } catch {
          return resolve(false);
        }
        req.onerror = () => resolve(false);
        req.onsuccess = () => {
          const db = req.result;
          try {
            if (!db.objectStoreNames.contains("firebaseLocalStorage")) {
              db.close();
              return resolve(false);
            }
            const keysReq = db
              .transaction("firebaseLocalStorage", "readonly")
              .objectStore("firebaseLocalStorage")
              .getAllKeys();
            keysReq.onsuccess = () => {
              const keys = keysReq.result || [];
              db.close();
              resolve(keys.some((k) => String(k).includes("firebase:authUser")));
            };
            keysReq.onerror = () => {
              db.close();
              resolve(false);
            };
          } catch {
            try { db.close(); } catch {}
            resolve(false);
          }
        };
      });
    },
    { timeout: timeoutMs },
  );
}

/**
 * Safety gate: confirm the session survives a REAL full-page reload before we
 * capture anything. Returns false if /app keeps bouncing to /login, so the
 * caller can abort instead of silently screenshotting the login page.
 */
async function ensureSessionStable(page) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    await page.goto(`${BASE_URL}/app`, { waitUntil: "domcontentloaded" });
    try {
      await page.waitForLoadState("networkidle", { timeout: 12000 });
    } catch {}
    await page.waitForTimeout(1500);
    if (!page.url().includes("/login")) return true;
    console.log(`  · session not authenticated yet (attempt ${attempt}/4) — waiting…`);
    await page.waitForTimeout(2000);
  }
  return false;
}

async function captureOne(page, { id, route, file, fullBleed, viewport, waitForText }) {
  const dest = path.join(OUTPUT_DIR, file);
  process.stdout.write(`  · ${id.padEnd(10)} → ${route} `);

  /* Per-page viewport (defaults to the shared 1920×900). Set BEFORE navigation
   * so responsive breakpoints resolve at the capture width. */
  const vp = viewport || VIEWPORT;
  await page.setViewportSize(vp);

  await page.goto(`${BASE_URL}${route}`, { waitUntil: "domcontentloaded" });

  /* Wait for network idle, then a settle delay so charts/animations finish. */
  try {
    await page.waitForLoadState("networkidle", { timeout: 15000 });
  } catch {
    /* Some pages keep a long-poll open (e.g. Firestore listener) — fine. */
  }
  await page.waitForTimeout(SETTLE_MS);

  /* Wait past data-dependent loading screens (e.g. dashboard "Loading your
   * dashboard…") so we never capture a spinner. */
  if (waitForText) {
    try {
      await page.getByText(waitForText, { exact: false }).first()
        .waitFor({ state: "visible", timeout: 15000 });
    } catch {
      process.stdout.write(`(no "${waitForText}") `);
    }
  }

  /* If the App Router error boundary fired (Firestore hiccup, hydration
   * race, etc.), click "Try again" — usually one or two retries recover.
   * We detect by text rather than selector because the fallback markup is
   * shared across multiple `error.tsx` files in the route tree. */
  for (let attempt = 0; attempt < 3; attempt++) {
    const tryAgain = page.getByRole("button", { name: /try again|réessayer/i }).first();
    const isShown = await tryAgain.isVisible().catch(() => false);
    if (!isShown) break;
    process.stdout.write(`(retry${attempt + 1}) `);
    await tryAgain.click().catch(() => {});
    /* Generous settle on retry — the underlying cause is often a Firestore
     * read still resolving when the first render lands. */
    await page.waitForTimeout(SETTLE_MS * 2);
  }

  /* Hide scrollbars + the Next.js dev-mode "Issues" indicator that pops up
   * in the bottom-left corner during dev builds and pollutes every capture.
   * Note: we deliberately do NOT blanket-hide `[role="dialog"]` here — that
   * selector matches legitimate inline UI (popovers, sheets) in some pages
   * and removing them mid-render can put React into an error state. The
   * `PREVENT_MODAL_ENTRIES` localStorage priming is the load-bearing
   * suppression for the WhatsNewModal + tour carousel. */
  await page.addStyleTag({
    content: `
      ::-webkit-scrollbar { display: none !important; }
      * { scrollbar-width: none !important; }
      html, body { overflow: hidden !important; }
      nextjs-portal,
      [data-nextjs-toast],
      [data-nextjs-dialog-overlay],
      [data-nextjs-build-indicator] { display: none !important; }
      ${fullBleed ? FULL_BLEED_CSS : ""}
    `,
  });
  /* Let the layout reflow after dropping the max-width cap before the shot. */
  if (fullBleed) await page.waitForTimeout(400);

  await page.screenshot({
    path: dest,
    type: "png",
    clip: { x: 0, y: 0, width: vp.width, height: vp.height },
  });

  console.log("✓");
}

/**
 * Keys that gate dismissable overlays in the product. We pre-write them into
 * localStorage so the modals never mount during a capture run — much cleaner
 * than relying on CSS-hiding (which still leaves a darkened scrim flicker on
 * the first frame after navigation).
 *
 * When you ship a new release that uses a fresh `RELEASE_KEY` in
 * [WhatsNewModal.tsx](components/onboarding/WhatsNewModal.tsx), add the new
 * key here too.
 */
/**
 * Each entry is { key, value }. Values are not all dates — `posty_app_tour_seen`
 * is checked with `=== "true"` in [useAppTour.ts](hooks/app/useAppTour.ts), so
 * we must write the literal string "true" there, not an ISO timestamp.
 */
const PREVENT_MODAL_ENTRIES = [
  { key: "posty-whatsnew-2026-05-25", value: () => new Date().toISOString() }, // WhatsNewModal
  { key: "posty_app_tour_seen",       value: () => "true" },                   // 5-slide premium tour carousel
  // CookieBanner (RGPD) is device-level (localStorage/cookie), so a fresh
  // .preview-browser profile shows it ~5s after load and pollutes captures.
  // Pre-seed a valid "accept all" consent. Shape + version MUST match
  // CONSENT_VERSION in [CookieBanner.tsx](components/ui/CookieBanner.tsx).
  {
    key: "posty_cookie_consent",
    value: () =>
      JSON.stringify({
        essential: true,
        functional: true,
        analytics: true,
        timestamp: new Date().toISOString(),
        version: "2.0",
      }),
  },
  // Force the capture language regardless of the account's profile setting —
  // localStorage `posty-language` wins over profile in LanguageContext.
  { key: "posty-language", value: () => LANGUAGE },
];

async function suppressOverlayModals(page) {
  const payload = PREVENT_MODAL_ENTRIES.map((e) => ({ key: e.key, value: e.value() }));
  await page.evaluate((entries) => {
    try {
      for (const { key, value } of entries) {
        window.localStorage.setItem(key, value);
      }
    } catch {
      /* localStorage unavailable — fine, the CSS net in captureOne handles it */
    }
  }, payload);
}

async function main() {
  await ensureDevServerRunning();
  await mkdir(OUTPUT_DIR, { recursive: true });
  await mkdir(USER_DATA_DIR, { recursive: true });

  const firstRun = await access(path.join(USER_DATA_DIR, "Default"))
    .then(() => false)
    .catch(() => true);

  /* A headless first run is only viable when credentials are supplied for
   * non-interactive login. Without them, the first login must be done by hand
   * in a headed window. */
  const hasCreds = Boolean(process.env.PREVIEW_EMAIL && process.env.PREVIEW_PASSWORD);
  if (firstRun && headless && !hasCreds) {
    console.error("\n✗ First run cannot be headless without credentials.");
    console.error("  Run headed (npm run generate-previews), or set");
    console.error("  PREVIEW_EMAIL + PREVIEW_PASSWORD for non-interactive login.\n");
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
    /* Prefer non-interactive login when PREVIEW_EMAIL/PREVIEW_PASSWORD are set
     * (works headless). Fall back to manual login in a headed window. */
    const didAuto = await autoLogin(page).catch((err) => {
      console.warn(`  ! Auto-login failed: ${err.message}`);
      return false;
    });
    if (!didAuto) {
      if (headless) {
        console.error("\n✗ Not logged in and no PREVIEW_EMAIL/PREVIEW_PASSWORD set.");
        console.error("  Re-run headed (npm run generate-previews) or provide credentials.\n");
        await context.close();
        process.exit(1);
      }
      await waitForManualLogin(page);
    }
  }

  /* Prime localStorage so the WhatsNewModal + tour + help tooltips stay
   * dormant for the entire capture run. Must run AFTER login (origin is now
   * the dev server) and BEFORE any captured page mounts the modal effect. */
  try {
    await suppressOverlayModals(page);
  } catch (err) {
    console.warn(`  ! Modal-suppression priming failed: ${err.message}`);
  }

  /* Verify the session actually survives a full-page reload before capturing.
   * Refuses to silently screenshot the login page if auth didn't persist
   * (language is already forced via the posty-language priming above). */
  if (!(await ensureSessionStable(page))) {
    console.error("\n✗ Authenticated session did not persist across reload.");
    console.error("  Aborting so we don't capture the login page (check credentials / dev server).\n");
    await context.close();
    process.exit(1);
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
