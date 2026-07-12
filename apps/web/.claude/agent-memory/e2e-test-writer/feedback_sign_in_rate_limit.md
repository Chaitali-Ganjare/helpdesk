---
name: sign-in-rate-limit-budget
description: The server's sign-in rate limiter is shared IP-wide across the whole e2e run — minimize loginViaUI calls per new spec file.
metadata:
  type: feedback
---

`apps/server/src/index.ts` registers `express-rate-limit` on `/api/auth/sign-in`: `max: 10` requests per 15-minute window, keyed by IP (not by email). Every Playwright worker/browser in the e2e run shares one IP (localhost), so **every** `loginViaUI` call across **every** spec file in the run draws from the same 10-attempt budget for that window.

`apps/e2e/tests/auth.spec.ts` alone already uses ~8 of those 10 attempts (it deliberately tests multiple login attempts: success, wrong password, non-existent email, plus `loginViaUI` calls in the route-protection/sign-out/session-persistence tests). Client-side-only validation failures (invalid email format, empty password) don't count — react-hook-form + zod blocks the request before it reaches the server.

**Why this matters:** I originally wrote `apps/e2e/tests/users.spec.ts` (user management CRUD) as three independent tests, each calling `loginViaUI` once (3 logins). In isolation (`playwright test users.spec.ts`) this passed every time. Running the **full suite** (`bun run test:e2e`, all spec files together) pushed the combined login count to 11, and the 3rd users.spec.ts test failed non-deterministically at the `loginViaUI` redirect assertion (`expect(page).toHaveURL("/")` got `/login` instead) — not a bug in the test or the app, just the rate limiter firing.

**How to apply:** When adding a new spec file, count how many `loginViaUI` calls it adds and consider the *combined* total across all spec files in `apps/e2e/tests/`, not just the new file in isolation. Prefer chaining multi-step CRUD/flow tests (create → edit → delete, etc.) into a single `test(...)` with one login rather than splitting into N independent tests each with their own login, unless the thing under test is specifically login/session behavior itself (in which case that's `auth.spec.ts`'s job, not a new file's). Always do a final validation run of the **entire** `bun run test:e2e` suite (not just the new/target file) before reporting done — a file-scoped `playwright test <file>` run alone will not catch this class of cross-file rate-limit collision. See [[e2e-test-conventions]] for the general workflow this fits into.
