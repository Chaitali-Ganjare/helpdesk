---
name: users-page-crud-surface
description: Locator/markup reference for the /users admin CRUD page (UsersTable, UserFormDialog, DeleteUserDialog) — accurate as of the session that added apps/e2e/tests/users.spec.ts.
metadata:
  type: project
---

The admin-only `/users` page (`apps/web/src/pages/UsersPage.tsx`) got its first e2e coverage in `apps/e2e/tests/users.spec.ts`, covering happy-path create/edit/delete only (validation/permission-denied cases are intentionally left to other specs/component tests per the user's request).

Key markup facts, useful for future edits to this spec or related ones:
- `UsersTable` (`apps/web/src/components/UsersTable.tsx`) renders one `<tr>` per user; each row's accessible name includes the name/email/role text plus the aria-labels of its action buttons (`Edit {name}`, `Delete {name}`). Admin rows never render a delete button (hard rule — enforced in UI by omission and in the API with a 403, not just hidden).
- `UserFormDialog.tsx` is a single shared Radix `Dialog` component for both create and edit, switched by whether a `user` prop is passed. Distinguish create vs edit in tests via the dialog heading text ("Create user" vs "Edit user") and submit button text ("Create user" vs "Save changes") — same field labels (Name/Email/Password) either way. On edit, Name/Email are prefilled from the row; Password is always left blank on open (blank on submit means "don't change password").
- `DeleteUserDialog.tsx` is a Radix `AlertDialog` (`role="alertdialog"`, not `role="dialog"`) titled `Delete {name}?`, with Cancel/Delete buttons.
- Radix `DialogTitle`/`AlertDialogTitle` both render as real `<h2>` elements, so `getByRole("heading", { name: ... })` works reliably inside `getByRole("dialog")` / `getByRole("alertdialog")` scopes — confirmed by reading `@radix-ui/react-dialog`'s source directly rather than assuming.

No existing e2e helper creates users through the UI (only `apps/e2e/helpers/db.ts`'s `createAgentUser`, which shells out to the seed script for backend-only AGENT creation). `users.spec.ts` fills/submits the dialog directly in-test since it's the one thing actually under test there.
