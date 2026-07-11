---
name: migration-schema-drift-fixed
description: The single committed Prisma migration (20260628141441_init) was stale/wrong relative to schema.prisma — fixed 2026-07-11, but watch for recurrence
metadata:
  type: project
---

Found and fixed 2026-07-11: `apps/server/prisma/migrations/20260628141441_init/migration.sql` did not match `apps/server/prisma/schema.prisma` at all — it had an old NextAuth-shaped schema (`Account.provider`/`providerAccountId`, `Session.sessionToken`/`expires`, a `VerificationToken` table, `emailVerified DATETIME`) while the actual app (better-auth adapter, `seed-user.ts`, `auth.ts`) needs the better-auth shape (`Account.accountId`/`providerId`, `Session.token`/`expiresAt`, a `Verification` table, `emailVerified BOOLEAN`).

**Why this happened (inferred):** the live dev database was almost certainly evolved via `prisma db push` (which syncs schema.prisma straight to the DB without touching migration files) at some point after the schema was changed for better-auth, so the dev DB *worked* even though the checked-in migration was stale. This only surfaces when something runs `prisma migrate reset`/`migrate deploy`, which replays migration files from scratch — e2e's `global-setup.ts` does exactly this before every run.

**How it was fixed:** regenerated correct SQL via `prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script` and replaced the migration.sql content in place (only one migration existed, no prod deploy yet, so editing in place was safe rather than layering a corrective migration).

**How to apply:**
- If e2e (or any) `prisma migrate reset` starts failing with a MySQL type/column error (e.g. "Incorrect datetime value... for column 'emailVerified'"), suspect migration/schema drift first, not the seed script logic. Compare `prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script` output against the committed migration.sql.
- After any future `schema.prisma` change, confirm a real migration was generated (`prisma migrate dev` interactively, not `db push`) so this doesn't reoccur. Worth mentioning to the user if you see `db push` habits creeping back in.
- Related: [[env-test-setup-gaps]] — this bug was only discovered because a from-scratch `.env.test`/`helpdesk_test` DB had to be created and reset for the first time.
