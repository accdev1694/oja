import { Page, expect } from "@playwright/test";

export class ForgotPasswordPage {
  constructor(private page: Page) {}

  // Locators
  get emailInput() {
    return this.page.getByPlaceholder("Email");
  }
  get sendResetCodeButton() {
    return this.page.getByText("Send Reset Code", { exact: true });
  }
  get resetCodeInput() {
    return this.page.getByPlaceholder("Reset code");
  }
  get newPasswordInput() {
    return this.page.getByPlaceholder("New password");
  }
  get resetPasswordButton() {
    return this.page.getByText("Reset Password", { exact: true });
  }
  get forgotPasswordTitle() {
    return this.page.getByText("Forgot password?");
  }
  get forgotPasswordSubtitle() {
    return this.page.getByText(
      "Enter your email and we'll send you a code to reset your password",
      { exact: false }
    );
  }
  get setNewPasswordTitle() {
    return this.page.getByText("Set new password");
  }
  get successMessage() {
    return this.page.getByText("Check your email for a reset code");
  }
  get backToSignInLink() {
    return this.page.getByText("Back to sign in", { exact: false });
  }
  get errorCard() {
    return this.page
      .locator("text=/failed|error|incorrect|invalid|incomplete/i")
      .first();
  }

  async goto() {
    await this.page.goto("/forgot-password");
    await this.page.waitForLoadState("domcontentloaded");
    await this.page.waitForTimeout(3000);
  }

  async fillEmail(email: string) {
    await this.emailInput.fill(email);
  }

  async submitEmail() {
    await this.sendResetCodeButton.click();
  }

  async fillResetForm(code: string, newPassword: string) {
    await this.resetCodeInput.fill(code);
    await this.newPasswordInput.fill(newPassword);
  }

  async submitReset() {
    await this.resetPasswordButton.click();
  }

  async expectVisible() {
    // Use subtitle + Send Reset Code button to confirm we're on the forgot-password page.
    // The title "Forgot password?" can conflict with the sign-in page link text.
    await expect(this.forgotPasswordSubtitle).toBeVisible({ timeout: 10_000 });
    await expect(this.sendResetCodeButton).toBeVisible();
  }

  async expectResetStep() {
    await expect(this.setNewPasswordTitle).toBeVisible({ timeout: 10_000 });
    await expect(this.successMessage).toBeVisible();
    await expect(this.resetCodeInput).toBeVisible();
    await expect(this.newPasswordInput).toBeVisible();
  }

  async expectError() {
    await expect(this.errorCard).toBeVisible({ timeout: 10_000 });
  }
}
