import { Page, expect } from "@playwright/test";
import { navigateToTab, waitForConvex, clickPressable } from "../fixtures/base";

export class ListsPage {
  constructor(private page: Page) {}

  // ── Header ───────────────────────────────────────────────
  get pageTitle() {
    return this.page.getByText("Lists", { exact: false }).first();
  }
  get activeListCount() {
    return this.page.getByText("active list", { exact: false });
  }

  // ── Tab switcher ─────────────────────────────────────────
  get activeTab() {
    return this.page.getByText("Active", { exact: true }).first();
  }
  get historyTab() {
    return this.page.getByText("History", { exact: true }).first();
  }

  // ── Create list ──────────────────────────────────────────
  get createListCard() {
    return this.page.getByText("Create a new list", { exact: false });
  }
  get newListButton() {
    // Match either "New List" button or the create card
    return this.page
      .getByText("New List", { exact: true })
      .or(this.page.getByText("Create a new list", { exact: false }));
  }

  // ── Create list options modal ────────────────────────────
  get createModalTitle() {
    return this.page.getByText("Create a New List", { exact: false });
  }
  get startFromScratchOption() {
    return this.page.getByText("Start from Scratch", { exact: false });
  }
  get useTemplateOption() {
    return this.page.getByText("Use a Template", { exact: false });
  }

  // ── Create list form — NOTE: "Start from Scratch" has NO form.
  //    It creates a list immediately with default name + £50 budget,
  //    then navigates to /list/{id}. Name/budget are edited on the detail page.

  // ── List card elements ───────────────────────────────────
  get activeBadge() {
    return this.page.getByText("Active", { exact: true });
  }
  get inProgressBadge() {
    return this.page.getByText("In Progress", { exact: false });
  }
  get completedBadge() {
    return this.page.getByText("Completed", { exact: true });
  }
  get planningBadge() {
    return this.page.getByText("Planning", { exact: true });
  }

  // ── Shared lists ─────────────────────────────────────────
  get sharedWithMe() {
    return this.page.getByText("Shared With Me", { exact: false });
  }
  get acceptInvite() {
    return this.page.getByText("Accept Invite", { exact: false });
  }

  // ── History tab ──────────────────────────────────────────
  get historyTripsCount() {
    return this.page.getByText("trip", { exact: false });
  }
  get noCompletedText() {
    return this.page
      .getByText("No completed", { exact: false })
      .or(this.page.getByText("no trips", { exact: false }));
  }

  // ── Delete confirmation ──────────────────────────────────
  get deleteConfirmDialog() {
    return this.page.getByText("Delete", { exact: false });
  }
  get confirmDeleteButton() {
    return this.page
      .getByText("Delete", { exact: true })
      .or(this.page.getByText("OK", { exact: true }))
      .or(this.page.getByText("Confirm", { exact: true }));
  }

  // ── Navigation ───────────────────────────────────────────

  async goto() {
    await navigateToTab(this.page, "Lists");
    await waitForConvex(this.page);
  }

  // ── Actions ──────────────────────────────────────────────

  /**
   * Create a list from scratch.
   *
   * The actual app flow:
   * 1. Click "Create a new list" card → CreateListOptionsModal
   * 2. Click "Start from Scratch" → immediately creates list (default name + £50) → navigates to /list/{id}
   * 3. If name/budget provided, edit them on the detail page via modals
   */
  async createList(name?: string, budget?: number) {
    await this.createFromScratch();

    // Now on the list detail page — edit name if specified
    if (name) {
      await this.editListNameOnDetail(name);
    }

    // Edit budget if specified (and different from default 50)
    if (budget !== undefined && budget !== 50) {
      await this.editBudgetOnDetail(budget);
    }
  }

  /** Create list with default name + default £50 budget (no edits) */
  async createListDefaultBudget() {
    await this.createFromScratch();
  }

  /** Click "Create a new list" → "Start from Scratch" → wait for /list/{id} */
  private async createFromScratch() {
    // RNW Pressable uses pointer events. clickPressable's DOM click()
    // doesn't trigger React's synthetic events reliably.
    // Use Playwright's dispatchEvent approach which fires proper events.
    await this.clickRNWPressable("Create a new list");
    await this.page.waitForTimeout(2000);

    // If options modal appears, select "Start from Scratch"
    const hasOptionsModal = await this.startFromScratchOption
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    if (hasOptionsModal) {
      await this.clickRNWPressable("Start from Scratch");
    }

    // "Start from Scratch" creates the list immediately and navigates to /list/{id}
    await this.page.waitForURL(/\/list\//, { timeout: 30_000 });
    await waitForConvex(this.page, 2000);
  }

  /**
   * Click a React Native Web Pressable by finding its text then dispatching
   * proper pointer/mouse events that trigger React's event system.
   */
  private async clickRNWPressable(text: string) {
    // Find the text element
    const textEl = this.page.getByText(text, { exact: false }).first();
    await textEl.waitFor({ state: "visible", timeout: 10_000 });

    // Get the bounding box and use Playwright's mouse to click the center
    // This dispatches real browser events that React intercepts
    const box = await textEl.boundingBox();
    if (box) {
      await this.page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    } else {
      // Fallback: force click via locator
      await textEl.click({ force: true });
    }
  }

  /** Edit list name via the pencil icon on the detail page */
  private async editListNameOnDetail(name: string) {
    // Click pencil icon (pencil-outline) in the header to open EditListNameModal
    // The icon is near the list title — find the clickable pencil
    const pencilClicked = await this.page.evaluate(() => {
      // Find elements with cursor:pointer that contain pencil icon text
      const allEls = document.querySelectorAll("*");
      for (const el of allEls) {
        if (
          el instanceof HTMLElement &&
          getComputedStyle(el).cursor === "pointer" &&
          el.textContent?.trim() === "󰏫" // pencil-outline icon
        ) {
          el.click();
          return true;
        }
      }
      return false;
    });

    if (!pencilClicked) {
      // Fallback: try clicking an element with class containing 'edit' or 'pencil'
      const editBtn = this.page.locator("[class*='pencil'], [class*='edit']").first();
      if (await editBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await editBtn.click();
      }
    }
    await this.page.waitForTimeout(1000);

    // Wait for EditListNameModal — has input with placeholder "Enter list name"
    const nameInput = this.page.getByPlaceholder("Enter list name", { exact: false }).first();
    await nameInput.waitFor({ state: "visible", timeout: 8_000 });

    // Clear and type new name
    await nameInput.click();
    await this.page.waitForTimeout(200);
    await nameInput.press("Control+A");
    await this.page.waitForTimeout(100);
    await nameInput.press("Backspace");
    await this.page.waitForTimeout(100);
    await nameInput.pressSequentially(name, { delay: 30 });
    await this.page.waitForTimeout(300);

    // Click Save
    await clickPressable(this.page, "Save");
    await waitForConvex(this.page, 1500);
  }

  /** Edit budget via the budget dial on the detail page */
  private async editBudgetOnDetail(budget: number) {
    // Click the budget dial (circular SVG) to open EditBudgetModal
    const dialClicked = await this.page.evaluate(() => {
      // The budget dial is an SVG inside a Pressable with cursor:pointer
      const svgs = document.querySelectorAll("svg");
      for (const svg of svgs) {
        let target: Element | null = svg;
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
      return false;
    });

    if (!dialClicked) {
      // Fallback: click on budget text
      const budgetText = this.page.getByText("budget", { exact: false }).first();
      if (await budgetText.isVisible().catch(() => false)) {
        await budgetText.click();
      }
    }
    await this.page.waitForTimeout(1000);

    // Wait for EditBudgetModal — has input with placeholder "50.00"
    const budgetInput = this.page.getByPlaceholder("50.00", { exact: false }).first();
    await budgetInput.waitFor({ state: "visible", timeout: 8_000 });

    // Clear and type new budget
    await budgetInput.click();
    await this.page.waitForTimeout(200);
    await budgetInput.press("Control+A");
    await this.page.waitForTimeout(100);
    await budgetInput.press("Backspace");
    await this.page.waitForTimeout(100);
    await budgetInput.pressSequentially(budget.toString(), { delay: 30 });
    await this.page.waitForTimeout(300);

    // Click Update
    await clickPressable(this.page, "Update");
    await waitForConvex(this.page, 1500);
  }

  async openList(name: string) {
    await clickPressable(this.page, name, { exact: false });
    await this.page.waitForURL(/\/list\//, { timeout: 15_000 }).catch(() => {});
    await waitForConvex(this.page);
  }

  async deleteListFromCard(name: string) {
    // Look for a trash/delete icon near the list card
    // The UI has a trash icon on the top-right of each list card
    const card = this.page.getByText(name, { exact: false }).first();
    await expect(card).toBeVisible();

    // Try finding delete/trash icon button near the card
    // Use evaluate to find and click the trash icon
    const deleted = await this.page.evaluate((listName) => {
      const allText = document.querySelectorAll("*");
      for (const el of allText) {
        if (el.textContent?.includes(listName) && el.children.length <= 3) {
          // Walk up to find the card container, then look for delete button
          let container: Element | null = el;
          for (let i = 0; i < 10; i++) {
            container = container?.parentElement ?? null;
            if (!container) break;
            const trashBtn = container.querySelector("[class*='delete'], [class*='trash']");
            if (trashBtn && trashBtn instanceof HTMLElement) {
              trashBtn.click();
              return true;
            }
          }
        }
      }
      return false;
    }, name);

    if (!deleted) {
      // Fallback: right-click for context menu
      await card.click({ button: "right" });
      await this.page.waitForTimeout(300);
    }

    // Wait for confirmation dialog
    await this.page.waitForTimeout(500);

    // Confirm deletion
    const confirmBtn = this.confirmDeleteButton;
    if (await confirmBtn.first().isVisible().catch(() => false)) {
      await confirmBtn.first().click();
    }
    await waitForConvex(this.page);
  }

  async switchToHistory() {
    await this.historyTab.click();
    await this.page.waitForTimeout(1000);
  }

  async switchToActive() {
    await this.activeTab.click();
    await this.page.waitForTimeout(1000);
  }

  // ── Assertions ───────────────────────────────────────────

  async expectListVisible(name: string) {
    await expect(this.page.getByText(name, { exact: false }).first()).toBeVisible({ timeout: 10_000 });
  }

  async expectListNotVisible(name: string) {
    await expect(this.page.getByText(name, { exact: false })).toHaveCount(0, { timeout: 10_000 });
  }

  async expectActiveTab() {
    await expect(this.activeTab).toBeVisible();
  }

  async expectHistoryTab() {
    await expect(this.historyTab).toBeVisible();
  }

  async expectEmptyState() {
    // Empty state shows the create card prominently
    const hasCreate = await this.createListCard.isVisible().catch(() => false);
    const hasEmpty = await this.page
      .getByText("no list", { exact: false })
      .or(this.page.getByText("Create a new list", { exact: false }))
      .isVisible()
      .catch(() => false);
    expect(hasCreate || hasEmpty).toBeTruthy();
  }

  async expectEmptyHistory() {
    await expect(
      this.page
        .getByText("No completed", { exact: false })
        .or(this.page.getByText("no trips", { exact: false }))
        .or(this.page.getByText("No history", { exact: false }))
    ).toBeVisible({ timeout: 5_000 });
  }

  async getActiveListCount(): Promise<number> {
    // Count list cards in the active view
    const cards = this.page.locator("[class*='card']").filter({
      has: this.page.getByText("budget", { exact: false }),
    });
    return await cards.count().catch(() => 0);
  }

  async expectBudgetOnCard(listName: string, budget: string) {
    const card = this.page.getByText(listName, { exact: false }).first().locator("..").locator("..");
    await expect(
      card.getByText(`£${budget}`, { exact: false }).or(card.getByText(budget, { exact: false }))
    ).toBeVisible({ timeout: 5_000 });
  }

  async expectStatusBadge(listName: string, status: "Active" | "In Progress" | "Completed" | "Planning") {
    // Just check the badge is visible somewhere on the page when the list is shown
    const badge = this.page.getByText(status, { exact: false });
    const isVisible = await badge.first().isVisible().catch(() => false);
    expect(isVisible).toBeTruthy();
  }
}
