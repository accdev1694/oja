import { defineConfig, devices } from "@playwright/test";
import path from "path";
import dotenv from "dotenv";

// Load e2e env vars (Clerk keys, test credentials)
dotenv.config({ path: path.resolve(__dirname, "e2e/.env.e2e") });

/**
 * Playwright config for Oja E2E tests against Expo Web.
 *
 * Run:   npx playwright test
 * UI:    npx playwright test --ui
 * Debug: npx playwright test --debug
 * Report: npx playwright show-report
 */
export default defineConfig({
  testDir: path.resolve(__dirname, "e2e"),
  outputDir: path.resolve(__dirname, "test-results"),
  fullyParallel: false, // Serial — tests build on auth state
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker — shared auth state
  timeout: 60_000,
  expect: { timeout: 10_000 },

  reporter: [
    ["html", { outputFolder: "playwright-report", open: "never" }],
    ["list"],
  ],

  use: {
    baseURL: "http://localhost:8081",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    viewport: { width: 430, height: 932 }, // iPhone 15 Pro Max
  },

  projects: [
    // Setup: authenticate and save state
    {
      name: "setup",
      testMatch: /fixtures\/auth\.setup\.ts/,
    },

    // Authenticated tests (all features)
    {
      name: "chromium",
      testMatch: /tests\/.*\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 430, height: 932 },
        storageState: path.resolve(__dirname, "e2e/.auth/user.json"),
      },
      dependencies: ["setup"],
    },
  ],

  // Auto-start Expo Web dev server
  webServer: {
    command: "npx expo start --web --port 8081",
    url: "http://localhost:8081",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
