/**
 * One-off diagnostic — dump candidate selectors for the demo workflow:
 * chat input, submit button, LinkedIn selector, schedule button.
 */
import { chromium } from "playwright";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const ctx = await chromium.launchPersistentContext(path.join(ROOT, ".preview-browser"), {
  headless: true,
  viewport: { width: 1280, height: 800 },
});

const page = ctx.pages()[0] || (await ctx.newPage());
await page.goto("http://localhost:3000/app", { waitUntil: "domcontentloaded" });
try { await page.waitForLoadState("networkidle", { timeout: 10000 }); } catch {}
await page.waitForTimeout(2500);

console.log("\n=== URL:", page.url());

// Look for input fields / textareas
const inputs = await page.locator('textarea, input[type="text"]').all();
console.log(`\n--- Inputs (${inputs.length}) ---`);
for (let i = 0; i < Math.min(inputs.length, 10); i++) {
  const el = inputs[i];
  const placeholder = await el.getAttribute("placeholder").catch(() => null);
  const name = await el.getAttribute("name").catch(() => null);
  const id = await el.getAttribute("id").catch(() => null);
  const aria = await el.getAttribute("aria-label").catch(() => null);
  const visible = await el.isVisible().catch(() => false);
  console.log(`  [${i}] visible=${visible} placeholder=${JSON.stringify(placeholder)} name=${name} id=${id} aria=${aria}`);
}

// Buttons (top 30)
const buttons = await page.locator('button').all();
console.log(`\n--- Buttons (${buttons.length}, first 30) ---`);
for (let i = 0; i < Math.min(buttons.length, 30); i++) {
  const el = buttons[i];
  const text = (await el.innerText().catch(() => "")).slice(0, 40).replace(/\s+/g, " ");
  const aria = await el.getAttribute("aria-label").catch(() => null);
  const visible = await el.isVisible().catch(() => false);
  if (visible && (text || aria)) console.log(`  [${i}] "${text}" aria=${aria}`);
}

// Look for LinkedIn / schedule keywords anywhere
console.log("\n--- Body text matching /linkedin|schedule|programm|generate/i (first 15) ---");
const matches = await page.locator('body').getByText(/linkedin|schedule|programm|generate|publier/i).all();
for (let i = 0; i < Math.min(matches.length, 15); i++) {
  const t = (await matches[i].innerText().catch(() => "")).slice(0, 80).replace(/\s+/g, " ");
  if (t) console.log(`  · "${t}"`);
}

await ctx.close();
