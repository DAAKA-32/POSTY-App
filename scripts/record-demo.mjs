/**
 * Record a real Posty product demo for the landing-page "See in action" tab.
 *
 *   1. Open /app in English (localStorage preflight)
 *   2. Type a prompt in the chat input
 *   3. Submit
 *   4. Hard cut to a pre-loaded conversation that already has AI responses
 *      (avoids real ~10s generation latency we can't fit in a 6-8s clip)
 *   5. Click Publish on the best response → modal opens
 *   6. Linger on the publish modal
 *
 * Output: public/videos/posty-demo.mp4 (H.264, ~6-8s, 1280×720, autoloop-ready)
 *
 * Requires: dev server on :3000, .preview-browser/ logged in, ffmpeg on PATH.
 */

import { chromium } from "playwright";
import { existsSync, readdirSync, statSync, mkdirSync, unlinkSync, rmSync } from "node:fs";
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

// Pre-existing conversation with two generated AI responses.
const EXISTING_CONVO = "/app/c/82glk1q6Qq7Zpo0ZYtEa"; // "Patrons du CAC40"

// ─────────────────────────── helpers ───────────────────────────
async function settle(page, ms) {
  await page.waitForTimeout(ms);
}

function findLatestWebm(dir) {
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".webm"))
    .map((f) => ({ f, mtime: statSync(path.join(dir, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
  return files[0] ? path.join(dir, files[0].f) : null;
}

// ─────────────────────────── main ──────────────────────────────
async function ensureEnglishUI() {
  // First-pass setup — switch the user's Firestore profile language to
  // English so the recording context loads in English. No video here.
  console.log("→ Pre-pass: switching account language to English (persistent)…");
  const setupCtx = await chromium.launchPersistentContext(USER_DATA, {
    headless: true,
    viewport: { width: 1280, height: 720 },
  });
  const page = setupCtx.pages()[0] || (await setupCtx.newPage());
  await page.goto(`${BASE}/settings`, { waitUntil: "domcontentloaded" });
  try { await page.waitForLoadState("networkidle", { timeout: 8000 }); } catch {}
  await page.waitForTimeout(800);

  // Click the language button labelled "English (US)"
  const enBtn = page.locator('button').filter({ hasText: /English \(US\)/ }).first();
  if (await enBtn.count()) {
    await enBtn.scrollIntoViewIfNeeded();
    await enBtn.click().catch(() => {});
    // Wait for Firestore write + toast
    await page.waitForTimeout(2000);
    console.log("  ✓ Language set to English");
  } else {
    console.warn("  ! English button not found; recording may render in current language");
  }
  await setupCtx.close();
}

async function main() {
  // Reset tmp dir
  if (existsSync(TMP)) rmSync(TMP, { recursive: true, force: true });
  mkdirSync(TMP, { recursive: true });
  mkdirSync(OUT_DIR, { recursive: true });

  await ensureEnglishUI();

  console.log("→ Launching browser with video recording (1280×720)…");
  const ctx = await chromium.launchPersistentContext(USER_DATA, {
    headless: false,
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
    recordVideo: { dir: TMP, size: { width: 1280, height: 720 } },
    bypassCSP: true,
  });

  // Force the UI to English on first paint via localStorage preflight.
  await ctx.addInitScript(() => {
    try {
      localStorage.setItem("posty-language", "en");
    } catch {}
  });

  const page = ctx.pages()[0] || (await ctx.newPage());

  /* ─── Beat 1: open /app, prompt input is visible ───────────── */
  console.log("→ Opening /app");
  await page.goto(`${BASE}/app`, { waitUntil: "domcontentloaded" });
  try { await page.waitForLoadState("networkidle", { timeout: 8000 }); } catch {}
  await settle(page, 1100);

  /* ─── Beat 2: focus the message input and type the prompt ─── */
  console.log("→ Typing the prompt");
  const input = page.locator('textarea[aria-label="Message input"], textarea[placeholder]').last();
  await input.scrollIntoViewIfNeeded();
  await input.click();
  await settle(page, 300);
  await input.type("Give me LinkedIn post ideas about AI productivity", { delay: 38 });
  await settle(page, 500);

  /* ─── Beat 3: submit ──────────────────────────────────────── */
  console.log("→ Submitting");
  await page.keyboard.press("Enter");
  await settle(page, 950);

  /* ─── Beat 4: hard cut to pre-loaded conversation ─────────── */
  console.log("→ Cutting to pre-loaded conversation (instant 'generation' result)");
  await page.goto(`${BASE}${EXISTING_CONVO}`, { waitUntil: "domcontentloaded" });
  try { await page.waitForLoadState("networkidle", { timeout: 8000 }); } catch {}
  await settle(page, 1700);

  /* ─── Beat 5: click Publish on the first AI response card ── */
  console.log("→ Clicking the LinkedIn Publish button on the best response");
  const publishBtn = page
    .locator('button:has-text("Publish"), button[aria-label*="Publish" i], button:has-text("Publier")')
    .first();
  if (await publishBtn.count()) {
    await publishBtn.scrollIntoViewIfNeeded();
    await settle(page, 350);
    await publishBtn.click({ timeout: 4000 }).catch(() => {});
  } else {
    console.warn("  ! Publish button not found, continuing without it");
  }
  await settle(page, 1700);

  /* ─── Beat 6: linger on the modal so the viewer reads it ──── */
  await settle(page, 1200);

  console.log("→ Closing context (this flushes the WebM to disk)…");
  await ctx.close();

  /* ─── Find the WebM produced ──────────────────────────────── */
  const webm = findLatestWebm(TMP);
  if (!webm) {
    console.error("✗ No WebM file found in tmp dir.");
    process.exit(1);
  }
  console.log(`✓ Raw recording: ${path.relative(ROOT, webm)}`);

  /* ─── ffmpeg: convert + trim + 1.05× speed for snappiness ─── */
  console.log("→ Converting WebM → MP4 with ffmpeg (trim + speed-up)");
  // Drop the first 0.4s (browser flash) and last 0.3s, lightly speed up
  // the playback so the loop fits a tight 7-8s window.
  // -an: no audio. -movflags +faststart: progressive playback for the web.
  const cmd = [
    "ffmpeg",
    "-y",
    "-ss", "0.4",
    "-i", `"${webm}"`,
    "-vf", '"setpts=0.95*PTS,scale=1280:720:flags=lanczos"',
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

  /* ─── Cleanup tmp ─────────────────────────────────────────── */
  rmSync(TMP, { recursive: true, force: true });

  const sizeMB = (statSync(OUT_MP4).size / 1024 / 1024).toFixed(2);
  console.log(`\n✓ Saved → ${path.relative(ROOT, OUT_MP4)}  (${sizeMB} MB)`);
  console.log("  Next: integrate into app/page.tsx video mode (replaces CInactionDemo).");
}

main().catch((err) => {
  console.error("✗ Fatal:", err);
  process.exit(1);
});
