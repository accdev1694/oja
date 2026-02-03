import { test as base, expect, Page } from "@playwright/test";
import path from "path";

/**
 * Custom test fixtures for Oja E2E tests.
 *
 * React Native Web renders with `data-testid` from `testID` props,
 * but Oja currently uses no testIDs. We rely on:
 *   - page.getByText() — visible text
 *   - page.getByPlaceholder() — input placeholders
 *   - page.getByRole() — semantic roles
 *   - page.locator('[class*="..."]') — CSS class fragments
 *
 * Native features mocked on web:
 *   - Haptics: no-op (expo-haptics stubs on web)
 *   - Camera: not available, skip camera tests
 *   - Gestures: use click-based alternatives
 */

// Extend base test with app-specific helpers
export const test = base.extend<{
  appPage: Page;
}>({
  appPage: async ({ page }, use) => {
    // Ensure we're on the app
    await page.goto("/");
    // NOTE: Don't use networkidle — Convex WebSocket keeps connection alive forever
    await waitForConvex(page);
    await dismissOverlays(page);
    await use(page);
  },
});

export { expect };

/** Dismiss any onboarding overlays (e.g. "Swipe to adjust stock" tooltip) */
export async function dismissOverlays(page: Page) {
  // The SwipeOnboardingOverlay shows a "Got it" button
  const gotIt = page.getByText("Got it", { exact: true });
  if (await gotIt.isVisible({ timeout: 2000 }).catch(() => false)) {
    await gotIt.click();
    await page.waitForTimeout(500);
  }
}

/** Wait for Convex real-time data to settle */
export async function waitForConvex(page: Page, ms = 2000) {
  await page.waitForTimeout(ms);
}

/**
 * Click a React Native Web Pressable/TouchableOpacity by text content.
 *
 * Playwright's native .click() on text inside RNW Pressable does NOT reliably
 * trigger the onPress handler. This helper walks up from the text element to
 * find the clickable ancestor (cursor: pointer) and triggers a real click.
 *
 * @param page - Playwright page
 * @param text - Exact text content to find
 * @param options - Optional: exact match (default true), timeout
 */
export async function clickPressable(
  page: Page,
  text: string,
  options?: { exact?: boolean; timeout?: number }
): Promise<void> {
  const exact = options?.exact ?? true;
  const timeout = options?.timeout ?? 10_000;

  // Wait for the text to be visible first
  const textLocator = exact
    ? page.getByText(text, { exact: true })
    : page.getByText(text, { exact: false });
  await textLocator.first().waitFor({ state: "visible", timeout });

  // Use JS evaluate to find and click the pressable ancestor
  const clicked = await page.evaluate(
    ({ searchText, exactMatch }) => {
      const allEls = document.querySelectorAll("*");
      for (const el of allEls) {
        const elText = el.textContent?.trim();
        const matches = exactMatch
          ? elText === searchText
          : elText?.includes(searchText);

        if (matches && el.childElementCount <= 1) {
          let target: Element | null = el;
          while (target) {
            if (
              target instanceof HTMLElement &&
              getComputedStyle(target).cursor === "pointer"
            ) {
              target.click();
              return true;
            }
            target = target.parentElement;
          }
        }
      }
      return false;
    },
    { searchText: text, exactMatch: exact }
  );

  if (!clicked) {
    // Fallback: try native click
    await textLocator.first().click();
  }
}

/** Ensure the app is loaded and ready (handles blank page / slow init) */
export async function ensureAppLoaded(page: Page) {
  // Wait for content to appear
  const hasContent = await page.evaluate(() => {
    return document.body.innerText.trim().length > 10;
  }).catch(() => false);

  if (!hasContent) {
    await page.reload();
    // NOTE: Don't use networkidle — Convex WebSocket keeps connection alive forever
    await waitForConvex(page, 3000);
  }

  // Dismiss any overlays
  await dismissOverlays(page);
}

/** Navigate to a specific tab by tapping the tab bar */
export async function navigateToTab(
  page: Page,
  tab: "Pantry" | "Lists" | "Scan" | "Profile"
) {
  // Map tabs to their URL routes for direct navigation
  const tabRoutes: Record<string, string> = {
    Pantry: "/",
    Lists: "/lists",
    Scan: "/scan",
    Profile: "/profile",
  };

  // Navigate directly via URL — more reliable than clicking tab labels
  await page.goto(tabRoutes[tab]);
  // NOTE: Don't use networkidle — Convex WebSocket keeps connection alive forever
  await waitForConvex(page, 1500);

  // Dismiss overlays that might intercept clicks
  await dismissOverlays(page);

  // Verify the tab content loaded by checking for tab-specific content
  const tabVerify: Record<string, () => Promise<boolean>> = {
    Pantry: () => page.getByText("My Stock", { exact: false }).isVisible().catch(() => false),
    Lists: () => page.getByText("Shopping Lists", { exact: false }).isVisible().catch(() => false),
    Scan: () => page.getByText("Scan", { exact: false }).first().isVisible().catch(() => false),
    Profile: () => page.getByText("Profile", { exact: false }).first().isVisible().catch(() => false),
  };

  // If tab content didn't load, try clicking tab label as fallback
  const contentLoaded = await tabVerify[tab]();
  if (!contentLoaded) {
    const tabMap: Record<string, string> = {
      Pantry: "Stock",
      Lists: "Lists",
      Scan: "Scan",
      Profile: "Profile",
    };
    const tabLabel = page.getByText(tabMap[tab], { exact: true }).last();
    await tabLabel.waitFor({ state: "visible", timeout: 10_000 }).catch(() => {});
    await tabLabel.click();
    // NOTE: Don't use networkidle — Convex WebSocket keeps connection alive forever
    await waitForConvex(page, 1000);
  }

  // Dismiss any overlays that appear on the new tab
  await dismissOverlays(page);
}

/** Scroll down to find off-screen content */
export async function scrollDown(page: Page, times = 3) {
  for (let i = 0; i < times; i++) {
    await page.mouse.wheel(0, 500);
    await page.waitForTimeout(300);
  }
}

/** Check that no element shows "undefined", "null", or "NaN" as text */
export async function assertNoBlankPrices(page: Page) {
  const badValues = await page
    .locator("text=/undefined|NaN|\\$null/")
    .count();
  expect(badValues).toBe(0);
}

// ── Receipt Upload Helpers ─────────────────────────────────

/** Absolute path to the receipts folder */
const RECEIPTS_DIR = path.resolve(__dirname, "../../receipts");

/** All available real receipt images (19 files) */
export const RECEIPT_FILES = {
  // Small JPEG — good for quick tests
  quick: path.join(RECEIPTS_DIR, "recpt.jpeg"),
  // Full-size JPGs from real UK store receipts (Jan 2026)
  receipt01: path.join(RECEIPTS_DIR, "20260131_215157.jpg"),
  receipt02: path.join(RECEIPTS_DIR, "20260131_215230.jpg"),
  receipt03: path.join(RECEIPTS_DIR, "20260131_215316.jpg"),
  receipt04: path.join(RECEIPTS_DIR, "20260131_215408.jpg"),
  receipt05: path.join(RECEIPTS_DIR, "20260131_215438.jpg"),
  receipt06: path.join(RECEIPTS_DIR, "20260131_215459.jpg"),
  receipt07: path.join(RECEIPTS_DIR, "20260131_215525.jpg"),
  receipt08: path.join(RECEIPTS_DIR, "20260131_215532.jpg"),
  receipt09: path.join(RECEIPTS_DIR, "20260131_215546.jpg"),
  receipt10: path.join(RECEIPTS_DIR, "20260131_215616.jpg"),
  receipt11: path.join(RECEIPTS_DIR, "20260131_215629.jpg"),
  receipt12: path.join(RECEIPTS_DIR, "20260131_215644.jpg"),
  receipt13: path.join(RECEIPTS_DIR, "20260131_215709.jpg"),
  receipt14: path.join(RECEIPTS_DIR, "20260131_215728.jpg"),
  receipt15: path.join(RECEIPTS_DIR, "20260131_215838.jpg"),
  receipt16: path.join(RECEIPTS_DIR, "20260131_215907.jpg"),
  receipt17: path.join(RECEIPTS_DIR, "20260131_220150.jpg"),
  receipt18: path.join(RECEIPTS_DIR, "20260131_220217.jpg"),
};

/**
 * Upload a receipt image via the hidden file input on the Scan screen.
 *
 * expo-image-picker renders a hidden <input type="file"> on web.
 * We bypass the native picker and inject the file directly.
 *
 * @param page - Playwright page (must be on the Scan tab)
 * @param receiptPath - Absolute path to a receipt image
 * @returns true if upload + parse started successfully
 */
export async function uploadReceipt(
  page: Page,
  receiptPath: string
): Promise<boolean> {
  // expo-image-picker on web creates a hidden file input
  // Trigger the "Choose from Library" button first to ensure the input exists
  const libraryBtn = page
    .getByText("Choose from Library", { exact: false })
    .or(page.getByText("Photo Library", { exact: false }));

  if (await libraryBtn.isVisible()) {
    // Set the file on the hidden input BEFORE clicking (Playwright intercepts)
    const fileInput = page.locator('input[type="file"]').first();

    // Use fileChooser pattern: start waiting for the file chooser,
    // click the button, then set the file
    const [fileChooser] = await Promise.all([
      page.waitForEvent("filechooser"),
      libraryBtn.click(),
    ]);
    await fileChooser.setFiles(receiptPath);

    await page.waitForTimeout(1000);
    return true;
  }

  return false;
}

/**
 * Complete the receipt upload flow: select file → use photo → wait for parsing.
 *
 * @param page - Playwright page (must be on the Scan tab)
 * @param receiptPath - Absolute path to a receipt image
 * @param options - Optional: link to a list, timeout for parsing
 */
export async function uploadAndParseReceipt(
  page: Page,
  receiptPath: string,
  options?: {
    linkToList?: string;
    parseTimeout?: number;
  }
): Promise<void> {
  const timeout = options?.parseTimeout ?? 60_000;

  // Link to a list if requested
  if (options?.linkToList) {
    const linkSelector = page.getByText("Link to shopping list", { exact: false });
    if (await linkSelector.isVisible()) {
      await linkSelector.click();
      await page.getByText(options.linkToList, { exact: false }).click();
      await page.waitForTimeout(300);
    }
  }

  // Upload the receipt image
  const uploaded = await uploadReceipt(page, receiptPath);
  if (!uploaded) {
    throw new Error("Failed to upload receipt — library button not visible");
  }

  // Click "Use Photo" to start the upload+parse flow
  const usePhotoBtn = page.getByText("Use Photo", { exact: true });
  // Increased timeout from 5s to 10s for slower headless rendering
  if (await usePhotoBtn.isVisible({ timeout: 10_000 })) {
    await usePhotoBtn.click();
  }

  // Wait for parsing to start
  const parsingIndicator = page.getByText("Reading your receipt", {
    exact: false,
  });
  await parsingIndicator
    .waitFor({ state: "visible", timeout: 10_000 })
    .catch(() => {}); // May be too fast to catch

  // Wait for parsing to complete (navigates to confirm screen or shows error)
  await page
    .waitForURL(/receipt\/.*\/confirm|scan/, { timeout })
    .catch(async () => {
      // If we're still on scan page, parsing may have failed
      const stillParsing = await parsingIndicator.isVisible();
      if (stillParsing) {
        throw new Error("Receipt parsing timed out");
      }
    });
}

/**
 * Get all receipt file paths as an array (for iterating in tests).
 */
export function getAllReceiptPaths(): string[] {
  return Object.values(RECEIPT_FILES);
}

/**
 * Get a random receipt path (for variety in tests).
 */
export function getRandomReceiptPath(): string {
  const paths = getAllReceiptPaths();
  return paths[Math.floor(Math.random() * paths.length)];
}
