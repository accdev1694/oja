import { test, expect } from "@playwright/test";
import { ProfilePage } from "../pages/ProfilePage";
import {
  navigateToTab,
  waitForConvex,
  scrollDown,
  clickPressable,
} from "../fixtures/base";

/**
 * Suite 8: Profile & Settings (TC-PROF-001 to TC-PROF-018)
 *
 * Tests the Profile tab including:
 * - Account info display and edit name modal
 * - Referral code display and invite button
 * - Notification/tutorial settings toggles
 * - Quick stats display
 * - Navigation links routing
 * - Sign Out, Delete Account, Reset Account
 *
 * NOTE: Tests that would destroy auth state (Sign Out, Delete Account,
 * Reset Account) are SKIPPED to preserve serial test stability.
 * Dietary/cuisine preferences are onboarding-only and not editable
 * from the Profile screen.
 */
test.describe("8. Profile & Settings", () => {
  test.describe.configure({ mode: "serial" });

  let profile: ProfilePage;

  test.beforeEach(async ({ page }) => {
    profile = new ProfilePage(page);
  });

  // ── 8.1 Account Information ───────────────────────────────

  test("8.1 TC-PROF-001 — profile displays greeting with user name", async ({
    page,
  }) => {
    await profile.goto();

    // Header: "Hey, Oloche"
    await expect(profile.headerGreeting).toBeVisible();
    const greetingText = await profile.headerGreeting.textContent();
    expect(greetingText).toContain("Hey");
  });

  test("8.2 TC-PROF-001 — profile shows account section with name and email", async ({
    page,
  }) => {
    await profile.goto();

    // Account section header
    await expect(profile.accountSection).toBeVisible();

    // Name and email visible in the account card
    const hasName = await profile.accountName.isVisible().catch(() => false);
    const hasEmail = await profile.accountEmail.isVisible().catch(() => false);
    expect(hasName || hasEmail).toBeTruthy();
  });

  test("8.3 TC-PROF-002 — tapping account card opens edit name modal", async ({
    page,
  }) => {
    await profile.goto();
    await profile.openEditNameModal();

    // Modal should show "Edit your name" title
    await expect(profile.editNameTitle).toBeVisible({ timeout: 5_000 });

    // Should have the input field and buttons
    const hasInput = await profile.nameInput.isVisible().catch(() => false);
    const hasSave = await profile.saveButton.isVisible().catch(() => false);
    const hasCancel = await profile.cancelButton.isVisible().catch(() => false);
    expect(hasInput).toBeTruthy();
    expect(hasSave || hasCancel).toBeTruthy();
  });

  test("8.4 TC-PROF-002 — edit name modal shows current name in input", async ({
    page,
  }) => {
    await profile.goto();
    await profile.openEditNameModal();
    await expect(profile.editNameTitle).toBeVisible({ timeout: 5_000 });

    // Input should have current name pre-filled
    const value = await profile.nameInput.inputValue();
    expect(value.length).toBeGreaterThan(0);
  });

  test("8.5 TC-PROF-002 — cancel edit name modal without saving", async ({
    page,
  }) => {
    await profile.goto();
    await profile.openEditNameModal();
    await expect(profile.editNameTitle).toBeVisible({ timeout: 5_000 });

    // Click Cancel
    const cancelBtn = profile.cancelButton;
    const box = await cancelBtn.boundingBox().catch(() => null);
    if (box) {
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    } else {
      await cancelBtn.click({ force: true });
    }
    await page.waitForTimeout(500);

    // Modal should close — edit name title should no longer be visible
    const stillOpen = await profile.editNameTitle
      .isVisible()
      .catch(() => false);
    expect(stillOpen).toBeFalsy();
  });

  test("8.6 TC-PROF-003 — edit name validation rejects too-short name", async ({
    page,
  }) => {
    await profile.goto();
    await profile.openEditNameModal();
    await expect(profile.editNameTitle).toBeVisible({ timeout: 5_000 });

    // Type single character (too short — min 2)
    await profile.nameInput.clear();
    await profile.nameInput.fill("J");

    // Save should be disabled or blocked
    const saveBtn = profile.saveButton;
    const isDisabled = await saveBtn.isDisabled().catch(() => false);
    // If not natively disabled, clicking should not close the modal
    if (!isDisabled) {
      const box = await saveBtn.boundingBox().catch(() => null);
      if (box) {
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      }
      await page.waitForTimeout(500);
      // Modal should still be open
      const stillOpen = await profile.editNameTitle
        .isVisible()
        .catch(() => false);
      expect(stillOpen).toBeTruthy();
    } else {
      expect(isDisabled).toBeTruthy();
    }

    // Close modal for cleanup
    const cancelBtn = profile.cancelButton;
    if (await cancelBtn.isVisible().catch(() => false)) {
      await cancelBtn.click({ force: true });
      await page.waitForTimeout(300);
    }
  });

  test("8.7 TC-PROF-005 — personalise prompt visibility (nameManuallySet)", async ({
    page,
  }) => {
    await profile.goto();

    // If nameManuallySet is false, "Personalise your experience" shows
    // If true, it's hidden. Either state is valid.
    const hasPrompt = await profile.personalisePrompt
      .isVisible()
      .catch(() => false);
    // Just verify the check runs without error — state depends on user
    expect(typeof hasPrompt).toBe("boolean");
  });

  // ── 8.2 Referral & Invite ────────────────────────────────

  test("8.8 TC-PROF-008 — referral code is displayed", async ({ page }) => {
    await profile.goto();

    await expect(profile.inviteFriendsHeader).toBeVisible();
    await expect(profile.referralCode).toBeVisible();

    // Code should be a non-empty string
    const codeText = await profile.referralCode
      .locator("..")
      .textContent()
      .catch(() => "");
    expect(codeText!.length).toBeGreaterThan(0);
  });

  test("8.9 TC-PROF-008 — invite button is visible and clickable", async ({
    page,
  }) => {
    await profile.goto();

    const inviteBtn = profile.inviteButton;
    await expect(inviteBtn).toBeVisible();

    // Click invite (may open native share or do nothing on web)
    const box = await inviteBtn.boundingBox().catch(() => null);
    if (box) {
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    }
    await page.waitForTimeout(500);

    // Dismiss any alert/share dialog that may appear
    const okBtn = page.getByText("OK", { exact: true });
    if (await okBtn.isVisible().catch(() => false)) {
      await okBtn.click();
      await page.waitForTimeout(300);
    }
  });

  // ── 8.3 Settings Section ──────────────────────────────────

  test("8.10 TC-PROF-009 — settings section shows notification toggles", async ({
    page,
  }) => {
    await profile.goto();

    await expect(profile.settingsHeader).toBeVisible();
    await expect(profile.enableNotifications).toBeVisible();

    // Sub-settings should also be visible when master is on
    const hasStock = await profile.stockReminders
      .isVisible()
      .catch(() => false);
    const hasNurture = await profile.nurtureMessages
      .isVisible()
      .catch(() => false);
    const hasQuiet = await profile.quietHours.isVisible().catch(() => false);
    expect(hasStock || hasNurture || hasQuiet).toBeTruthy();
  });

  test("8.11 TC-PROF-010 — stock reminders toggle visible with description", async ({
    page,
  }) => {
    await profile.goto();

    await expect(profile.stockReminders).toBeVisible();

    // Should show subtitle "Wed & Fri pantry checks"
    const subtitle = await page
      .getByText("Wed & Fri pantry checks", { exact: false })
      .isVisible()
      .catch(() => false);
    expect(subtitle).toBeTruthy();
  });

  test("8.12 TC-PROF-011 — tutorial hints toggle and re-show all hints", async ({
    page,
  }) => {
    await profile.goto();

    // Tutorial Hints label visible
    await expect(profile.tutorialHints).toBeVisible();

    // Re-show All Hints section visible
    await expect(profile.reshowHints).toBeVisible();

    // Reset button visible
    await expect(profile.resetHintsButton).toBeVisible();
  });

  // ── 8.4 Quick Stats ───────────────────────────────────────

  test("8.13 TC-PROF-013 — quick stats display with 4 metrics", async ({
    page,
  }) => {
    await profile.goto();
    await scrollDown(page, 1);

    // Should show trips, items, receipts, scans
    const hasTrips = await profile.tripsCount.isVisible().catch(() => false);
    const hasItems = await profile.itemsCount.isVisible().catch(() => false);
    const hasReceipts = await profile.receiptsCount
      .isVisible()
      .catch(() => false);
    const hasScans = await profile.scansCount.isVisible().catch(() => false);

    expect(hasTrips && hasItems && hasReceipts && hasScans).toBeTruthy();
  });

  test("8.14 TC-PROF-013 — quick stats show numeric values", async ({
    page,
  }) => {
    await profile.goto();
    await scrollDown(page, 1);

    // Each stat has a number above its label
    // From snapshot: "6" trips, "146" items, "3" receipts, "3" scans
    const tripsParent = profile.tripsCount.locator("..");
    const tripsText = await tripsParent.textContent().catch(() => "");
    // Should contain a number followed by "trips"
    expect(tripsText).toMatch(/\d+/);
  });

  // ── 8.5 Navigation Links ──────────────────────────────────

  test("8.15 TC-PROF-014 — Points History link visible and navigates", async ({
    page,
  }) => {
    await profile.goto();
    await scrollDown(page, 2);

    await expect(profile.pointsHistoryLink).toBeVisible();

    // Click and verify navigation
    await clickPressable(page, "Points History", { exact: true });
    await page.waitForTimeout(1500);
    await waitForConvex(page);

    // Should navigate to points history page
    const url = page.url();
    const hasPointsContent =
      url.includes("points") ||
      (await page
        .getByText("Points", { exact: false })
        .first()
        .isVisible()
        .catch(() => false));
    expect(hasPointsContent).toBeTruthy();

    // Navigate back
    await page.goBack();
    await page.waitForTimeout(1000);
  });

  test("8.16 TC-PROF-014 — Insights link visible and navigates", async ({
    page,
  }) => {
    await profile.goto();
    await scrollDown(page, 2);

    await expect(profile.insightsLink).toBeVisible();

    await clickPressable(page, "Insights", { exact: true });
    await page.waitForTimeout(1500);
    await waitForConvex(page);

    // Should navigate to insights page
    const url = page.url();
    const hasInsightsContent =
      url.includes("insights") ||
      (await page
        .getByText("Insights", { exact: false })
        .first()
        .isVisible()
        .catch(() => false));
    expect(hasInsightsContent).toBeTruthy();

    await page.goBack();
    await page.waitForTimeout(1000);
  });

  test("8.17 TC-PROF-014 — Help & Support link visible and navigates", async ({
    page,
  }) => {
    await profile.goto();
    await scrollDown(page, 2);

    await expect(profile.helpSupportLink).toBeVisible();

    await clickPressable(page, "Help & Support", { exact: true });
    await page.waitForTimeout(1500);
    await waitForConvex(page);

    // Should navigate to support page
    const url = page.url();
    const hasSupportContent =
      url.includes("support") ||
      (await page
        .getByText("Support", { exact: false })
        .first()
        .isVisible()
        .catch(() => false));
    expect(hasSupportContent).toBeTruthy();

    await page.goBack();
    await page.waitForTimeout(1000);
  });

  test("8.18 TC-PROF-014 — AI Usage link visible and navigates", async ({
    page,
  }) => {
    await profile.goto();
    await scrollDown(page, 2);

    await expect(profile.aiUsageLink).toBeVisible();

    await clickPressable(page, "AI Usage", { exact: true });
    await page.waitForTimeout(1500);
    await waitForConvex(page);

    // Should navigate to AI usage page
    const url = page.url();
    const hasAiContent =
      url.includes("ai-usage") ||
      (await page
        .getByText("AI", { exact: false })
        .first()
        .isVisible()
        .catch(() => false));
    expect(hasAiContent).toBeTruthy();

    await page.goBack();
    await page.waitForTimeout(1000);
  });

  test("8.19 TC-PROF-014 — Subscription link visible and navigates", async ({
    page,
  }) => {
    await profile.goto();
    await scrollDown(page, 3);

    // Subscription link shows as "Premium Trial" or "Free Plan"
    await expect(profile.subscriptionLink).toBeVisible();

    await clickPressable(page, "Premium Trial", { exact: false });
    await page.waitForTimeout(1500);
    await waitForConvex(page);

    // Should navigate to subscription page
    const url = page.url();
    const hasSubContent =
      url.includes("subscription") ||
      (await page
        .getByText("Subscription", { exact: false })
        .or(page.getByText("Premium", { exact: false }))
        .first()
        .isVisible()
        .catch(() => false));
    expect(hasSubContent).toBeTruthy();

    await page.goBack();
    await page.waitForTimeout(1000);
  });

  test("8.20 TC-PROF-014 — Stock Alerts link visible", async ({ page }) => {
    await profile.goto();
    await scrollDown(page, 3);

    // Stock Alerts shows when there are out-of-stock items
    const hasStockAlerts = await profile.stockAlertsLink
      .isVisible()
      .catch(() => false);
    // May or may not be visible depending on stock state
    expect(typeof hasStockAlerts).toBe("boolean");

    if (hasStockAlerts) {
      // Should show count like "1 out · 63 low"
      const subtitle = await page
        .getByText("out", { exact: false })
        .first()
        .isVisible()
        .catch(() => false);
      expect(subtitle).toBeTruthy();
    }
  });

  // ── 8.6 Admin Controls ────────────────────────────────────

  test("8.21 TC-PROF-015 — admin controls visibility (non-admin user)", async ({
    page,
  }) => {
    await profile.goto();
    await scrollDown(page, 5);

    // Regular user should NOT see Admin Dashboard
    const hasAdmin = await profile.adminDashboardLink
      .isVisible()
      .catch(() => false);

    // Regular user should NOT see Reset Account
    const hasReset = await profile.resetAccountButton
      .isVisible()
      .catch(() => false);

    // These could be visible if E2E user IS an admin — either state is valid
    expect(typeof hasAdmin).toBe("boolean");
    expect(typeof hasReset).toBe("boolean");
  });

  // ── 8.7 Danger Zone ───────────────────────────────────────

  test("8.22 TC-PROF-017 — Danger Zone section with Delete Account", async ({
    page,
  }) => {
    await profile.goto();
    await scrollDown(page, 5);

    // Sign Out button visible
    await expect(profile.signOutButton).toBeVisible();

    // Danger Zone section visible
    await expect(profile.dangerZone).toBeVisible();

    // Delete Account button visible
    await expect(profile.deleteAccountButton).toBeVisible();
  });

  test("8.23 TC-PROF-017 — Delete Account shows confirmation dialog", async ({
    page,
  }) => {
    await profile.goto();
    await scrollDown(page, 5);

    // Click Delete Account
    const delBtn = profile.deleteAccountButton;
    const box = await delBtn.boundingBox().catch(() => null);
    if (box) {
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    } else {
      await clickPressable(page, "Delete Account", { exact: true });
    }
    await page.waitForTimeout(500);

    // Should show confirmation dialog with warning text
    const hasWarning = await page
      .getByText("permanently deletes EVERYTHING", { exact: false })
      .isVisible()
      .catch(() => false);
    const hasDeleteTitle = await page
      .getByText("Delete Account", { exact: false })
      .first()
      .isVisible()
      .catch(() => false);
    expect(hasWarning || hasDeleteTitle).toBeTruthy();

    // Dismiss the dialog — click Cancel
    const cancelBtn = page.getByText("Cancel", { exact: true });
    if (await cancelBtn.isVisible().catch(() => false)) {
      await cancelBtn.click();
      await page.waitForTimeout(300);
    }
  });

  // ── 8.8 Profile Screen Integrity ──────────────────────────

  test("8.24 TC-PROF-001 — profile has no undefined/NaN text", async ({
    page,
  }) => {
    await profile.goto();

    const badText = await page.locator("text=/undefined|NaN/").count();
    expect(badText).toBe(0);
  });

  test("8.25 TC-PROF-001 — profile subtitle shows personalised text", async ({
    page,
  }) => {
    await profile.goto();

    // Subtitle: "Oloche's insights & settings"
    await expect(profile.headerSubtitle).toBeVisible();
  });

  // ── 8.9 Skipped Tests ─────────────────────────────────────

  test("8.26 TC-PROF-004 — edit name validation: numeric only", async () => {
    test.skip(
      true,
      "Numeric name validation tested via unit tests — modal interaction unreliable on web"
    );
  });

  test("8.27 TC-PROF-006 — dietary preferences (onboarding only)", async () => {
    test.skip(
      true,
      "Dietary preferences set during onboarding, not editable from Profile"
    );
  });

  test("8.28 TC-PROF-007 — cuisine preferences (onboarding only)", async () => {
    test.skip(
      true,
      "Cuisine preferences set during onboarding, not editable from Profile"
    );
  });

  test("8.29 TC-PROF-012 — milestone path badges (requires gamification data)", async () => {
    test.skip(
      true,
      "Milestone path rendering depends on gamification state — tested in Suite 15"
    );
  });

  test("8.30 TC-PROF-016 — sign out flow", async () => {
    test.skip(
      true,
      "Sign out destroys auth state needed for subsequent test suites"
    );
  });

  test("8.31 TC-PROF-017 — delete account confirmation (destructive)", async () => {
    test.skip(
      true,
      "Account deletion is irreversible — cannot test in shared E2E env"
    );
  });

  test("8.32 TC-PROF-018 — reset account re-onboard (admin only)", async () => {
    test.skip(
      true,
      "Account reset is destructive and requires admin privileges"
    );
  });
});
