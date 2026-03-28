import { Page, expect } from "@playwright/test";

export class SignUpPage {
  constructor(private page: Page) {}

  // Locators
  get firstNameInput() {
    return this.page.getByPlaceholder("First name");
  }
  get emailInput() {
    return this.page.getByPlaceholder("Email");
  }
  get referralCodeInput() {
    return this.page.getByPlaceholder("Referral Code (Optional)");
  }
  get passwordInput() {
    return this.page.getByPlaceholder("Password");
  }
  get createAccountButton() {
    return this.page.getByText("Create Account", { exact: true });
  }
  get signInLink() {
    return this.page.getByText("Sign in");
  }
  get googleButton() {
    return this.page.getByText("Google");
  }
  get appleButton() {
    return this.page.getByText("Apple");
  }
  get createAccountTitle() {
    return this.page.getByText("Create account", { exact: true });
  }
  get subtitle() {
    return this.page.getByText("Start your budget-first shopping journey");
  }
  get oauthDivider() {
    return this.page.getByText(/or (continue|sign up) with/i);
  }
  get verificationCodeInput() {
    return this.page.getByPlaceholder("Verification code");
  }
  get verifyButton() {
    return this.page.getByText("Verify", { exact: true });
  }
  get verifyEmailTitle() {
    return this.page.getByText("Verify your email");
  }
  get errorCard() {
    return this.page
      .locator(
        "text=/failed|error|incorrect|invalid|incomplete|already|taken/i"
      )
      .first();
  }
  get alreadyHaveAccountText() {
    return this.page.getByText("Already have an account", { exact: false });
  }

  async goto() {
    await this.page.context().clearCookies();
    await this.page
      .evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      })
      .catch(() => {});
    await this.page.goto("/sign-up");
    await this.page.waitForLoadState("networkidle");
    await this.page.waitForTimeout(2000);
  }

  async fillSignUpForm(opts: {
    firstName?: string;
    email: string;
    password: string;
    referralCode?: string;
  }) {
    if (opts.firstName) {
      await this.firstNameInput.fill(opts.firstName);
    }
    await this.emailInput.fill(opts.email);
    if (opts.referralCode) {
      await this.referralCodeInput.fill(opts.referralCode);
    }
    await this.passwordInput.fill(opts.password);
  }

  async submit() {
    await this.createAccountButton.click();
  }

  async expectVisible() {
    await expect(this.createAccountTitle).toBeVisible();
  }

  async expectError() {
    await expect(this.errorCard).toBeVisible({ timeout: 10_000 });
  }

  async expectVerificationScreen() {
    await expect(this.verifyEmailTitle).toBeVisible({ timeout: 15_000 });
    await expect(this.verificationCodeInput).toBeVisible();
    await expect(this.verifyButton).toBeVisible();
  }

  async expectRedirectToOnboarding() {
    await this.page.waitForURL(/onboarding/, { timeout: 30_000 });
  }
}
