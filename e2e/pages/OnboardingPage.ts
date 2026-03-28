import { Page, expect } from "@playwright/test";

export class OnboardingPage {
  constructor(private page: Page) {}

  // ── Welcome screen ────────────────────────────────────────────

  get welcomeTitle() {
    return this.page.getByText("Welcome to Oja", { exact: false });
  }
  get welcomeSubtitle() {
    return this.page.getByText("AI-powered shopping", { exact: false });
  }
  get nameLabel() {
    return this.page.getByText("What should we call you?", { exact: false });
  }
  get nameInput() {
    return this.page.getByPlaceholder("First name");
  }
  get getStartedButton() {
    return this.page.getByText("Get Started", { exact: false });
  }

  // Feature cards
  get learnsYouCard() {
    return this.page.getByText("Learns You", { exact: false });
  }
  get scanEarnCard() {
    return this.page.getByText("Scan & Earn", { exact: false });
  }
  get voiceListsCard() {
    return this.page.getByText("Voice Lists", { exact: false });
  }
  get rewardsTiersCard() {
    return this.page.getByText("Rewards & Tiers", { exact: false });
  }

  // ── Cuisine selection screen ──────────────────────────────────

  get cuisineTitle() {
    return this.page.getByText("where are you cooking", { exact: false });
  }
  get cuisineSubtitle() {
    return this.page.getByText("What cuisines do you cook", { exact: false });
  }
  get cuisineDescription() {
    return this.page.getByText("Select all that apply", { exact: false });
  }
  get locationDetectingText() {
    return this.page.getByText("Detecting your location", { exact: false });
  }

  // Location card
  get locationCard() {
    return this.page.getByText("You're in", { exact: false });
  }
  get currencyText() {
    return this.page.getByText("Prices shown in", { exact: false });
  }
  get postcodeText() {
    return this.page.getByText("Price area", { exact: false });
  }
  get setPostcodeText() {
    return this.page.getByText("Set your area for local prices", {
      exact: false,
    });
  }

  // Dietary section
  get dietaryTitle() {
    return this.page.getByText("Any dietary preferences", { exact: false });
  }
  get dietaryDescription() {
    return this.page.getByText("suggest healthier", { exact: false });
  }

  // Continue button (shared across screens)
  get continueButton() {
    return this.page.getByText("Continue", { exact: false }).first();
  }

  // ── Store selection screen ────────────────────────────────────

  get storeSelectionTitle() {
    return this.page.getByText("Where do you usually shop", { exact: false });
  }
  get storeSelectionDescription() {
    return this.page.getByText("Select your favorite stores", { exact: false });
  }
  get recommendedSection() {
    return this.page.getByText("Recommended for your cuisines", {
      exact: false,
    });
  }
  get mainstreamSection() {
    return this.page.getByText("UK supermarkets", { exact: false });
  }
  get skipStoresButton() {
    return this.page.getByText("Skip for now", { exact: false });
  }

  // ── Pantry seeding screen ─────────────────────────────────────

  get seedingTitle() {
    return this.page.getByText("Creating your pantry", { exact: false });
  }
  get seedingSubtitle() {
    return this.page.getByText("Generating your personalized", { exact: false });
  }
  get locationDetectedProgress() {
    return this.page.getByText("Location detected", { exact: false });
  }
  get cuisinesAnalyzedProgress() {
    return this.page.getByText("Cuisines analyzed", { exact: false });
  }
  get generatingItemsProgress() {
    return this.page.getByText("Generating items", { exact: false });
  }
  get pantryReadyTitle() {
    return this.page.getByText("Pantry Ready", { exact: false });
  }
  get itemsGeneratedSubtitle() {
    return this.page.getByText("items generated", { exact: false });
  }

  // Seeding error state
  get seedingErrorTitle() {
    return this.page.getByText("Oops!", { exact: false });
  }
  get tryAgainButton() {
    return this.page.getByText("Try Again", { exact: false });
  }
  get skipStartEmptyButton() {
    return this.page.getByText("Skip & Start Empty", { exact: false });
  }

  // ── Review items screen ───────────────────────────────────────

  get reviewTitle() {
    return this.page.getByText("Review Your Pantry", { exact: false });
  }
  get reviewSubtitle() {
    return this.page.getByText("Tap items to deselect", { exact: false });
  }
  get localStaplesSection() {
    return this.page.getByText("Local Staples", { exact: false });
  }
  get culturalFavouritesSection() {
    return this.page.getByText("Cultural Favourites", { exact: false });
  }
  get saveButton() {
    return this.page
      .getByText("Save to Pantry", { exact: false })
      .or(this.page.getByText("Save", { exact: false }))
      .or(this.page.getByText("Confirm", { exact: false }));
  }
  get selectedCountText() {
    return this.page.getByText("selected", { exact: false });
  }

  // ── Admin setup screen ────────────────────────────────────────

  get adminSetupTitle() {
    return this.page.getByText("Admin Control Plane", { exact: false });
  }

  // ── Navigation helpers ────────────────────────────────────────

  async goto(path = "/onboarding/welcome") {
    await this.page.goto(path);
    await this.page.waitForLoadState("domcontentloaded");
    await this.page.waitForTimeout(3000);
  }

  async expectWelcomeScreen() {
    await expect(this.welcomeTitle).toBeVisible({ timeout: 15_000 });
    await expect(this.getStartedButton).toBeVisible();
  }

  async tapGetStarted() {
    await this.getStartedButton.click();
    await this.page.waitForTimeout(2000);
  }

  async waitForCuisineScreen() {
    // Wait for location detection to finish and cuisine grid to appear
    await expect(
      this.cuisineSubtitle.or(this.cuisineTitle)
    ).toBeVisible({ timeout: 30_000 });
  }

  async selectCuisines(cuisines: string[]) {
    for (const cuisine of cuisines) {
      const chip = this.page.getByText(cuisine, { exact: true });
      if (await chip.isVisible().catch(() => false)) {
        await chip.click();
        await this.page.waitForTimeout(500);
      }
    }
  }

  async selectDietary(options: string[]) {
    for (const option of options) {
      const chip = this.page.getByText(option, { exact: true });
      if (await chip.isVisible().catch(() => false)) {
        await chip.click();
        await this.page.waitForTimeout(500);
      }
    }
  }

  async tapContinue() {
    await this.continueButton.scrollIntoViewIfNeeded();
    await expect(this.continueButton).toBeEnabled({ timeout: 5_000 });
    await this.continueButton.click();
    await this.page.waitForTimeout(2000);
  }

  async expectStoreSelectionScreen() {
    await expect(this.storeSelectionTitle).toBeVisible({ timeout: 15_000 });
  }

  async selectStores(storeNames: string[]) {
    for (const store of storeNames) {
      const storeBtn = this.page.getByText(store, { exact: true });
      if (await storeBtn.isVisible().catch(() => false)) {
        await storeBtn.click();
        await this.page.waitForTimeout(300);
      }
    }
  }

  async skipStoreSelection() {
    await this.skipStoresButton.scrollIntoViewIfNeeded();
    await this.skipStoresButton.click();
    await this.page.waitForTimeout(2000);
  }

  async waitForSeeding(timeout = 180_000) {
    // Wait for seeding screen to appear then resolve
    await this.page.waitForTimeout(3000);
    // Wait until we leave the seeding screen (arrive at review or home)
    await this.page.waitForFunction(
      () => {
        const text = document.body.innerText;
        return (
          text.includes("Review") ||
          text.includes("Pantry Ready") ||
          text.includes("Needs Restocking") ||
          text.includes("All Items") ||
          text.includes("Oops!")
        );
      },
      { timeout }
    );
  }

  async confirmItems() {
    const saveBtn = this.saveButton.first();
    await saveBtn.scrollIntoViewIfNeeded();
    await saveBtn.click();
    await this.page.waitForTimeout(5000);
  }

  async expectOnAppScreen() {
    // After onboarding, should land on app tabs (lists, stock, etc.)
    const isApp = await this.page
      .waitForURL(/(tabs|app|stock|profile)/, { timeout: 15_000 })
      .then(() => true)
      .catch(() => false);

    if (!isApp) {
      // Check for home screen text
      const isPantry =
        (await this.page
          .getByText("Needs Restocking")
          .isVisible({ timeout: 5000 })
          .catch(() => false)) ||
        (await this.page
          .getByText("All Items")
          .isVisible({ timeout: 2000 })
          .catch(() => false)) ||
        (await this.page
          .getByText("Lists")
          .isVisible({ timeout: 2000 })
          .catch(() => false));
      expect(isPantry).toBeTruthy();
    }
  }

  async getVisibleStoreCount(): Promise<number> {
    const majorStores = [
      "Tesco", "Sainsbury", "Asda", "Aldi", "Morrisons",
      "Lidl", "Co-op", "Waitrose", "M&S", "Iceland",
    ];
    let count = 0;
    for (const store of majorStores) {
      const el = this.page.getByText(store, { exact: false });
      if (await el.isVisible().catch(() => false)) {
        count++;
      }
    }
    return count;
  }

  /** Check if the user has already completed onboarding */
  async isAlreadyOnboarded(): Promise<boolean> {
    const isOnboarding =
      (await this.welcomeTitle.isVisible({ timeout: 3000 }).catch(() => false)) ||
      (await this.getStartedButton
        .isVisible({ timeout: 2000 })
        .catch(() => false));
    return !isOnboarding;
  }

  /**
   * Navigate to welcome and reliably check if we can access the onboarding.
   * Returns true if the welcome screen is accessible; false if already onboarded.
   * Handles race conditions where the app briefly renders welcome before redirecting.
   */
  async gotoAndCheckWelcome(): Promise<boolean> {
    await this.goto("/onboarding/welcome");

    // First quick check — is the welcome title visible?
    const isWelcome = await this.welcomeTitle
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    if (!isWelcome) {
      return false;
    }

    // Double-check: wait a moment and ensure we're still on welcome
    // (not a brief flash during redirect)
    await this.page.waitForTimeout(1000);

    // Check for app screen indicators (already onboarded, was redirected)
    const isApp =
      (await this.page
        .getByText("Needs Restocking")
        .isVisible({ timeout: 1000 })
        .catch(() => false)) ||
      (await this.page
        .getByText("Oloche's Lists")
        .isVisible({ timeout: 500 })
        .catch(() => false)) ||
      (await this.page
        .getByText("All Items")
        .isVisible({ timeout: 500 })
        .catch(() => false));

    if (isApp) {
      return false;
    }

    // Confirm Get Started button is still present
    const hasButton = await this.getStartedButton
      .isVisible({ timeout: 2000 })
      .catch(() => false);

    return hasButton;
  }
}
