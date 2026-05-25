import { authedTest as test, expect, hasAuthCredentials } from "../fixtures/auth";

test.describe("Authed flows — main app surface", () => {
  test.skip(
    !hasAuthCredentials,
    "Populate E2E_TEST_EMAIL/PASSWORD in .env.e2e to enable authed flows.",
  );

  test("dashboard mounts and stays past the auth gate", async ({ authedPage: page }) => {
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator("body")).toBeVisible();
  });

  test("analytics mounts past the auth gate", async ({ authedPage: page }) => {
    await page.goto("/analytics", { waitUntil: "domcontentloaded" });
    await expect(page).not.toHaveURL(/\/login/);
  });

  test("settings mounts past the auth gate", async ({ authedPage: page }) => {
    await page.goto("/settings", { waitUntil: "domcontentloaded" });
    await expect(page).not.toHaveURL(/\/login/);
  });

  test("chat surface reachable from /app", async ({ authedPage: page }) => {
    await page.goto("/app", { waitUntil: "domcontentloaded" });
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator("body")).toBeVisible();
  });
});
