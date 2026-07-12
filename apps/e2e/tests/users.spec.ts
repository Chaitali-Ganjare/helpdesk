import { test, expect, type Page } from "@playwright/test";
import { loginViaUI } from "../helpers/auth";
import { SEEDED_ADMIN } from "../helpers/constants";

/** Generates a unique name/email pair so tests never collide with each other or a re-run. */
function uniqueUser(label: string) {
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    name: `Test User ${label} ${unique}`,
    email: `user-${label}-${unique}@test.local`,
    password: "Test1234!",
  };
}

/** Fills and submits the create/edit user dialog, which is already open. */
async function fillAndSubmitUserForm(
  page: Page,
  fields: { name?: string; email?: string; password?: string },
  submitLabel: "Create user" | "Save changes"
): Promise<void> {
  if (fields.name !== undefined) {
    await page.getByLabel("Name").fill(fields.name);
  }
  if (fields.email !== undefined) {
    await page.getByLabel("Email").fill(fields.email);
  }
  if (fields.password !== undefined) {
    await page.getByLabel("Password").fill(fields.password);
  }
  await page.getByRole("dialog").getByRole("button", { name: submitLabel }).click();
}

test.describe("User management", () => {
  // Chained into a single flow (create -> edit -> delete the same user) rather
  // than split across separate tests, so the whole CRUD lifecycle only needs
  // one sign-in. The server's sign-in rate limiter (max 10 attempts / 15 min
  // per IP, see apps/server/src/index.ts) is shared across the whole e2e run,
  // and auth.spec.ts alone already uses most of that budget.
  test("admin can create, edit, and delete a user from the users page", async ({ page }) => {
    const created = uniqueUser("crud");

    await loginViaUI(page, SEEDED_ADMIN.email, SEEDED_ADMIN.password);
    await page.goto("/users");

    // --- Create ---
    await page.getByRole("button", { name: "New user" }).click();
    const createDialog = page.getByRole("dialog");
    await expect(createDialog.getByRole("heading", { name: "Create user" })).toBeVisible();

    await fillAndSubmitUserForm(page, created, "Create user");
    await expect(createDialog).not.toBeVisible();

    const createdRow = page.getByRole("row", { name: new RegExp(created.name) });
    await expect(createdRow).toBeVisible();
    await expect(createdRow.getByText(created.email)).toBeVisible();
    await expect(createdRow.getByText("AGENT", { exact: true })).toBeVisible();

    // --- Edit ---
    const updatedName = `Test User crud-renamed ${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;

    await createdRow.getByRole("button", { name: `Edit ${created.name}` }).click();
    const editDialog = page.getByRole("dialog");
    await expect(editDialog.getByRole("heading", { name: "Edit user" })).toBeVisible();
    // Name/email should be prefilled with the existing values.
    await expect(page.getByLabel("Name")).toHaveValue(created.name);
    await expect(page.getByLabel("Email")).toHaveValue(created.email);

    // Leave password blank — blank means "don't change the password".
    await fillAndSubmitUserForm(page, { name: updatedName }, "Save changes");
    await expect(editDialog).not.toBeVisible();

    const updatedRow = page.getByRole("row", { name: new RegExp(updatedName) });
    await expect(updatedRow).toBeVisible();
    await expect(page.getByText(created.name, { exact: true })).toHaveCount(0);

    // --- Delete ---
    await updatedRow.getByRole("button", { name: `Delete ${updatedName}` }).click();
    const alertDialog = page.getByRole("alertdialog");
    await expect(
      alertDialog.getByRole("heading", { name: `Delete ${updatedName}?` })
    ).toBeVisible();

    await alertDialog.getByRole("button", { name: "Delete" }).click();
    await expect(alertDialog).not.toBeVisible();
    await expect(page.getByRole("row", { name: new RegExp(updatedName) })).toHaveCount(0);
  });
});
