---
name: e2e-test-conventions
description: Always validate a new/changed spec by running the entire e2e suite, not just the target file, before reporting done.
metadata:
  type: feedback
---

Running `playwright test <new-file>.spec.ts` in isolation passing is not sufficient evidence the suite is healthy. This project's tests share one MySQL database *and* hit real server-side infrastructure (e.g. the sign-in rate limiter, see [[sign-in-rate-limit-budget]]) that only manifests as a problem when multiple spec files' effects combine within the same run/window.

**Why:** Caught directly in the session that added `apps/e2e/tests/users.spec.ts` — the new file passed 100% of the time alone, but failed intermittently when run as part of `bun run test:e2e` (the full suite), because combined with `auth.spec.ts` it exceeded a shared rate limit. Isolated-file testing gave false confidence.

**How to apply:** Before reporting a new or modified e2e spec as done, run the project's actual `bun run test:e2e` (full suite, from repo root) at least once — not only `playwright test <file>` — and ideally twice in a row to catch cross-file, shared-state, or timing-window flakiness that single-file runs can't surface.
