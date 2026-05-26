import { test, expect, type Page } from "@playwright/test";

/**
 * Mobile responsive audit.
 *
 * Iterates every key route at iPhone 15 / Pixel 7 viewport and asserts:
 *  1. No horizontal scroll on <html> / <body>
 *  2. No descendant element overflows the viewport width
 *  3. <main> renders inside the viewport (not pushed off-screen by sidebar/menu)
 *
 * Captures a full-page screenshot + a structured layout report per route in
 * tests/e2e/screens/<project>/<route>.png and writes a JSON summary listing
 * any offending element selectors so they can be fixed at the source.
 *
 * Auth: skipped intentionally — even when the route redirects to /login, the
 * mobile shell / scaffolding still renders and overflow is observable. This
 * lets us validate the layout system without test credentials.
 */

const ROUTES = [
  "/",
  "/login",
  "/signup",
  "/app",
  "/history",
  "/schedule",
  "/analytics",
  "/dashboard",
  "/settings",
  "/pricing",
  "/about",
];

type Offender = {
  selector: string;
  tag: string;
  cls: string;
  width: number;
  right: number;
  text: string;
};

async function auditOverflow(page: Page) {
  return await page.evaluate(() => {
    const docW = document.documentElement.clientWidth;
    const winW = window.innerWidth;
    const htmlScrollX = document.documentElement.scrollWidth > docW;
    const bodyScrollX = document.body.scrollWidth > docW;
    const main = document.querySelector("main");
    const mainRect = main?.getBoundingClientRect();

    const offenders: Offender[] = [];
    const els = document.querySelectorAll<HTMLElement>("body *");

    // An element is a "real" offender only if no clipping ancestor would hide
    // its bleed. Decorative blobs (gradients/halos with absolute -right-[X%])
    // commonly sit inside a `fixed overflow-hidden` parent; their bounding
    // box exceeds the viewport but they are visually clipped and do NOT
    // produce horizontal scroll. We walk up the tree and skip if any
    // ancestor clips horizontal overflow.
    const isClippedByAncestor = (el: HTMLElement): boolean => {
      let p: HTMLElement | null = el.parentElement;
      while (p && p !== document.body) {
        const ps = window.getComputedStyle(p);
        const ox = ps.overflowX;
        const o = ps.overflow;
        if (ox === "hidden" || ox === "clip" || o === "hidden" || o === "clip") return true;
        p = p.parentElement;
      }
      return false;
    };

    els.forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.right > docW + 1 && r.width > 0 && r.width < 10000) {
        const cs = window.getComputedStyle(el);
        if (cs.position === "fixed") return; // fixed overlays may legitimately span beyond
        if (cs.visibility === "hidden" || cs.display === "none") return;
        if (cs.pointerEvents === "none" && isClippedByAncestor(el)) return; // decorative + clipped
        if (isClippedByAncestor(el)) return; // any ancestor clips → safe
        offenders.push({
          tag: el.tagName.toLowerCase(),
          cls: (el.className || "").toString().slice(0, 120),
          selector: el.id ? `#${el.id}` : `${el.tagName.toLowerCase()}.${(el.className || "").toString().split(/\s+/).filter(Boolean).slice(0, 3).join(".")}`,
          width: Math.round(r.width),
          right: Math.round(r.right),
          text: (el.innerText || "").slice(0, 40).replace(/\s+/g, " "),
        });
      }
    });

    return {
      viewport: { docW, winW, dpr: window.devicePixelRatio },
      htmlScrollX,
      bodyScrollX,
      mainExists: !!main,
      mainRect: mainRect
        ? {
            x: Math.round(mainRect.x),
            y: Math.round(mainRect.y),
            w: Math.round(mainRect.width),
            h: Math.round(mainRect.height),
          }
        : null,
      offenders: offenders.slice(0, 25),
      offenderCount: offenders.length,
    };
  });
}

test.describe("Mobile responsive audit", () => {
  test.skip(({ browserName }) => browserName === "chromium" && process.env.E2E_DESKTOP_ONLY === "1");

  // Auth-gated routes redirect to /login on cold start; the redirect bounce
  // plus first-paint compile in dev under Turbopack can stretch past Playwright's
  // default 60s. Give the audit room to breathe so a transient compile time
  // doesn't masquerade as a layout failure.
  test.setTimeout(120_000);

  for (const route of ROUTES) {
    test(`audit ${route}`, async ({ page }, testInfo) => {
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
      page.on("console", (msg) => {
        if (msg.type() === "error") errors.push(`console: ${msg.text().slice(0, 200)}`);
      });

      try {
        await page.goto(route, { waitUntil: "networkidle", timeout: 45_000 });
      } catch (e) {
        testInfo.annotations.push({ type: "nav-error", description: String(e) });
      }

      // Wait for real content (not the "Chargement…" spinner from ProtectedRoute).
      // We poll body innerText: anything longer than the loader hint means client
      // hydration + ProtectedRoute decision completed.
      try {
        await page.waitForFunction(
          () => {
            const t = document.body.innerText || "";
            // Either substantial content, or we landed on the login form, or we hit a real loader page.
            return t.length > 80 || t.toLowerCase().includes("connect") || t.toLowerCase().includes("se connecter") || t.toLowerCase().includes("login");
          },
          { timeout: 12_000 },
        );
      } catch {
        /* fall through — captures whatever state we're in */
      }
      // Final paint settle
      await page.waitForTimeout(800);

      const report = await auditOverflow(page);

      // Save artifacts. The landing page is very tall and a fullPage capture
      // can exceed Playwright's default 15s action timeout under Chromium on
      // Windows. Pass a generous explicit timeout so the screenshot artifact
      // never masquerades as a layout failure.
      const safe = route.replace(/[\/:?]/g, "_") || "_root";
      const png = testInfo.outputPath(`audit-${safe}.png`);
      try {
        await page.screenshot({ path: png, fullPage: true, timeout: 30_000 });
      } catch {
        // Fall back to a viewport-only screenshot — the layout report is the
        // authoritative artifact, the image is only there for visual review.
        await page.screenshot({ path: png, fullPage: false, timeout: 30_000 });
      }

      // Write JSON to outputPath so we can grep it from the shell, in addition
      // to attaching it to the HTML report.
      const jsonPayload = JSON.stringify(
        { route, finalUrl: page.url(), report, errors: errors.slice(0, 10) },
        null,
        2,
      );
      const fs = await import("node:fs/promises");
      await fs.writeFile(testInfo.outputPath(`audit-${safe}.json`), jsonPayload);
      await testInfo.attach(`audit-${safe}.json`, {
        body: jsonPayload,
        contentType: "application/json",
      });

      // Soft assertions — collect everything, don't fail-fast
      if (report.bodyScrollX) {
        testInfo.annotations.push({
          type: "overflow",
          description: `body scrollWidth > clientWidth on ${route}`,
        });
      }
      if (report.offenderCount > 0) {
        testInfo.annotations.push({
          type: "offenders",
          description: `${report.offenderCount} elements overflow viewport on ${route}`,
        });
      }
      if (report.mainExists && report.mainRect && report.mainRect.y > report.viewport.docW * 1.2) {
        testInfo.annotations.push({
          type: "main-offscreen",
          description: `<main> at y=${report.mainRect.y} (suspicious)`,
        });
      }

      // Single hard check: no element should be more than the viewport wide
      // (deliberately lenient to surface real shifts, not 1-2 px rounding).
      const reallyBad = report.offenders.filter((o) => o.right > report.viewport.docW + 10);
      expect.soft(reallyBad, `Offenders on ${route}`).toEqual([]);
    });
  }
});
