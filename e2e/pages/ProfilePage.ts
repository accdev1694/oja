import { Page, expect } from "@playwright/test";
import { navigateToTab, waitForConvex } from "../fixtures/base";

export class ProfilePage {
  constructor(private page: Page) {}

  get userName() {
    return this.page.locator("[class*='name'], [class*='title']").first();
  }
  get signOutButton() {
    return this.page.getByText("Sign Out", { exact: false }).or(
      this.page.getByText("Log Out", { exact: false })
    );
  }
  get insightsCard() {
    return this.page.getByText("Insights", { exact: true }).first();
  }
  get premiumCard() {
    return this.page.getByText("Free Plan").first().or(
      this.page.getByText("Premium").first()
    );
  }
  get stockAlertsCard() {
    return this.page.getByText("Stock Alert", { exact: false });
  }

  // Quick stats
  get completedTrips() {
    return this.page.getByText("Completed", { exact: false });
  }
  get pantryItemsCount() {
    return this.page.getByText("Pantry", { exact: false });
  }
  get receiptsScanned() {
    return this.page.getByText("Receipts", { exact: false }).or(
      this.page.getByText("Scanned", { exact: false })
    );
  }

  // Milestone path
  get milestonePath() {
    return this.page.getByText("Your journey", { exact: false }).or(
      this.page.getByText("journey starts", { exact: false })
    );
  }

  // Dev tools
  get resetAccountButton() {
    return this.page.getByText("Reset Account", { exact: false });
  }
  get deleteAccountButton() {
    return this.page.getByText("Delete Account", { exact: false });
  }

  async goto() {
    await navigateToTab(this.page, "Profile");
    await waitForConvex(this.page);
    // Wait for profile content to actually load (not just "Loading...")
    await this.page.waitForTimeout(2000);
    // Wait until Loading... disappears or content appears
    const loaded = await this.page.waitForFunction(
      () => !document.body.innerText.includes("Loading...") || document.body.innerText.includes("Insights"),
      { timeout: 15_000 }
    ).catch(() => null);
  }

  async expectVisible() {
    // Check either Sign Out or Insights is visible (don't use .or() to avoid strict mode)
    const signOut = await this.signOutButton.first().isVisible({ timeout: 10_000 }).catch(() => false);
    const insights = await this.insightsCard.first().isVisible().catch(() => false);
    expect(signOut || insights).toBeTruthy();
  }

  async signOut() {
    await this.signOutButton.click();
    await this.page.waitForTimeout(1000);
  }

  async expectSignedOut() {
    await expect(
      this.page.getByText("Welcome back").or(
        this.page.getByText("Sign in")
      )
    ).toBeVisible({ timeout: 15_000 });
  }

  async openInsights() {
    await this.insightsCard.click();
    await this.page.waitForLoadState("networkidle");
  }

  async expectMilestoneVisible() {
    await expect(this.milestonePath).toBeVisible();
  }

  async expectMilestoneHidden() {
    await expect(this.milestonePath).toHaveCount(0);
  }
}
