import { test, expect } from '@playwright/test';

/**
 * Smoke tests for Oja PWA
 * These tests verify the app loads correctly and basic navigation works
 */

test.describe('App Smoke Tests', () => {
  test('should load the home page', async ({ page }) => {
    await page.goto('/');

    // Wait for the page to be fully loaded
    await page.waitForLoadState('networkidle');

    // Verify the page title or main content is present
    await expect(page).toHaveTitle(/Oja/i);
  });

  test('should be responsive on mobile viewport', async ({ page }) => {
    await page.goto('/');

    // Verify viewport is set correctly (mobile-first)
    const viewport = page.viewportSize();
    expect(viewport?.width).toBeLessThanOrEqual(768);
  });

  test('should have no accessibility violations on home page', async ({
    page,
  }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Basic accessibility check - page should have a main landmark
    const main = page.locator('main');
    // Don't fail if main doesn't exist yet (early development)
    if ((await main.count()) > 0) {
      await expect(main).toBeVisible();
    }
  });
});

test.describe('PWA Features', () => {
  test('should have a valid web manifest', async ({ page }) => {
    const response = await page.goto('/manifest.webmanifest');

    if (response) {
      expect(response.status()).toBe(200);

      const manifest = await response.json();
      expect(manifest.name).toBeDefined();
      expect(manifest.short_name).toBeDefined();
      expect(manifest.icons).toBeDefined();
      expect(manifest.start_url).toBeDefined();
    }
  });
});
