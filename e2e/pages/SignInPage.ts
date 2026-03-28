import { Page, expect } from "@playwright/test";

export class SignInPage {
  constructor(private page: Page) {}

  // Locators
  get emailInput() {
    return this.page.getByPlaceholder("Email");
  }
  get passwordInput() {
    return this.page.getByPlaceholder("Password");
  }
  get signInButton() {
    return this.page.getByText("Sign In", { exact: true });
  }
  get continueButton() {
    return this.page.getByText("Continue", { exact: true });
  }
  get signUpLink() {
    return this.page.getByText("Sign up");
  }
  get googleButton() {
    return this.page.getByText("Google");
  }
  get appleButton() {
    return this.page.getByText("Apple");
  }
  get welcomeText() {
    return this.page.getByText("Welcome back");
  }
  get subtitle() {
    return this.page.getByText("Sign in to continue to Oja");
  }
  get errorCard() {
    return this.page
      .locator(
        "text=/failed|error|incorrect|invalid|incomplete|couldn't find|No account found|Please enter a valid/i"
      )
      .first();
  }
  get verificationCodeInput() {
    return this.page.getByPlaceholder("Verification code");
  }
  get verifyButton() {
    return this.page.getByText("Verify", { exact: true });
  }
  get forgotPasswordLink() {
    return this.page.getByText("Forgot password?");
  }
  get oauthDivider() {
    return this.page.getByText("or continue with", { exact: false });
  }
  get dontHaveAccountText() {
    return this.page.getByText("Don't have an account");
  }
  get savedAccountCard() {
    return this.page.locator(
      "text=/Email & password|Google account|Apple account/i"
    );
  }
  get useDifferentAccountLink() {
    return this.page.getByText("Use a different account", { exact: false });
  }
  get continueWithGoogleButton() {
    return this.page.getByText("Continue with Google", { exact: false });
  }
  get verifyEmailTitle() {
    return this.page.getByText("Verify your email");
  }
  get backToSignInLink() {
    return this.page.getByText("Back to sign in", { exact: false });
  }

  async goto() {
    // Clear auth state to ensure we see sign-in
    await this.page.context().clearCookies();
    await this.page.goto("/");
    await this.page.waitForLoadState("networkidle");
    await this.page.waitForTimeout(2000);
  }

  async clearAuthAndGoto() {
    await this.page.context().clearCookies();
    await this.page
      .evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      })
      .catch(() => {});
    await this.page.goto("/");
    await this.page.waitForLoadState("networkidle");
    await this.page.waitForTimeout(2000);
  }

  /**
   * Identifier-first flow: fill email → tap Continue → wait for password field → fill password.
   * The sign-in form shows only the email input initially. After tapping Continue,
   * Clerk resolves the auth strategy and the password field appears.
   */
  async fillCredentials(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.continueButton.click();
    // Wait for Clerk to resolve the identifier and show password field
    await expect(this.passwordInput).toBeVisible({ timeout: 15_000 });
    await this.passwordInput.fill(password);
  }

  async fillEmail(email: string) {
    await this.emailInput.fill(email);
  }

  /**
   * Fill the password field. Must be called AFTER the password step is visible
   * (i.e., after tapping Continue on the email step).
   */
  async fillPassword(password: string) {
    await expect(this.passwordInput).toBeVisible({ timeout: 15_000 });
    await this.passwordInput.fill(password);
  }

  async submit() {
    await this.signInButton.click();
  }

  async tapContinue() {
    await this.continueButton.click();
  }

  /**
   * Full sign-in flow: email → Continue → password → Sign In.
   */
  async signIn(email: string, password: string) {
    await this.fillCredentials(email, password);
    await this.submit();
  }

  async expectVisible() {
    await expect(this.welcomeText).toBeVisible();
  }

  async expectError() {
    await expect(this.errorCard).toBeVisible({ timeout: 10_000 });
  }

  async expectErrorMessage(message: string | RegExp) {
    const pattern =
      typeof message === "string" ? new RegExp(message, "i") : message;
    await expect(
      this.page.locator(`text=${pattern.source}`).first()
    ).toBeVisible({ timeout: 10_000 });
  }

  /**
   * Expect redirect to app after sign-in.
   * If 2FA is enabled, the redirect won't happen — this method returns false.
   * Returns true if redirected, false if blocked by 2FA.
   */
  async expectRedirectToApp(): Promise<boolean> {
    const redirected = await this.page
      .waitForURL(/(app|onboarding)/, { timeout: 15_000 })
      .then(() => true)
      .catch(() => false);

    if (!redirected) {
      // Check if 2FA is blocking the redirect
      const twoFa = await this.page
        .getByText("Two-factor authentication", { exact: false })
        .isVisible({ timeout: 3000 })
        .catch(() => false);
      if (twoFa) return false;
      // If not 2FA, still wait longer
      await this.page.waitForURL(/(app|onboarding)/, { timeout: 15_000 });
    }
    return true;
  }

  async expectOnSignInPage() {
    await expect(this.emailInput).toBeVisible({ timeout: 10_000 });
  }
}
