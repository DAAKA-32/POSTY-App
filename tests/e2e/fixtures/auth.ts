import { test as base, expect, type Page } from "@playwright/test";
import dotenv from "dotenv";
import path from "node:path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.e2e") });

const EMAIL = process.env.E2E_TEST_EMAIL;
const PASSWORD = process.env.E2E_TEST_PASSWORD;

export const hasAuthCredentials = Boolean(EMAIL && PASSWORD);

export async function signIn(page: Page) {
  if (!hasAuthCredentials) {
    throw new Error(
      "E2E_TEST_EMAIL / E2E_TEST_PASSWORD not set — populate .env.e2e (see .env.e2e.example).",
    );
  }
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.locator('input[type="email"]').first().fill(EMAIL!);
  await page.locator('input[type="password"]').first().fill(PASSWORD!);
  const submitButton = page
    .getByRole("button", { name: /(sign in|log in|connexion|se connecter)/i })
    .first();
  await submitButton.click();
  await page.waitForURL((url) => !/\/login(\?|$)/.test(url.toString()), {
    timeout: 30_000,
  });
}

export const authedTest = base.extend<{ authedPage: Page }>({
  authedPage: async ({ page }, use) => {
    await signIn(page);
    await use(page);
  },
});

export { expect };
