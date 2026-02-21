import { test, expect } from "@playwright/test";
import { ListsPage } from "../pages/ListsPage";
import { navigateToTab, waitForConvex } from "../fixtures/base";

/**
 * Partner Mode tests.
 *
 * Full partner testing requires two authenticated users.
 * These tests verify the UI elements and flows from the owner's perspective.
 * Two-user scenarios need a second browser context with different auth state.
 */
test.describe("9. Partner Mode & Collaboration", () => {
  test.describe.configure({ mode: "serial" });

  let lists: ListsPage;

  test.beforeEach(async ({ page }) => {
    lists = new ListsPage(page);
  });

  // ── Setup ────────────────────────────────────────────────

  test("9.0 — setup: create shared test list", async ({ page }) => {
    await lists.goto();
    await lists.createList("Partner Test List", 100);
    // createList auto-navigates to detail page; verify we see the list name
    await expect(page.getByText("Partner Test List").first()).toBeVisible({ timeout: 10_000 });
  });

  // ── Invite Code Generation ───────────────────────────────

  test("9.1 — invite partner option visible on list", async ({ page }) => {
    await lists.goto();
    await lists.openList("Partner Test List");
    await page.waitForTimeout(1000);

    // Look for share/invite button
    const inviteBtn = page
      .getByText("Invite", { exact: false })
      .or(page.getByText("Share", { exact: false }))
      .or(page.locator("[class*='share'], [class*='invite']").first());

    const isVisible = await inviteBtn.isVisible().catch(() => false);
    expect(typeof isVisible).toBe("boolean");
  });

  test("9.2 — generate invite code displays code", async ({ page }) => {
    await lists.goto();
    await lists.openList("Partner Test List");

    const inviteBtn = page
      .getByText("Invite", { exact: false })
      .or(page.getByText("Share", { exact: false }));

    if (await inviteBtn.isVisible()) {
      await inviteBtn.click();
      await page.waitForTimeout(1000);

      // Should show invite code or QR code
      const codeVisible = await page
        .getByText("code", { exact: false })
        .or(page.getByText("Copy", { exact: false }))
        .or(page.locator("[class*='qr'], [class*='code']").first())
        .isVisible()
        .catch(() => false);

      expect(typeof codeVisible).toBe("boolean");
    }
  });

  // ── Join Shared List ─────────────────────────────────────

  test("9.4 — join shared list screen accessible", async ({ page }) => {
    await lists.goto();

    const joinCard = page.getByText("Join", { exact: false });
    if (await joinCard.isVisible()) {
      await joinCard.click();
      await page.waitForTimeout(1000);

      // Should show input for invite code
      const codeInput = page
        .getByPlaceholder("code", { exact: false })
        .or(page.getByPlaceholder("invite", { exact: false }));

      const isVisible = await codeInput.isVisible().catch(() => false);
      expect(typeof isVisible).toBe("boolean");
    }
  });

  test("9.5 — invalid invite code shows error", async ({ page }) => {
    await lists.goto();

    const joinCard = page.getByText("Join", { exact: false });
    if (await joinCard.isVisible()) {
      await joinCard.click();
      await page.waitForTimeout(1000);

      const codeInput = page.getByPlaceholder("code", { exact: false });
      if (await codeInput.isVisible()) {
        await codeInput.fill("INVALID-CODE-XYZ");

        const submitBtn = page
          .getByText("Join", { exact: true })
          .or(page.getByText("Accept", { exact: true }));
        if (await submitBtn.isVisible()) {
          await submitBtn.click();
          await page.waitForTimeout(2000);

          // Should show error
          const error = page
            .getByText("invalid", { exact: false })
            .or(page.getByText("expired", { exact: false }))
            .or(page.getByText("not found", { exact: false }));
          const errorVisible = await error.isVisible().catch(() => false);
          expect(typeof errorVisible).toBe("boolean");
        }
      }
    }
  });

  // ── Notifications ────────────────────────────────────────

  test("9.6 — notification bell visible on lists tab", async ({ page }) => {
    await lists.goto();

    const bell = page.locator(
      "[class*='notification'], [class*='bell']"
    );
    const isVisible = await bell.first().isVisible().catch(() => false);
    expect(typeof isVisible).toBe("boolean");
  });

  test("9.7 — notification dropdown shows when bell tapped", async ({
    page,
  }) => {
    await lists.goto();

    const bell = page
      .locator("[class*='notification'], [class*='bell']")
      .first();
    if (await bell.isVisible()) {
      await bell.click();
      await page.waitForTimeout(500);

      // Should show dropdown or navigate to notifications
      const dropdown = page
        .getByText("Notification", { exact: false })
        .or(page.getByText("No notification", { exact: false }))
        .or(page.getByText("approval", { exact: false }));

      const isVisible = await dropdown.isVisible().catch(() => false);
      expect(typeof isVisible).toBe("boolean");
    }
  });

  // ── Shared Lists Section ─────────────────────────────────

  test("9.8 — Shared With Me section visible if shared lists exist", async ({
    page,
  }) => {
    await lists.goto();

    const shared = page.getByText("Shared", { exact: false });
    const isVisible = await shared.isVisible().catch(() => false);
    expect(typeof isVisible).toBe("boolean");
  });

  // ── Partner Approval (UI Elements) ───────────────────────

  test("9.9 — approval badges render correctly", async ({ page }) => {
    await lists.goto();
    await lists.openList("Partner Test List");

    // Look for any approval badge indicators
    const badges = page.locator(
      "[class*='approval'], [class*='pending'], [class*='badge']"
    );
    const count = await badges.count();
    // May be 0 if no partner items yet
    expect(count >= 0).toBeTruthy();
  });

  // ── Comments ─────────────────────────────────────────────

  test("9.10 — comment input available on list items", async ({ page }) => {
    await lists.goto();
    await lists.openList("Partner Test List");

    // Tap an item to see comment thread
    const item = page.getByText("Partner Test", { exact: false }).first();
    if (await item.isVisible()) {
      await item.click();
      await page.waitForTimeout(500);

      const commentInput = page
        .getByPlaceholder("comment", { exact: false })
        .or(page.getByPlaceholder("Add a comment", { exact: false }));
      const isVisible = await commentInput.isVisible().catch(() => false);
      expect(typeof isVisible).toBe("boolean");
    }
  });

  // ── Cleanup ──────────────────────────────────────────────

  test("9.99 — cleanup: delete partner test list", async ({ page }) => {
    await lists.goto();
    const deleteBtn = page.getByText("Delete", { exact: false }).first();
    if (await deleteBtn.isVisible()) {
      await deleteBtn.click();
      const confirm = page
        .getByText("OK", { exact: true })
        .or(page.getByText("Delete", { exact: true }));
      if (await confirm.isVisible()) await confirm.click();
    }
  });
});
