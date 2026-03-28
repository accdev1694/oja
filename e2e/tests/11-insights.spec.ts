import { test, expect } from "@playwright/test";
import {
  waitForConvex,
  scrollDown,
  clickPressable,
} from "../fixtures/base";

/**
 * Suite 11: Insights (TC-INSI-001 to TC-INSI-016)
 *
 * Tests the Insights screen including:
 * - Screen load with all cards visible
 * - This Week summary (spent, change, trips, saved)
 * - Weekly Challenge card
 * - Savings Jar (total, milestone)
 * - Expandable accordion sections (Health Trends, Monthly Trends,
 *   Budget Adherence, Top Categories, Store Breakdown, Streaks,
 *   Personal Bests, Achievements)
 * - Did You Know tip card
 *
 * NOTE: Most TC-INSI tests call backend queries directly
 * (getWeeklyDigest, getMonthlyTrends, getSavingsJar, getPersonalBests,
 *  getStreaks, getAchievements, getActiveChallenge, etc.)
 * and are SKIPPED here — they are covered by Jest unit tests.
 */
test.describe("11. Insights", () => {
  test.describe.configure({ mode: "serial" });

  async function gotoInsights(page: import("@playwright/test").Page) {
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
  }

  // ── 11.1 Screen Load & Header ─────────────────────────────

  test("11.1 TC-INSI-001 — insights screen loads with header", async ({
    page,
  }) => {
    await gotoInsights(page);

    await expect(
      page.getByText("Insights", { exact: false }).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("11.2 TC-INSI-001 — back button visible in header", async ({
    page,
  }) => {
    await gotoInsights(page);

    const backBtn = page.getByText("\u{F0141}", { exact: true });
    await expect(backBtn).toBeVisible();
  });

  test("11.3 TC-INSI-001 — savings banner displayed", async ({ page }) => {
    await gotoInsights(page);

    // "You've saved £X.XX so far!"
    await expect(
      page.getByText("saved", { exact: false }).first()
    ).toBeVisible();
    await expect(page.getByText("£", { exact: false }).first()).toBeVisible();
  });

  // ── 11.2 This Week Summary Card ───────────────────────────

  test("11.4 TC-INSI-002 — This Week card visible with stats", async ({
    page,
  }) => {
    await gotoInsights(page);

    await expect(
      page.getByText("This Week", { exact: true })
    ).toBeVisible();

    // Spent amount
    await expect(page.getByText("Spent", { exact: true })).toBeVisible();

    // vs Last Week comparison
    await expect(
      page.getByText("vs Last Week", { exact: true })
    ).toBeVisible();

    // Trips count
    await expect(page.getByText("Trips", { exact: true })).toBeVisible();

    // Saved amount
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
  });

  test("11.5 TC-INSI-002 — This Week narrative text displayed", async ({
    page,
  }) => {
    await gotoInsights(page);

    // The narrative paragraph below the stats
    const hasNarrative = await page
      .getByText("week", { exact: false })
      .first()
      .isVisible()
      .catch(() => false);
    expect(hasNarrative).toBeTruthy();
  });

  test("11.6 TC-INSI-002 — This Week shows percentage change", async ({
    page,
  }) => {
    await gotoInsights(page);

    // Percentage: "X%" or "0%"
    const hasPercent = await page
      .getByText("%", { exact: false })
      .first()
      .isVisible()
      .catch(() => false);
    expect(hasPercent).toBeTruthy();
  });

  // ── 11.3 Weekly Challenge Card ────────────────────────────

  test("11.7 TC-INSI-004 — Weekly Challenge card visible", async ({
    page,
  }) => {
    await gotoInsights(page);

    await expect(
      page.getByText("Weekly Challenge", { exact: true })
    ).toBeVisible();
  });

  test("11.8 TC-INSI-004 — Weekly Challenge shows action or progress", async ({
    page,
  }) => {
    await gotoInsights(page);

    // Either "Start a Challenge" button or active challenge progress
    const hasStart = await page
      .getByText("Start a Challenge", { exact: true })
      .isVisible()
      .catch(() => false);
    const hasProgress = await page
      .getByText(/\d+\/\d+/)
      .first()
      .isVisible()
      .catch(() => false);
    const hasActive = await page
      .getByText("challenge", { exact: false })
      .first()
      .isVisible()
      .catch(() => false);
    expect(hasStart || hasProgress || hasActive).toBeTruthy();
  });

  // ── 11.4 Savings Jar Card ─────────────────────────────────

  test("11.9 TC-INSI-006 — Savings Jar card visible with total", async ({
    page,
  }) => {
    await gotoInsights(page);

    await expect(
      page.getByText("Savings Jar", { exact: true })
    ).toBeVisible();

    // Total saved amount with £
    const jarSection = page.getByText("Savings Jar", { exact: true }).locator("..").locator("..");
    const text = await jarSection.textContent().catch(() => "");
    expect(text).toMatch(/£[\d,.]+/);
  });

  test("11.10 TC-INSI-006 — Savings Jar shows milestone progress", async ({
    page,
  }) => {
    await gotoInsights(page);
    await scrollDown(page, 1);

    // "Next milestone: £X" text or percentage progress
    const hasMilestone = await page
      .getByText("milestone", { exact: false })
      .isVisible()
      .catch(() => false);
    const hasProgress = await page
      .getByText("%", { exact: false })
      .first()
      .isVisible()
      .catch(() => false);
    expect(hasMilestone || hasProgress).toBeTruthy();
  });

  test("11.11 TC-INSI-006 — Savings Jar shows trip stats", async ({
    page,
  }) => {
    await gotoInsights(page);

    // "Saved across X trips" or "X avg"
    const hasTrips = await page
      .getByText("trips", { exact: false })
      .first()
      .isVisible()
      .catch(() => false);
    const hasAvg = await page
      .getByText("avg", { exact: false })
      .first()
      .isVisible()
      .catch(() => false);
    expect(hasTrips || hasAvg).toBeTruthy();
  });

  // ── 11.5 Expandable Accordion Sections ────────────────────

  test("11.12 TC-INSI-001 — all accordion sections visible", async ({
    page,
  }) => {
    await gotoInsights(page);
    await scrollDown(page, 1);

    // Check all accordion buttons are present
    const sections = [
      "Health Trends",
      "Monthly Trends",
      "Budget Adherence",
      "Top Categories",
      "Store Breakdown",
      "Streaks",
      "Personal Bests",
      "Achievements",
    ];

    let visibleCount = 0;
    for (const section of sections) {
      const isVisible = await page
        .getByText(section, { exact: true })
        .isVisible()
        .catch(() => false);
      if (isVisible) visibleCount++;
    }

    // At least 6 of the 8 sections should be visible (some may need more scrolling)
    expect(visibleCount).toBeGreaterThanOrEqual(6);
  });

  test("11.13 TC-INSI-010 — Streaks section expands with data", async ({
    page,
  }) => {
    await gotoInsights(page);
    await scrollDown(page, 2);

    // Click Streaks accordion
    const streaksBtn = page.getByRole("button", { name: /Streaks/ });
    await expect(streaksBtn).toBeVisible();
    await streaksBtn.click();
    await page.waitForTimeout(500);

    // Should show streak types with day counts
    const hasStreakType = await page
      .getByText("receipt scanner", { exact: false })
      .or(page.getByText("shopping", { exact: false }))
      .or(page.getByText("day", { exact: false }))
      .first()
      .isVisible()
      .catch(() => false);
    expect(hasStreakType).toBeTruthy();
  });

  test("11.14 TC-INSI-013 — Personal Bests section expands with data", async ({
    page,
  }) => {
    await gotoInsights(page);
    await scrollDown(page, 2);

    // Click Personal Bests accordion
    const bestsBtn = page.getByRole("button", { name: /Personal Bests/ });
    await expect(bestsBtn).toBeVisible();
    await bestsBtn.click();
    await page.waitForTimeout(500);

    // Should show personal best categories
    await expect(
      page.getByText("Biggest Saving", { exact: true })
    ).toBeVisible();
    await expect(
      page.getByText("Longest Streak", { exact: true })
    ).toBeVisible();
    await expect(
      page.getByText("Most Items", { exact: true })
    ).toBeVisible();
    await expect(
      page.getByText("Cheapest Trip", { exact: true })
    ).toBeVisible();
  });

  test("11.15 TC-INSI-014 — Achievements section expands with badges", async ({
    page,
  }) => {
    await gotoInsights(page);
    await scrollDown(page, 3);

    // Click Achievements accordion
    const achBtn = page.getByRole("button", { name: /Achievements/ });
    await expect(achBtn).toBeVisible();
    await achBtn.click();
    await page.waitForTimeout(500);

    // Should show unlocked achievements with titles and descriptions
    const hasAchievement = await page
      .getByText("Rewards Pioneer", { exact: true })
      .or(page.getByText("Pantry Pro", { exact: true }))
      .or(page.getByText("Store Explorer", { exact: true }))
      .first()
      .isVisible()
      .catch(() => false);
    expect(hasAchievement).toBeTruthy();
  });

  test("11.16 TC-INSI-014 — Achievement entries show descriptions", async ({
    page,
  }) => {
    await gotoInsights(page);
    await scrollDown(page, 3);

    // Expand Achievements if not already expanded
    const achBtn = page.getByRole("button", { name: /Achievements/ });
    await achBtn.click();
    await page.waitForTimeout(500);

    // Should show descriptions like "Earned your first points"
    const hasDescription = await page
      .getByText("Earned your first points", { exact: false })
      .or(page.getByText("Track", { exact: false }))
      .first()
      .isVisible()
      .catch(() => false);
    expect(hasDescription).toBeTruthy();
  });

  // ── 11.6 Badge Counts on Accordion Headers ────────────────

  test("11.17 TC-INSI-001 — accordion sections show badge counts", async ({
    page,
  }) => {
    await gotoInsights(page);
    await scrollDown(page, 2);

    // Some sections show counts (e.g., "Top Categories 1", "Achievements 2")
    // Check that at least one button has a numeric badge
    const achievementsBtn = page.getByRole("button", { name: /Achievements \d+/ });
    const hasBadge = await achievementsBtn
      .isVisible()
      .catch(() => false);
    expect(hasBadge).toBeTruthy();
  });

  // ── 11.7 Did You Know Tip ─────────────────────────────────

  test("11.18 TC-INSI-001 — Did You Know tip card visible", async ({
    page,
  }) => {
    await gotoInsights(page);
    await scrollDown(page, 4);

    await expect(
      page.getByText("Did You Know?", { exact: true })
    ).toBeVisible();
  });

  // ── 11.8 Screen Integrity ─────────────────────────────────

  test("11.19 TC-INSI-001 — no undefined/NaN text on insights screen", async ({
    page,
  }) => {
    await gotoInsights(page);

    const badText = await page.locator("text=/undefined|NaN/").count();
    expect(badText).toBe(0);
  });

  test("11.20 TC-INSI-016 — screen loads without error states", async ({
    page,
  }) => {
    await gotoInsights(page);

    // Should not show error messages
    const hasError = await page
      .getByText("Something went wrong", { exact: false })
      .isVisible()
      .catch(() => false);
    expect(hasError).toBeFalsy();

    // Should have meaningful content
    const hasContent = await page
      .getByText("This Week", { exact: true })
      .isVisible()
      .catch(() => false);
    expect(hasContent).toBeTruthy();
  });

  test("11.21 TC-INSI-001 — back navigation returns to previous screen", async ({
    page,
  }) => {
    await gotoInsights(page);

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

  // ── 11.9 Skipped Tests (Backend-Only Queries) ─────────────

  test("11.22 TC-INSI-002 — weekly digest calculation (backend query)", async () => {
    test.skip(true, "Backend query test — covered by unit tests");
  });

  test("11.23 TC-INSI-003 — weekly digest top categories (backend query)", async () => {
    test.skip(true, "Backend query test — covered by unit tests");
  });

  test("11.24 TC-INSI-005 — weekly challenge generation (backend mutation)", async () => {
    test.skip(true, "Backend mutation test — covered by unit tests");
  });

  test("11.25 TC-INSI-006 — savings jar calculation (backend query)", async () => {
    test.skip(true, "Backend query test — covered by unit tests");
  });

  test("11.26 TC-INSI-007 — monthly trends 6-month data (backend query)", async () => {
    test.skip(true, "Backend query test — covered by unit tests");
  });

  test("11.27 TC-INSI-008 — monthly trends category breakdown (backend query)", async () => {
    test.skip(true, "Backend query test — covered by unit tests");
  });

  test("11.28 TC-INSI-009 — budget adherence calculation (backend query)", async () => {
    test.skip(true, "Backend query test — covered by unit tests");
  });

  test("11.29 TC-INSI-011 — streak update and continuation (backend mutation)", async () => {
    test.skip(true, "Backend mutation test — covered by unit tests");
  });

  test("11.30 TC-INSI-012 — streak reset on missed day (backend mutation)", async () => {
    test.skip(true, "Backend mutation test — covered by unit tests");
  });

  test("11.31 TC-INSI-013 — personal bests calculation (backend query)", async () => {
    test.skip(true, "Backend query test — covered by unit tests");
  });

  test("11.32 TC-INSI-015 — empty state all queries (backend edge case)", async () => {
    test.skip(true, "Requires new user with no data — cannot test in E2E");
  });
});
