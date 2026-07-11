---
name: env-test-setup-gaps
description: apps/server/.env.test doesn't exist by default and wasn't gitignored — must be created locally before any e2e run
metadata:
  type: project
---

As of 2026-07-11, `apps/server/.env.test` did not actually exist on disk (despite CLAUDE.md and `apps/e2e` conventions assuming it does), and the root `.gitignore` only ignored `.env`/`.env.local` — not `.env.test` — so a freshly-created one would have been picked up by `git add -A`.

**Why:** `global-setup.ts` and `playwright.config.ts` both hard-require `apps/server/.env.test` to exist (they `dotenv.config` it directly, no fallback). Without it, `DATABASE_URL` etc. are undefined and Prisma/the test server silently fall back to whatever `.env` (dev) provides — which is exactly how a test run can accidentally hit the dev database.

**How to apply:**
- Before running e2e tests in this repo, check `apps/server/.env.test` exists; if not, create it from `.env.test.example`, pointing `DATABASE_URL` at a **dedicated** `helpdesk_test` MySQL database (create the DB first: `mysql -u root -p<pw> -e "CREATE DATABASE IF NOT EXISTS helpdesk_test;"`). Reuse the same MySQL root password as `apps/server/.env` (dev) unless told otherwise.
- Added `.env.test` to root `.gitignore` (fixed 2026-07-11) — verify it's still there before creating new env files, since this is an easy thing for someone to accidentally revert.
- Never run bare `prisma migrate reset` / `prisma migrate dev` etc. from `apps/server` without an explicit `DATABASE_URL` override or without first confirming `.env.test` is loaded into the shell env — Prisma CLI falls back to `apps/server/.env` (the dev database) if `DATABASE_URL` isn't already set, and `migrate reset` is destructive. Always pass `DATABASE_URL=...` inline or dotenv-load `.env.test` explicitly before any prisma CLI invocation for test purposes.
