import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

/**
 * Logs in through the real login form and waits for the post-login redirect
 * to "/". Use this for setting up an authenticated session in tests that
 * aren't specifically exercising the login form itself.
 */
export async function loginViaUI(page: Page, email: string, password: string): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL("/");
}
