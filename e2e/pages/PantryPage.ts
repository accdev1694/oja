import { Page, expect } from "@playwright/test";
import {
  navigateToTab,
  waitForConvex,
  clickPressable,
} from "../fixtures/base";

export class PantryPage {
  constructor(private page: Page) {}

  // ── Tabs ──────────────────────────────────────────────────
  get needsRestockingTab() {
    return this.page.getByText("Needs Restocking", { exact: false });
  }
  get allItemsTab() {
    return this.page.getByText("All Items", { exact: true });
  }

  // ── Search ────────────────────────────────────────────────
  get searchInput() {
    return this.page
      .getByPlaceholder("Search stock", { exact: false })
      .or(this.page.getByPlaceholder("Search", { exact: false }));
  }

  // ── Header action buttons ─────────────────────────────────
  get addButton() {
    // Plus icon (󰐕) in the header — use the icon glyph or fallback
    return this.page.getByText("Add", { exact: true }).first();
  }

  // ── Add to Stock modal ────────────────────────────────────
  get addItemNameInput() {
    return this.page
      .getByPlaceholder("Item name", { exact: false })
      .or(this.page.getByPlaceholder("name", { exact: false }));
  }
  get addItemCategorySelect() {
    return this.page.getByText("Select a category", { exact: false });
  }
  get stockLevelStocked() {
    return this.page.getByText("Stocked", { exact: true });
  }
  get stockLevelRunningLow() {
    return this.page.getByText("Running Low", { exact: false });
  }
  get stockLevelOutOfStock() {
    return this.page.getByText("Out of Stock", { exact: false });
  }
  get addItemSubmitButton() {
    return this.page.getByText("Add Item", { exact: true });
  }
  get cancelButton() {
    return this.page.getByText("Cancel", { exact: true });
  }

  // ── Item row elements ─────────────────────────────────────
  get editItemButton() {
    // Pencil icon (󰐒) on item rows
    return this.page.locator("[class*='pencil'], [class*='edit']");
  }
  get menuButton() {
    // Three-dot menu (󰩺) on item rows
    return this.page.locator("[class*='dots'], [class*='menu']");
  }

  // ── Journey banner ────────────────────────────────────────
  get journeyBanner() {
    return this.page
      .getByText("out of stock", { exact: false })
      .or(this.page.getByText("add to your next list", { exact: false }));
  }

  // ── Navigation ────────────────────────────────────────────

  async goto() {
    await navigateToTab(this.page, "Pantry");
    await waitForConvex(this.page);
    // Wait for pantry data to load — "Needs Restocking" tab appears after data loads
    await this.page
      .getByText("Needs Restocking", { exact: false })
      .waitFor({ state: "visible", timeout: 15_000 })
      .catch(() => {});
    // Dismiss any onboarding overlays
    await this.dismissOverlay();
  }

  // ── Tab switching ─────────────────────────────────────────

  async switchToNeedsRestocking() {
    const tab = this.needsRestockingTab;
    const box = await tab.boundingBox().catch(() => null);
    if (box) {
      await this.page.mouse.click(
        box.x + box.width / 2,
        box.y + box.height / 2
      );
    } else {
      await tab.click({ force: true });
    }
    await this.page.waitForTimeout(500);
  }

  async switchToAllItems() {
    const tab = this.allItemsTab;
    const box = await tab.boundingBox().catch(() => null);
    if (box) {
      await this.page.mouse.click(
        box.x + box.width / 2,
        box.y + box.height / 2
      );
    } else {
      await tab.click({ force: true });
    }
    await this.page.waitForTimeout(500);
  }

  // ── Add item ──────────────────────────────────────────────

  /** Open the Add to Stock modal via the header plus icon */
  async openAddItemModal() {
    // The add button is a header icon — find it by the 󰐕 glyph
    const addClicked = await this.page.evaluate(() => {
      const allEls = document.querySelectorAll("*");
      for (const el of allEls) {
        if (!(el instanceof HTMLElement)) continue;
        const text = el.textContent?.trim() ?? "";
        if (
          text === "\u{F0415}" &&
          getComputedStyle(el).cursor === "pointer" &&
          el.children.length <= 1
        ) {
          el.click();
          return true;
        }
      }
      return false;
    });

    if (!addClicked) {
      // Fallback: try clickPressable
      try {
        await clickPressable(this.page, "Add Item", { timeout: 5_000 });
      } catch {
        await clickPressable(this.page, "Add", { timeout: 5_000 });
      }
    }
    await this.page.waitForTimeout(500);
  }

  /** Add a new pantry item via the Add to Stock modal */
  async addItem(
    name: string,
    options?: { category?: string; stockLevel?: "Stocked" | "Running Low" | "Out of Stock" }
  ) {
    await this.openAddItemModal();

    // Wait for modal
    await this.addItemNameInput.waitFor({ state: "visible", timeout: 5_000 });

    // Enter name
    await this.addItemNameInput.click();
    await this.addItemNameInput.fill(name);
    await this.page.waitForTimeout(300);

    // Select category if specified
    if (options?.category) {
      const catSelect = this.addItemCategorySelect;
      if (await catSelect.isVisible().catch(() => false)) {
        await catSelect.click();
        await this.page.waitForTimeout(300);
        await this.page
          .getByText(options.category, { exact: true })
          .click()
          .catch(() => {});
        await this.page.waitForTimeout(300);
      }
    }

    // Select stock level if specified
    if (options?.stockLevel) {
      const levelBtn = this.page.getByText(options.stockLevel, {
        exact: false,
      });
      if (await levelBtn.isVisible().catch(() => false)) {
        const box = await levelBtn.boundingBox().catch(() => null);
        if (box) {
          await this.page.mouse.click(
            box.x + box.width / 2,
            box.y + box.height / 2
          );
        } else {
          await levelBtn.click({ force: true });
        }
      }
    }

    // Submit
    const submitBtn = this.addItemSubmitButton;
    const submitBox = await submitBtn.boundingBox().catch(() => null);
    if (submitBox) {
      await this.page.mouse.click(
        submitBox.x + submitBox.width / 2,
        submitBox.y + submitBox.height / 2
      );
    } else {
      await clickPressable(this.page, "Add Item", { timeout: 5_000 }).catch(
        async () => {
          await clickPressable(this.page, "Save", { timeout: 5_000 });
        }
      );
    }

    await waitForConvex(this.page);
  }

  // ── Search ────────────────────────────────────────────────

  async searchForItem(query: string) {
    const input = this.searchInput.first();
    await input.waitFor({ state: "visible", timeout: 5_000 }).catch(() => {});
    await input.fill(query);
    await this.page.waitForTimeout(500);
  }

  async clearSearch() {
    const input = this.searchInput.first();
    await input.clear();
    await this.page.waitForTimeout(500);
  }

  // ── Per-item actions ──────────────────────────────────────

  /** Click the three-dot menu on the first item matching `name` */
  async openItemMenu(name: string) {
    const menuClicked = await this.page.evaluate((itemName: string) => {
      const allEls = document.querySelectorAll("*");
      for (const el of allEls) {
        if (!(el instanceof HTMLElement)) continue;
        const text = el.textContent?.trim() ?? "";
        if (!text.includes(itemName) || el.children.length > 10) continue;
        // Find the three-dot menu icon (󰩺 = U+F0A7A) inside this container
        const children = el.querySelectorAll("*");
        for (const child of children) {
          if (!(child instanceof HTMLElement)) continue;
          const cText = child.textContent?.trim() ?? "";
          if (
            getComputedStyle(child).cursor === "pointer" &&
            (cText === "\u{F0A7A}" || cText === "\u{F01D8}") &&
            child.children.length <= 1
          ) {
            child.click();
            return true;
          }
        }
      }
      return false;
    }, name);

    if (!menuClicked) {
      // Fallback: click the edit/pencil icon near the item
      const pencilClicked = await this.page.evaluate((itemName: string) => {
        const allEls = document.querySelectorAll("*");
        for (const el of allEls) {
          if (!(el instanceof HTMLElement)) continue;
          const text = el.textContent?.trim() ?? "";
          if (!text.includes(itemName) || el.children.length > 10) continue;
          const children = el.querySelectorAll("*");
          for (const child of children) {
            if (!(child instanceof HTMLElement)) continue;
            const cText = child.textContent?.trim() ?? "";
            if (
              getComputedStyle(child).cursor === "pointer" &&
              (cText === "\u{F0412}" || cText === "\u{F03EB}") &&
              child.children.length <= 1
            ) {
              child.click();
              return true;
            }
          }
        }
        return false;
      }, name);

      if (!pencilClicked) return false;
    }
    await this.page.waitForTimeout(500);
    return true;
  }

  /** Dismiss any overlay (e.g. "Swipe to adjust stock" onboarding hint) */
  async dismissOverlay() {
    const gotIt = this.page.getByText("Got it", { exact: true });
    if (await gotIt.isVisible({ timeout: 1000 }).catch(() => false)) {
      await gotIt.click();
      await this.page.waitForTimeout(500);
    }
  }

  /** Toggle a category section by clicking its header */
  async toggleCategory(categoryName: string) {
    // Dismiss any onboarding overlay first
    await this.dismissOverlay();

    const catHeader = this.page
      .getByText(categoryName, { exact: false })
      .first();
    await catHeader
      .waitFor({ state: "visible", timeout: 10_000 })
      .catch(() => {});
    const box = await catHeader.boundingBox().catch(() => null);
    if (box) {
      await this.page.mouse.click(
        box.x + box.width / 2,
        box.y + box.height / 2
      );
    } else {
      await catHeader.click({ force: true });
    }
    await this.page.waitForTimeout(500);

    // Dismiss overlay again if it appeared after expanding
    await this.dismissOverlay();
  }

  // ── Assertions ────────────────────────────────────────────

  async expectItemVisible(name: string) {
    await expect(
      this.page.getByText(name, { exact: false }).first()
    ).toBeVisible({ timeout: 10_000 });
  }

  async expectItemNotVisible(name: string) {
    const count = await this.page
      .getByText(name, { exact: true })
      .count();
    expect(count).toBe(0);
  }

  async expectNonEmptyList() {
    // Check for category headers (visible in collapsed view)
    const hasBakery = await this.page
      .getByText("Bakery", { exact: false })
      .count();
    const hasPantryStaples = await this.page
      .getByText("Pantry Staples", { exact: false })
      .count();
    const hasCondiments = await this.page
      .getByText("Condiments", { exact: false })
      .count();
    // Check for Needs Restocking/All Items tab badges
    const hasNeedsRestocking = await this.page
      .getByText("Needs Restocking", { exact: false })
      .count();
    expect(
      hasBakery + hasPantryStaples + hasCondiments + hasNeedsRestocking
    ).toBeGreaterThan(0);
  }

  async expectEmptyState() {
    await expect(
      this.page
        .getByText("Add your first", { exact: false })
        .or(this.page.getByText("Get started", { exact: false }))
    ).toBeVisible();
  }

  async expectAllItemsHavePrices() {
    const blanks = await this.page
      .locator("text=/undefined|NaN|null price/i")
      .count();
    expect(blanks).toBe(0);
  }

  /** Get the badge count from the Needs Restocking tab */
  async getNeedsRestockingCount(): Promise<number> {
    // The badge "64" is a sibling element — get parent container text
    const tabText = await this.needsRestockingTab
      .locator("..")
      .textContent()
      .catch(() => "");
    const match = tabText?.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /** Get the badge count from the All Items tab */
  async getAllItemsCount(): Promise<number> {
    const tabText = await this.allItemsTab
      .locator("..")
      .textContent()
      .catch(() => "");
    const match = tabText?.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /** Get the Stock tab badge count from the bottom tab bar */
  async getTabBarBadgeCount(): Promise<number> {
    // The badge is near the "Stock" text in the tab bar
    const badge = await this.page.evaluate(() => {
      const allEls = document.querySelectorAll("*");
      for (const el of allEls) {
        if (!(el instanceof HTMLElement)) continue;
        const text = el.textContent?.trim() ?? "";
        if (text === "Stock" && el.children.length <= 2) {
          // Look for a badge sibling/child with a number
          const parent = el.parentElement;
          if (parent) {
            const siblings = parent.querySelectorAll("*");
            for (const sib of siblings) {
              if (sib === el) continue;
              const sibText = (sib as HTMLElement).textContent?.trim() ?? "";
              if (/^\d+$/.test(sibText) && parseInt(sibText) > 0) {
                return parseInt(sibText);
              }
            }
          }
        }
      }
      return 0;
    });
    return badge;
  }

  async getItemCount(): Promise<number> {
    return this.page.locator("[class*='item']").count();
  }

  async tapAddToList(itemName: string) {
    const itemRow = this.page.getByText(itemName).first().locator("..");
    const addBtn = itemRow
      .locator("text=/Add to List|add-to-list/i")
      .or(itemRow.locator("[class*='addToList']"));
    if (await addBtn.isVisible()) {
      await addBtn.click();
    } else {
      await this.page
        .getByText(itemName)
        .first()
        .locator("xpath=ancestor::div[1]")
        .getByText("Add", { exact: false })
        .click();
    }
  }
}
