import { test, expect } from "@playwright/test";
import {
  waitForConvex,
  scrollDown,
  clickPressable,
} from "../fixtures/base";

/**
 * Suite 10: Points & Gamification (TC-POIN-001 to TC-POIN-020)
 *
 * Tests the Points History screen and gamification UI including:
 * - Points balance display (available, lifetime)
 * - Tier badge and progress
 * - Monthly earning scans tracker
 * - Transaction history list
 * - "How do Points work?" help section
 *
 * NOTE: Most TC-POIN tests are backend mutation/query tests
 * (processEarnPoints, redeemPoints, expireOldPoints, etc.)
 * and are SKIPPED here — they are covered by Jest unit tests.
 */
test.describe("10. Points & Gamification", () => {
  test.describe.configure({ mode: "serial" });

  async function gotoPointsHistory(page: import("@playwright/test").Page) {
    await page.goto("/points-history");
    await waitForConvex(page, 3000);
    await page
      .waitForFunction(
        () =>
          document.body.innerText.includes("Points History") ||
          document.body.innerText.includes("Available"),
        { timeout: 15_000 }
      )
      .catch(() => null);
  }

  // ── 10.1 Screen Load & Header ─────────────────────────────

  test("10.1 TC-POIN-007 — points history screen loads with header", async ({
    page,
  }) => {
    await gotoPointsHistory(page);

    await expect(
      page.getByText("Points History", { exact: true })
    ).toBeVisible({ timeout: 10_000 });
  });

  test("10.2 TC-POIN-007 — back button visible in header", async ({
    page,
  }) => {
    await gotoPointsHistory(page);

    const backBtn = page.getByText("\u{F0141}", { exact: true });
    await expect(backBtn).toBeVisible();
  });

  // ── 10.2 Points Balance Summary ───────────────────────────

  test("10.3 TC-POIN-007 — available points displayed with value", async ({
    page,
  }) => {
    await gotoPointsHistory(page);

    // "Available" label
    await expect(page.getByText("Available", { exact: true })).toBeVisible();

    // Numeric points value
    const availableSection = page.getByText("Available", { exact: true }).locator("..");
    const text = await availableSection.textContent().catch(() => "");
    expect(text).toMatch(/\d+/);

    // Pound value (≈ £X.XX)
    await expect(page.getByText("£", { exact: false }).first()).toBeVisible();
  });

  test("10.4 TC-POIN-007 — lifetime earned points displayed", async ({
    page,
  }) => {
    await gotoPointsHistory(page);

    await expect(
      page.getByText("Lifetime Earned", { exact: true })
    ).toBeVisible();

    // "Total value" label
    await expect(page.getByText("Total value", { exact: true })).toBeVisible();
  });

  // ── 10.3 Tier Badge & Progress ────────────────────────────

  test("10.5 TC-POIN-002 — tier badge displayed (Bronze/Silver/Gold/Platinum)", async ({
    page,
  }) => {
    await gotoPointsHistory(page);

    const hasTier = await page
      .getByText("Bronze Tier", { exact: false })
      .or(page.getByText("Silver Tier", { exact: false }))
      .or(page.getByText("Gold Tier", { exact: false }))
      .or(page.getByText("Platinum Tier", { exact: false }))
      .first()
      .isVisible()
      .catch(() => false);
    expect(hasTier).toBeTruthy();
  });

  test("10.6 TC-POIN-002 — tier progress shows scans to next tier", async ({
    page,
  }) => {
    await gotoPointsHistory(page);

    // "X to silver/gold/platinum" or already at platinum
    const hasProgress = await page
      .getByText("to silver", { exact: false })
      .or(page.getByText("to gold", { exact: false }))
      .or(page.getByText("to platinum", { exact: false }))
      .first()
      .isVisible()
      .catch(() => false);
    const atMax = await page
      .getByText("Platinum Tier", { exact: false })
      .isVisible()
      .catch(() => false);
    expect(hasProgress || atMax).toBeTruthy();
  });

  test("10.7 TC-POIN-002 — scan progress indicator (X/Y scans)", async ({
    page,
  }) => {
    await gotoPointsHistory(page);

    // "X/Y scans" format
    const scanProgress = page.getByText(/\d+\/\d+ scans/);
    await expect(scanProgress).toBeVisible();
  });

  // ── 10.4 Monthly Earning Tracker ──────────────────────────

  test("10.8 TC-POIN-004 — monthly earning scans tracker visible", async ({
    page,
  }) => {
    await gotoPointsHistory(page);

    await expect(
      page.getByText("Monthly earning scans", { exact: true })
    ).toBeVisible();

    // Shows "X/Y" format
    const monthlyTracker = page.getByText("Monthly earning scans", {
      exact: true,
    }).locator("..");
    const text = await monthlyTracker.textContent().catch(() => "");
    expect(text).toMatch(/\d+\/\d+/);
  });

  // ── 10.5 Help Section ─────────────────────────────────────

  test("10.9 TC-POIN-007 — 'How do Points work?' button visible", async ({
    page,
  }) => {
    await gotoPointsHistory(page);

    await expect(
      page.getByText("How do Points work?", { exact: false })
    ).toBeVisible();
  });

  // ── 10.6 Transaction History ──────────────────────────────

  test("10.10 TC-POIN-006 — transaction history shows entries", async ({
    page,
  }) => {
    await gotoPointsHistory(page);

    // Month header (e.g., "March 2026")
    const hasMonthHeader = await page
      .getByText(/\w+ 20\d{2}/)
      .first()
      .isVisible()
      .catch(() => false);
    expect(hasMonthHeader).toBeTruthy();
  });

  test("10.11 TC-POIN-006 — transaction entries show type and amount", async ({
    page,
  }) => {
    await gotoPointsHistory(page);

    // Transaction types: "Bonus", "Earn", "Redeem", "Expire"
    const hasType = await page
      .getByText("Bonus", { exact: true })
      .or(page.getByText("Earn", { exact: true }))
      .or(page.getByText("Receipt Scan", { exact: false }))
      .first()
      .isVisible()
      .catch(() => false);
    expect(hasType).toBeTruthy();

    // Points amount: "+150 pts" or "-150 pts"
    const hasAmount = await page
      .getByText(/[+-]?\d+ pts/)
      .first()
      .isVisible()
      .catch(() => false);
    expect(hasAmount).toBeTruthy();
  });

  test("10.12 TC-POIN-006 — transaction entries show date/time", async ({
    page,
  }) => {
    await gotoPointsHistory(page);

    // Date format: "DD/MM/YYYY · HH:MM" — use partial text match for year
    const hasDate = await page
      .getByText("/2026", { exact: false })
      .or(page.getByText("/2025", { exact: false }))
      .first()
      .isVisible()
      .catch(() => false);
    expect(hasDate).toBeTruthy();
  });

  // ── 10.7 Screen Integrity ─────────────────────────────────

  test("10.13 TC-POIN-007 — no undefined/NaN text on points screen", async ({
    page,
  }) => {
    await gotoPointsHistory(page);

    const badText = await page.locator("text=/undefined|NaN/").count();
    expect(badText).toBe(0);
  });

  test("10.14 TC-POIN-007 — back navigation returns to previous screen", async ({
    page,
  }) => {
    await gotoPointsHistory(page);

    const backBtn = page.getByText("\u{F0141}", { exact: true });
    const box = await backBtn.boundingBox().catch(() => null);
    if (box) {
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    } else {
      await backBtn.click({ force: true });
    }
    await page.waitForTimeout(1500);

    // Should be back on profile or another screen
    const navigated = await page
      .getByText("Hey,", { exact: false })
      .first()
      .or(page.getByText("Lists", { exact: true }).first())
      .isVisible()
      .catch(() => false);
    expect(navigated).toBeTruthy();
  });

  // ── 10.8 Skipped Tests (Backend-Only) ─────────────────────

  test("10.15 TC-POIN-001 — points earned per receipt scan (backend mutation)", async () => {
    test.skip(true, "Backend mutation test — covered by unit tests");
  });

  test("10.16 TC-POIN-002 — tier promotion Bronze to Silver (backend)", async () => {
    test.skip(true, "Backend mutation test — covered by unit tests");
  });

  test("10.17 TC-POIN-003 — tier thresholds Gold/Platinum (backend)", async () => {
    test.skip(true, "Backend function test — covered by unit tests");
  });

  test("10.18 TC-POIN-004 — monthly earning caps (backend)", async () => {
    test.skip(true, "Backend mutation test — covered by unit tests");
  });

  test("10.19 TC-POIN-005 — free tier lock 1 scan/month (backend)", async () => {
    test.skip(true, "Backend mutation test — covered by unit tests");
  });

  test("10.20 TC-POIN-008 — points expiry 12 months (cron job)", async () => {
    test.skip(true, "Cron job test — cannot trigger from E2E");
  });

  test("10.21 TC-POIN-009 — expiry warning 30 days (backend query)", async () => {
    test.skip(true, "Backend query test — covered by unit tests");
  });

  test("10.22 TC-POIN-010 — points redemption via Stripe (backend)", async () => {
    test.skip(true, "Backend mutation with Stripe — covered by unit tests");
  });

  test("10.23 TC-POIN-011 — redemption rejected below 500 min (backend)", async () => {
    test.skip(true, "Backend validation test — covered by unit tests");
  });

  test("10.24 TC-POIN-012 — redemption rejected insufficient balance (backend)", async () => {
    test.skip(true, "Backend validation test — covered by unit tests");
  });

  test("10.25 TC-POIN-013 — achievement unlock Rewards Pioneer (backend)", async () => {
    test.skip(true, "Backend mutation test — covered by unit tests");
  });

  test("10.26 TC-POIN-014 — achievement unlock Top Tier (backend)", async () => {
    test.skip(true, "Backend mutation test — covered by unit tests");
  });

  test("10.27 TC-POIN-015 — streak bonus 3 consecutive weeks (backend)", async () => {
    test.skip(true, "Backend mutation test — covered by unit tests");
  });

  test("10.28 TC-POIN-016 — streak reset on missed week (backend)", async () => {
    test.skip(true, "Backend mutation test — covered by unit tests");
  });

  test("10.29 TC-POIN-017 — weekly challenge completion (backend)", async () => {
    test.skip(true, "Backend mutation test — covered by unit tests");
  });

  test("10.30 TC-POIN-018 — challenge auto-complete overshoot (backend)", async () => {
    test.skip(true, "Backend mutation test — covered by unit tests");
  });

  test("10.31 TC-POIN-019 — fraud prevention duplicate receipt (backend)", async () => {
    test.skip(true, "Backend security test — covered by unit tests");
  });

  test("10.32 TC-POIN-020 — idempotent points earning (backend)", async () => {
    test.skip(true, "Backend idempotency test — covered by unit tests");
  });
});
