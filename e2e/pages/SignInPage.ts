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
  get signUpLink() {
    return this.page.getByText("Sign up");
  }
  get googleButton() {
    return this.page.getByText("Google");
  }
  get welcomeText() {
    return this.page.getByText("Welcome back");
  }
  get errorCard() {
    return this.page.locator("text=/failed|error|incorrect|invalid|incomplete|couldn't find/i").first();
  }
  get verificationCodeInput() {
    return this.page.getByPlaceholder("Verification code");
  }
  get verifyButton() {
    return this.page.getByText("Verify", { exact: true });
  }

  async goto() {
    // Clear auth state to ensure we see sign-in
    await this.page.context().clearCookies();
    await this.page.goto("/");
    await this.page.waitForLoadState("networkidle");
    await this.page.waitForTimeout(2000);
  }

  async fillCredentials(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
  }

  async submit() {
    await this.signInButton.click();
  }

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

  async expectRedirectToApp() {
    await this.page.waitForURL(/(app|onboarding)/, { timeout: 30_000 });
  }
}
