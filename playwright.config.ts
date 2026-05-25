import { defineConfig, devices } from "@playwright/test";

/**
 * Posty E2E config.
 *
 * Mobile-first: iPhone 15 (WebKit) matches the Capacitor iOS WKWebView surface,
 * Pixel 7 (Chromium) covers the PWA-on-Android case, Desktop Chrome is the
 * regression baseline. Native iOS plugin testing is out of scope here —
 * see project_capacitor_hybrid memory for the rationale.
 *
 * Override target with E2E_BASE_URL (e.g. https://staging.postyapp.ai).
 * Credentials live in .env.e2e (gitignored).
 */
const E2E_BASE_URL = process.env.E2E_BASE_URL || "http://localhost:3000";
const IS_LOCAL = E2E_BASE_URL.startsWith("http://localhost");

export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: "./test-results",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
  ],
  use: {
    baseURL: E2E_BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: "iphone-15",
      use: { ...devices["iPhone 15"] },
    },
    {
      name: "pixel-7",
      use: { ...devices["Pixel 7"] },
    },
    {
      name: "desktop-chrome",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 800 },
      },
    },
  ],
  webServer: IS_LOCAL
    ? {
        command: "npm run dev",
        url: E2E_BASE_URL,
        reuseExistingServer: true,
        timeout: 180_000,
        stdout: "ignore",
        stderr: "pipe",
      }
    : undefined,
});
