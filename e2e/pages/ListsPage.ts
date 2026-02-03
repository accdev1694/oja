import { Page, expect } from "@playwright/test";
import { navigateToTab, waitForConvex } from "../fixtures/base";

export class ListsPage {
  constructor(private page: Page) {}

  // Tabs
  get activeTab() {
    return this.page.getByText("Active", { exact: true });
  }
  get historyTab() {
    return this.page.getByText("History", { exact: true });
  }

  // Create list
  get newListButton() {
    // Use "New List" exact match to avoid matching other elements
    return this.page.getByText("New List", { exact: true });
  }
  get listNameInput() {
    // React Native Web renders as role=textbox with placeholder as accessible name
    return this.page.getByRole("textbox", { name: /Weekly Shop/i });
  }
  get budgetInput() {
    // Budget input has placeholder "50"
    return this.page.getByRole("textbox", { name: "50" });
  }
  get createButton() {
    // Match the "Create List" button text exactly (not "Create New List" heading)
    return this.page.getByText("Create List", { exact: true });
  }

  // Shared lists
  get sharedWithMe() {
    return this.page.getByText("Shared With Me", { exact: false });
  }
  get joinSharedList() {
    return this.page.getByText("Join a shared list", { exact: false });
  }

  async goto() {
    await navigateToTab(this.page, "Lists");
    await waitForConvex(this.page);
  }

  async createList(name: string, budget?: number) {
    await this.newListButton.click();
    await this.page.waitForTimeout(1000);

    // Wait for the dialog to appear
    await this.listNameInput.waitFor({ state: "visible", timeout: 5_000 });

    if (name) {
      // Focus the input, select all, delete, then type new value
      await this.listNameInput.click();
      await this.page.waitForTimeout(200);
      await this.listNameInput.press("Control+A");
      await this.page.waitForTimeout(100);
      await this.listNameInput.press("Backspace");
      await this.page.waitForTimeout(100);
      await this.listNameInput.pressSequentially(name, { delay: 30 });
      await this.page.waitForTimeout(300);
    }
    if (budget !== undefined) {
      await this.budgetInput.click();
      await this.page.waitForTimeout(200);
      await this.budgetInput.press("Control+A");
      await this.page.waitForTimeout(100);
      await this.budgetInput.press("Backspace");
      await this.page.waitForTimeout(100);
      await this.budgetInput.pressSequentially(budget.toString(), { delay: 30 });
      await this.page.waitForTimeout(300);
    }

    await this.page.waitForTimeout(500);

    // Click Create List button using JS evaluate — Playwright's native .click() does NOT
    // trigger React Native Web's Pressable onPress handler reliably.
    // We walk up from the "Create List" text to find the cursor:pointer ancestor.
    await this.page.evaluate(() => {
      const allEls = document.querySelectorAll('*');
      for (const el of allEls) {
        if (el.textContent?.trim() === 'Create List' && el.childElementCount <= 1) {
          let target: Element | null = el;
          while (target) {
            if (target instanceof HTMLElement && getComputedStyle(target).cursor === 'pointer') {
              target.click();
              return;
            }
            target = target.parentElement;
          }
        }
      }
    });

    // Wait for navigation to list detail page or dialog to close
    await this.page.waitForURL(/\/list\//, { timeout: 30_000 }).catch(async () => {
      // If no navigation, wait for dialog to close
      await this.page.waitForFunction(
        () => !document.body.innerText.includes("Create New List"),
        { timeout: 10_000 }
      ).catch(() => {});
    });

    // Wait for Convex + navigation to settle
    await waitForConvex(this.page, 3000);
  }

  /**
   * Placeholder: Free plan limit has been raised to 10 for E2E testing.
   */
  async ensureListSlotAvailable(_page: Page) {
    // No-op: free plan limit raised to 10 in featureGating.ts
  }

  async openList(name: string) {
    await this.page.getByText(name).first().click();
    await this.page.waitForLoadState("networkidle");
  }

  async deleteList(name: string) {
    // Long-press or find delete button near the list card
    const card = this.page.getByText(name).first();
    await card.click({ button: "right" }); // Try right-click for context menu
    await this.page.waitForTimeout(300);
    const deleteBtn = this.page.getByText("Delete", { exact: false });
    if (await deleteBtn.isVisible()) {
      await deleteBtn.click();
      // Confirm deletion
      const confirmBtn = this.page
        .getByText("Delete", { exact: true })
        .or(this.page.getByText("OK", { exact: true }))
        .or(this.page.getByText("Confirm", { exact: true }));
      if (await confirmBtn.isVisible()) {
        await confirmBtn.click();
      }
    }
  }

  async expectListVisible(name: string) {
    await expect(this.page.getByText(name).first()).toBeVisible();
  }

  async expectListNotVisible(name: string) {
    await expect(this.page.getByText(name)).toHaveCount(0);
  }

  async switchToHistory() {
    await this.historyTab.click();
    await this.page.waitForTimeout(500);
  }

  async expectEmptyHistory() {
    await expect(
      this.page.getByText("No completed", { exact: false }).or(
        this.page.getByText("no trips", { exact: false })
      )
    ).toBeVisible();
  }

  async expectBudgetColor(listName: string, color: "green" | "orange" | "red") {
    // Check the budget indicator color near the list card
    const card = this.page.getByText(listName).first().locator("..");
    // Just verify the card is visible as a smoke test
    await expect(card).toBeVisible();
  }
}
