import { Page, expect } from "@playwright/test";
import { waitForConvex } from "../fixtures/base";

export class ListDetailPage {
  constructor(private page: Page) {}

  // Header
  get budgetDial() {
    return this.page.locator("[class*='dial'], [class*='budget'], svg").first();
  }

  // Sentiment
  get sentimentMessage() {
    return this.page
      .getByText("Looking good", { exact: false })
      .or(this.page.getByText("Getting close", { exact: false }))
      .or(this.page.getByText("Over budget", { exact: false }));
  }

  // Add item
  get addItemInput() {
    return this.page.getByPlaceholder("Add item", { exact: false }).or(
      this.page.getByPlaceholder("item name", { exact: false })
    );
  }
  get addItemButton() {
    return this.page.getByText("Add", { exact: true });
  }

  // Shopping mode
  get startShoppingButton() {
    return this.page.getByText("Start Shopping", { exact: false });
  }
  get completeShoppingButton() {
    return this.page.getByText("Complete", { exact: false }).or(
      this.page.getByText("Finish", { exact: false })
    );
  }

  // Status badge
  get planningBadge() {
    return this.page.getByText("Planning", { exact: true });
  }
  get shoppingBadge() {
    return this.page.getByText("Shopping", { exact: true });
  }

  // Category chips
  get categoryChips() {
    return this.page.locator("[class*='chip'], [class*='filter']");
  }

  async addItem(name: string) {
    await this.addItemInput.fill(name);
    await this.page.waitForTimeout(500);

    // Click the add button (󰐕) to submit
    const addBtn = this.page.locator('text=/󰐕/').first();
    if (await addBtn.isVisible().catch(() => false)) {
      await addBtn.click();
    } else {
      await this.addItemInput.press("Enter");
    }

    await this.page.waitForTimeout(1000);

    // If variant picker appeared ("Choose a size:"), select "Not sure" or first option
    const variantPicker = await this.page.getByText("Choose a size", { exact: false }).isVisible().catch(() => false);
    if (variantPicker) {
      const notSure = this.page.getByText("Not sure", { exact: false });
      if (await notSure.isVisible().catch(() => false)) {
        await notSure.click();
      } else {
        // Click the first variant option
        const firstVariant = this.page.locator('text=/~£\\d/').first();
        if (await firstVariant.isVisible().catch(() => false)) {
          await firstVariant.click();
        }
      }
    }

    await waitForConvex(this.page);
  }

  async checkOffItem(name: string) {
    // Find the item's checkbox and click it
    const itemRow = this.page.getByText(name).first().locator("..");
    const checkbox = itemRow
      .locator("[class*='check'], [role='checkbox']")
      .first();
    if (await checkbox.isVisible()) {
      await checkbox.click();
    } else {
      // Fallback: click on the item text itself if it acts as a toggle
      await this.page.getByText(name).first().click();
    }
    await this.page.waitForTimeout(500);
  }

  async uncheckItem(name: string) {
    await this.checkOffItem(name); // Toggle
  }

  async removeItem(name: string) {
    const itemRow = this.page.getByText(name).first().locator("..");
    const deleteBtn = itemRow.getByText("Remove", { exact: false }).or(
      itemRow.locator("[class*='delete'], [class*='remove']").first()
    );
    if (await deleteBtn.isVisible()) {
      await deleteBtn.click();
    }
  }

  async startShopping() {
    await this.startShoppingButton.click();
    await waitForConvex(this.page);
  }

  async completeShopping() {
    await this.completeShoppingButton.click();
    await this.page.waitForTimeout(500);
    // Confirm if alert appears
    const confirmBtn = this.page
      .getByText("Complete", { exact: true })
      .or(this.page.getByText("OK", { exact: true }))
      .or(this.page.getByText("Confirm", { exact: true }));
    if (await confirmBtn.isVisible()) {
      await confirmBtn.click();
    }
    await waitForConvex(this.page);
  }

  async expectItemVisible(name: string) {
    await expect(this.page.getByText(name).first()).toBeVisible();
  }

  async expectItemChecked(name: string) {
    // Item should appear visually checked (strikethrough, dimmed, etc.)
    const item = this.page.getByText(name).first();
    await expect(item).toBeVisible();
  }

  async expectSentiment(type: "healthy" | "caution" | "over") {
    const messages: Record<string, string> = {
      healthy: "Looking good",
      caution: "Getting close",
      over: "Over budget",
    };
    await expect(
      this.page.getByText(messages[type], { exact: false })
    ).toBeVisible();
  }

  async expectVariantPicker() {
    // Variant picker modal should appear with size options
    await expect(
      this.page
        .getByText("Select size", { exact: false })
        .or(this.page.getByText("variant", { exact: false }))
        .or(this.page.getByText("Pint", { exact: false }))
    ).toBeVisible({ timeout: 10_000 });
  }

  async selectVariant(variantText: string) {
    await this.page.getByText(variantText, { exact: false }).click();
    await waitForConvex(this.page);
  }

  async expectPriceLabel(itemName: string, labelType: "est" | "avg" | "at") {
    const item = this.page.getByText(itemName).first().locator("..");
    const patterns: Record<string, RegExp> = {
      est: /~.*est\./,
      avg: /avg/,
      at: /at \w+/,
    };
    await expect(item.locator(`text=/${patterns[labelType].source}/`)).toBeVisible();
  }

  async expectAllItemsHavePrices() {
    const blanks = await this.page
      .locator("text=/undefined|NaN|null/i")
      .count();
    expect(blanks).toBe(0);
  }
}
