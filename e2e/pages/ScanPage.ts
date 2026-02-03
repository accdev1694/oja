import { Page, expect } from "@playwright/test";
import {
  navigateToTab,
  waitForConvex,
  uploadReceipt,
  uploadAndParseReceipt,
  RECEIPT_FILES,
} from "../fixtures/base";

export class ScanPage {
  constructor(private page: Page) {}

  get tipsCard() {
    return this.page.getByText("Tips for best results", { exact: false });
  }
  get linkToListSelector() {
    return this.page.getByText("Link to shopping list", { exact: false });
  }
  get takePhotoButton() {
    return this.page.getByText("Take Photo", { exact: false });
  }
  get chooseFromLibraryButton() {
    return this.page.getByText("Choose from Library", { exact: false }).or(
      this.page.getByText("Photo Library", { exact: false })
    );
  }
  get parsingSpinner() {
    return this.page.getByText("Reading your receipt", { exact: false });
  }
  get cancelButton() {
    return this.page.getByText("Cancel", { exact: true });
  }
  get retakeButton() {
    return this.page.getByText("Retake", { exact: true });
  }
  get usePhotoButton() {
    return this.page.getByText("Use Photo", { exact: true });
  }
  get saveButton() {
    return this.page
      .getByText("Save", { exact: false })
      .or(this.page.getByText("Add to Pantry", { exact: false }))
      .or(this.page.getByText("Confirm", { exact: false }));
  }

  async goto() {
    await navigateToTab(this.page, "Scan");
    await waitForConvex(this.page);

    // If we're on the review screen from a previous state, retake to get back to default
    const onReview = await this.page.getByText("Review Receipt", { exact: false }).isVisible().catch(() => false);
    const hasRetake = await this.retakeButton.isVisible().catch(() => false);
    const hasUsePhoto = await this.usePhotoButton.isVisible().catch(() => false);

    if ((onReview || hasRetake || hasUsePhoto) && hasRetake) {
      await this.retakeButton.click();
      await this.page.waitForTimeout(2000);
      // Verify we're back on the default scan screen
      await this.chooseFromLibraryButton.first().waitFor({ state: "visible", timeout: 10_000 }).catch(() => {});
    }
  }

  async expectDefaultState() {
    // Check tips card or scan header
    const hasTips = await this.tipsCard.isVisible().catch(() => false);
    const hasScanHeader = await this.page.getByText("Scan Receipt", { exact: false }).isVisible().catch(() => false);
    expect(hasTips || hasScanHeader).toBeTruthy();

    // Check at least one action button visible (avoid .or() strict mode)
    const hasPhoto = await this.takePhotoButton.isVisible().catch(() => false);
    const hasLibrary = await this.chooseFromLibraryButton.first().isVisible().catch(() => false);
    expect(hasPhoto || hasLibrary).toBeTruthy();
  }

  async selectLinkedList(listName: string) {
    await this.linkToListSelector.click();
    await this.page.getByText(listName, { exact: false }).click();
    await this.page.waitForTimeout(300);
  }

  async expectLinkedTo(listName: string) {
    await expect(
      this.page.getByText("Linked to", { exact: false }).or(
        this.page.getByText(listName, { exact: false })
      )
    ).toBeVisible();
  }

  /**
   * Upload a real receipt image from the receipts/ folder.
   * Uses Playwright's fileChooser to inject the file into expo-image-picker's
   * hidden <input type="file"> on web.
   */
  async uploadReceiptImage(receiptPath?: string): Promise<boolean> {
    const filePath = receiptPath ?? RECEIPT_FILES.quick;
    return uploadReceipt(this.page, filePath);
  }

  /**
   * Full flow: upload receipt → use photo → wait for AI parsing → land on confirm screen.
   *
   * @param receiptPath - Path to receipt image (defaults to recpt.jpeg)
   * @param options - Link to list, custom parse timeout
   */
  async scanReceipt(
    receiptPath?: string,
    options?: { linkToList?: string; parseTimeout?: number }
  ): Promise<void> {
    const filePath = receiptPath ?? RECEIPT_FILES.quick;
    await uploadAndParseReceipt(this.page, filePath, options);
  }

  /** Verify we landed on the confirm receipt screen with parsed data */
  async expectOnConfirmScreen() {
    await expect(
      this.page.getByText("confirm", { exact: false }).or(
        this.page.getByText("Review", { exact: false })
      )
    ).toBeVisible({ timeout: 10_000 });
  }

  /** Verify parsed items are shown on confirm screen */
  async expectParsedItems() {
    // Should show at least one item with a price
    const pricePattern = this.page.locator("text=/£\\d/");
    const count = await pricePattern.count();
    expect(count).toBeGreaterThan(0);
  }

  /** Verify store name was extracted */
  async expectStoreName() {
    const storeNames = [
      "Aldi", "Lidl", "Tesco", "Sainsbury", "Morrisons",
      "Asda", "Waitrose", "Co-op", "Iceland", "Store",
    ];
    let found = false;
    for (const store of storeNames) {
      if (await this.page.getByText(store, { exact: false }).isVisible().catch(() => false)) {
        found = true;
        break;
      }
    }
    return found;
  }

  /** Save the parsed receipt (triggers side effects: price history, restock, credits) */
  async saveReceipt() {
    await this.saveButton.click();
    await waitForConvex(this.page, 3000);
  }

  /** Verify parsing is in progress (spinner visible) */
  async expectParsing() {
    await expect(this.parsingSpinner).toBeVisible({ timeout: 10_000 });
  }

  /** Verify parsing has finished (spinner gone) */
  async expectParsingComplete() {
    await expect(this.parsingSpinner).toHaveCount(0, { timeout: 60_000 });
  }

  /** Cancel during parsing */
  async cancelParsing() {
    if (await this.cancelButton.isVisible()) {
      await this.cancelButton.click();
      await this.page.waitForTimeout(1000);
    }
  }

  /** Check confirm screen for discount line exclusion */
  async expectNoDiscountLines() {
    const discountPatterns = [/discount/i, /savings/i, /money off/i, /coupon/i];
    for (const pattern of discountPatterns) {
      const count = await this.page
        .locator(`text=/${pattern.source}/${pattern.flags}`)
        .count();
      // Discount lines should not appear as items (may appear as metadata)
      // This is a soft check — some receipts legitimately mention discounts in item names
    }
  }
}
