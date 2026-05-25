import { test, expect } from "@playwright/test";

test.describe("Public surface smoke", () => {
  test("homepage renders without crashing", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveTitle(/posty/i);
    await expect(page.locator("body")).toBeVisible();

    expect(errors, `Uncaught page errors: ${errors.join(" | ")}`).toHaveLength(0);
  });

  test("/login renders the auth form with an email input", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    const emailInput = page.locator('input[type="email"]').first();
    await expect(emailInput).toBeVisible({ timeout: 15_000 });
  });

  test("/signup renders the auth form", async ({ page }) => {
    await page.goto("/signup", { waitUntil: "domcontentloaded" });
    const emailInput = page.locator('input[type="email"]').first();
    await expect(emailInput).toBeVisible({ timeout: 15_000 });
  });
});

test.describe("Auth-gated routes redirect when signed out", () => {
  for (const route of ["/app", "/analytics", "/dashboard", "/settings"]) {
    test(`${route} bounces an anonymous visitor`, async ({ page }) => {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      // Either we land on /login, or a login UI mounts in-place.
      await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
      const url = page.url();
      const onLogin = /\/login(\?|$)/.test(url) || /\/$/.test(url);
      const emailInput = page.locator('input[type="email"]').first();
      const hasAuthUi = await emailInput.isVisible().catch(() => false);
      expect(onLogin || hasAuthUi, `Expected redirect to /login or auth UI for ${route}, got ${url}`).toBe(true);
    });
  }
});
