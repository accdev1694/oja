import { Page, expect } from "@playwright/test";
import {
  navigateToTab,
  waitForConvex,
  clickPressable,
  uploadAndParseReceipt,
} from "../fixtures/base";

/**
 * Page object for the Scan tab.
 *
 * The Scan tab has two modes (Receipt / Product) toggled by a GlassCapsuleSwitcher.
 *
 * Receipt Mode shows:
 *  - Pro Tip card (dismissible)
 *  - Recent Receipts list (store name, date, total, chevron)
 *  - "Scan Receipt" FAB button
 *
 * Product Mode shows:
 *  - Scanned products list
 *  - "Scan Product" FAB button
 *
 * Clicking the Scan button opens an alert dialog:
 *  "Cancel" | "Photo Library" | "Use Camera"
 */
export class ScanPage {
  constructor(private page: Page) {}

  // ── Header / Mode ───────────────────────────────────────
  get headerTitle() {
    return this.page.getByText("Scan", { exact: true }).first();
  }
  get receiptModeSubtitle() {
    return this.page.getByText("Receipt Mode", { exact: true });
  }
  get productModeSubtitle() {
    return this.page.getByText("Product Mode", { exact: true });
  }

  // ── Mode Switcher (GlassCapsuleSwitcher) ────────────────
  get receiptTab() {
    return this.page.getByText("Receipt", { exact: true }).first();
  }
  get productTab() {
    return this.page.getByText("Product", { exact: true }).first();
  }

  // ── Pro Tip Card ────────────────────────────────────────
  get proTipCard() {
    return this.page.getByText("Pro Tip", { exact: false });
  }
  get proTipDismiss() {
    // 󰅖 dismiss icon
    return this.page.getByText("\u{F0156}", { exact: true });
  }

  // ── Recent Receipts ─────────────────────────────────────
  get recentReceiptsHeader() {
    return this.page.getByText("Recent Receipts", { exact: false });
  }
  get recentReceiptsSubtitle() {
    return this.page.getByText("Track your spending", { exact: false });
  }

  // ── Scan Button (FAB) ──────────────────────────────────
  get scanReceiptButton() {
    return this.page.getByText("Scan Receipt", { exact: true });
  }
  get scanProductButton() {
    return this.page.getByText("Scan Product", { exact: true });
  }

  // ── Alert Dialog Buttons ────────────────────────────────
  get alertPhotoLibrary() {
    return this.page.getByText("Photo Library", { exact: true });
  }
  get alertUseCamera() {
    return this.page.getByText("Use Camera", { exact: true });
  }
  get alertCancel() {
    return this.page.getByText("Cancel", { exact: true });
  }

  // ── Confirm Screen ─────────────────────────────────────
  get confirmHeader() {
    return this.page.getByText("Confirm Receipt", { exact: false });
  }
  get saveReceiptButton() {
    return this.page.getByText("Save Receipt", { exact: false });
  }
  get createListFromReceiptButton() {
    return this.page.getByText("Create List from Receipt", { exact: false });
  }
  get addToPantryButton() {
    return this.page.getByText("Add to Pantry", { exact: false });
  }
  get doneButton() {
    return this.page.getByText("Done", { exact: true });
  }
  get deleteReceiptButton() {
    return this.page.getByText("Delete Receipt", { exact: false });
  }
  get addMissingItemButton() {
    return this.page.getByText("Add Missing Item", { exact: false });
  }

  // ── Navigation ──────────────────────────────────────────

  async goto() {
    await navigateToTab(this.page, "Scan");
    await waitForConvex(this.page);
    // Wait for scan tab to finish loading
    await this.page
      .getByText("Receipt Mode", { exact: false })
      .or(this.page.getByText("Product Mode", { exact: false }))
      .waitFor({ state: "visible", timeout: 15_000 })
      .catch(() => {});
  }

  // ── Mode Switching ──────────────────────────────────────

  async switchToReceiptMode() {
    const tab = this.receiptTab;
    const box = await tab.boundingBox().catch(() => null);
    if (box) {
      await this.page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    } else {
      await tab.click({ force: true });
    }
    await this.page.waitForTimeout(500);
  }

  async switchToProductMode() {
    const tab = this.productTab;
    const box = await tab.boundingBox().catch(() => null);
    if (box) {
      await this.page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    } else {
      await tab.click({ force: true });
    }
    await this.page.waitForTimeout(500);
  }

  // ── Scan Actions ────────────────────────────────────────

  /** Click the Scan Receipt / Scan Product FAB button */
  async clickScanButton() {
    const scanBtn = this.scanReceiptButton.or(this.scanProductButton);
    const box = await scanBtn.boundingBox().catch(() => null);
    if (box) {
      await this.page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    } else {
      await scanBtn.click({ force: true });
    }
    await this.page.waitForTimeout(500);
  }

  // ── Recent Receipts ─────────────────────────────────────

  /** Get the count of recent receipt rows (each has a store name + price) */
  async getRecentReceiptCount(): Promise<number> {
    // Each receipt row has a price like "£X.XX"
    const prices = await this.page.locator("text=/£\\d+\\.\\d{2}/").count();
    return prices;
  }

  /** Click on a recent receipt by store name */
  async clickRecentReceipt(storeName: string) {
    const receipt = this.page.getByText(storeName, { exact: false }).first();
    const box = await receipt.boundingBox().catch(() => null);
    if (box) {
      await this.page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    } else {
      await receipt.click({ force: true });
    }
    await this.page.waitForTimeout(1000);
    await waitForConvex(this.page);
  }

  // ── Confirm Screen ─────────────────────────────────────

  /** Check if we're on the confirm receipt screen */
  async isOnConfirmScreen(): Promise<boolean> {
    const url = this.page.url();
    if (url.includes("confirm") || url.includes("receipt")) return true;
    return this.confirmHeader.isVisible().catch(() => false);
  }

  /** Get count of items on the confirm screen (items with £ prices) */
  async getConfirmItemCount(): Promise<number> {
    return this.page.locator("text=/£\\d/").count();
  }

  /** Get the total shown on confirm screen */
  async getConfirmTotal(): Promise<string> {
    // "Total:" label and "£2.50" value are siblings — get parent row text
    const totalLabel = this.page.getByText("Total:", { exact: false }).last();
    const parentText = await totalLabel
      .locator("..")
      .textContent()
      .catch(() => "");
    return parentText ?? "";
  }

  /** Get store name from confirm screen */
  async getConfirmStoreName(): Promise<string> {
    // Wait for store info to load
    await this.page.waitForTimeout(500);
    const storeNames = [
      "Aldi", "Lidl", "LIDL", "Tesco", "Sainsbury", "Morrisons",
      "Asda", "Waitrose", "Co-op", "Iceland", "Noshahi",
    ];
    for (const store of storeNames) {
      const count = await this.page.getByText(store, { exact: false }).count();
      if (count > 0) {
        return store;
      }
    }
    // Fallback: check Store Information section for any text after "Store:"
    const storeLabel = this.page.getByText("Store:", { exact: false });
    if (await storeLabel.isVisible().catch(() => false)) {
      const parent = storeLabel.locator("..");
      const text = await parent.textContent().catch(() => "");
      const cleaned = text?.replace("Store:", "").trim() ?? "";
      if (cleaned.length > 0) return cleaned;
    }
    return "";
  }

  // ── Assertions ──────────────────────────────────────────

  async expectDefaultReceiptMode() {
    // Header shows "Scan" with "Receipt Mode" subtitle
    const hasHeader = await this.page.getByText("Scan", { exact: false }).first().isVisible().catch(() => false);
    const hasSubtitle = await this.receiptModeSubtitle.isVisible().catch(() => false);
    expect(hasHeader || hasSubtitle).toBeTruthy();

    // Mode switcher shows Receipt and Product tabs
    const hasReceipt = await this.receiptTab.isVisible().catch(() => false);
    const hasProduct = await this.productTab.isVisible().catch(() => false);
    expect(hasReceipt && hasProduct).toBeTruthy();

    // Scan button visible
    const hasScanBtn = await this.scanReceiptButton.isVisible().catch(() => false);
    expect(hasScanBtn).toBeTruthy();
  }

  async expectProductMode() {
    const hasSubtitle = await this.productModeSubtitle.isVisible().catch(() => false);
    expect(hasSubtitle).toBeTruthy();
  }

  async expectRecentReceipts() {
    const hasHeader = await this.recentReceiptsHeader.isVisible().catch(() => false);
    expect(hasHeader).toBeTruthy();
  }

  async expectConfirmScreen() {
    // Use .first() to avoid strict mode violation when multiple elements match
    await expect(
      this.confirmHeader.first()
    ).toBeVisible({ timeout: 15_000 });
  }

  async expectNoPriceBlanks() {
    const blanks = await this.page
      .locator("text=/undefined|NaN|null price/i")
      .count();
    expect(blanks).toBe(0);
  }

  // ── High-Level Workflows ─────────────────────────────────

  /**
   * Upload and parse a receipt image.
   * Clicks the scan button, triggers the file chooser, waits for parsing.
   */
  async scanReceipt(receiptPath: string) {
    await this.clickScanButton();
    await this.page.waitForTimeout(500);
    await uploadAndParseReceipt(this.page, receiptPath);
  }

  /** Click the Save Receipt button on the confirm screen and wait for navigation */
  async saveReceipt() {
    const btn = this.saveReceiptButton;
    const box = await btn.boundingBox().catch(() => null);
    if (box) {
      await this.page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    } else {
      await btn.click({ force: true });
    }
    await this.page.waitForTimeout(2000);
    await waitForConvex(this.page);
  }
}
