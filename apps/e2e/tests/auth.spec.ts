import { test, expect } from "@playwright/test";
import { loginViaUI } from "../helpers/auth";
import { createAgentUser } from "../helpers/db";
import { SEEDED_ADMIN } from "../helpers/constants";

const INVALID_CREDENTIALS_ERROR = "Invalid email or password";

test.describe("Login", () => {
  test("successful login with valid ADMIN credentials redirects to dashboard", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByLabel("Email address").fill(SEEDED_ADMIN.email);
    await page.getByLabel("Password").fill(SEEDED_ADMIN.password);
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page).toHaveURL("/");
    await expect(page.getByText(SEEDED_ADMIN.name, { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  });

  test("wrong password for an existing user shows a generic error", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email address").fill(SEEDED_ADMIN.email);
    await page.getByLabel("Password").fill("definitely-the-wrong-password");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByText(INVALID_CREDENTIALS_ERROR)).toBeVisible();
    await expect(page).toHaveURL("/login");
  });

  test("non-existent email shows the same generic error (no user enumeration)", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByLabel("Email address").fill("nobody-here@test.local");
    await page.getByLabel("Password").fill("whatever-password");
    await page.getByRole("button", { name: "Sign in" }).click();

    // Must be byte-for-byte the same message as the wrong-password case,
    // otherwise the UI leaks whether an email is registered.
    await expect(page.getByText(INVALID_CREDENTIALS_ERROR)).toBeVisible();
    await expect(page).toHaveURL("/login");
  });

  test("invalid email format is rejected client-side", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email address").fill("not-an-email");
    await page.getByLabel("Password").fill("some-password");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByText("Enter a valid email address")).toBeVisible();
    await expect(page).toHaveURL("/login");
  });

  test("empty password is rejected client-side", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email address").fill(SEEDED_ADMIN.email);
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByText("Password is required")).toBeVisible();
    await expect(page).toHaveURL("/login");
  });
});

test.describe("Route protection", () => {
  test("visiting / while unauthenticated redirects to /login", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL("/login");
  });

  test("visiting /users while unauthenticated redirects to /login", async ({ page }) => {
    await page.goto("/users");
    await expect(page).toHaveURL("/login");
  });

  test("visiting /login while already authenticated redirects to /", async ({ page }) => {
    await loginViaUI(page, SEEDED_ADMIN.email, SEEDED_ADMIN.password);

    await page.goto("/login");
    await expect(page).toHaveURL("/");
  });

  test("ADMIN can access /users and sees the Users nav link", async ({ page }) => {
    await loginViaUI(page, SEEDED_ADMIN.email, SEEDED_ADMIN.password);

    await page.goto("/users");
    await expect(page).toHaveURL("/users");
    await expect(page.getByRole("heading", { name: "Users" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Users" })).toBeVisible();
  });

  test("AGENT visiting /users is redirected to / and has no Users nav link", async ({
    page,
  }) => {
    const agent = await createAgentUser();

    await loginViaUI(page, agent.email, agent.password);

    await page.goto("/users");
    await expect(page).toHaveURL("/");
    await expect(page.getByRole("link", { name: "Users" })).toHaveCount(0);
  });
});

test.describe("Sign out", () => {
  test("signing out redirects to /login and actually clears the server session", async ({
    page,
  }) => {
    await loginViaUI(page, SEEDED_ADMIN.email, SEEDED_ADMIN.password);

    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL("/login");

    // If the session were only cleared client-side, / would still load.
    // A real server-side sign-out means the session cookie no longer
    // resolves, so / bounces back to /login.
    await page.goto("/");
    await expect(page).toHaveURL("/login");
  });
});

test.describe("Session persistence", () => {
  test("reloading / while authenticated keeps the session", async ({ page }) => {
    await loginViaUI(page, SEEDED_ADMIN.email, SEEDED_ADMIN.password);

    await page.reload();

    await expect(page).toHaveURL("/");
    await expect(page.getByText(SEEDED_ADMIN.name, { exact: true })).toBeVisible();
  });
});
