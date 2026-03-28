import { Page, expect } from "@playwright/test";
import {
  navigateToTab,
  waitForConvex,
  scrollDown,
  clickPressable,
} from "../fixtures/base";

/**
 * Page object for the Profile tab.
 *
 * The Profile tab shows:
 *  - Header: "Hey, {name}" + subtitle "Oloche's insights & settings"
 *  - Account section: avatar + name + email (tappable to edit name)
 *  - Referral card: invite code + "Invite" button
 *  - Settings section: notification toggles (GlassCheckbox), tutorial hints
 *  - Quick stats: trips, items, receipts, scans
 *  - Navigation links: Points History, Insights, Help & Support, AI Usage,
 *    Subscription/Premium Trial, Stock Alerts, (Admin Dashboard for admins)
 *  - Sign Out button
 *  - Danger Zone: Delete Account (+ Reset Account for admins)
 */
export class ProfilePage {
  constructor(private page: Page) {}

  // ── Header ────────────────────────────────────────────────
  get headerGreeting() {
    return this.page.getByText("Hey,", { exact: false }).first();
  }
  get headerSubtitle() {
    return this.page.getByText("insights & settings", { exact: false });
  }

  // ── Account Card ──────────────────────────────────────────
  get accountSection() {
    return this.page.getByText("Account", { exact: true });
  }
  get accountName() {
    return this.page.getByText("Oloche", { exact: true }).first();
  }
  get accountEmail() {
    return this.page.getByText("diloch111@gmail.com", { exact: true });
  }
  get accountEditIcon() {
    // The pencil icon (󰲶) on the account card
    return this.page.getByText("\u{F0CB6}", { exact: true });
  }

  // ── Edit Name Modal ───────────────────────────────────────
  get editNameTitle() {
    return this.page.getByText("Edit your name", { exact: false });
  }
  get editNameSubtitle() {
    return this.page.getByText("This is how Oja will greet you", {
      exact: false,
    });
  }
  get nameInput() {
    return this.page.getByPlaceholder("First name");
  }
  get saveButton() {
    return this.page.getByText("Save", { exact: true });
  }
  get cancelButton() {
    return this.page.getByText("Cancel", { exact: true });
  }

  // ── Personalise Prompt ────────────────────────────────────
  get personalisePrompt() {
    return this.page.getByText("Personalise your experience", {
      exact: false,
    });
  }

  // ── Referral Section ──────────────────────────────────────
  get inviteFriendsHeader() {
    return this.page.getByText("Invite Friends, Get Points", { exact: false });
  }
  get referralCode() {
    return this.page.getByText("YOUR CODE", { exact: false });
  }
  get inviteButton() {
    return this.page.getByText("Invite", { exact: true });
  }

  // ── Settings Section ──────────────────────────────────────
  get settingsHeader() {
    return this.page.getByText("Settings", { exact: true });
  }
  get enableNotifications() {
    return this.page.getByText("Enable Notifications", { exact: true });
  }
  get stockReminders() {
    return this.page.getByText("Stock Reminders", { exact: true });
  }
  get nurtureMessages() {
    return this.page.getByText("Nurture Messages", { exact: true });
  }
  get quietHours() {
    return this.page.getByText("Quiet Hours", { exact: false });
  }
  get tutorialHints() {
    return this.page.getByText("Tutorial Hints", { exact: true });
  }
  get reshowHints() {
    return this.page.getByText("Re-show All Hints", { exact: false });
  }
  get resetHintsButton() {
    return this.page.getByText("Reset", { exact: true });
  }

  // ── Quick Stats ───────────────────────────────────────────
  get tripsCount() {
    return this.page.getByText("trips", { exact: true });
  }
  get itemsCount() {
    return this.page.getByText("items", { exact: true });
  }
  get receiptsCount() {
    return this.page.getByText("receipts", { exact: true });
  }
  get scansCount() {
    return this.page.getByText("scans", { exact: true });
  }

  // ── Navigation Links ──────────────────────────────────────
  get pointsHistoryLink() {
    return this.page.getByText("Points History", { exact: true });
  }
  get insightsLink() {
    return this.page.getByText("Insights", { exact: true }).first();
  }
  get helpSupportLink() {
    return this.page.getByText("Help & Support", { exact: true });
  }
  get aiUsageLink() {
    return this.page.getByText("AI Usage", { exact: true });
  }
  get subscriptionLink() {
    return this.page
      .getByText("Premium Trial", { exact: false })
      .or(this.page.getByText("Free Plan", { exact: false }))
      .or(this.page.getByText("Premium", { exact: true }))
      .first();
  }
  get stockAlertsLink() {
    return this.page.getByText("Stock Alerts", { exact: true });
  }
  get adminDashboardLink() {
    return this.page.getByText("Admin Dashboard", { exact: true });
  }

  // ── Account Actions ───────────────────────────────────────
  get signOutButton() {
    return this.page.getByText("Sign Out", { exact: true });
  }
  get dangerZone() {
    return this.page.getByText("Danger Zone", { exact: true });
  }
  get deleteAccountButton() {
    return this.page.getByText("Delete Account", { exact: true });
  }
  get resetAccountButton() {
    return this.page.getByText("Reset Account", { exact: false });
  }

  // ── Confirmation Dialog ───────────────────────────────────
  get confirmButton() {
    return this.page.getByText("Confirm", { exact: true });
  }
  get dialogCancelButton() {
    return this.page.getByText("Cancel", { exact: true });
  }

  // ── Navigation ────────────────────────────────────────────

  async goto() {
    await navigateToTab(this.page, "Profile");
    await waitForConvex(this.page);
    // Wait for profile content to load
    await this.page.waitForTimeout(2000);
    await this.page
      .waitForFunction(
        () =>
          !document.body.innerText.includes("Loading...") ||
          document.body.innerText.includes("Insights"),
        { timeout: 15_000 }
      )
      .catch(() => null);
  }

  async expectVisible() {
    const signOut = await this.signOutButton
      .isVisible({ timeout: 10_000 })
      .catch(() => false);
    const greeting = await this.headerGreeting.isVisible().catch(() => false);
    expect(signOut || greeting).toBeTruthy();
  }

  // ── Account Card Actions ──────────────────────────────────

  /** Tap the account card to open the edit name modal */
  async openEditNameModal() {
    const card = this.page.getByText("diloch111@gmail.com", { exact: true });
    const box = await card.boundingBox().catch(() => null);
    if (box) {
      await this.page.mouse.click(
        box.x + box.width / 2,
        box.y + box.height / 2
      );
    } else {
      await clickPressable(this.page, "diloch111@gmail.com");
    }
    await this.page.waitForTimeout(500);
  }

  /** Edit the display name via the modal */
  async editName(newName: string) {
    await this.openEditNameModal();
    await expect(this.editNameTitle).toBeVisible({ timeout: 5_000 });
    await this.nameInput.clear();
    await this.nameInput.fill(newName);
  }

  // ── Settings Actions ──────────────────────────────────────

  /** Toggle a notification checkbox by clicking the checkbox icon next to the label */
  async toggleSetting(label: string) {
    // Find the label, then click the checkbox in the same row
    const row = this.page.getByText(label, { exact: true }).locator("..");
    const checkbox = row.locator("..");
    const box = await checkbox.boundingBox().catch(() => null);
    if (box) {
      // Click the right side of the row where the checkbox is
      await this.page.mouse.click(box.x + box.width - 20, box.y + box.height / 2);
    }
    await this.page.waitForTimeout(500);
  }

  // ── Navigation Link Actions ───────────────────────────────

  async clickNavLink(text: string) {
    await scrollDown(this.page, 2);
    await this.page.waitForTimeout(300);
    await clickPressable(this.page, text, { exact: true });
    await this.page.waitForTimeout(1000);
    await waitForConvex(this.page);
  }

  // ── Sign Out ──────────────────────────────────────────────

  async signOut() {
    await scrollDown(this.page, 5);
    await this.page.waitForTimeout(300);
    const box = await this.signOutButton.boundingBox().catch(() => null);
    if (box) {
      await this.page.mouse.click(
        box.x + box.width / 2,
        box.y + box.height / 2
      );
    } else {
      await clickPressable(this.page, "Sign Out");
    }
    await this.page.waitForTimeout(1000);
  }

  async expectSignedOut() {
    await expect(
      this.page
        .getByText("Welcome back")
        .or(this.page.getByText("Sign in"))
    ).toBeVisible({ timeout: 15_000 });
  }

  // ── Insights Navigation ───────────────────────────────────

  async openInsights() {
    await scrollDown(this.page, 2);
    await this.page.waitForTimeout(500);
    const insightsVisible = await this.insightsLink
      .isVisible({ timeout: 5_000 })
      .catch(() => false);
    if (!insightsVisible) {
      await scrollDown(this.page, 2);
    }
    await clickPressable(this.page, "Insights", { exact: true });
    await waitForConvex(this.page);
  }
}
