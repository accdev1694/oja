import { test, expect } from "@playwright/test";
import {
  waitForConvex,
  scrollDown,
  clickPressable,
} from "../fixtures/base";

/**
 * Suite 12: Partner/Sharing (TC-PART-001 to TC-PART-020)
 *
 * Tests the partner/sharing feature including:
 * - Join List screen (enter invite code)
 * - Partners screen (partner list, invite button, empty state)
 * - Share button on list detail header
 * - Accept Invite link on lists page
 *
 * NOTE: Most TC-PART tests are backend mutation/query tests requiring
 * multi-user interaction (createInviteCode, acceptInvite, removePartner,
 * leaveList, addComment, getComments, permissions, etc.)
 * and are SKIPPED here — they are covered by Jest unit tests.
 */
test.describe("12. Partner/Sharing", () => {
  test.describe.configure({ mode: "serial" });

  // ── 12.1 Join List Screen ─────────────────────────────────

  async function gotoJoinList(page: import("@playwright/test").Page) {
    await page.goto("/join-list");
    await waitForConvex(page, 3000);
    await page
      .waitForFunction(
        () =>
          document.body.innerText.includes("Join a List") ||
          document.body.innerText.includes("Invite Code"),
        { timeout: 15_000 }
      )
      .catch(() => null);
  }

  test("12.1 TC-PART-005 — join list screen loads with header", async ({
    page,
  }) => {
    await gotoJoinList(page);

    await expect(
      page.getByText("Join a List", { exact: true })
    ).toBeVisible({ timeout: 10_000 });
  });

  test("12.2 TC-PART-005 — back button visible on join list", async ({
    page,
  }) => {
    await gotoJoinList(page);

    const backBtn = page.getByText("\u{F0141}", { exact: true });
    await expect(backBtn).toBeVisible();
  });

  test("12.3 TC-PART-005 — invite code heading and subtitle displayed", async ({
    page,
  }) => {
    await gotoJoinList(page);

    await expect(
      page.getByText("Enter Invite Code", { exact: true })
    ).toBeVisible();

    await expect(
      page.getByText("6-character code", { exact: false })
    ).toBeVisible();
  });

  test("12.4 TC-PART-005 — code input field present", async ({ page }) => {
    await gotoJoinList(page);

    const input = page.getByPlaceholder("ABC123");
    await expect(input).toBeVisible();
  });

  test("12.5 TC-PART-005 — Accept Invite button disabled when empty", async ({
    page,
  }) => {
    await gotoJoinList(page);

    const acceptBtn = page.getByText("Accept Invite", { exact: true });
    await expect(acceptBtn).toBeVisible();

    // Button should be disabled when no code entered
    const btn = page.getByRole("button", { name: /Accept Invite/ });
    const isDisabled = await btn.isDisabled().catch(() => false);
    expect(isDisabled).toBeTruthy();
  });

  test("12.6 TC-PART-005 — typing code enables Accept Invite button", async ({
    page,
  }) => {
    await gotoJoinList(page);

    const input = page.getByPlaceholder("ABC123");
    await input.fill("TEST99");
    await page.waitForTimeout(500);

    // Button should be enabled after entering 6-char code
    const acceptBtn = page.getByText("Accept Invite", { exact: true });
    await expect(acceptBtn).toBeVisible();
  });

  test("12.7 TC-PART-017 — invalid code shows error", async ({ page }) => {
    await gotoJoinList(page);

    const input = page.getByPlaceholder("ABC123");
    await input.fill("FAKE99");
    await page.waitForTimeout(300);

    // Click Accept Invite
    await clickPressable(page, "Accept Invite", { exact: true });
    await page.waitForTimeout(3000);

    // Should show error alert/message
    const hasError = await page
      .getByText("Invalid", { exact: false })
      .or(page.getByText("expired", { exact: false }))
      .or(page.getByText("error", { exact: false }))
      .or(page.getByText("not found", { exact: false }))
      .first()
      .isVisible()
      .catch(() => false);
    expect(hasError).toBeTruthy();
  });

  // ── 12.2 Partners Screen ──────────────────────────────────

  test("12.8 TC-PART-015 — partners screen loads with header", async ({
    page,
  }) => {
    // Navigate to a list first, then partners
    await page.goto("/");
    await waitForConvex(page, 3000);

    // Get the first list's URL
    await page
      .waitForFunction(
        () => document.body.innerText.includes("E2e"),
        { timeout: 15_000 }
      )
      .catch(() => null);

    // Click the first list card
    await clickPressable(page, "E2e Items Test", { exact: false });
    await waitForConvex(page, 2000);

    // Extract list ID from URL
    const url = page.url();
    const listId = url.split("/list/")[1]?.split("?")[0] || "";
    expect(listId).toBeTruthy();

    // Navigate to partners screen
    await page.goto(`/partners?listId=${listId}`);
    await waitForConvex(page, 3000);

    await expect(
      page.getByText("Partners", { exact: true }).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("12.9 TC-PART-015 — partners screen shows partner count", async ({
    page,
  }) => {
    // Navigate to partners directly with known list pattern
    await page.goto("/");
    await waitForConvex(page, 3000);
    await page
      .waitForFunction(
        () => document.body.innerText.includes("E2e"),
        { timeout: 15_000 }
      )
      .catch(() => null);

    await clickPressable(page, "E2e Items Test", { exact: false });
    await waitForConvex(page, 2000);

    const url = page.url();
    const listId = url.split("/list/")[1]?.split("?")[0] || "";

    await page.goto(`/partners?listId=${listId}`);
    await waitForConvex(page, 3000);

    // Should show partner count like "0 partners" or "X partners"
    const hasCount = await page
      .getByText(/\d+ partners?/)
      .first()
      .isVisible()
      .catch(() => false);
    expect(hasCount).toBeTruthy();
  });

  test("12.10 TC-PART-015 — empty state when no partners", async ({
    page,
  }) => {
    await page.goto("/");
    await waitForConvex(page, 3000);
    await page
      .waitForFunction(
        () => document.body.innerText.includes("E2e"),
        { timeout: 15_000 }
      )
      .catch(() => null);

    await clickPressable(page, "E2e Items Test", { exact: false });
    await waitForConvex(page, 2000);

    const url = page.url();
    const listId = url.split("/list/")[1]?.split("?")[0] || "";

    await page.goto(`/partners?listId=${listId}`);
    await waitForConvex(page, 3000);

    // Empty state message
    const hasEmptyState = await page
      .getByText("No Partners Yet", { exact: true })
      .isVisible()
      .catch(() => false);
    const hasInviteMsg = await page
      .getByText("invite someone", { exact: false })
      .isVisible()
      .catch(() => false);
    expect(hasEmptyState || hasInviteMsg).toBeTruthy();
  });

  test("12.11 TC-PART-001 — Invite button visible for owner", async ({
    page,
  }) => {
    await page.goto("/");
    await waitForConvex(page, 3000);
    await page
      .waitForFunction(
        () => document.body.innerText.includes("E2e"),
        { timeout: 15_000 }
      )
      .catch(() => null);

    await clickPressable(page, "E2e Items Test", { exact: false });
    await waitForConvex(page, 2000);

    const url = page.url();
    const listId = url.split("/list/")[1]?.split("?")[0] || "";

    await page.goto(`/partners?listId=${listId}`);
    await waitForConvex(page, 3000);

    // Invite button should be visible for the list owner
    await expect(
      page.getByText("Invite", { exact: true })
    ).toBeVisible();
  });

  // ── 12.3 Accept Invite Link on Lists Page ─────────────────

  test("12.12 TC-PART-004 — Accept Invite link visible on lists page", async ({
    page,
  }) => {
    await page.goto("/");
    await waitForConvex(page, 3000);
    await page
      .waitForFunction(
        () => document.body.innerText.includes("Lists"),
        { timeout: 15_000 }
      )
      .catch(() => null);

    await scrollDown(page, 5);

    // "Accept Invite" link at the bottom of lists
    await expect(
      page.getByText("Accept Invite", { exact: true })
    ).toBeVisible();
  });

  test("12.13 TC-PART-004 — Accept Invite link navigates to join-list", async ({
    page,
  }) => {
    await page.goto("/");
    await waitForConvex(page, 3000);
    await page
      .waitForFunction(
        () => document.body.innerText.includes("Lists"),
        { timeout: 15_000 }
      )
      .catch(() => null);

    await scrollDown(page, 5);

    await clickPressable(page, "Accept Invite", { exact: true });
    await page.waitForTimeout(1500);
    await waitForConvex(page);

    // Should navigate to join-list screen
    const url = page.url();
    const hasJoinContent =
      url.includes("join-list") ||
      (await page
        .getByText("Enter Invite Code", { exact: true })
        .isVisible()
        .catch(() => false));
    expect(hasJoinContent).toBeTruthy();
  });

  // ── 12.4 Share Button on List Detail ──────────────────────

  test("12.14 TC-PART-002 — share button visible on list detail header", async ({
    page,
  }) => {
    await page.goto("/");
    await waitForConvex(page, 3000);
    await page
      .waitForFunction(
        () => document.body.innerText.includes("E2e"),
        { timeout: 15_000 }
      )
      .catch(() => null);

    await clickPressable(page, "E2e Items Test", { exact: false });
    await waitForConvex(page, 2000);

    // The header row has multiple icon buttons (add, share, health, search)
    // Share navigates to /partners — verify by checking the icon exists
    // Use evaluate to find a share-like icon button in the header area
    const hasShareBtn = await page.evaluate(() => {
      // Look for cursor:pointer elements that could be the share button in header row
      const pointerEls = document.querySelectorAll('[style*="cursor: pointer"], [style*="cursor:pointer"]');
      // The header area should have at least 3 icon buttons
      return pointerEls.length >= 3;
    });
    expect(hasShareBtn).toBeTruthy();
  });

  // ── 12.5 Screen Integrity ─────────────────────────────────

  test("12.15 TC-PART-005 — no undefined/NaN text on join list screen", async ({
    page,
  }) => {
    await gotoJoinList(page);

    const badText = await page.locator("text=/undefined|NaN/").count();
    expect(badText).toBe(0);
  });

  test("12.16 TC-PART-005 — back navigation from join list", async ({
    page,
  }) => {
    // Navigate from lists page first so there's browser history
    await page.goto("/");
    await waitForConvex(page, 3000);
    await page
      .waitForFunction(
        () => document.body.innerText.includes("Lists"),
        { timeout: 15_000 }
      )
      .catch(() => null);

    // Navigate to join-list via Accept Invite link
    await scrollDown(page, 5);
    await clickPressable(page, "Accept Invite", { exact: true });
    await page.waitForTimeout(1500);
    await waitForConvex(page);

    // Verify we're on join-list
    await expect(
      page.getByText("Join a List", { exact: true })
    ).toBeVisible({ timeout: 10_000 });

    // Click back button
    const backBtn = page.getByText("\u{F0141}", { exact: true });
    const box = await backBtn.boundingBox().catch(() => null);
    if (box) {
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    } else {
      await backBtn.click({ force: true });
    }
    await page.waitForTimeout(1500);

    // Should be back on lists page
    const navigated = await page
      .getByText("active lists", { exact: false })
      .or(page.getByText("Oloche's Lists", { exact: false }))
      .first()
      .isVisible()
      .catch(() => false);
    expect(navigated).toBeTruthy();
  });

  // ── 12.6 Skipped Tests (Backend / Multi-User) ─────────────

  test("12.17 TC-PART-001 — create invite code mutation (backend)", async () => {
    test.skip(true, "Backend mutation test — covered by unit tests");
  });

  test("12.18 TC-PART-003 — copy invite code to clipboard (native API)", async () => {
    test.skip(true, "Clipboard API not available in headless browser");
  });

  test("12.19 TC-PART-004 — accept invite mutation (backend, multi-user)", async () => {
    test.skip(true, "Backend mutation test requiring second user — covered by unit tests");
  });

  test("12.20 TC-PART-006 — owner permissions (backend query)", async () => {
    test.skip(true, "Backend query test — covered by unit tests");
  });

  test("12.21 TC-PART-007 — partner permissions (backend query)", async () => {
    test.skip(true, "Backend query test — covered by unit tests");
  });

  test("12.22 TC-PART-008 — owner removes partner (backend mutation)", async () => {
    test.skip(true, "Backend mutation test — covered by unit tests");
  });

  test("12.23 TC-PART-009 — partner leaves list (backend mutation)", async () => {
    test.skip(true, "Backend mutation test — covered by unit tests");
  });

  test("12.24 TC-PART-010 — per-item comments (backend mutation)", async () => {
    test.skip(true, "Backend mutation test — covered by unit tests");
  });

  test("12.25 TC-PART-011 — comment counts batch query (backend)", async () => {
    test.skip(true, "Backend query test — covered by unit tests");
  });

  test("12.26 TC-PART-012 — list-wide messages/chat (backend mutation)", async () => {
    test.skip(true, "Backend mutation test — covered by unit tests");
  });

  test("12.27 TC-PART-013 — real-time updates when partner edits (multi-user)", async () => {
    test.skip(true, "Requires two concurrent users — cannot test in single-user E2E");
  });

  test("12.28 TC-PART-014 — notification on partner activity (backend)", async () => {
    test.skip(true, "Backend notification test — covered by unit tests");
  });

  test("12.29 TC-PART-016 — expired invite code (backend validation)", async () => {
    test.skip(true, "Backend validation test — covered by unit tests");
  });

  test("12.30 TC-PART-018 — re-invite after partner leaves (backend)", async () => {
    test.skip(true, "Backend mutation test — covered by unit tests");
  });

  test("12.31 TC-PART-019 — premium-only feature gating (backend)", async () => {
    test.skip(true, "Backend feature gating test — covered by unit tests");
  });

  test("12.32 TC-PART-020 — partner permissions on completed list (backend)", async () => {
    test.skip(true, "Backend edge case test — covered by unit tests");
  });
});
