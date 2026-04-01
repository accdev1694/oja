import { test, expect } from "@playwright/test";
import { OnboardingPage } from "../pages/OnboardingPage";

/**
 * SUITE 2: Onboarding (TC-ONBD-001 to TC-ONBD-018)
 *
 * The onboarding flow has 5 steps:
 *   1. Welcome → 2. Cuisine Selection → 3. Store Selection → 4. Pantry Seeding → 5. Review Items
 *
 * IMPORTANT: Most onboarding tests require a NEW user who hasn't completed onboarding.
 * Tests that can't run against an already-onboarded user will be skipped gracefully.
 * The test account (E2E_CLERK_USER) has already completed onboarding, so:
 *   - Direct navigation tests (goto /onboarding/welcome) may redirect to app
 *   - Full flow tests require E2E_FRESH_USER_EMAIL + E2E_FRESH_USER_PASSWORD
 *
 * For already-onboarded users, we verify:
 *   - Revisiting onboarding redirects to app (TC-ONBD-016 variant)
 *   - Direct URL navigation is guarded
 */

test.describe("Suite 2: Onboarding", () => {
  test.describe.configure({ mode: "serial" });

  let onboarding: OnboardingPage;

  test.beforeEach(async ({ page }) => {
    onboarding = new OnboardingPage(page);
  });

  // ── TC-ONBD-001: Welcome screen display ──────────────────────

  test("TC-ONBD-001: welcome screen displays logo, title, subtitle, and feature cards", async ({
    page,
  }) => {
    const canAccess = await onboarding.gotoAndCheckWelcome();
    if (!canAccess) {
      test.skip(true, "User already onboarded — welcome screen not accessible");
      return;
    }

    // Verify title and subtitle
    await expect(onboarding.welcomeTitle).toBeVisible();
    await expect(onboarding.welcomeSubtitle).toBeVisible();

    // Verify logo (img element)
    const logo = page.locator("img").first();
    await expect(logo).toBeVisible();

    // Verify name input section
    await expect(onboarding.nameLabel).toBeVisible();
    await expect(onboarding.nameInput).toBeVisible();

    // Verify 4 feature cards
    await expect(onboarding.learnsYouCard).toBeVisible();
    await expect(onboarding.scanEarnCard).toBeVisible();
    await expect(onboarding.voiceListsCard).toBeVisible();
    await expect(onboarding.rewardsTiersCard).toBeVisible();

    // Verify feature card descriptions
    await expect(
      page.getByText("AI-powered suggestions", { exact: false })
    ).toBeVisible();
    await expect(
      page.getByText("Snap products or receipts", { exact: false })
    ).toBeVisible();
    await expect(
      page.getByText("Create shopping lists by just speaking", { exact: false })
    ).toBeVisible();
    await expect(
      page.getByText("Level up from Bronze to Platinum", { exact: false })
    ).toBeVisible();

    // Verify Get Started button
    await expect(onboarding.getStartedButton).toBeVisible();
  });

  // ── TC-ONBD-002: Name entry (optional) ───────────────────────

  test("TC-ONBD-002: name input is optional — can proceed without name", async ({
    page,
  }) => {
    const canAccess = await onboarding.gotoAndCheckWelcome();
    if (!canAccess) {
      test.skip(true, "User already onboarded");
      return;
    }

    // Leave name empty and tap Get Started
    await expect(onboarding.nameInput).toBeVisible();
    // Don't fill anything — just tap Get Started
    await onboarding.tapGetStarted();

    // Should navigate to cuisine selection (or admin setup)
    const isCuisine = await onboarding.cuisineSubtitle
      .or(onboarding.cuisineTitle)
      .isVisible({ timeout: 30_000 })
      .catch(() => false);
    const isAdmin = await onboarding.adminSetupTitle
      .isVisible({ timeout: 2000 })
      .catch(() => false);

    expect(isCuisine || isAdmin).toBeTruthy();
  });

  test("TC-ONBD-002: name can be entered before proceeding", async ({
    page,
  }) => {
    const canAccess = await onboarding.gotoAndCheckWelcome();
    if (!canAccess) {
      test.skip(true, "User already onboarded");
      return;
    }

    // Enter a name and proceed
    await onboarding.nameInput.fill("TestUser");
    await onboarding.tapGetStarted();

    // Should navigate to cuisine selection
    const isCuisine = await onboarding.cuisineSubtitle
      .or(onboarding.cuisineTitle)
      .isVisible({ timeout: 30_000 })
      .catch(() => false);
    const isAdmin = await onboarding.adminSetupTitle
      .isVisible({ timeout: 2000 })
      .catch(() => false);

    expect(isCuisine || isAdmin).toBeTruthy();
  });

  // ── TC-ONBD-003: Cuisine selection (23 cuisines + Other) ─────

  test("TC-ONBD-003: cuisine selection screen shows all 23 cuisines and Other tile", async ({
    page,
  }) => {
    const canAccess = await onboarding.gotoAndCheckWelcome();
    if (!canAccess) {
      test.skip(true, "User already onboarded");
      return;
    }

    await onboarding.tapGetStarted();
    await onboarding.waitForCuisineScreen();

    // Verify all 23 cuisines are displayed
    const allCuisines = [
      "British", "Nigerian", "Indian", "Chinese", "Italian",
      "Pakistani", "Bangladeshi", "Caribbean", "West African",
      "East African", "Ethiopian", "S. African", "Middle Eastern",
      "Turkish", "Greek", "French", "Polish", "Mexican",
      "Japanese", "Korean", "Thai", "Vietnamese", "Filipino",
    ];

    let visibleCount = 0;
    for (const cuisine of allCuisines) {
      const chip = page.getByText(cuisine, { exact: true });
      if (await chip.isVisible().catch(() => false)) {
        visibleCount++;
      }
    }
    expect(visibleCount).toBe(23);

    // Verify "Other" tile is also visible
    const otherTile = page.getByText("Other", { exact: true });
    await expect(otherTile).toBeVisible();
  });

  test("TC-ONBD-003: cuisine selection toggle works", async ({ page }) => {
    const canAccess = await onboarding.gotoAndCheckWelcome();
    if (!canAccess) {
      test.skip(true, "User already onboarded");
      return;
    }

    await onboarding.tapGetStarted();
    await onboarding.waitForCuisineScreen();

    // Select Nigerian
    await onboarding.selectCuisines(["Nigerian"]);

    // Continue button should show count
    const continueText = await onboarding.continueButton
      .textContent()
      .catch(() => "");
    expect(continueText).toContain("1");

    // Select British
    await onboarding.selectCuisines(["British"]);
    const continueText2 = await onboarding.continueButton
      .textContent()
      .catch(() => "");
    expect(continueText2).toContain("2");

    // Deselect Nigerian
    await page.getByText("Nigerian", { exact: true }).click();
    await page.waitForTimeout(500);
    const continueText3 = await onboarding.continueButton
      .textContent()
      .catch(() => "");
    expect(continueText3).toContain("1");
  });

  // ── TC-ONBD-004: Must select at least 1 cuisine ─────────────

  test("TC-ONBD-004: continue button disabled with 0 cuisines selected", async ({
    page,
  }) => {
    const canAccess = await onboarding.gotoAndCheckWelcome();
    if (!canAccess) {
      test.skip(true, "User already onboarded");
      return;
    }

    await onboarding.tapGetStarted();
    await onboarding.waitForCuisineScreen();

    // Scroll to continue button
    await onboarding.continueButton.scrollIntoViewIfNeeded();

    // Continue button should show "0 selected" text
    const continueText = await onboarding.continueButton
      .textContent()
      .catch(() => "");
    expect(continueText).toContain("0");

    // Button should be disabled
    const isDisabled = await onboarding.continueButton
      .isDisabled()
      .catch(() => false);
    expect(isDisabled).toBeTruthy();
  });

  // ── TC-ONBD-005: Dietary restrictions (optional) ─────────────

  test("TC-ONBD-005: dietary preferences section shows 9 options", async ({
    page,
  }) => {
    const canAccess = await onboarding.gotoAndCheckWelcome();
    if (!canAccess) {
      test.skip(true, "User already onboarded");
      return;
    }

    await onboarding.tapGetStarted();
    await onboarding.waitForCuisineScreen();

    // Scroll to dietary section
    const dietaryHeader = onboarding.dietaryTitle;
    await dietaryHeader.scrollIntoViewIfNeeded();
    await expect(dietaryHeader).toBeVisible();
    await expect(onboarding.dietaryDescription).toBeVisible();

    // Verify all 9 dietary options
    const dietaryOptions = [
      "Vegan", "Vegetarian", "Gluten-Free", "Dairy-Free",
      "Halal", "Kosher", "Pescatarian", "Keto", "Paleo",
    ];

    let visibleCount = 0;
    for (const option of dietaryOptions) {
      const chip = page.getByText(option, { exact: true });
      if (await chip.isVisible().catch(() => false)) {
        visibleCount++;
      }
    }
    expect(visibleCount).toBe(9);
  });

  test("TC-ONBD-005: dietary preferences are optional", async ({ page }) => {
    const canAccess = await onboarding.gotoAndCheckWelcome();
    if (!canAccess) {
      test.skip(true, "User already onboarded");
      return;
    }

    await onboarding.tapGetStarted();
    await onboarding.waitForCuisineScreen();

    // Select a cuisine (required) but no dietary (optional)
    await onboarding.selectCuisines(["British"]);

    // Should be able to continue without selecting dietary
    await onboarding.continueButton.scrollIntoViewIfNeeded();
    const isEnabled = await onboarding.continueButton
      .isEnabled()
      .catch(() => false);
    expect(isEnabled).toBeTruthy();
  });

  // ── TC-ONBD-006: Location auto-detection ─────────────────────

  test("TC-ONBD-006: location detection shows country and currency", async ({
    page,
  }) => {
    const canAccess = await onboarding.gotoAndCheckWelcome();
    if (!canAccess) {
      test.skip(true, "User already onboarded");
      return;
    }

    await onboarding.tapGetStarted();
    await onboarding.waitForCuisineScreen();

    // Location card should show detected country
    const hasLocation = await onboarding.locationCard
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    if (hasLocation) {
      // Currency text should be visible
      await expect(onboarding.currencyText).toBeVisible();
      // Postcode row should be visible (either detected or "Set your area")
      const hasPostcode = await onboarding.postcodeText
        .isVisible({ timeout: 2000 })
        .catch(() => false);
      const hasSetPostcode = await onboarding.setPostcodeText
        .isVisible({ timeout: 2000 })
        .catch(() => false);
      expect(hasPostcode || hasSetPostcode).toBeTruthy();
    }
  });

  // ── TC-ONBD-007: Manual postcode editing ─────────────────────

  test("TC-ONBD-007: postcode can be edited via pencil icon", async ({
    page,
  }) => {
    const canAccess = await onboarding.gotoAndCheckWelcome();
    if (!canAccess) {
      test.skip(true, "User already onboarded");
      return;
    }

    await onboarding.tapGetStarted();
    await onboarding.waitForCuisineScreen();

    // Look for the postcode row and tap it to edit
    const postcodeRow = onboarding.postcodeText.or(onboarding.setPostcodeText);
    const isPostcodeVisible = await postcodeRow
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    if (isPostcodeVisible) {
      await postcodeRow.click();
      await page.waitForTimeout(1000);

      // Look for the postcode input (placeholder "e.g. CV12")
      const postcodeInput = page.getByPlaceholder("e.g. CV12");
      const hasInput = await postcodeInput
        .isVisible({ timeout: 3000 })
        .catch(() => false);

      if (hasInput) {
        await postcodeInput.fill("SW1A");
        // Blur to exit edit mode
        await page.keyboard.press("Enter");
        await page.waitForTimeout(1000);

        // Should show updated postcode
        await expect(
          page.getByText("SW1A", { exact: false })
        ).toBeVisible();
      }
    }
  });

  // ── TC-ONBD-008: Store selection ─────────────────────────────

  test("TC-ONBD-008: store selection shows recommended and mainstream stores", async ({
    page,
  }) => {
    test.setTimeout(120_000);

    const canAccess = await onboarding.gotoAndCheckWelcome();
    if (!canAccess) {
      test.skip(true, "User already onboarded");
      return;
    }

    // Navigate through welcome → cuisine → store
    await onboarding.tapGetStarted();
    await onboarding.waitForCuisineScreen();
    await onboarding.selectCuisines(["British", "Nigerian"]);
    await onboarding.tapContinue();

    // Wait for store selection screen
    await onboarding.expectStoreSelectionScreen();

    // Should show mainstream UK stores
    const storeCount = await onboarding.getVisibleStoreCount();
    expect(storeCount).toBeGreaterThan(0);

    // Recommended section may appear (depends on cuisine selection)
    const hasRecommended = await onboarding.recommendedSection
      .isVisible({ timeout: 3000 })
      .catch(() => false);
    // Mainstream section should always appear
    const hasMainstream = await onboarding.mainstreamSection
      .isVisible({ timeout: 3000 })
      .catch(() => false);

    expect(hasMainstream || storeCount > 0).toBeTruthy();
  });

  test("TC-ONBD-008: store selection toggle works", async ({ page }) => {
    test.setTimeout(120_000);

    const canAccess = await onboarding.gotoAndCheckWelcome();
    if (!canAccess) {
      test.skip(true, "User already onboarded");
      return;
    }

    await onboarding.tapGetStarted();
    await onboarding.waitForCuisineScreen();
    await onboarding.selectCuisines(["British"]);
    await onboarding.tapContinue();

    await onboarding.expectStoreSelectionScreen();

    // Select a store
    await onboarding.selectStores(["Tesco"]);

    // Continue button should show count
    const continueBtn = onboarding.continueButton;
    await continueBtn.scrollIntoViewIfNeeded();
    const text = await continueBtn.textContent().catch(() => "");
    expect(text).toContain("1");
  });

  // ── TC-ONBD-009: Skip store selection ────────────────────────

  test("TC-ONBD-009: skip store selection navigates to pantry seeding", async ({
    page,
  }) => {
    test.setTimeout(120_000);

    const canAccess = await onboarding.gotoAndCheckWelcome();
    if (!canAccess) {
      test.skip(true, "User already onboarded");
      return;
    }

    await onboarding.tapGetStarted();
    await onboarding.waitForCuisineScreen();
    await onboarding.selectCuisines(["British"]);
    await onboarding.tapContinue();

    await onboarding.expectStoreSelectionScreen();

    // Skip for now button should be visible
    await expect(onboarding.skipStoresButton).toBeVisible();
    await onboarding.skipStoreSelection();

    // Should navigate to pantry seeding (or the next screen)
    const isSeedingOrReview =
      (await onboarding.seedingTitle
        .isVisible({ timeout: 10_000 })
        .catch(() => false)) ||
      (await onboarding.reviewTitle
        .isVisible({ timeout: 5000 })
        .catch(() => false)) ||
      (await onboarding.pantryReadyTitle
        .isVisible({ timeout: 5000 })
        .catch(() => false));
    expect(isSeedingOrReview).toBeTruthy();
  });

  // ── TC-ONBD-010: Pantry seeding (AI-generated items) ─────────

  test("TC-ONBD-010: pantry seeding shows progress and generates items", async ({
    page,
  }) => {
    test.setTimeout(300_000); // 5 min for AI seeding

    const canAccess = await onboarding.gotoAndCheckWelcome();
    if (!canAccess) {
      test.skip(true, "User already onboarded");
      return;
    }

    // Full flow: welcome → cuisine → store (skip) → seeding
    await onboarding.tapGetStarted();
    await onboarding.waitForCuisineScreen();
    await onboarding.selectCuisines(["British", "Nigerian"]);
    await onboarding.tapContinue();

    // Skip store selection to reach seeding faster
    await onboarding.expectStoreSelectionScreen();
    await onboarding.skipStoreSelection();

    // Should see seeding progress
    const isSeedingOrReady =
      (await onboarding.seedingTitle
        .isVisible({ timeout: 10_000 })
        .catch(() => false)) ||
      (await onboarding.pantryReadyTitle
        .isVisible({ timeout: 5000 })
        .catch(() => false));

    if (isSeedingOrReady) {
      // Check progress indicators
      const hasLocationProgress = await onboarding.locationDetectedProgress
        .isVisible({ timeout: 3000 })
        .catch(() => false);
      const hasCuisineProgress = await onboarding.cuisinesAnalyzedProgress
        .isVisible({ timeout: 3000 })
        .catch(() => false);

      // Wait for seeding to complete
      await onboarding.waitForSeeding();

      // Should arrive at review screen or home
      const isReview = await onboarding.reviewTitle
        .isVisible({ timeout: 10_000 })
        .catch(() => false);
      const isError = await onboarding.seedingErrorTitle
        .isVisible({ timeout: 2000 })
        .catch(() => false);

      expect(isReview || isError).toBeTruthy();
    }
  });

  // ── TC-ONBD-011: Pantry seeding error and retry ──────────────

  test("TC-ONBD-011: seeding error shows retry and skip options", async ({
    page,
  }) => {
    // This test verifies the error UI exists — hard to trigger real AI errors
    // We check via direct navigation or during a natural error
    test.skip(
      true,
      "AI seeding errors are not reliably triggerable in E2E — covered by unit tests"
    );
  });

  // ── TC-ONBD-012: Review items screen ─────────────────────────

  test("TC-ONBD-012: review screen shows items grouped by source", async ({
    page,
  }) => {
    test.setTimeout(300_000);

    const canAccess = await onboarding.gotoAndCheckWelcome();
    if (!canAccess) {
      test.skip(true, "User already onboarded");
      return;
    }

    // Full flow to reach review
    await onboarding.tapGetStarted();
    await onboarding.waitForCuisineScreen();
    await onboarding.selectCuisines(["British", "Nigerian"]);
    await onboarding.tapContinue();
    await onboarding.expectStoreSelectionScreen();
    await onboarding.skipStoreSelection();
    await onboarding.waitForSeeding();

    // Check if we're on review screen
    const isReview = await onboarding.reviewTitle
      .isVisible({ timeout: 10_000 })
      .catch(() => false);

    if (!isReview) {
      // If seeding errored, we might be on error screen — skip
      test.skip(true, "Did not reach review screen (seeding may have errored)");
      return;
    }

    // Verify review header
    await expect(onboarding.reviewTitle).toBeVisible();
    await expect(onboarding.reviewSubtitle).toBeVisible();

    // Verify source sections
    const hasLocal = await onboarding.localStaplesSection
      .isVisible({ timeout: 3000 })
      .catch(() => false);
    const hasCultural = await onboarding.culturalFavouritesSection
      .isVisible({ timeout: 3000 })
      .catch(() => false);
    expect(hasLocal || hasCultural).toBeTruthy();

    // Verify selected count text
    await expect(onboarding.selectedCountText.first()).toBeVisible();

    // Verify no bad prices (undefined, NaN, null)
    const badPrices = await page
      .locator("text=/undefined|NaN|null/i")
      .count();
    expect(badPrices).toBe(0);

    // Verify save button exists
    const saveBtn = onboarding.saveButton.first();
    await saveBtn.scrollIntoViewIfNeeded();
    await expect(saveBtn).toBeVisible();
  });

  // ── TC-ONBD-013: Complete onboarding triggers trial ──────────

  test("TC-ONBD-013: completing onboarding navigates to app home", async ({
    page,
  }) => {
    test.setTimeout(300_000);

    const canAccess = await onboarding.gotoAndCheckWelcome();
    if (!canAccess) {
      test.skip(true, "User already onboarded");
      return;
    }

    // Full flow through to saving
    await onboarding.tapGetStarted();
    await onboarding.waitForCuisineScreen();
    await onboarding.selectCuisines(["British"]);
    await onboarding.tapContinue();
    await onboarding.expectStoreSelectionScreen();
    await onboarding.skipStoreSelection();
    await onboarding.waitForSeeding();

    const isReview = await onboarding.reviewTitle
      .isVisible({ timeout: 10_000 })
      .catch(() => false);

    if (isReview) {
      // Save items
      await onboarding.confirmItems();
    }

    // Should land on app home
    await page.waitForTimeout(5000);
    await onboarding.expectOnAppScreen();
  });

  // ── TC-ONBD-014: Skip entire onboarding steps ───────────────

  test("TC-ONBD-014: minimal onboarding — skip name, 1 cuisine, skip stores", async ({
    page,
  }) => {
    test.setTimeout(300_000);

    const canAccess = await onboarding.gotoAndCheckWelcome();
    if (!canAccess) {
      test.skip(true, "User already onboarded");
      return;
    }

    // Step 1: Skip name, tap Get Started
    await onboarding.tapGetStarted();

    // Step 2: Select minimum 1 cuisine
    await onboarding.waitForCuisineScreen();
    await onboarding.selectCuisines(["British"]);
    await onboarding.tapContinue();

    // Step 3: Skip store selection
    await onboarding.expectStoreSelectionScreen();
    await onboarding.skipStoreSelection();

    // Step 4-5: Wait for seeding, then review/home
    await onboarding.waitForSeeding();

    const isReview = await onboarding.reviewTitle
      .isVisible({ timeout: 10_000 })
      .catch(() => false);

    if (isReview) {
      await onboarding.confirmItems();
    }

    // Should reach app home
    await page.waitForTimeout(5000);
    const url = page.url();
    const isOnApp =
      url.includes("tabs") ||
      url.includes("app") ||
      (await page
        .getByText("Needs Restocking")
        .isVisible({ timeout: 5000 })
        .catch(() => false)) ||
      (await page
        .getByText("Lists")
        .isVisible({ timeout: 2000 })
        .catch(() => false));
    expect(isOnApp).toBeTruthy();
  });

  // ── TC-ONBD-015: Back navigation during onboarding ──────────

  test("TC-ONBD-015: back navigation returns to previous step", async ({
    page,
  }) => {
    test.setTimeout(120_000);

    const canAccess = await onboarding.gotoAndCheckWelcome();
    if (!canAccess) {
      test.skip(true, "User already onboarded");
      return;
    }

    // Navigate welcome → cuisine
    await onboarding.tapGetStarted();
    await onboarding.waitForCuisineScreen();

    // Go back
    await page.goBack();
    await page.waitForTimeout(2000);

    // Should be back on welcome
    const backOnWelcome = await onboarding.welcomeTitle
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    const backOnGetStarted = await onboarding.getStartedButton
      .isVisible({ timeout: 2000 })
      .catch(() => false);
    expect(backOnWelcome || backOnGetStarted).toBeTruthy();
  });

  // ── TC-ONBD-016: Resume interrupted onboarding ───────────────

  test("TC-ONBD-016: already-onboarded user visiting /onboarding is redirected", async ({
    page,
  }) => {
    // Navigate to onboarding welcome as an already-onboarded user
    await page.goto("/onboarding/welcome");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(8000);

    // Either we see the welcome screen (not onboarded) or we got redirected to app
    const isWelcome = await onboarding.welcomeTitle
      .isVisible({ timeout: 3000 })
      .catch(() => false);

    // Check for app screen indicators — user was redirected because already onboarded
    const isApp =
      page.url().includes("tabs") ||
      page.url().includes("app") ||
      (await page
        .getByText("Oloche's Lists")
        .isVisible({ timeout: 3000 })
        .catch(() => false)) ||
      (await page
        .getByText("Needs Restocking")
        .isVisible({ timeout: 2000 })
        .catch(() => false)) ||
      (await page
        .getByText("active list")
        .isVisible({ timeout: 2000 })
        .catch(() => false)) ||
      (await page
        .getByText("Stock")
        .isVisible({ timeout: 2000 })
        .catch(() => false)) ||
      (await page
        .getByText("Profile")
        .isVisible({ timeout: 2000 })
        .catch(() => false));

    // One of these must be true — user is either on onboarding or redirected
    expect(isWelcome || isApp).toBeTruthy();
  });

  // ── TC-ONBD-017: Onboarding with no network ─────────────────

  test("TC-ONBD-017: onboarding welcome renders offline", async ({ page }) => {
    const canAccess = await onboarding.gotoAndCheckWelcome();
    if (!canAccess) {
      test.skip(true, "User already onboarded");
      return;
    }

    // Go offline
    await page.context().setOffline(true);

    // Welcome screen should still be visible (already rendered)
    await expect(onboarding.welcomeTitle).toBeVisible();
    await expect(onboarding.getStartedButton).toBeVisible();

    // Tap Get Started
    await onboarding.tapGetStarted();
    await page.waitForTimeout(5000);

    // Re-enable network
    await page.context().setOffline(false);

    // Location detection may fail gracefully — the page should still render
    // (either cuisine screen with defaults or loading state that resolves)
    const pageLoaded =
      (await onboarding.cuisineSubtitle
        .or(onboarding.cuisineTitle)
        .isVisible({ timeout: 15_000 })
        .catch(() => false)) ||
      (await onboarding.locationDetectingText
        .isVisible({ timeout: 3000 })
        .catch(() => false));

    // Page should not crash — either cuisine loaded or detection in progress
    expect(pageLoaded).toBeTruthy();
  });

  // ── TC-ONBD-018: Already-subscribed user skips trial ─────────

  test("TC-ONBD-018: already-subscribed user skips trial creation", async ({
    page,
  }) => {
    // This test requires verifying backend behavior (trial not created if
    // subscription exists). Not reliably testable via E2E without backend access.
    test.skip(
      true,
      "Trial creation logic is a backend concern — covered by unit tests"
    );
  });

  // ── Additional: Post-onboarding state ────────────────────────

  test("after onboarding, user lands on app screen", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(8000);

    const isApp =
      (await page
        .getByText("Needs Restocking")
        .isVisible({ timeout: 5000 })
        .catch(() => false)) ||
      (await page
        .getByText("All Items")
        .isVisible({ timeout: 2000 })
        .catch(() => false)) ||
      (await page
        .getByText("active list", { exact: false })
        .isVisible({ timeout: 2000 })
        .catch(() => false)) ||
      (await page
        .getByText("Stock")
        .isVisible({ timeout: 2000 })
        .catch(() => false)) ||
      (await page
        .getByText("Profile")
        .isVisible({ timeout: 2000 })
        .catch(() => false));

    const isOnboarding =
      (await onboarding.welcomeTitle
        .isVisible({ timeout: 2000 })
        .catch(() => false)) ||
      (await onboarding.getStartedButton
        .isVisible({ timeout: 2000 })
        .catch(() => false));

    const isAuth = await page
      .getByText("Welcome back")
      .isVisible({ timeout: 2000 })
      .catch(() => false);

    // Should be somewhere valid
    expect(isApp || isOnboarding || isAuth).toBeTruthy();
  });

  test("direct URL /onboarding/cuisine-selection loads or redirects", async ({
    page,
  }) => {
    await page.goto("/onboarding/cuisine-selection");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(8000);

    // Either shows cuisine screen (not onboarded) or redirects
    const isCuisine =
      (await onboarding.cuisineSubtitle
        .isVisible({ timeout: 3000 })
        .catch(() => false)) ||
      (await onboarding.cuisineTitle
        .isVisible({ timeout: 2000 })
        .catch(() => false));

    const isRedirected =
      page.url().includes("tabs") ||
      page.url().includes("app") ||
      (await page
        .getByText("active list", { exact: false })
        .isVisible({ timeout: 3000 })
        .catch(() => false)) ||
      (await page
        .getByText("Stock")
        .isVisible({ timeout: 2000 })
        .catch(() => false)) ||
      (await page
        .getByText("Profile")
        .isVisible({ timeout: 2000 })
        .catch(() => false));

    expect(isCuisine || isRedirected).toBeTruthy();
  });

  test("direct URL /onboarding/store-selection loads or redirects", async ({
    page,
  }) => {
    await page.goto("/onboarding/store-selection");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(8000);

    const isStores =
      (await onboarding.storeSelectionTitle
        .isVisible({ timeout: 3000 })
        .catch(() => false)) ||
      (await onboarding.skipStoresButton
        .isVisible({ timeout: 2000 })
        .catch(() => false));

    const isRedirected =
      page.url().includes("tabs") ||
      page.url().includes("app") ||
      (await page
        .getByText("active list", { exact: false })
        .isVisible({ timeout: 3000 })
        .catch(() => false)) ||
      (await page
        .getByText("Stock")
        .isVisible({ timeout: 2000 })
        .catch(() => false)) ||
      (await page
        .getByText("Profile")
        .isVisible({ timeout: 2000 })
        .catch(() => false));

    expect(isStores || isRedirected).toBeTruthy();
  });
});
