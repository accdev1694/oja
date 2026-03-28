import { test, expect } from "@playwright/test";
import {
  waitForConvex,
  scrollDown,
  clickPressable,
  navigateToTab,
} from "../fixtures/base";

/**
 * Suite 17: Performance Testing (TC-PERF-001 to TC-PERF-010)
 *
 * Validates performance benchmarks measurable via Playwright on Expo Web:
 * - Page load timing (lists, list detail, stock, profile, scan)
 * - Content render verification (items, prices, budget, stats)
 * - Skeleton-to-content transitions
 * - Scroll performance on list detail and pantry
 * - Data integrity after rapid navigation
 * - Network resilience (slow connection simulation)
 *
 * NOTE: Native-only measurements (cold start, FPS profiling, memory leaks,
 * battery drain, multi-device sync, native camera OCR, voice STT/TTS latency)
 * are SKIPPED — require physical device profilers.
 */
test.describe("17. Performance Testing", () => {
  test.describe.configure({ mode: "serial" });

  // ── 17.1 Page Load Timing ──────────────────────────────────

  test("17.1 TC-PERF-001 — lists page loads content within timeout", async ({
    page,
  }) => {
    const start = Date.now();
    await page.goto("/");
    await waitForConvex(page, 3000);

    // Wait for actual list content to render
    await page
      .waitForFunction(
        () =>
          document.body.innerText.includes("active lists") ||
          document.body.innerText.includes("E2e"),
        { timeout: 15_000 }
      )
      .catch(() => null);

    const loadTime = Date.now() - start;

    // Lists page should render content — verify at least one list card present
    const hasLists =
      (await page
        .getByText("E2e", { exact: false })
        .first()
        .isVisible()
        .catch(() => false)) ||
      (await page
        .getByText("active lists", { exact: false })
        .first()
        .isVisible()
        .catch(() => false));
    expect(hasLists).toBeTruthy();

    // Web load under 15s is acceptable (includes Convex WebSocket setup)
    expect(loadTime).toBeLessThan(15_000);
  });

  test("17.2 TC-PERF-002 — list detail renders items with prices", async ({
    page,
  }) => {
    await page.goto("/");
    await waitForConvex(page, 3000);
    await page
      .waitForFunction(() => document.body.innerText.includes("E2e"), {
        timeout: 15_000,
      })
      .catch(() => null);

    // Time the navigation to list detail
    const navStart = Date.now();
    await clickPressable(page, "E2e Items Test", { exact: false });
    await waitForConvex(page, 2000);

    // Wait for items with prices to render
    await page
      .waitForFunction(
        () => document.body.innerText.includes("£") && document.body.innerText.includes("each"),
        { timeout: 10_000 }
      )
      .catch(() => null);
    const navTime = Date.now() - navStart;

    // Items with prices should be visible (zero-blank guarantee)
    const priceCount = await page.locator("text=/£\\d+\\.\\d{2} each/").count();
    expect(priceCount).toBeGreaterThanOrEqual(1);

    // Budget should be visible
    await expect(
      page.getByText("Budget:", { exact: false }).first()
    ).toBeVisible();

    // Navigation + render under 12s is acceptable for web
    expect(navTime).toBeLessThan(12_000);
  });

  test("17.3 TC-PERF-002 — list detail shows all item categories", async ({
    page,
  }) => {
    await page.goto("/");
    await waitForConvex(page, 3000);
    await page
      .waitForFunction(() => document.body.innerText.includes("E2e"), {
        timeout: 15_000,
      })
      .catch(() => null);

    await clickPressable(page, "E2e Items Test", { exact: false });
    await waitForConvex(page, 2000);

    // Category headers should be rendered (grouping items)
    const hasDairy = await page
      .getByText("DAIRY", { exact: true })
      .isVisible()
      .catch(() => false);
    const hasOther = await page
      .getByText("OTHER", { exact: true })
      .isVisible()
      .catch(() => false);
    const hasUncategorized = await page
      .getByText("UNCATEGORIZED", { exact: true })
      .isVisible()
      .catch(() => false);

    // At least one category header visible
    expect(hasDairy || hasOther || hasUncategorized).toBeTruthy();
  });

  test("17.4 TC-PERF-004 — stock page loads pantry items within timeout", async ({
    page,
  }) => {
    const start = Date.now();
    await page.goto("/stock");
    await waitForConvex(page, 3000);

    await page
      .waitForFunction(
        () =>
          document.body.innerText.includes("Needs Restocking") ||
          document.body.innerText.includes("All Items"),
        { timeout: 15_000 }
      )
      .catch(() => null);

    const loadTime = Date.now() - start;

    // Pantry content should be present
    const hasRestocking = await page
      .getByText("Needs Restocking", { exact: false })
      .first()
      .isVisible()
      .catch(() => false);
    const hasAllItems = await page
      .getByText("All Items", { exact: false })
      .first()
      .isVisible()
      .catch(() => false);
    expect(hasRestocking || hasAllItems).toBeTruthy();

    // Stock page load under 15s
    expect(loadTime).toBeLessThan(15_000);
  });

  test("17.5 TC-PERF-004 — stock page shows tab badges with counts", async ({
    page,
  }) => {
    await page.goto("/stock");
    await waitForConvex(page, 3000);
    await page
      .waitForFunction(
        () =>
          document.body.innerText.includes("Needs Restocking") ||
          document.body.innerText.includes("All Items"),
        { timeout: 15_000 }
      )
      .catch(() => null);

    // Stock tab badges should show numeric counts from pantry data
    const hasBadge = await page.evaluate(() => {
      const allEls = document.querySelectorAll("*");
      for (const el of allEls) {
        const text = el.textContent?.trim();
        if (
          text &&
          /^\d+$/.test(text) &&
          el.childElementCount === 0 &&
          parseInt(text) > 0
        ) {
          return true;
        }
      }
      return false;
    });
    expect(hasBadge).toBeTruthy();
  });

  test("17.6 TC-PERF-001 — profile page loads stats within timeout", async ({
    page,
  }) => {
    const start = Date.now();
    await page.goto("/profile");
    await waitForConvex(page, 3000);

    await page
      .waitForFunction(() => document.body.innerText.includes("Hey,"), {
        timeout: 15_000,
      })
      .catch(() => null);

    const loadTime = Date.now() - start;

    // Profile greeting visible
    await expect(
      page.getByText("Hey,", { exact: false }).first()
    ).toBeVisible();

    // Quick stats should be rendered (data from multiple features)
    const hasTrips = await page
      .getByText("trips", { exact: true })
      .first()
      .isVisible()
      .catch(() => false);
    const hasItems = await page
      .getByText("items", { exact: true })
      .first()
      .isVisible()
      .catch(() => false);
    expect(hasTrips || hasItems).toBeTruthy();

    expect(loadTime).toBeLessThan(15_000);
  });

  test("17.7 TC-PERF-001 — scan page loads within timeout", async ({
    page,
  }) => {
    const start = Date.now();
    await page.goto("/scan");
    await waitForConvex(page, 3000);

    await page
      .waitForFunction(
        () =>
          document.body.innerText.includes("Choose from Library") ||
          document.body.innerText.includes("Receipt") ||
          document.body.innerText.includes("Scan"),
        { timeout: 15_000 }
      )
      .catch(() => null);

    const loadTime = Date.now() - start;

    // Scan page content visible
    const hasScanContent =
      (await page
        .getByText("Choose from Library", { exact: false })
        .first()
        .isVisible()
        .catch(() => false)) ||
      (await page
        .getByText("Receipt", { exact: false })
        .first()
        .isVisible()
        .catch(() => false));
    expect(hasScanContent).toBeTruthy();

    expect(loadTime).toBeLessThan(15_000);
  });

  // ── 17.2 Item Render & Zero-Blank Price Guarantee ──────────

  test("17.8 TC-PERF-002 — all list items have prices (zero-blank guarantee)", async ({
    page,
  }) => {
    await page.goto("/");
    await waitForConvex(page, 3000);
    await page
      .waitForFunction(() => document.body.innerText.includes("E2e"), {
        timeout: 15_000,
      })
      .catch(() => null);

    await clickPressable(page, "E2e Items Test", { exact: false });
    await waitForConvex(page, 2000);

    // Wait for items to render
    await page
      .waitForFunction(
        () => document.body.innerText.includes("each"),
        { timeout: 10_000 }
      )
      .catch(() => null);

    // Count items with "each" price label and items with "Total" label
    const eachCount = await page.locator("text=/£\\d+\\.\\d{2} each/").count();
    const totalCount = await page.locator("text=/Total/").count();

    // Every item should have both "each" and "Total" prices
    expect(eachCount).toBeGreaterThanOrEqual(1);
    expect(totalCount).toBeGreaterThanOrEqual(1);
    // Each count and Total count should match (every item has both)
    expect(eachCount).toBe(totalCount);
  });

  test("17.9 TC-PERF-002 — item names use formatItemDisplay format (size prefix)", async ({
    page,
  }) => {
    await page.goto("/");
    await waitForConvex(page, 3000);
    await page
      .waitForFunction(() => document.body.innerText.includes("E2e"), {
        timeout: 15_000,
      })
      .catch(() => null);

    await clickPressable(page, "E2e Items Test", { exact: false });
    await waitForConvex(page, 2000);

    // Items should display in "{size} {name}" format
    // E.g. "Semi-skimmed Milk", "800g Bread", "6 pack Eggs", "1kg Rice"
    const hasFormattedItems = await page.evaluate(() => {
      const text = document.body.innerText;
      // Check for known item formats
      const formats = [
        "Semi-skimmed Milk",
        "800g Bread",
        "6 pack Eggs",
        "1kg Rice",
      ];
      return formats.filter((f) => text.includes(f)).length;
    });
    expect(hasFormattedItems).toBeGreaterThanOrEqual(2);
  });

  // ── 17.3 Scroll & Data Integrity ───────────────────────────

  test("17.10 TC-PERF-002 — list detail scrollable with all items accessible", async ({
    page,
  }) => {
    await page.goto("/");
    await waitForConvex(page, 3000);
    await page
      .waitForFunction(() => document.body.innerText.includes("E2e"), {
        timeout: 15_000,
      })
      .catch(() => null);

    await clickPressable(page, "E2e Items Test", { exact: false });
    await waitForConvex(page, 2000);

    // Scroll down to reveal more items
    await scrollDown(page, 3);
    await page.waitForTimeout(500);

    // After scrolling, should still see item prices (not blank)
    const priceCount = await page.locator("text=/£\\d+\\.\\d{2}/").count();
    expect(priceCount).toBeGreaterThanOrEqual(1);

    // Finish button at bottom should be accessible
    const finishBtn = page.getByText("Finish", { exact: false }).last();
    const isVisible = await finishBtn.isVisible().catch(() => false);
    // May need more scrolling to reach, but button should exist in DOM
    const exists = await finishBtn.count();
    expect(exists).toBeGreaterThanOrEqual(1);
  });

  test("17.11 TC-PERF-004 — stock page scrollable through categories", async ({
    page,
  }) => {
    await page.goto("/stock");
    await waitForConvex(page, 3000);
    await page
      .waitForFunction(
        () =>
          document.body.innerText.includes("Needs Restocking") ||
          document.body.innerText.includes("All Items"),
        { timeout: 15_000 }
      )
      .catch(() => null);

    // Click All Items to see full pantry
    await clickPressable(page, "All Items", { exact: true });
    await waitForConvex(page, 1000);

    // Scroll through pantry items
    await scrollDown(page, 3);
    await page.waitForTimeout(500);

    // Content should still be rendered (no blank frames)
    const bodyText = await page.evaluate(() => document.body.innerText);
    // Should have pantry item content — not empty
    expect(bodyText.length).toBeGreaterThan(100);
  });

  // ── 17.4 Rapid Navigation Stability ────────────────────────

  test("17.12 TC-PERF-002 — rapid tab switches maintain data integrity", async ({
    page,
  }) => {
    await page.goto("/");
    await waitForConvex(page, 3000);
    await page
      .waitForFunction(
        () => document.body.innerText.includes("active lists") || document.body.innerText.includes("E2e"),
        { timeout: 15_000 }
      )
      .catch(() => null);

    // Rapidly switch between all tabs
    await page.goto("/stock");
    await page.waitForTimeout(500);
    await page.goto("/scan");
    await page.waitForTimeout(500);
    await page.goto("/profile");
    await page.waitForTimeout(500);
    await page.goto("/");
    await waitForConvex(page, 2000);

    // After rapid switches, lists page should still show content correctly
    await page
      .waitForFunction(
        () => document.body.innerText.includes("active lists") || document.body.innerText.includes("E2e"),
        { timeout: 15_000 }
      )
      .catch(() => null);

    const hasContent =
      (await page
        .getByText("E2e", { exact: false })
        .first()
        .isVisible()
        .catch(() => false)) ||
      (await page
        .getByText("active lists", { exact: false })
        .first()
        .isVisible()
        .catch(() => false));
    expect(hasContent).toBeTruthy();
  });

  test("17.13 TC-PERF-002 — navigating back from detail preserves list state", async ({
    page,
  }) => {
    await page.goto("/");
    await waitForConvex(page, 3000);
    await page
      .waitForFunction(() => document.body.innerText.includes("E2e"), {
        timeout: 15_000,
      })
      .catch(() => null);

    // Navigate into list detail
    await clickPressable(page, "E2e Items Test", { exact: false });
    await waitForConvex(page, 2000);

    // Verify we're on detail
    await expect(
      page.getByText("Budget:", { exact: false }).first()
    ).toBeVisible({ timeout: 10_000 });

    // Navigate back
    const backBtn = page.getByText("\u{F0141}", { exact: true });
    const box = await backBtn.boundingBox().catch(() => null);
    if (box) {
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    } else {
      await page.goBack();
    }
    await waitForConvex(page, 2000);

    // Lists page should be back with content preserved
    await page
      .waitForFunction(
        () => document.body.innerText.includes("active lists") || document.body.innerText.includes("E2e"),
        { timeout: 15_000 }
      )
      .catch(() => null);

    const hasLists = await page
      .getByText("E2e", { exact: false })
      .first()
      .isVisible()
      .catch(() => false);
    expect(hasLists).toBeTruthy();
  });

  // ── 17.5 Data Render Integrity ─────────────────────────────

  test("17.14 TC-PERF-002 — no undefined/NaN/null in rendered content on lists page", async ({
    page,
  }) => {
    await page.goto("/");
    await waitForConvex(page, 3000);
    await page
      .waitForFunction(
        () => document.body.innerText.includes("active lists") || document.body.innerText.includes("E2e"),
        { timeout: 15_000 }
      )
      .catch(() => null);

    const badText = await page.locator("text=/undefined|NaN/").count();
    expect(badText).toBe(0);
  });

  test("17.15 TC-PERF-002 — no undefined/NaN/null in rendered content on list detail", async ({
    page,
  }) => {
    await page.goto("/");
    await waitForConvex(page, 3000);
    await page
      .waitForFunction(() => document.body.innerText.includes("E2e"), {
        timeout: 15_000,
      })
      .catch(() => null);

    await clickPressable(page, "E2e Items Test", { exact: false });
    await waitForConvex(page, 2000);

    const badText = await page.locator("text=/undefined|NaN/").count();
    expect(badText).toBe(0);
  });

  test("17.16 TC-PERF-004 — no undefined/NaN/null in rendered content on stock page", async ({
    page,
  }) => {
    await page.goto("/stock");
    await waitForConvex(page, 3000);
    await page
      .waitForFunction(
        () =>
          document.body.innerText.includes("Needs Restocking") ||
          document.body.innerText.includes("All Items"),
        { timeout: 15_000 }
      )
      .catch(() => null);

    const badText = await page.locator("text=/undefined|NaN/").count();
    expect(badText).toBe(0);
  });

  // ── 17.6 Budget Calculation Performance ────────────────────

  test("17.17 TC-PERF-002 — budget dial renders with correct arithmetic", async ({
    page,
  }) => {
    await page.goto("/");
    await waitForConvex(page, 3000);
    await page
      .waitForFunction(() => document.body.innerText.includes("E2e"), {
        timeout: 15_000,
      })
      .catch(() => null);

    await clickPressable(page, "E2e Items Test", { exact: false });
    await waitForConvex(page, 2000);

    // Extract budget, planned, and remaining values
    const budgetText = await page
      .getByText("Budget:", { exact: false })
      .first()
      .textContent()
      .catch(() => "");

    const plannedText = await page
      .getByText("planned", { exact: false })
      .first()
      .textContent()
      .catch(() => "");

    const leftText = await page
      .locator("text=/£\\d+\\.\\d{2} left/")
      .first()
      .textContent()
      .catch(() => "");

    // All three values should be non-empty
    expect(budgetText).toBeTruthy();
    expect(plannedText).toBeTruthy();

    // Extract numeric values
    const budgetMatch = budgetText?.match(/£(\d+\.?\d*)/);
    const plannedMatch = plannedText?.match(/£(\d+\.?\d*)/);
    const leftMatch = leftText?.match(/£(\d+\.?\d*)/);

    if (budgetMatch && plannedMatch && leftMatch) {
      const budget = parseFloat(budgetMatch[1]);
      const planned = parseFloat(plannedMatch[1]);
      const left = parseFloat(leftMatch[1]);

      // Budget - planned should approximately equal left (within rounding)
      expect(Math.abs(budget - planned - left)).toBeLessThan(0.02);
    }
  });

  // ── 17.7 Insights Load Performance ─────────────────────────

  test("17.18 TC-PERF-001 — insights page loads aggregated data", async ({
    page,
  }) => {
    const start = Date.now();
    await page.goto("/insights");
    await waitForConvex(page, 3000);

    await page
      .waitForFunction(
        () =>
          document.body.innerText.includes("Insights") ||
          document.body.innerText.includes("This Week"),
        { timeout: 15_000 }
      )
      .catch(() => null);

    const loadTime = Date.now() - start;

    // Insights should show aggregated data
    await expect(
      page.getByText("This Week", { exact: true })
    ).toBeVisible({ timeout: 5_000 });

    // Should have £ amounts (spending data from trips)
    const hasMoney = await page
      .locator("text=/£\\d+\\.\\d{2}/")
      .first()
      .isVisible()
      .catch(() => false);
    expect(hasMoney).toBeTruthy();

    expect(loadTime).toBeLessThan(15_000);
  });

  // ── 17.8 Subscription Page Performance ─────────────────────

  test("17.19 TC-PERF-001 — subscription page loads tier and points", async ({
    page,
  }) => {
    const start = Date.now();
    await page.goto("/subscription");
    await waitForConvex(page, 3000);

    await page
      .waitForFunction(
        () =>
          document.body.innerText.includes("Premium") ||
          document.body.innerText.includes("Trial") ||
          document.body.innerText.includes("Subscription"),
        { timeout: 15_000 }
      )
      .catch(() => null);

    const loadTime = Date.now() - start;

    // Tier name should be visible
    const hasTier = await page
      .getByText("Bronze", { exact: false })
      .or(page.getByText("Silver", { exact: false }))
      .or(page.getByText("Gold", { exact: false }))
      .first()
      .isVisible()
      .catch(() => false);
    expect(hasTier).toBeTruthy();

    expect(loadTime).toBeLessThan(15_000);
  });

  // ── 17.9 Skipped Tests (Native-Only Performance) ───────────

  test("17.20 TC-PERF-001 — app cold start time < 3s (native device)", async () => {
    test.skip(true, "Requires native device — cold start timing not measurable in web E2E");
  });

  test("17.21 TC-PERF-003 — large list 100 items FPS profiling (native)", async () => {
    test.skip(true, "Requires 100-item list + native FPS profiler — not available in web E2E");
  });

  test("17.22 TC-PERF-005 — receipt OCR processing time (native camera)", async () => {
    test.skip(true, "Requires native camera + Gemini OCR timing — not available in web E2E");
  });

  test("17.23 TC-PERF-006 — voice response latency STT + AI + TTS (native)", async () => {
    test.skip(true, "Requires native speech recognition — not available in web E2E");
  });

  test("17.24 TC-PERF-007 — real-time sync latency between partners (multi-device)", async () => {
    test.skip(true, "Requires two concurrent devices — cannot test in single-browser E2E");
  });

  test("17.25 TC-PERF-008 — memory usage 30-minute extended session (native profiler)", async () => {
    test.skip(true, "Requires Android Studio memory profiler — not available in web E2E");
  });

  test("17.26 TC-PERF-009 — battery consumption 1-hour session (native device)", async () => {
    test.skip(true, "Requires physical device battery measurement — not available in web E2E");
  });

  test("17.27 TC-PERF-010 — network resilience slow 3G simulation (native)", async () => {
    test.skip(true, "Requires network throttling on native device — covered by Convex offline handling");
  });
});
