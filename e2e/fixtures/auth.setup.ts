import { test as setup, expect } from "@playwright/test";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";

// Load e2e env vars
dotenv.config({ path: path.resolve(__dirname, "../.env.e2e") });

const authFile = path.resolve(__dirname, "../.auth/user.json");

/** Create a Clerk sign-in token via Backend API (bypasses MFA) */
async function createSignInToken(clerkSecretKey: string, userId: string): Promise<{ url: string; token: string } | null> {
  try {
    const res = await fetch("https://api.clerk.com/v1/sign_in_tokens", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${clerkSecretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ user_id: userId }),
    });
    if (!res.ok) {
      console.error("Failed to create sign-in token:", res.status, await res.text());
      return null;
    }
    const data = await res.json();
    return { url: data.url as string, token: data.token as string };
  } catch (e) {
    console.error("Error creating sign-in token:", e);
    return null;
  }
}

/** Look up user ID by email via Clerk Backend API */
async function getUserIdByEmail(clerkSecretKey: string, email: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.clerk.com/v1/users?email_address=${encodeURIComponent(email)}`,
      {
        headers: {
          Authorization: `Bearer ${clerkSecretKey}`,
          "Content-Type": "application/json",
        },
      }
    );
    if (!res.ok) return null;
    const users = await res.json();
    if (Array.isArray(users) && users.length > 0) return users[0].id;
    return null;
  } catch {
    return null;
  }
}

/**
 * Auth setup — signs in with pre-created test account, completes
 * onboarding if needed, then saves storageState for all tests.
 *
 * Uses Clerk Backend API sign-in tokens to bypass MFA entirely.
 * Falls back to email/password form if CLERK_SECRET_KEY is missing.
 */
setup("authenticate", async ({ page }) => {
  setup.setTimeout(300_000); // 5 min for sign-in + onboarding + AI seeding

  const username = process.env.E2E_CLERK_USER_USERNAME;
  const password = process.env.E2E_CLERK_USER_PASSWORD;
  const clerkSecretKey = process.env.CLERK_SECRET_KEY;

  if (!username || !password) {
    console.warn("Missing E2E credentials in e2e/.env.e2e");
    const dir = path.dirname(authFile);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(authFile, JSON.stringify({ cookies: [], origins: [] }));
    return;
  }

  // ── Step 0: Check if valid auth state already exists ──
  if (fs.existsSync(authFile)) {
    try {
      const existingState = JSON.parse(fs.readFileSync(authFile, "utf-8"));
      const hasClerkCookies = existingState.cookies?.some(
        (c: { name: string }) => c.name.includes("__clerk") || c.name.includes("__session")
      );
      if (hasClerkCookies) {
        console.log("Found existing auth state with Clerk cookies, verifying...");
        await page.context().addCookies(existingState.cookies || []);
        await page.goto("/");
        await page.waitForTimeout(5000);

        const isAuthenticated =
          !page.url().includes("sign-in") &&
          !page.url().includes("sign-up") &&
          !(await page.locator('input[name="emailAddress"]').isVisible({ timeout: 2000 }).catch(() => false));

        if (isAuthenticated) {
          console.log("Existing auth state is valid! Skipping sign-in.");
          const gotItBtn = page.getByText("Got it", { exact: true });
          if (await gotItBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
            await gotItBtn.click();
            await page.waitForTimeout(500);
          }
          await page.context().storageState({ path: authFile });
          return;
        }
        console.log("Existing auth state expired, proceeding with fresh sign-in...");
      }
    } catch (e) {
      console.log("Could not parse existing auth state, proceeding with fresh sign-in...");
    }
  }

  // ── Step 1: Sign in ──
  await page.context().clearCookies();

  // Log console errors for debugging
  page.on("console", (msg) => {
    if (msg.type() === "error") console.log("BROWSER ERROR:", msg.text());
  });

  // ── Strategy A: Sign-in token (bypasses MFA) ──
  let signedIn = false;
  if (clerkSecretKey) {
    console.log("Using Clerk sign-in token strategy (bypasses MFA)...");
    const userId = await getUserIdByEmail(clerkSecretKey, username);
    if (userId) {
      const tokenData = await createSignInToken(clerkSecretKey, userId);
      if (tokenData) {
        console.log("Sign-in token created, exchanging via FAPI in browser context...");

        // First load the app so Clerk JS is initialized
        await page.goto("/");
        await page.waitForFunction(
          () => {
            const root = document.getElementById("root");
            return root && root.children.length > 0;
          },
          { timeout: 30_000 }
        );
        await page.waitForTimeout(3000);

        // Use Clerk's signIn.create() with the ticket strategy from the browser.
        // This properly sets the session cookies/localStorage via the Clerk JS SDK.
        const signInResult = await page.evaluate(async (ticket) => {
          // Wait for Clerk to be available on window
          const maxWait = 20000;
          const start = Date.now();
          while (Date.now() - start < maxWait) {
            const clerk = (window as any).Clerk;
            if (clerk?.loaded) {
              try {
                // In React Native / Expo web, Clerk may expose signIn differently
                const signIn = clerk.signIn || clerk.client?.signIn;
                if (!signIn?.create) {
                  // Try using the Clerk Frontend API directly
                  const fapiUrl = clerk.frontendApi || clerk.__unstable__environment?.displayConfig?.frontendApi;
                  if (fapiUrl) {
                    const res = await fetch(`https://${fapiUrl}/v1/client/sign_ins`, {
                      method: "POST",
                      headers: { "Content-Type": "application/x-www-form-urlencoded" },
                      body: `strategy=ticket&ticket=${ticket}`,
                      credentials: "include",
                    });
                    const data = await res.json();
                    if (data.response?.status === "complete" && data.response?.created_session_id) {
                      await clerk.setActive({ session: data.response.created_session_id });
                      return { success: true, status: "complete", method: "fapi-direct" };
                    }
                    return { success: false, error: `FAPI status: ${data.response?.status}`, data: JSON.stringify(data).substring(0, 200) };
                  }
                  return { success: false, error: "signIn.create not found, no FAPI URL", keys: Object.keys(clerk).join(",") };
                }
                const result = await signIn.create({
                  strategy: "ticket",
                  ticket,
                });
                if (result.status === "complete") {
                  await clerk.setActive({ session: result.createdSessionId });
                  return { success: true, status: result.status, method: "sdk" };
                }
                return { success: false, status: result.status, error: "not complete" };
              } catch (e: any) {
                return { success: false, error: e?.message || String(e) };
              }
            }
            await new Promise((r) => setTimeout(r, 500));
          }
          // Try to find what's on window.Clerk
          const clerk = (window as any).Clerk;
          return {
            success: false,
            error: "Clerk not loaded in time",
            clerkExists: !!clerk,
            clerkKeys: clerk ? Object.keys(clerk).slice(0, 15).join(",") : "none",
          };
        }, tokenData.token);

        console.log("Sign-in token result:", JSON.stringify(signInResult));

        if (signInResult.success) {
          // Clerk session is now active, navigate to app home
          await page.goto("/");
          await page.waitForTimeout(5000);

          const isAuth =
            !page.url().includes("sign-in") &&
            !page.url().includes("sign-up");
          if (isAuth) {
            console.log("Sign-in token auth successful! URL:", page.url());
            signedIn = true;
          } else {
            console.log("Session set but still on auth page, trying reload...");
            await page.reload();
            await page.waitForTimeout(5000);
            const isAuthRetry =
              !page.url().includes("sign-in") &&
              !page.url().includes("sign-up");
            if (isAuthRetry) {
              console.log("Sign-in token auth successful after reload! URL:", page.url());
              signedIn = true;
            }
          }
        } else {
          console.log("Sign-in token exchange failed, falling back to form...");
        }
      }
    } else {
      console.log("Could not find user by email, falling back to form sign-in...");
    }
  }

  // ── Strategy B: Form-based sign-in (fallback) ──
  if (!signedIn) {
    console.log("Using form-based sign-in...");
    await page.goto("/");

    await page.waitForFunction(
      () => {
        const root = document.getElementById("root");
        return root && root.children.length > 0;
      },
      { timeout: 30_000 }
    );
    await page.waitForTimeout(5000);

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

    await page.waitForTimeout(3000);
    const twoFactorError = await page
      .getByText("needs_second_factor", { exact: false })
      .or(page.getByText("Two-factor authentication required", { exact: false }))
      .or(page.getByText("check your authenticator", { exact: false }))
      .isVisible()
      .catch(() => false);

    if (twoFactorError) {
      console.error(
        "⚠️  2FA required and no CLERK_SECRET_KEY for token auth. Tests will run unauthenticated."
      );
      const dir = path.dirname(authFile);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(authFile, JSON.stringify({ cookies: [], origins: [] }));
      return;
    }

    await page.waitForURL(
      (url) => {
        const p = url.pathname;
        return !p.includes("sign-in") && !p.includes("sign-up");
      },
      { timeout: 60_000 }
    );
    console.log("Form sign-in successful! URL:", page.url());
  }

  console.log("Authenticated! URL:", page.url());

  // ── Step 2: Complete onboarding if needed ──
  // NOTE: Don't use networkidle — Convex WebSocket keeps connection alive forever
  await page.waitForTimeout(3000);

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
    // NOTE: Don't use networkidle — Convex WebSocket keeps connection alive forever
    await page.waitForTimeout(3000);

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
    // NOTE: Don't use networkidle — Convex WebSocket keeps connection alive forever
    await page.waitForTimeout(3000);
  }

  console.log("Final URL:", page.url());
  // NOTE: Don't use networkidle — Convex WebSocket keeps connection alive forever
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
