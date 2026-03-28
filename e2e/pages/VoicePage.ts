import { Page, expect } from "@playwright/test";
import {
  navigateToTab,
  waitForConvex,
  clickPressable,
} from "../fixtures/base";

/**
 * Page object for the Tobi Voice Assistant (VoiceFAB + VoiceSheet).
 *
 * The FAB is a draggable 52px mic button with accessibility label
 * "Ask Oja voice assistant". It renders on all authenticated tab screens
 * except focused flows (receipt-confirm, trip-summary, etc.).
 *
 * Tapping the FAB opens the VoiceSheet bottom modal with:
 *  - Header: mic icon + "Ask Tobi" + close button
 *  - Conversation area (empty state or message bubbles)
 *  - Status bar (Listening/Thinking)
 *  - Mic button to start/stop listening
 *  - "New chat" button when history exists
 */
export class VoicePage {
  constructor(private page: Page) {}

  // ── FAB Button ──────────────────────────────────────────
  get fabButton() {
    return this.page.locator("button[aria-label='Ask Oja voice assistant']");
  }
  get fabButtonByText() {
    // Fallback: find by the 󰍬 microphone glyph
    return this.page.getByText("\u{F036C}", { exact: true });
  }

  // ── Voice Sheet ─────────────────────────────────────────
  get sheetTitle() {
    return this.page.getByText("Ask Tobi", { exact: true });
  }
  get sheetCloseButton() {
    // Close icon (󰅖) scoped to the dialog to avoid matching trial banner dismiss
    return this.page.locator("div[role='dialog']").getByText("\u{F0156}", { exact: true });
  }
  get emptyStateText() {
    return this.page.getByText("Tap the mic and ask Tobi", { exact: false });
  }
  get micButton() {
    // The large mic button at bottom of sheet
    return this.page.getByText("\u{F036C}", { exact: true });
  }
  get newChatButton() {
    return this.page.getByText("New chat", { exact: true });
  }
  get listeningIndicator() {
    return this.page.getByText("Listening...", { exact: false });
  }
  get thinkingIndicator() {
    return this.page.getByText("Thinking...", { exact: false });
  }

  // ── FAB Actions ─────────────────────────────────────────

  /** Check if the FAB button is visible on the current screen */
  async isFabVisible(): Promise<boolean> {
    const byLabel = await this.fabButton.isVisible().catch(() => false);
    if (byLabel) return true;
    const byText = await this.fabButtonByText.isVisible().catch(() => false);
    return byText;
  }

  /** Click the FAB button to open the voice sheet */
  async openSheet() {
    const fab = this.fabButton;
    const box = await fab.boundingBox().catch(() => null);
    if (box) {
      await this.page.mouse.click(
        box.x + box.width / 2,
        box.y + box.height / 2
      );
    } else {
      await fab.click({ force: true });
    }
    await this.page.waitForTimeout(500);
  }

  /** Close the voice sheet */
  async closeSheet() {
    const close = this.sheetCloseButton;
    if (await close.isVisible().catch(() => false)) {
      await close.click();
      await this.page.waitForTimeout(500);
    }
  }

  // ── Sheet Assertions ────────────────────────────────────

  async expectSheetOpen() {
    await expect(this.sheetTitle).toBeVisible({ timeout: 5_000 });
  }

  async expectSheetClosed() {
    const visible = await this.sheetTitle.isVisible().catch(() => false);
    expect(visible).toBeFalsy();
  }

  async expectEmptyState() {
    await expect(this.emptyStateText).toBeVisible({ timeout: 5_000 });
  }
}
