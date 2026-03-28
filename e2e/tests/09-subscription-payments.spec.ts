import { test, expect } from "@playwright/test";
import {
  waitForConvex,
  scrollDown,
  clickPressable,
} from "../fixtures/base";

/**
 * Suite 9: Subscription & Payments (TC-SUBS-001 to TC-SUBS-015)
 *
 * Tests the subscription screen including:
 * - Current plan display (Trial/Free/Premium/Cancelled/Expired)
 * - Trial banner with days remaining
 * - Scan rewards card (tier, points, progress)
 * - Plan comparison / Rewards & Benefits section
 * - Plan options (Monthly £2.99, Annual £21.99)
 * - Navigation links (Points History)
 *
 * NOTE: Stripe checkout, webhook integration, cancellation, and
 * backend mutations (startFreeTrial, expireTrials, processEarnPoints)
 * are SKIPPED — they require real Stripe integration or backend-only testing.
 */
test.describe("9. Subscription & Payments", () => {
  test.describe.configure({ mode: "serial" });

  async function gotoSubscription(page: import("@playwright/test").Page) {
    await page.goto("/subscription");
    await waitForConvex(page, 3000);
    // Wait for content to load
    await page
      .waitForFunction(
        () =>
          document.body.innerText.includes("Premium") ||
          document.body.innerText.includes("Subscription") ||
          document.body.innerText.includes("Rewards"),
        { timeout: 15_000 }
      )
      .catch(() => null);
  }

  // ── 9.1 Screen Load & Header ──────────────────────────────

  test("9.1 TC-SUBS-002 — subscription screen loads with header", async ({
    page,
  }) => {
    await gotoSubscription(page);

    // Header: "Premium & Rewards"
    await expect(
      page.getByText("Premium & Rewards", { exact: true })
    ).toBeVisible({ timeout: 10_000 });
  });

  test("9.2 TC-SUBS-002 — back button visible in header", async ({ page }) => {
    await gotoSubscription(page);

    // Back arrow (󰅁) visible
    const backBtn = page.getByText("\u{F0141}", { exact: true });
    await expect(backBtn).toBeVisible();
  });

  // ── 9.2 Trial Banner ──────────────────────────────────────

  test("9.3 TC-SUBS-002 — trial banner shows days remaining", async ({
    page,
  }) => {
    await gotoSubscription(page);

    // Trial banner: "X days left in trial"
    const trialBanner = page.getByText("days left in trial", { exact: false });
    const hasTrial = await trialBanner.isVisible().catch(() => false);

    if (hasTrial) {
      // Should also show subscribe prompt
      const subscribePrompt = page.getByText("Subscribe now", { exact: false });
      await expect(subscribePrompt).toBeVisible();
    } else {
      // User may not be on trial — check for expired or active
      const hasExpired = await page
        .getByText("trial has ended", { exact: false })
        .isVisible()
        .catch(() => false);
      const hasActive = await page
        .getByText("Premium", { exact: false })
        .first()
        .isVisible()
        .catch(() => false);
      expect(hasExpired || hasActive).toBeTruthy();
    }
  });

  // ── 9.3 Current Plan Card ─────────────────────────────────

  test("9.4 TC-SUBS-002 — current plan card shows plan name and status", async ({
    page,
  }) => {
    await gotoSubscription(page);

    // Current plan card: "Premium Monthly" or "Free" with status
    const hasPlanName = await page
      .getByText("Premium Monthly", { exact: true })
      .or(page.getByText("Premium Annual", { exact: true }))
      .or(page.getByText("Free", { exact: true }))
      .first()
      .isVisible()
      .catch(() => false);
    expect(hasPlanName).toBeTruthy();

    // Status: "Trial Active", "Active", "Expired", "Cancelled"
    const hasStatus = await page
      .getByText("Trial Active", { exact: true })
      .or(page.getByText("Active", { exact: true }))
      .or(page.getByText("Expired", { exact: true }))
      .or(page.getByText("Cancelled", { exact: true }))
      .first()
      .isVisible()
      .catch(() => false);
    expect(hasStatus).toBeTruthy();
  });

  test("9.5 TC-SUBS-002 — current plan card shows renewal date", async ({
    page,
  }) => {
    await gotoSubscription(page);

    // "Renews DD/MM/YYYY" or similar date text
    const hasRenews = await page
      .getByText("Renews", { exact: false })
      .isVisible()
      .catch(() => false);
    const hasEnds = await page
      .getByText("Ends", { exact: false })
      .isVisible()
      .catch(() => false);
    // Either renews or ends date should be present for active/trial plans
    expect(hasRenews || hasEnds).toBeTruthy();
  });

  // ── 9.4 Scan Rewards Card ─────────────────────────────────

  test("9.6 TC-SUBS-015 — scan rewards card shows tier", async ({ page }) => {
    await gotoSubscription(page);

    // Scan Rewards section
    await expect(
      page.getByText("Scan Rewards", { exact: true })
    ).toBeVisible();

    // Tier: Bronze, Silver, Gold, or Platinum
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

  test("9.7 TC-SUBS-015 — scan rewards shows scans count", async ({
    page,
  }) => {
    await gotoSubscription(page);

    // "X scanned" text
    const scannedText = page.getByText("scanned", { exact: false });
    await expect(scannedText).toBeVisible();
  });

  test("9.8 TC-SUBS-015 — scan rewards shows tier progress", async ({
    page,
  }) => {
    await gotoSubscription(page);

    // "X more scans to Silver/Gold/Platinum" or already at highest tier
    const hasProgress = await page
      .getByText("more scans to", { exact: false })
      .isVisible()
      .catch(() => false);
    const atMax = await page
      .getByText("Platinum Tier", { exact: false })
      .isVisible()
      .catch(() => false);
    expect(hasProgress || atMax).toBeTruthy();
  });

  test("9.9 TC-SUBS-015 — scan rewards shows points available", async ({
    page,
  }) => {
    await gotoSubscription(page);

    // "X points available"
    await expect(
      page.getByText("points available", { exact: false })
    ).toBeVisible();
  });

  test("9.10 TC-SUBS-015 — scan rewards shows points value", async ({
    page,
  }) => {
    await gotoSubscription(page);

    // "(Value: £X.XX)"
    await expect(
      page.getByText("Value:", { exact: false })
    ).toBeVisible();
  });

  test("9.11 TC-SUBS-015 — View Points History link navigates", async ({
    page,
  }) => {
    await gotoSubscription(page);

    const pointsLink = page.getByText("View Points History", { exact: true });
    await expect(pointsLink).toBeVisible();

    await clickPressable(page, "View Points History", { exact: true });
    await page.waitForTimeout(1500);
    await waitForConvex(page);

    // Should navigate to points-history
    const url = page.url();
    const hasPointsContent =
      url.includes("points") ||
      (await page
        .getByText("Points", { exact: false })
        .first()
        .isVisible()
        .catch(() => false));
    expect(hasPointsContent).toBeTruthy();

    await page.goBack();
    await page.waitForTimeout(1000);
  });

  test("9.12 TC-SUBS-015 — scan rewards shows monthly earning hint", async ({
    page,
  }) => {
    await gotoSubscription(page);

    // "Scan X more receipt(s) to earn..." or similar earning hint
    const hasEarningHint = await page
      .getByText("more receipt", { exact: false })
      .or(page.getByText("earn up to", { exact: false }))
      .or(page.getByText("more points", { exact: false }))
      .first()
      .isVisible()
      .catch(() => false);
    expect(hasEarningHint).toBeTruthy();
  });

  // ── 9.5 Rewards & Benefits Section ────────────────────────

  test("9.13 TC-SUBS-005 — rewards & benefits section visible", async ({
    page,
  }) => {
    await gotoSubscription(page);
    await scrollDown(page, 1);

    await expect(
      page.getByText("Rewards & Benefits", { exact: true })
    ).toBeVisible();
  });

  test("9.14 TC-SUBS-005 — premium benefits list items", async ({ page }) => {
    await gotoSubscription(page);
    await scrollDown(page, 1);

    // Should show PREMIUM badges
    const premiumBadgeCount = await page
      .getByText("PREMIUM", { exact: true })
      .count();
    expect(premiumBadgeCount).toBeGreaterThanOrEqual(3);

    // Should list key benefits
    const hasScans = await page
      .getByText("point-earning scans", { exact: false })
      .isVisible()
      .catch(() => false);
    const hasLists = await page
      .getByText("Unlimited active lists", { exact: false })
      .isVisible()
      .catch(() => false);
    expect(hasScans || hasLists).toBeTruthy();
  });

  // ── 9.6 Plan Options ──────────────────────────────────────

  test("9.15 TC-SUBS-005 — change plan section with monthly and annual options", async ({
    page,
  }) => {
    await gotoSubscription(page);
    await scrollDown(page, 2);

    // "Change Plan" header
    await expect(
      page.getByText("Change Plan", { exact: true })
    ).toBeVisible();

    // Monthly option: "Premium Monthly" with "£2.99/month"
    const hasMonthly = await page
      .getByText("£2.99", { exact: false })
      .isVisible()
      .catch(() => false);
    expect(hasMonthly).toBeTruthy();

    // Annual option: "Premium Annual" with "£21.99/year"
    const hasAnnual = await page
      .getByText("£21.99", { exact: false })
      .isVisible()
      .catch(() => false);
    expect(hasAnnual).toBeTruthy();
  });

  test("9.16 TC-SUBS-005 — annual plan shows savings percentage", async ({
    page,
  }) => {
    await gotoSubscription(page);
    await scrollDown(page, 3);

    // "39% off" or similar savings badge on annual plan
    const hasSavings = await page
      .getByText("% off", { exact: false })
      .isVisible()
      .catch(() => false);
    expect(hasSavings).toBeTruthy();
  });

  test("9.17 TC-SUBS-005 — monthly plan features list", async ({ page }) => {
    await gotoSubscription(page);
    await scrollDown(page, 2);

    // Monthly plan features with checkmarks
    const hasUnlimited = await page
      .getByText("Unlimited lists & pantry", { exact: false })
      .isVisible()
      .catch(() => false);
    const hasPriority = await page
      .getByText("Priority support", { exact: false })
      .isVisible()
      .catch(() => false);
    expect(hasUnlimited || hasPriority).toBeTruthy();
  });

  test("9.18 TC-SUBS-005 — annual plan features include savings", async ({
    page,
  }) => {
    await gotoSubscription(page);
    await scrollDown(page, 3);

    // Annual plan: "Save £X.XX/year"
    const hasSave = await page
      .getByText("Save £", { exact: false })
      .isVisible()
      .catch(() => false);
    // Annual plan: "Early access to new features"
    const hasEarly = await page
      .getByText("Early access", { exact: false })
      .isVisible()
      .catch(() => false);
    expect(hasSave || hasEarly).toBeTruthy();
  });

  test("9.19 TC-SUBS-006 — Switch Plan buttons visible", async ({ page }) => {
    await gotoSubscription(page);
    await scrollDown(page, 2);

    // "Switch Plan" buttons for monthly and annual
    const switchBtns = await page
      .getByText("Switch Plan", { exact: true })
      .count();
    expect(switchBtns).toBeGreaterThanOrEqual(1);
  });

  // ── 9.7 Screen Integrity ──────────────────────────────────

  test("9.20 TC-SUBS-001 — no undefined/NaN/null text on subscription screen", async ({
    page,
  }) => {
    await gotoSubscription(page);

    const badText = await page.locator("text=/undefined|NaN/").count();
    expect(badText).toBe(0);
  });

  test("9.21 TC-SUBS-002 — back navigation returns to profile", async ({
    page,
  }) => {
    await gotoSubscription(page);

    // Click back button
    const backBtn = page.getByText("\u{F0141}", { exact: true });
    const box = await backBtn.boundingBox().catch(() => null);
    if (box) {
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    } else {
      await backBtn.click({ force: true });
    }
    await page.waitForTimeout(1500);

    // Should be back on profile or previous screen
    const onProfile = await page
      .getByText("Hey,", { exact: false })
      .first()
      .isVisible()
      .catch(() => false);
    const onLists = await page
      .getByText("Lists", { exact: true })
      .first()
      .isVisible()
      .catch(() => false);
    expect(onProfile || onLists).toBeTruthy();
  });

  // ── 9.8 Skipped Tests (Backend / Stripe Integration) ──────

  test("9.22 TC-SUBS-001 — view free plan features (requires no subscription)", async () => {
    test.skip(true, "Requires user with no subscription — E2E user has trial");
  });

  test("9.23 TC-SUBS-003 — expired subscription banner (requires expired trial)", async () => {
    test.skip(true, "Requires expired trial state — cannot manipulate in E2E");
  });

  test("9.24 TC-SUBS-004 — cancelled subscription banner", async () => {
    test.skip(
      true,
      "Requires cancelled subscription state — cannot manipulate in E2E"
    );
  });

  test("9.25 TC-SUBS-006 — Stripe checkout flow (requires Stripe)", async () => {
    test.skip(true, "Stripe checkout requires real payment integration");
  });

  test("9.26 TC-SUBS-007 — Stripe webhook activates premium (backend only)", async () => {
    test.skip(true, "Backend mutation test — covered by unit tests");
  });

  test("9.27 TC-SUBS-008 — Stripe checkout cancelled (requires Stripe)", async () => {
    test.skip(true, "Stripe cancellation flow requires external browser");
  });

  test("9.28 TC-SUBS-009 — manage subscription via Stripe portal", async () => {
    test.skip(true, "Stripe portal requires active paid subscription");
  });

  test("9.29 TC-SUBS-010 — cancel subscription flow", async () => {
    test.skip(
      true,
      "Cancellation is destructive and requires active paid subscription"
    );
  });

  test("9.30 TC-SUBS-011 — trial auto-starts on onboarding (backend only)", async () => {
    test.skip(true, "Backend mutation test — covered by unit tests");
  });

  test("9.31 TC-SUBS-012 — trial expiry reverts to free (cron job)", async () => {
    test.skip(true, "Cron job test — cannot trigger from E2E");
  });

  test("9.32 TC-SUBS-013 — admin bypass as premium_annual (backend only)", async () => {
    test.skip(true, "Backend query test — covered by unit tests");
  });

  test("9.33 TC-SUBS-014 — duplicate trial prevention (backend only)", async () => {
    test.skip(true, "Backend mutation test — covered by unit tests");
  });
});
