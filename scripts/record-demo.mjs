/**
 * Record a real Posty product demo for the landing-page "See in action" tab.
 *
 * The feature being showcased: Posty turns a one-line brief into polished,
 * ready-to-publish LinkedIn posts. The clip's prompt and result ALWAYS match,
 * because we first generate a fresh post off-camera for the exact prompt, then
 * record cutting to it (the old version cut to an unrelated "CAC40" post).
 *
 * Beats (real-time; ffmpeg trims the cold load + lightly speeds up afterwards):
 *   1. /app welcome — "Describe your idea and I'll generate 2 optimized versions"
 *   2. Type a short brief
 *   3. Enter → Posty starts thinking (live "AI is working" signal)
 *   4. The finished post(s) appear (cut to the freshly-generated, on-topic convo)
 *   5. Click Publish → "Publish your content" modal (ready-to-publish payoff)
 *   6. Return to the /app welcome so the last frame matches the first (clean loop)
 *
 * Output: public/videos/posty-demo.mp4 (H.264, ~10s, 1280×720, clean autoloop)
 * Requires: dev server on :3000, .preview-browser/ logged in, ffmpeg on PATH.
 *
 * Env: DEMO_PROMPT overrides the brief; DEMO_CONVO skips the off-camera
 * generation and reuses an existing /app/c/<id> (faster re-runs).
 */

import { chromium } from "playwright";
import { existsSync, readdirSync, statSync, mkdirSync, rmSync } from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const BASE = "http://localhost:3000";
const USER_DATA = path.join(ROOT, ".preview-browser");
const TMP = path.join(ROOT, "tmp-recording");
const OUT_DIR = path.join(ROOT, "public/videos");
const OUT_MP4 = path.join(OUT_DIR, "posty-demo.mp4");

/* The brief the user types. MUST stay under the input's 100-char cap. */
const PROMPT =
  process.env.DEMO_PROMPT ||
  "Write a LinkedIn post: I helped a SaaS client 2x revenue in 6 months.";
if (PROMPT.length > 100) {
  throw new Error(`DEMO_PROMPT is ${PROMPT.length} chars (> 100 cap): ${PROMPT}`);
}

const TARGET_SEC = 10;
const VIEWPORT = { width: 1280, height: 720 };
const MSG_INPUT = 'textarea[aria-label="Message input"]';
const STOP_BTN = 'button[aria-label="Arreter la generation"]';

// ─────────────────────────── helpers ───────────────────────────
const settle = (page, ms) => page.waitForTimeout(ms);

function findLatestWebm(dir) {
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".webm"))
    .map((f) => ({ f, mtime: statSync(path.join(dir, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
  return files[0] ? path.join(dir, files[0].f) : null;
}

const waitForComposer = (page) =>
  page.locator(MSG_INPUT).first().waitFor({ state: "visible", timeout: 25000 });

/* Runs on every page (init script): force English, pre-dismiss the overlays
 * that would pop in mid-recording (cookie banner ≈5s, app tour), and hide
 * dev-only chrome (Next.js build indicator) + scrollbars. */
function initScript() {
  try {
    localStorage.setItem("posty-language", "en");
    localStorage.setItem("posty_app_tour_seen", "true");
    localStorage.setItem(
      "posty_cookie_consent",
      JSON.stringify({
        essential: true,
        functional: true,
        analytics: true,
        timestamp: new Date().toISOString(),
        version: "2.0",
      }),
    );
  } catch {}
  const css =
    "::-webkit-scrollbar{display:none!important}*{scrollbar-width:none!important}" +
    "nextjs-portal,[data-nextjs-toast],[data-nextjs-dialog-overlay],[data-nextjs-build-indicator]{display:none!important}";
  const apply = () => {
    const s = document.createElement("style");
    s.textContent = css;
    (document.head || document.documentElement).appendChild(s);
  };
  if (document.head || document.documentElement) apply();
  document.addEventListener("DOMContentLoaded", apply);
}

/* Off-camera: generate a fresh post for PROMPT and return its /app/c/<id>. */
async function generateSeedConvo() {
  console.log("→ Setup: generating a fresh on-topic post (off-camera)…");
  const ctx = await chromium.launchPersistentContext(USER_DATA, {
    headless: true,
    viewport: VIEWPORT,
    bypassCSP: true,
  });
  await ctx.addInitScript(initScript);
  const page = ctx.pages()[0] || (await ctx.newPage());
  await page.goto(`${BASE}/app`, { waitUntil: "domcontentloaded" });
  try { await page.waitForLoadState("networkidle", { timeout: 10000 }); } catch {}
  await waitForComposer(page);
  const input = page.locator(MSG_INPUT).first();
  await input.click();
  await input.type(PROMPT, { delay: 18 }); // type (not fill) so React enables Send
  await page.waitForTimeout(250);
  await page.keyboard.press("Enter");
  // A completed generation persists + redirects to /app/c/<id> (after text and
  // any auto image embed). Wait for that URL change rather than guessing timings.
  let convoPath = "/app";
  try {
    await page.waitForURL((u) => u.pathname.startsWith("/app/c/"), { timeout: 120000 });
    await page.waitForTimeout(1500);
    convoPath = new URL(page.url()).pathname;
  } catch {
    convoPath = new URL(page.url()).pathname;
  }
  await ctx.close();
  if (!convoPath.startsWith("/app/c/")) {
    throw new Error(`Seed generation did not land on a conversation (got ${convoPath}). Re-run, or pass DEMO_CONVO=/app/c/<id>.`);
  }
  console.log(`  ✓ Seed conversation: ${convoPath}`);
  return convoPath;
}

// ─────────────────────────── main ──────────────────────────────
async function main() {
  if (existsSync(TMP)) rmSync(TMP, { recursive: true, force: true });
  mkdirSync(TMP, { recursive: true });
  mkdirSync(OUT_DIR, { recursive: true });

  const SEEDED = process.env.DEMO_CONVO || (await generateSeedConvo());

  console.log("→ Launching browser with video recording (1280×720)…");
  const tRecStart = Date.now(); // ≈ video t=0 (recording begins at context creation)
  const ctx = await chromium.launchPersistentContext(USER_DATA, {
    headless: false,
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
    recordVideo: { dir: TMP, size: VIEWPORT },
    bypassCSP: true,
  });
  await ctx.addInitScript(initScript);
  const page = ctx.pages()[0] || (await ctx.newPage());

  /* ─── Beat 1: /app welcome (loop anchor) ───────────────────── */
  console.log("→ Beat 1: /app welcome");
  await page.goto(`${BASE}/app`, { waitUntil: "domcontentloaded" });
  try { await page.waitForLoadState("networkidle", { timeout: 8000 }); } catch {}
  await waitForComposer(page);
  const tAnchor = Date.now(); // welcome is on-screen; everything before this is cold-load to trim
  await settle(page, 700);

  /* ─── Beat 2: type the brief ───────────────────────────────── */
  console.log("→ Beat 2: typing the brief");
  const input = page.locator(MSG_INPUT).first();
  await input.click();
  await settle(page, 250);
  await input.type(PROMPT, { delay: 28 });
  await settle(page, 300);

  /* ─── Beat 3: submit → live "thinking" ─────────────────────── */
  console.log("→ Beat 3: submit");
  await page.keyboard.press("Enter");
  await settle(page, 1500); // show the "Posty is thinking" signal

  /* ─── Beat 4: the finished post appears (SPA-nav to the fresh on-topic convo
   *     via the sidebar — a client-side nav avoids the full-page "POSTY" splash
   *     that a goto() would show). */
  console.log("→ Beat 4: revealing the generated post");
  const convoLink = page.locator(`a[href="${SEEDED}"]`).first();
  if (await convoLink.count()) {
    await convoLink.click().catch(() => {});
  } else {
    await page.goto(`${BASE}${SEEDED}`, { waitUntil: "domcontentloaded" });
  }
  try { await page.getByText("LinkedIn Preview").first().waitFor({ state: "visible", timeout: 12000 }); } catch {}
  await settle(page, 2800); // linger on the polished post(s) — the payoff

  /* ─── Beat 5: Publish → modal ──────────────────────────────── */
  console.log("→ Beat 5: clicking Publish");
  const publishBtn = page.getByRole("button", { name: /Publish/ }).last();
  if ((await publishBtn.count()) === 0) {
    console.warn("  ! Publish button not found — recording without the publish beat.");
  } else {
    await publishBtn.scrollIntoViewIfNeeded();
    await settle(page, 350);
    await publishBtn.click({ timeout: 4000 }).catch(() => {});
  }
  await settle(page, 1800); // linger on the publish-ready modal

  /* ─── Beat 6: return to rest (clean loop) — SPA-nav via "New post" so we
   *     land back on the empty welcome WITHOUT the full-page splash. */
  console.log("→ Beat 6: returning to the welcome rest state");
  await page.keyboard.press("Escape").catch(() => {});
  await settle(page, 300);
  const newPostBtn = page.getByRole("button", { name: /New post/i }).first();
  if (await newPostBtn.count()) {
    await newPostBtn.click().catch(() => {});
  } else {
    await page.goto(`${BASE}/app`, { waitUntil: "domcontentloaded" });
  }
  try { await waitForComposer(page); } catch {}
  // Let the welcome greeting + suggestion chips finish their entrance animation
  // so the final frame fully matches the opening one (clean loop).
  await settle(page, 1700);

  console.log("→ Closing context (flushes the WebM)…");
  await ctx.close();

  /* ─── ffmpeg: trim cold load, light speed-up, fades for loop ─ */
  const webm = findLatestWebm(TMP);
  if (!webm) {
    console.error("✗ No WebM file found in tmp dir.");
    process.exit(1);
  }
  const rawDur = parseFloat(
    execSync(`ffprobe -v error -show_entries format=duration -of default=nw=1:nokey=1 "${webm}"`).toString().trim(),
  );
  // Trim everything before the welcome appeared (the cold-load spinner).
  const startTrim = Math.max(0.2, (tAnchor - tRecStart) / 1000 - 0.4);
  const trimmed = Math.max(1, rawDur - startTrim);
  const factor = Math.min(1, TARGET_SEC / trimmed); // <1 = speed up; never slow down
  const outDur = trimmed * factor;
  const foStart = Math.max(0.2, outDur - 0.4);
  const vf =
    `setpts=${factor.toFixed(4)}*PTS,scale=1280:720:flags=lanczos,` +
    `fade=t=in:st=0:d=0.35,fade=t=out:st=${foStart.toFixed(2)}:d=0.4`;

  console.log(
    `→ ffmpeg: raw ${rawDur.toFixed(1)}s, trim ${startTrim.toFixed(1)}s (cold load), ` +
    `speed ×${(1 / factor).toFixed(2)} → ~${outDur.toFixed(1)}s + loop fades`,
  );
  const cmd = [
    "ffmpeg", "-y",
    "-ss", startTrim.toFixed(2),
    "-i", `"${webm}"`,
    "-vf", `"${vf}"`,
    "-an",
    "-c:v", "libx264",
    "-preset", "slow",
    "-crf", "23",
    "-pix_fmt", "yuv420p",
    "-movflags", "+faststart",
    `"${OUT_MP4}"`,
  ].join(" ");

  try {
    execSync(cmd, { stdio: "inherit" });
  } catch (err) {
    console.error("✗ ffmpeg failed:", err.message);
    process.exit(1);
  }
  rmSync(TMP, { recursive: true, force: true });

  const info = execSync(
    `ffprobe -v error -select_streams v:0 -show_entries stream=width,height -show_entries format=duration -of default=nw=1:nokey=1 "${OUT_MP4}"`,
  ).toString().trim().split("\n");
  const sizeMB = (statSync(OUT_MP4).size / 1024 / 1024).toFixed(2);
  console.log(`\n✓ Saved → ${path.relative(ROOT, OUT_MP4)}  (${sizeMB} MB)`);
  console.log(`  ${info.join(" / ")}  (width / height / duration)`);
}

main().catch((err) => {
  console.error("✗ Fatal:", err);
  process.exit(1);
});
