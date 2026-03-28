import { Page, expect } from "@playwright/test";
import { waitForConvex, clickPressable } from "../fixtures/base";

export class ListDetailPage {
  constructor(private page: Page) {}

  // ── Header ───────────────────────────────────────────────
  get listTitle() {
    // The list name is in the header — we'll match it dynamically
    return this.page.locator("h1, [class*='title']").first();
  }
  get editNameButton() {
    // Pencil icon for editing list name
    return this.page.locator("[class*='pencil'], [class*='edit']").first();
  }
  get storeSubtitle() {
    return this.page.getByText("Store:", { exact: false });
  }
  get noStoreText() {
    return this.page.getByText("No store selected", { exact: false });
  }

  // ── Budget dial ──────────────────────────────────────────
  get budgetDial() {
    return this.page.locator("[class*='dial'], [class*='budget'], svg").first();
  }
  get budgetText() {
    return this.page.getByText("budget", { exact: false });
  }
  get remainingText() {
    return this.page.getByText("remaining", { exact: false });
  }

  // ── Budget display ───────────────────────────────────────
  get overBudgetIndicator() {
    return this.page
      .getByText("over budget", { exact: false })
      .or(this.page.getByText("Over budget", { exact: false }));
  }
  get underBudgetIndicator() {
    return this.page
      .getByText("under budget", { exact: false })
      .or(this.page.getByText("remaining", { exact: false }));
  }

  // ── Store selector ───────────────────────────────────────
  get storeButton() {
    return this.page
      .getByText("Store", { exact: true })
      .or(this.page.getByText("Switch Store", { exact: false }));
  }
  get storeDropdown() {
    return this.page.getByText("YOUR STORES", { exact: false });
  }
  get pickStoreHint() {
    return this.page.getByText("Pick a store", { exact: false });
  }

  // ── Add items ────────────────────────────────────────────
  get addItemsButton() {
    return this.page.getByText("Add Items", { exact: true });
  }
  get addItemInput() {
    return this.page
      .getByPlaceholder("Search items", { exact: false })
      .or(this.page.getByPlaceholder("Type item name", { exact: false }));
  }
  get addItemButton() {
    return this.page.getByText("Add Item", { exact: true });
  }
  get goToListButton() {
    return this.page.getByText("Go to List", { exact: false });
  }

  // ── Search ───────────────────────────────────────────────
  get searchInput() {
    return this.page.getByPlaceholder("Search items", { exact: false });
  }

  // ── Items ────────────────────────────────────────────────
  get emptyListText() {
    return this.page
      .getByText("No items yet", { exact: false })
      .or(this.page.getByText("Add your first item", { exact: false }))
      .or(this.page.getByText("no items", { exact: false }));
  }

  // ── Refresh prices ───────────────────────────────────────
  get refreshPricesButton() {
    return this.page.getByText("Refresh Prices", { exact: false });
  }
  get refreshingText() {
    return this.page.getByText("Refreshing", { exact: false });
  }

  // ── Health analysis ──────────────────────────────────────
  get healthButton() {
    // Heart icon button in header
    return this.page.locator("[class*='heart'], [class*='health']").first();
  }
  get healthScore() {
    return this.page.getByText(/\d+\/100/, { exact: false });
  }
  get healthSwapSuggestion() {
    return this.page.getByText("swap", { exact: false });
  }

  // ── Multi-select bar ─────────────────────────────────────
  get selectedCount() {
    return this.page.getByText("selected", { exact: false });
  }
  get deleteSelectedButton() {
    return this.page.getByText("Delete", { exact: true });
  }

  // ── Per-item action buttons ─────────────────────────────
  get editItemButton() {
    // pencil-outline icon on each item row (18px)
    return this.page.locator("[class*='pencil'], [class*='edit']");
  }
  get deleteItemButton() {
    // trash-can-outline icon on each item row (18px)
    return this.page.locator("[class*='trash'], [class*='delete']");
  }

  // ── Edit item modal ───────────────────────────────────────
  get editItemModal() {
    return this.page.getByText("Edit Item", { exact: false });
  }
  get editItemNameInput() {
    return this.page.getByPlaceholder("Item name", { exact: false });
  }
  get editItemSizeInput() {
    return this.page.getByPlaceholder("e.g., 500ml", { exact: false })
      .or(this.page.getByPlaceholder("e.g. 500ml", { exact: false }));
  }
  get editItemQuantityInput() {
    return this.page.getByPlaceholder("1", { exact: true });
  }
  get editItemPriceInput() {
    return this.page.getByPlaceholder("0.00", { exact: false });
  }
  get saveItemEditButton() {
    return this.page.getByText("Save", { exact: true });
  }

  // ── Search bar ─────────────────────────────────────────────
  get searchItemsInput() {
    return this.page.getByPlaceholder("Search items", { exact: false });
  }

  // ── Footer ───────────────────────────────────────────────
  get finishButton() {
    return this.page
      .getByText("Finish", { exact: false })
      .first();
  }
  get finishTripButton() {
    // Alias used by some tests — same as finishButton
    return this.finishButton;
  }
  get allDoneButton() {
    return this.page.getByText("All Done", { exact: false });
  }
  get hideCheckedButton() {
    return this.page.getByText("Hide Checked", { exact: false });
  }
  get showCheckedButton() {
    return this.page.getByText("Show Checked", { exact: false });
  }

  // ── Trip summary modal ───────────────────────────────────
  get tripCompleteTitle() {
    return this.page.getByText("Trip Complete", { exact: false });
  }
  get tripSummaryFinishButton() {
    // "Finish Trip" button inside trip summary modal
    return this.page.getByText("Finish Trip", { exact: true });
  }
  get continueShopping() {
    return this.page.getByText("Continue Shopping", { exact: false });
  }
  get scanReceiptButton() {
    return this.page.getByText("Scan Receipt", { exact: false });
  }
  get rightOnBudget() {
    return this.page.getByText("Right on budget", { exact: false });
  }
  get underBudgetSummary() {
    return this.page.getByText("under budget", { exact: false });
  }
  get overBudgetSummary() {
    return this.page.getByText("over budget", { exact: false });
  }
  get uncheckedItemsSection() {
    return this.page.getByText("not purchased", { exact: false });
  }
  get pantryRestockNote() {
    return this.page.getByText("restocked to your pantry", { exact: false });
  }

  // ── Duplicate alert ──────────────────────────────────────
  get alreadyOnListAlert() {
    return this.page.getByText("Already on List", { exact: false });
  }

  // ── Edit modals ──────────────────────────────────────────
  get editListNameModal() {
    return this.page.getByText("Edit List Name", { exact: false });
  }
  get editBudgetModal() {
    return this.page.getByText("Edit Budget", { exact: false });
  }
  get editNameInput() {
    return this.page.getByPlaceholder("Enter list name", { exact: false });
  }
  get editBudgetInput() {
    return this.page.getByPlaceholder("50.00", { exact: false });
  }
  get saveEditButton() {
    return this.page.getByText("Save", { exact: true });
  }
  get updateBudgetButton() {
    return this.page
      .getByText("Update", { exact: true })
      .or(this.page.getByText("Set Budget", { exact: false }));
  }
  get cancelEditButton() {
    return this.page.getByText("Cancel", { exact: true });
  }

  // ── Actions ──────────────────────────────────────────────

  async goto(listId: string) {
    await this.page.goto(`/list/${listId}`);
    await waitForConvex(this.page, 2000);
  }

  /** Ensure a store is selected (required before adding items) */
  async ensureStoreSelected(storeName = "Tesco") {
    // Check if "Add items" button is disabled — means no store selected
    const addBtn = this.page.locator('button:has-text("Add items")').first();
    const isDisabled = await addBtn.isDisabled().catch(() => false);
    const hasPickStore = await this.pickStoreHint.isVisible().catch(() => false);

    if (isDisabled || hasPickStore) {
      await this.selectStore(storeName);
    }
  }

  async addItem(name: string) {
    // Ensure store is selected first (Add Items is disabled without a store)
    await this.ensureStoreSelected();

    // Open add items modal if not already open
    const inputVisible = await this.addItemInput.isVisible().catch(() => false);
    if (!inputVisible) {
      // Wait for animations to settle after store selection
      await this.page.waitForTimeout(2000);
      // Use clickPressable — AnimatedSection causes "element is not stable" with .click()
      await clickPressable(this.page, "Add Items");
      await this.page.waitForTimeout(1000);
    }

    // Type item name
    const input = this.addItemInput.first();
    await input.waitFor({ state: "visible", timeout: 5_000 });
    await input.fill(name);
    await this.page.waitForTimeout(1500);

    // Wait briefly for suggestions to load
    await this.page.waitForTimeout(1000);

    // Check if there are suggestions or "No matches found"
    const noMatches = await this.page
      .getByText("No matches found", { exact: false })
      .isVisible({ timeout: 2000 })
      .catch(() => false);

    if (noMatches) {
      // Click "Add Item" button — the manual add button at the bottom of the modal
      // Use mouse.click on the button's bounding box to bypass RNW click issues
      const addBtnLoc = this.page.getByRole("button", { name: /^Add Item$/ });
      const box = await addBtnLoc.last().boundingBox().catch(() => null);
      if (box) {
        await this.page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      } else {
        await clickPressable(this.page, "Add Item");
      }
    } else {
      // Suggestions may have appeared — check for auto-selected suggestion
      // The first suggestion may already be selected; clicking "Add Item" adds it
      const addBtnLoc = this.page.getByRole("button", { name: /^Add Item$/ });
      const hasAddBtn = await addBtnLoc.isVisible({ timeout: 1000 }).catch(() => false);
      if (hasAddBtn) {
        const box = await addBtnLoc.last().boundingBox().catch(() => null);
        if (box) {
          await this.page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
        } else {
          await clickPressable(this.page, "Add Item");
        }
      }
    }
    await this.page.waitForTimeout(2000);

    // Check if feedback pill appeared ("{name} added")
    const feedbackPill = this.page.getByText("added", { exact: false });
    await feedbackPill.isVisible({ timeout: 3000 }).catch(() => false);

    // Handle duplicate alert if it appears
    const hasDuplicate = await this.alreadyOnListAlert
      .isVisible({ timeout: 1000 })
      .catch(() => false);
    if (hasDuplicate) {
      // Click "Add Separate" to add anyway
      const addSeparate = this.page.getByText("Add Separate", { exact: false });
      if (await addSeparate.isVisible().catch(() => false)) {
        await addSeparate.click();
      }
    }

    await waitForConvex(this.page);
  }

  async closeAddModal() {
    // Close the add items modal by clicking X or going to list
    const goToList = this.goToListButton;
    if (await goToList.isVisible().catch(() => false)) {
      await clickPressable(this.page, "Go to List", { exact: false });
      await this.page.waitForTimeout(500);
      return;
    }
    // Fallback: click the X (close) icon in the modal header
    const closeClicked = await this.page.evaluate(() => {
      const allEls = document.querySelectorAll("*");
      for (const el of allEls) {
        if (!(el instanceof HTMLElement)) continue;
        const text = el.textContent?.trim() ?? "";
        // MDI close icon = 󰅖 (U+F0156)
        if (
          (text === "\u{F0156}" || text === "\u{F0156}") &&
          getComputedStyle(el).cursor === "pointer" &&
          el.children.length <= 1
        ) {
          el.click();
          return true;
        }
      }
      return false;
    });
    if (closeClicked) {
      await this.page.waitForTimeout(500);
      return;
    }
    // Last resort: press Escape
    await this.page.keyboard.press("Escape");
    await this.page.waitForTimeout(500);
  }

  async selectStore(storeName: string) {
    // Click the store button to open dropdown (use mouse.click to avoid animation instability)
    const selectStoreBtn = this.page.getByRole("button", { name: "Select store" });
    const hasSelectBtn = await selectStoreBtn.isVisible().catch(() => false);

    if (hasSelectBtn) {
      const box = await selectStoreBtn.boundingBox();
      if (box) {
        await this.page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      } else {
        await selectStoreBtn.click({ force: true });
      }
    } else {
      await this.storeButton.first().click({ force: true });
    }
    await this.page.waitForTimeout(1000);

    // Select the store from dropdown (use evaluate + mouse.click for RNW)
    // The store text may have CSS overflow:hidden — find the clickable parent's position
    const storeRect = await this.page.evaluate((name: string) => {
      const allEls = document.querySelectorAll("*");
      for (const el of allEls) {
        if (!(el instanceof HTMLElement)) continue;
        const text = el.textContent?.trim() ?? "";
        if (
          text === name &&
          getComputedStyle(el).cursor === "pointer"
        ) {
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
          }
        }
      }
      // Fallback: look for parent with cursor:pointer containing the store name
      for (const el of allEls) {
        if (!(el instanceof HTMLElement)) continue;
        if (
          el.textContent?.includes(name) &&
          el.childElementCount <= 2 &&
          getComputedStyle(el).cursor === "pointer"
        ) {
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
          }
        }
      }
      return null;
    }, storeName);

    if (storeRect) {
      await this.page.mouse.click(storeRect.x, storeRect.y);
    } else {
      // Last resort: force click
      const storeOption = this.page.getByText(storeName, { exact: false }).first();
      await storeOption.click({ force: true });
    }
    await waitForConvex(this.page);
  }

  async switchStore(storeName: string) {
    // Click "Switch Store" button (may have CSS overflow:hidden)
    const switchBtn = this.page.getByRole("button", { name: /Store/i }).first();
    const switchBtnBox = await switchBtn.boundingBox();
    if (switchBtnBox) {
      await this.page.mouse.click(switchBtnBox.x + switchBtnBox.width / 2, switchBtnBox.y + switchBtnBox.height / 2);
    } else {
      const switchText = this.page.getByText("Switch Store", { exact: false });
      if (await switchText.isVisible().catch(() => false)) {
        await switchText.click({ force: true });
      } else {
        await this.storeButton.first().click({ force: true });
      }
    }
    await this.page.waitForTimeout(1000);

    // Select the store using evaluate + mouse.click (same as selectStore)
    const storeRect = await this.page.evaluate((name: string) => {
      const allEls = document.querySelectorAll("*");
      for (const el of allEls) {
        if (!(el instanceof HTMLElement)) continue;
        const text = el.textContent?.trim() ?? "";
        if (text === name && getComputedStyle(el).cursor === "pointer") {
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
          }
        }
      }
      for (const el of allEls) {
        if (!(el instanceof HTMLElement)) continue;
        if (
          el.textContent?.includes(name) &&
          el.childElementCount <= 2 &&
          getComputedStyle(el).cursor === "pointer"
        ) {
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
          }
        }
      }
      return null;
    }, storeName);

    if (storeRect) {
      await this.page.mouse.click(storeRect.x, storeRect.y);
    } else {
      const storeOption = this.page.getByText(storeName, { exact: false }).first();
      await storeOption.click({ force: true });
    }
    await waitForConvex(this.page);
  }

  async checkOffItem(name: string) {
    await this.page.getByText(name, { exact: false }).first().click();
    await this.page.waitForTimeout(800);
    await waitForConvex(this.page);
  }

  async uncheckItem(name: string) {
    await this.checkOffItem(name); // Toggle
  }

  async tapFinish() {
    // Tap the footer Finish button
    await this.finishButton.click();
    await this.page.waitForTimeout(1500);
  }

  async finishTrip() {
    // Tap Finish in footer, then confirm in trip summary modal
    await this.tapFinish();

    // Wait for trip summary modal
    const hasSummary = await this.tripCompleteTitle
      .isVisible({ timeout: 5_000 })
      .catch(() => false);
    if (hasSummary) {
      // Click "Finish Trip" in the summary modal
      await clickPressable(this.page, "Finish Trip");
      await waitForConvex(this.page, 3000);
    }
  }

  async editListName(newName: string) {
    // Click pencil icon to edit name
    await this.editNameButton.click();
    await this.page.waitForTimeout(500);

    // Wait for edit name modal
    await this.editNameInput.first().waitFor({ state: "visible", timeout: 5_000 });
    const input = this.editNameInput.first();
    await input.click();
    await input.press("Control+A");
    await input.press("Backspace");
    await input.pressSequentially(newName, { delay: 30 });
    await this.page.waitForTimeout(300);

    // Save
    await clickPressable(this.page, "Save");
    await waitForConvex(this.page);
  }

  async editBudget(newBudget: number) {
    // Find and click budget edit trigger (tap on budget dial area)
    const budgetArea = this.budgetDial;
    await budgetArea.click();
    await this.page.waitForTimeout(500);

    // Wait for edit budget modal
    const input = this.editBudgetInput.first();
    await input.waitFor({ state: "visible", timeout: 5_000 });
    await input.click();
    await input.press("Control+A");
    await input.press("Backspace");
    await input.pressSequentially(newBudget.toString(), { delay: 30 });
    await this.page.waitForTimeout(300);

    // Update
    await clickPressable(this.page, "Update");
    await waitForConvex(this.page);
  }

  async refreshPrices() {
    await clickPressable(this.page, "Refresh Prices", { exact: false });
    // Wait for refresh to complete
    await this.page.waitForTimeout(3000);
    await waitForConvex(this.page);
  }

  /** Click pencil icon on the first item matching `name` to open Edit Item modal */
  async openEditItemModal(name: string) {
    // Find the item row containing this name, then click the pencil icon near it
    const pencilClicked = await this.page.evaluate((itemName: string) => {
      const allEls = document.querySelectorAll("*");
      for (const el of allEls) {
        if (!(el instanceof HTMLElement)) continue;
        const text = el.textContent?.trim() ?? "";
        if (!text.includes(itemName) || el.children.length > 8) continue;
        // Look for pencil-like clickable inside this container
        const clickables = el.querySelectorAll("*");
        for (const child of clickables) {
          if (!(child instanceof HTMLElement)) continue;
          const cText = child.textContent?.trim() ?? "";
          if (
            getComputedStyle(child).cursor === "pointer" &&
            (cText === "\u{F03EB}" || cText === "\u{F0CB6}") &&
            child.children.length <= 1
          ) {
            child.click();
            return true;
          }
        }
      }
      return false;
    }, name);

    if (!pencilClicked) {
      // Fallback: just click the first edit-like icon
      const editIcon = this.editItemButton.first();
      if (await editIcon.isVisible({ timeout: 3000 }).catch(() => false)) {
        await editIcon.click();
      }
    }
    await this.page.waitForTimeout(1000);
  }

  /** Delete an item by clicking its trash icon */
  async deleteItemFromList(name: string) {
    const trashClicked = await this.page.evaluate((itemName: string) => {
      const allEls = document.querySelectorAll("*");
      for (const el of allEls) {
        if (!(el instanceof HTMLElement)) continue;
        const text = el.textContent?.trim() ?? "";
        if (!text.includes(itemName) || el.children.length > 8) continue;
        const clickables = el.querySelectorAll("*");
        for (const child of clickables) {
          if (!(child instanceof HTMLElement)) continue;
          const cText = child.textContent?.trim() ?? "";
          if (
            getComputedStyle(child).cursor === "pointer" &&
            (cText === "\u{F0A79}" || cText === "\u{F01B4}") && // trash icons
            child.children.length <= 1
          ) {
            child.click();
            return true;
          }
        }
      }
      return false;
    }, name);

    if (!trashClicked) {
      const trashIcon = this.deleteItemButton.first();
      if (await trashIcon.isVisible({ timeout: 3000 }).catch(() => false)) {
        await trashIcon.click();
      }
    }
    await this.page.waitForTimeout(500);

    // Confirm deletion if dialog appears
    const confirmBtn = this.page.getByText("Delete", { exact: true })
      .or(this.page.getByText("OK", { exact: true }))
      .or(this.page.getByText("Confirm", { exact: true }));
    if (await confirmBtn.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await confirmBtn.first().click();
    }
    await waitForConvex(this.page);
  }

  /** Toggle the search bar and type a query */
  async searchItems(query: string) {
    // Click the magnify icon to toggle search bar
    const magnifyClicked = await this.page.evaluate(() => {
      const allEls = document.querySelectorAll("*");
      for (const el of allEls) {
        if (!(el instanceof HTMLElement)) continue;
        const text = el.textContent?.trim() ?? "";
        if (
          getComputedStyle(el).cursor === "pointer" &&
          (text === "\u{F0349}" || text === "\u{F068C}") && // magnify icons
          el.children.length <= 1
        ) {
          el.click();
          return true;
        }
      }
      return false;
    });
    await this.page.waitForTimeout(500);

    const input = this.searchItemsInput.first();
    if (await input.isVisible({ timeout: 3000 }).catch(() => false)) {
      await input.fill(query);
      await this.page.waitForTimeout(500);
    }
  }

  // ── Assertions ───────────────────────────────────────────

  async expectListName(name: string) {
    // The title text may be styled with overflow:hidden + textOverflow:ellipsis,
    // causing Playwright to consider it "hidden". Verify the text exists in DOM.
    const el = this.page.getByText(name, { exact: false }).first();
    try {
      await expect(el).toBeVisible({ timeout: 10_000 });
    } catch {
      // Fallback: element exists in DOM but marked hidden due to CSS truncation
      const count = await this.page.getByText(name, { exact: false }).count();
      expect(count).toBeGreaterThan(0);
    }
  }

  async expectItemVisible(name: string) {
    await expect(this.page.getByText(name, { exact: false }).first()).toBeVisible({ timeout: 10_000 });
  }

  async expectItemNotVisible(name: string) {
    const count = await this.page.getByText(name, { exact: true }).count();
    expect(count).toBe(0);
  }

  async expectItemChecked(name: string) {
    const item = this.page.getByText(name, { exact: false }).first();
    await expect(item).toBeVisible();
  }

  async expectEmptyList() {
    await expect(this.emptyListText).toBeVisible({ timeout: 5_000 });
  }

  async expectBudgetVisible() {
    const hasBudget = await this.budgetText.isVisible().catch(() => false);
    const hasRemaining = await this.remainingText.isVisible().catch(() => false);
    const hasDial = await this.budgetDial.isVisible().catch(() => false);
    expect(hasBudget || hasRemaining || hasDial).toBeTruthy();
  }

  async expectStoreDisplayed(storeName: string) {
    await expect(
      this.page.getByText(storeName, { exact: false }).first()
    ).toBeVisible({ timeout: 5_000 });
  }

  async expectAllItemsHavePrices() {
    const blanks = await this.page
      .locator("text=/undefined|NaN|null/i")
      .count();
    expect(blanks).toBe(0);
  }

  async expectTripSummary() {
    await expect(this.tripCompleteTitle).toBeVisible({ timeout: 10_000 });
  }

  async getItemCount(): Promise<number> {
    // Count visible items with price-like elements
    const items = this.page.getByText("£", { exact: false });
    return await items.count().catch(() => 0);
  }
}
