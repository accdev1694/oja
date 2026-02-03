import { Page, expect } from "@playwright/test";
import { navigateToTab, waitForConvex, scrollDown } from "../fixtures/base";

export class PantryPage {
  constructor(private page: Page) {}

  // Tabs
  get needsRestockingTab() {
    return this.page.getByText("Needs Restocking", { exact: false });
  }
  get allItemsTab() {
    return this.page.getByText("All Items", { exact: true });
  }

  // Search
  get searchInput() {
    return this.page.getByPlaceholder("Search", { exact: false });
  }

  // Add item modal
  get addButton() {
    return this.page.getByText("Add", { exact: true }).first();
  }
  get itemNameInput() {
    return this.page.getByPlaceholder("Item name", { exact: false }).or(
      this.page.getByPlaceholder("name", { exact: false })
    );
  }

  // Journey banner
  get journeyBanner() {
    return this.page.getByText("out of stock", { exact: false }).or(
      this.page.getByText("add to your next list", { exact: false })
    );
  }

  async goto() {
    await navigateToTab(this.page, "Pantry");
    await waitForConvex(this.page);
  }

  async switchToNeedsRestocking() {
    await this.needsRestockingTab.click();
  }

  async switchToAllItems() {
    await this.allItemsTab.click();
    await this.page.waitForTimeout(500);
  }

  async searchForItem(query: string) {
    await this.searchInput.fill(query);
    await this.page.waitForTimeout(500);
  }

  async clearSearch() {
    await this.searchInput.clear();
    await this.page.waitForTimeout(500);
  }

  async expectItemVisible(name: string) {
    await expect(this.page.getByText(name).first()).toBeVisible();
  }

  async expectItemNotVisible(name: string) {
    await expect(this.page.getByText(name)).toHaveCount(0);
  }

  async getItemCount() {
    // Count item cards in the list
    return this.page.locator("[class*='item']").count();
  }

  async expectNonEmptyList() {
    // At least one pantry item or category visible
    // Needs Restocking view shows items with "Running low" / "Out of stock" / price "est."
    // All Items view shows collapsed categories like "Dairy", "Bakery", etc.
    const hasRunningLow = await this.page.getByText("Running low", { exact: false }).count();
    const hasOutOfStock = await this.page.getByText("Out of stock", { exact: false }).count();
    const hasPriceEst = await this.page.getByText("est.", { exact: false }).count();
    const hasCategories = await this.page.getByText("Dairy", { exact: false }).count();
    const hasItemCount = await this.page.getByText("of 101 items", { exact: false }).count()
      + await this.page.getByText("items", { exact: false }).count();
    expect(hasRunningLow + hasOutOfStock + hasPriceEst + hasCategories + hasItemCount).toBeGreaterThan(0);
  }

  async expectEmptyState() {
    await expect(
      this.page.getByText("Add your first", { exact: false }).or(
        this.page.getByText("Get started", { exact: false })
      )
    ).toBeVisible();
  }

  async expectBadgeCount(expectedCount: number) {
    const badge = this.page.getByText(`${expectedCount}`).first();
    await expect(badge).toBeVisible();
  }

  async expectAllItemsHavePrices() {
    // Zero-blank invariant: no item should show "undefined" or null price
    const blanks = await this.page
      .locator("text=/undefined|NaN|null price/i")
      .count();
    expect(blanks).toBe(0);
  }

  async tapAddToList(itemName: string) {
    // Find the item row, then click its "Add to List" button
    const itemRow = this.page.getByText(itemName).first().locator("..");
    const addBtn = itemRow.locator("text=/Add to List|add-to-list/i").or(
      itemRow.locator("[class*='addToList']")
    );
    if (await addBtn.isVisible()) {
      await addBtn.click();
    } else {
      // Fallback: look for the button near the item text
      await this.page
        .getByText(itemName)
        .first()
        .locator("xpath=ancestor::div[1]")
        .getByText("Add", { exact: false })
        .click();
    }
  }
}
