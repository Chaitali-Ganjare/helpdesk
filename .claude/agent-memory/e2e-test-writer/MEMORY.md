# E2E Test Writer Memory

- [env-test-setup-gaps](env_test_setup_gaps.md) — apps/server/.env.test must be created locally (wasn't gitignored either, now fixed); never run bare prisma CLI against dev DB by accident.
- [migration-schema-drift-fixed](migration_schema_drift_fixed.md) — the one committed Prisma migration was stale (old NextAuth shape); fixed 2026-07-11, watch for recurrence after future schema.prisma edits.
- [better-auth-crypto-esm-only](better_auth_crypto_esm_only.md) — never import better-auth subpaths (e.g. /crypto) directly in apps/e2e files; shell out to a Bun script instead.
- [dev-server-port-conflict](dev_server_port_conflict.md) — e2e's :3000 webServer never reuses an existing server; stop the user's dev server first, restart it after the run.
