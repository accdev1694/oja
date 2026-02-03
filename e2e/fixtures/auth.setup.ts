import { test as setup, expect } from "@playwright/test";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";

// Load e2e env vars
dotenv.config({ path: path.resolve(__dirname, "../.env.e2e") });

const authFile = path.resolve(__dirname, "../.auth/user.json");

/**
 * Auth setup — signs in with pre-created test account, completes
 * onboarding if needed, then saves storageState for all tests.
 *
 * Account is created via Clerk Backend API (email pre-verified).
 */
setup("authenticate", async ({ page }) => {
  setup.setTimeout(300_000); // 5 min for sign-in + onboarding + AI seeding

  const username = process.env.E2E_CLERK_USER_USERNAME;
  const password = process.env.E2E_CLERK_USER_PASSWORD;

  if (!username || !password) {
    console.warn("Missing E2E credentials in e2e/.env.e2e");
    const dir = path.dirname(authFile);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(authFile, JSON.stringify({ cookies: [], origins: [] }));
    return;
  }

  // ── Step 1: Sign in ──
  // Start clean
  await page.context().clearCookies();
  await page.goto("/");

  // Log console errors for debugging
  page.on("console", (msg) => {
    if (msg.type() === "error") console.log("BROWSER ERROR:", msg.text());
  });

  // Wait for React app to render
  await page.waitForFunction(
    () => {
      const root = document.getElementById("root");
      return root && root.children.length > 0;
    },
    { timeout: 30_000 }
  );
  await page.waitForTimeout(5000); // Extra time for Clerk to initialize

  // Reload if page appears blank (Clerk can fail silently on first load)
  const hasContent = await page.evaluate(() => {
    const body = document.body.innerText.trim();
    return body.length > 10;
  });
  if (!hasContent) {
    console.log("Page appears blank, reloading...");
    await page.reload();
    await page.waitForTimeout(5000);
  }

  console.log("Page URL:", page.url());

  // If on sign-up, switch to sign-in
  if (page.url().includes("sign-up")) {
    const signInLink = page.getByText("Sign in", { exact: false }).last();
    if (await signInLink.isVisible({ timeout: 5000 })) {
      await signInLink.click();
      await page.waitForTimeout(2000);
    }
  }

  console.log("Signing in as", username);
  const emailInput = page
    .locator('input[name="emailAddress"]')
    .first()
    .or(page.getByPlaceholder("Email").first())
    .or(page.locator('input[type="email"]').first());
  await expect(emailInput).toBeVisible({ timeout: 15_000 });
  await emailInput.fill(username);

  const passwordInput = page
    .locator('input[name="password"]')
    .first()
    .or(page.getByPlaceholder("Password").first())
    .or(page.locator('input[type="password"]').first());
  await expect(passwordInput).toBeVisible({ timeout: 10_000 });
  await passwordInput.fill(password);

  const signInBtn = page
    .getByRole("button", { name: /sign in/i })
    .or(page.getByText("Sign In", { exact: true }))
    .or(page.locator('button[type="submit"]'));
  await signInBtn.first().click();

  console.log("Clicked sign-in, waiting for redirect...");
  // After sign-in, user may land on "/" (already onboarded) or "/onboarding/..."
  await page.waitForURL(
    (url) => {
      const p = url.pathname;
      return !p.includes("sign-in") && !p.includes("sign-up");
    },
    { timeout: 60_000 }
  );
  console.log("Authenticated! URL:", page.url());

  // ── Step 2: Complete onboarding if needed ──
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  const isOnboarding =
    page.url().includes("onboarding") ||
    (await page.getByText("Get Started").isVisible().catch(() => false)) ||
    (await page.getByText("Welcome to Oja").isVisible().catch(() => false));

  if (isOnboarding) {
    console.log("User needs onboarding, completing...");

    // Click Get Started if visible
    const getStartedBtn = page.getByText("Get Started", { exact: false });
    if (await getStartedBtn.isVisible().catch(() => false)) {
      await getStartedBtn.click();
      await page.waitForTimeout(3000);
    }

    // Wait for cuisine selection to load (location detection)
    const cuisineHeader = page.getByText("What cuisines do you cook?");
    if (await cuisineHeader.isVisible({ timeout: 30_000 }).catch(() => false)) {
      console.log("Selecting cuisines...");

      // Select British and Nigerian
      for (const cuisine of ["British", "Nigerian"]) {
        const chip = page.getByText(cuisine, { exact: true });
        if (await chip.isVisible().catch(() => false)) {
          await chip.click();
          await page.waitForTimeout(500);
        }
      }

      // Click Continue
      const continueBtn = page.getByText("Continue", { exact: false }).first();
      await continueBtn.scrollIntoViewIfNeeded();
      await expect(continueBtn).toBeEnabled({ timeout: 5_000 });
      await continueBtn.click();
      console.log("Continue clicked, waiting for AI seeding...");
    }

    // Wait for seeding to complete — may take up to 3 min
    // The seeding screen will redirect to review-items or main app when done
    await page.waitForURL(
      (url) => {
        const p = url.pathname;
        return p.includes("review-items") || p.includes("(tabs)") || p.includes("(app)");
      },
      { timeout: 180_000 }
    );
    console.log("Seeding complete! URL:", page.url());
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // If on review screen, confirm items
    if (page.url().includes("review-items")) {
      console.log("On review-items screen, saving to pantry...");

      // Button text: "Save to Pantry (N items)"
      const saveBtn = page.getByText("Save to Pantry", { exact: false });
      await expect(saveBtn).toBeVisible({ timeout: 10_000 });
      await saveBtn.scrollIntoViewIfNeeded();
      await saveBtn.click();
      console.log("Clicked Save to Pantry, waiting for navigation...");

      // Wait for mutations (bulkCreate + completeOnboarding) then router.replace
      await page.waitForURL(
        (url) => !url.pathname.includes("onboarding"),
        { timeout: 120_000 }
      );
      console.log("Onboarding complete! URL:", page.url());
    }

    // Wait for the main app to stabilize
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);
  }

  console.log("Final URL:", page.url());
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(3000);

  // ── Step 3: Dismiss any onboarding overlays ──
  // The SwipeOnboardingOverlay shows on first pantry visit — dismiss it
  // so the localStorage flag is saved in storageState for all tests
  const gotItBtn = page.getByText("Got it", { exact: true });
  if (await gotItBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    console.log("Dismissing swipe onboarding overlay...");
    await gotItBtn.click();
    await page.waitForTimeout(1000);
  }

  // ── Step 4: Save signed-in state ──
  const dir = path.dirname(authFile);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  await page.context().storageState({ path: authFile });
  console.log("Auth state saved to", authFile);
});
