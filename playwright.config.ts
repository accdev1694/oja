import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Test Configuration for Oja PWA
 *
 * Configured for:
 * - Mobile-first viewports (375x667, 390x844)
 * - 4 worker shards for CI parallelism
 * - Trace capture on failure
 * - Offline simulation support
 */
export default defineConfig({
  // Test directory
  testDir: './tests/e2e',

  // Timeout settings
  timeout: 30000,
  expect: {
    timeout: 5000,
  },

  // Run tests in files in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Parallel workers - 4 for CI sharding
  workers: process.env.CI ? 4 : undefined,

  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
    ...(process.env.CI ? [['github'] as const] : []),
  ],

  // Shared settings for all projects
  use: {
    // Base URL for tests
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3009',

    // Collect trace on failure
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure
    video: 'on-first-retry',

    // Default viewport (iPhone SE)
    viewport: { width: 375, height: 667 },
  },

  // Test projects for different viewports and browsers
  projects: [
    // Mobile viewports (primary - PWA focus)
    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 5'],
        viewport: { width: 393, height: 851 },
      },
    },
    {
      name: 'mobile-safari',
      use: {
        ...devices['iPhone 12'],
        viewport: { width: 390, height: 844 },
      },
    },
    // Small mobile
    {
      name: 'mobile-small',
      use: {
        ...devices['iPhone SE'],
        viewport: { width: 375, height: 667 },
      },
    },
    // Tablet
    {
      name: 'tablet',
      use: {
        ...devices['iPad Mini'],
        viewport: { width: 768, height: 1024 },
      },
    },
    // Desktop (secondary)
    {
      name: 'desktop-chrome',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
    },
  ],

  // Web server configuration
  webServer: {
    command: 'npm run build && npm run start -- -p 3009',
    url: 'http://localhost:3009',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    env: {
      NEXT_PUBLIC_SUPABASE_URL:
        process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321',
      NEXT_PUBLIC_SUPABASE_ANON_KEY:
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-anon-key',
    },
  },

  // Output directory for test artifacts
  outputDir: 'test-results/',
});
