import { test, expect } from "@playwright/test";
import { waitForConvex } from "../fixtures/base";

/**
 * Suite 13: Admin Dashboard (TC-ADMN-001 to TC-ADMN-040)
 *
 * Tests the admin dashboard including:
 * - Non-admin access denied (TC-ADMN-002)
 * - Route protection / error boundary
 * - Screen integrity
 *
 * NOTE: The E2E test user is NOT an admin. Navigating to /admin shows
 * either "Access Denied" or an error boundary with "Admin access required".
 * All admin-interaction tests (overview KPIs, user management, receipts,
 * monitoring, settings, webhooks, global search) are SKIPPED — they
 * require an admin user and are covered by Jest unit tests.
 */
test.describe("13. Admin Dashboard", () => {
  test.describe.configure({ mode: "serial" });

  async function gotoAdmin(page: import("@playwright/test").Page) {
    await page.goto("/admin");
    await waitForConvex(page, 3000);
    await page
      .waitForFunction(
        () =>
          document.body.innerText.includes("Access Denied") ||
          document.body.innerText.includes("Admin access required") ||
          document.body.innerText.includes("Something went wrong") ||
          document.body.innerText.includes("Overview"),
        { timeout: 15_000 }
      )
      .catch(() => null);
  }

  // ── 13.1 Access Control ─────────────────────────────────────

  test("13.1 TC-ADMN-002 — non-admin user blocked from /admin", async ({
    page,
  }) => {
    await gotoAdmin(page);

    // Non-admin users see either "Access Denied" or error boundary
    const hasAccessDenied = await page
      .getByText("Access Denied", { exact: true })
      .isVisible()
      .catch(() => false);
    const hasErrorBoundary = await page
      .getByText("Something went wrong", { exact: true })
      .isVisible()
      .catch(() => false);
    const hasAdminRequired = await page
      .getByText("Admin access required", { exact: false })
      .isVisible()
      .catch(() => false);

    expect(hasAccessDenied || hasErrorBoundary || hasAdminRequired).toBeTruthy();
  });

  test("13.2 TC-ADMN-002 — admin content not rendered for non-admin", async ({
    page,
  }) => {
    await gotoAdmin(page);

    // Admin tab bar should NOT be visible
    const hasOverviewTab = await page
      .getByText("Overview", { exact: true })
      .isVisible()
      .catch(() => false);
    const hasUsersTab = await page
      .getByText("Users", { exact: true })
      .isVisible()
      .catch(() => false);
    const hasAnalyticsTab = await page
      .getByText("Analytics", { exact: true })
      .isVisible()
      .catch(() => false);

    expect(hasOverviewTab).toBeFalsy();
    expect(hasUsersTab).toBeFalsy();
    expect(hasAnalyticsTab).toBeFalsy();
  });

  test("13.3 TC-ADMN-002 — error shows descriptive message", async ({
    page,
  }) => {
    await gotoAdmin(page);

    // Either Access Denied message or error boundary with admin-specific text
    const hasAccessMsg = await page
      .getByText("administrative privileges", { exact: false })
      .isVisible()
      .catch(() => false);
    const hasAdminError = await page
      .getByText("Admin access required", { exact: false })
      .isVisible()
      .catch(() => false);

    expect(hasAccessMsg || hasAdminError).toBeTruthy();
  });

  test("13.4 TC-ADMN-002 — Try Again button visible on error", async ({
    page,
  }) => {
    await gotoAdmin(page);

    // Error boundary shows Try Again button
    const hasTryAgain = await page
      .getByText("Try Again", { exact: true })
      .isVisible()
      .catch(() => false);
    // Or Access Denied page has no retry (which is also valid)
    const hasAccessDenied = await page
      .getByText("Access Denied", { exact: true })
      .isVisible()
      .catch(() => false);

    expect(hasTryAgain || hasAccessDenied).toBeTruthy();
  });

  test("13.5 TC-ADMN-002 — tab bar still visible for navigation away", async ({
    page,
  }) => {
    await gotoAdmin(page);

    // The app tab bar (Lists, Stock, Scan, Profile) should still be visible
    // so the user can navigate away from the admin page
    await expect(
      page.getByText("Lists", { exact: true }).first()
    ).toBeVisible();
    await expect(
      page.getByText("Profile", { exact: true }).first()
    ).toBeVisible();
  });

  test("13.6 TC-ADMN-002 — navigating away from admin works", async ({
    page,
  }) => {
    await gotoAdmin(page);

    // Click Profile tab to navigate away
    const profileTab = page.getByText("Profile", { exact: true }).first();
    const box = await profileTab.boundingBox().catch(() => null);
    if (box) {
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    } else {
      await profileTab.click({ force: true });
    }
    await page.waitForTimeout(2000);
    await waitForConvex(page);

    // Should be on profile screen
    const onProfile = await page
      .getByText("Hey,", { exact: false })
      .first()
      .isVisible()
      .catch(() => false);
    expect(onProfile).toBeTruthy();
  });

  // ── 13.2 Screen Integrity ───────────────────────────────────

  test("13.7 TC-ADMN-002 — no undefined/NaN text on admin screen", async ({
    page,
  }) => {
    await gotoAdmin(page);

    const badText = await page.locator("text=/undefined|NaN/").count();
    expect(badText).toBe(0);
  });

  test("13.8 TC-ADMN-002 — admin route does not crash the app", async ({
    page,
  }) => {
    await gotoAdmin(page);

    // The page should still be functional (not a white screen crash)
    // Either error state or access denied — both are valid non-crash states
    const hasContent = await page.evaluate(() => {
      return document.body.innerText.length > 10;
    });
    expect(hasContent).toBeTruthy();
  });

  // ── 13.3 Skipped Tests (Require Admin User) ────────────────

  test("13.9 TC-ADMN-001 — admin route access with isAdmin=true", async () => {
    test.skip(true, "Requires admin user — E2E user is not admin");
  });

  test("13.10 TC-ADMN-003 — unauthenticated user blocked from /admin", async () => {
    test.skip(true, "Requires logged-out state — cannot test in serial auth flow");
  });

  test("13.11 TC-ADMN-004 — RBAC super_admin gets all permissions", async () => {
    test.skip(true, "Backend query test — covered by unit tests");
  });

  test("13.12 TC-ADMN-005 — RBAC moderator gets limited permissions", async () => {
    test.skip(true, "Backend query test — covered by unit tests");
  });

  test("13.13 TC-ADMN-006 — RBAC analyst gets read-only access", async () => {
    test.skip(true, "Backend query test — covered by unit tests");
  });

  test("13.14 TC-ADMN-007 — MFA grace period within 14 days", async () => {
    test.skip(true, "Backend query test — covered by unit tests");
  });

  test("13.15 TC-ADMN-008 — MFA grace period expired blocks access", async () => {
    test.skip(true, "Backend query test — covered by unit tests");
  });

  test("13.16 TC-ADMN-009 — overview tab renders platform KPIs", async () => {
    test.skip(true, "Requires admin user — E2E user is not admin");
  });

  test("13.17 TC-ADMN-010 — overview auto-refresh toggles", async () => {
    test.skip(true, "Requires admin user — E2E user is not admin");
  });

  test("13.18 TC-ADMN-011 — overview date range filter", async () => {
    test.skip(true, "Requires admin user — E2E user is not admin");
  });

  test("13.19 TC-ADMN-012 — overview GMV segmented filter", async () => {
    test.skip(true, "Requires admin user — E2E user is not admin");
  });

  test("13.20 TC-ADMN-013 — overview widget customization toggle", async () => {
    test.skip(true, "Requires admin user — E2E user is not admin");
  });

  test("13.21 TC-ADMN-014 — overview widget reorder", async () => {
    test.skip(true, "Requires admin user — E2E user is not admin");
  });

  test("13.22 TC-ADMN-015 — users tab search by email/name", async () => {
    test.skip(true, "Requires admin user — E2E user is not admin");
  });

  test("13.23 TC-ADMN-016 — users tab view user detail", async () => {
    test.skip(true, "Requires admin user — E2E user is not admin");
  });

  test("13.24 TC-ADMN-017 — users tab grant/revoke admin access", async () => {
    test.skip(true, "Destructive admin mutation — covered by unit tests");
  });

  test("13.25 TC-ADMN-018 — users tab suspend/unsuspend user", async () => {
    test.skip(true, "Destructive admin mutation — covered by unit tests");
  });

  test("13.26 TC-ADMN-019 — users tab extend trial by 14 days", async () => {
    test.skip(true, "Admin mutation — covered by unit tests");
  });

  test("13.27 TC-ADMN-020 — users tab adjust points", async () => {
    test.skip(true, "Admin mutation — covered by unit tests");
  });

  test("13.28 TC-ADMN-021 — users tab impersonate user", async () => {
    test.skip(true, "Admin mutation — covered by unit tests");
  });

  test("13.29 TC-ADMN-022 — users tab bulk select and extend trials", async () => {
    test.skip(true, "Admin mutation — covered by unit tests");
  });

  test("13.30 TC-ADMN-023 — users tab CSV export", async () => {
    test.skip(true, "Requires admin user — E2E user is not admin");
  });

  test("13.31 TC-ADMN-024 — users tab add/remove tags", async () => {
    test.skip(true, "Admin mutation — covered by unit tests");
  });

  test("13.32 TC-ADMN-025 — receipts tab search and filter", async () => {
    test.skip(true, "Requires admin user — E2E user is not admin");
  });

  test("13.33 TC-ADMN-026 — receipts tab delete receipt", async () => {
    test.skip(true, "Destructive admin mutation — covered by unit tests");
  });

  test("13.34 TC-ADMN-027 — receipts tab view receipt image modal", async () => {
    test.skip(true, "Requires admin user — E2E user is not admin");
  });

  test("13.35 TC-ADMN-028 — receipts tab edit receipt details", async () => {
    test.skip(true, "Admin mutation — covered by unit tests");
  });

  test("13.36 TC-ADMN-029 — receipts tab flagged queue", async () => {
    test.skip(true, "Admin mutation — covered by unit tests");
  });

  test("13.37 TC-ADMN-030 — receipts tab price anomaly detection", async () => {
    test.skip(true, "Backend query test — covered by unit tests");
  });

  test("13.38 TC-ADMN-031 — monitoring tab active alerts", async () => {
    test.skip(true, "Requires admin user — E2E user is not admin");
  });

  test("13.39 TC-ADMN-032 — monitoring tab SLA performance", async () => {
    test.skip(true, "Requires admin user — E2E user is not admin");
  });

  test("13.40 TC-ADMN-033 — monitoring tab A/B experiment creation", async () => {
    test.skip(true, "Admin mutation — covered by unit tests");
  });

  test("13.41 TC-ADMN-034 — monitoring tab workflow toggle", async () => {
    test.skip(true, "Admin mutation — covered by unit tests");
  });

  test("13.42 TC-ADMN-035 — settings tab toggle feature flag", async () => {
    test.skip(true, "Destructive admin mutation — covered by unit tests");
  });

  test("13.43 TC-ADMN-036 — settings tab create announcement", async () => {
    test.skip(true, "Admin mutation — covered by unit tests");
  });

  test("13.44 TC-ADMN-037 — settings tab force logout admin session", async () => {
    test.skip(true, "Destructive admin mutation — covered by unit tests");
  });

  test("13.45 TC-ADMN-038 — webhooks tab create new webhook", async () => {
    test.skip(true, "Admin mutation — covered by unit tests");
  });

  test("13.46 TC-ADMN-039 — webhooks tab test and delete webhook", async () => {
    test.skip(true, "Destructive admin mutation — covered by unit tests");
  });

  test("13.47 TC-ADMN-040 — global search (Cmd+K) finds results", async () => {
    test.skip(true, "Requires admin user — E2E user is not admin");
  });
});
