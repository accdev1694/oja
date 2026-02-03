import { Page, expect } from "@playwright/test";

export class OnboardingPage {
  constructor(private page: Page) {}

  // Welcome screen
  get getStartedButton() {
    return this.page.getByText("Get Started", { exact: false });
  }
  get welcomeTitle() {
    return this.page.getByText("Welcome to Oja", { exact: false });
  }

  // Cuisine selection
  get continueButton() {
    return this.page.getByText("Continue", { exact: false });
  }

  // Pantry seeding
  get seedingSpinner() {
    return this.page.getByText("seeding", { exact: false }).or(
      this.page.getByText("Setting up", { exact: false })
    );
  }

  // Review items
  get saveButton() {
    return this.page.getByText("Save", { exact: false }).or(
      this.page.getByText("Confirm", { exact: false })
    );
  }

  async expectWelcomeScreen() {
    await expect(this.getStartedButton).toBeVisible({ timeout: 15_000 });
  }

  async tapGetStarted() {
    await this.getStartedButton.click();
  }

  async selectCuisines(cuisines: string[]) {
    for (const cuisine of cuisines) {
      const chip = this.page.getByText(cuisine, { exact: true });
      if (await chip.isVisible()) {
        await chip.click();
      }
    }
  }

  async tapContinue() {
    await this.continueButton.scrollIntoViewIfNeeded();
    await this.continueButton.click();
  }

  async waitForSeeding() {
    // Wait for seeding to start then finish
    await this.page.waitForTimeout(3000);
    // Wait until we're past the seeding screen (review or home)
    await this.page.waitForFunction(
      () => !document.body.innerText.includes("Setting up"),
      { timeout: 120_000 }
    );
  }

  async confirmItems() {
    await this.saveButton.click();
    await this.page.waitForLoadState("networkidle");
  }

  async expectOnPantryScreen() {
    // After onboarding, should land on pantry (home tab)
    await expect(
      this.page.getByText("Needs Restocking").or(
        this.page.getByText("All Items")
      )
    ).toBeVisible({ timeout: 15_000 });
  }
}
