---
name: better-auth-crypto-esm-only
description: better-auth's "/crypto" subpath export is ESM-only and breaks when required from Playwright's CJS-loaded test/helper files
metadata:
  type: feedback
---

Do not `import { hashPassword } from "better-auth/crypto"` (or any other better-auth subpath) directly inside files under `apps/e2e` (spec files or helpers). It throws `SyntaxError: Cannot use import statement outside a module` at test collection time.

**Why:** better-auth's package.json exports map `"./crypto"` to only `"default": "./dist/crypto/index.mjs"` — no CJS/require condition. `apps/server` runs everything through Bun, which handles ESM/CJS interop transparently, so `scripts/seed-user.ts` importing it works fine there. But Playwright Test loads `apps/e2e/**/*.spec.ts` (and anything they import) through Node's CommonJS loader via its own esbuild-based transform, and Node's synchronous `require()` cannot load an ESM-only `.mjs` file — it just sees a literal `import` keyword and fails.

**How to apply:** if an e2e helper needs to create a user with a hashed password (e.g. an AGENT user, since sign-up is disabled and only one ADMIN is seeded), don't call better-auth's hashing function in-process. Instead shell out to the existing `apps/server/scripts/seed-user.ts` via `child_process.execFileSync(bun, ["run", "seed:user"], { cwd: SERVER_DIR, env: {...process.env, SEED_EMAIL, SEED_PASSWORD, SEED_NAME, SEED_ROLE} })` — same pattern `global-setup.ts` already uses for the ADMIN user. This is what `apps/e2e/helpers/db.ts` (`createAgentUser`/`createUser`) does. It reuses an already-correct code path and avoids the ESM/CJS split entirely.
This generalizes: any future e2e helper needing direct backend state that touches better-auth internals should default to shelling out to a Bun script rather than importing better-auth subpaths directly, unless the subpath is confirmed to ship a CJS condition.
