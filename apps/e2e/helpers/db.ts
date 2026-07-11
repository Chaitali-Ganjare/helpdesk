// Direct backend-state helper for e2e tests.
//
// Only one seeded user exists by default (the ADMIN created by
// `apps/server/scripts/seed-user.ts` in global-setup.ts), and sign-up is
// disabled in the app, so there's no way to create an AGENT user through the
// UI. This helper creates one by re-running that exact same seed script
// (which already supports SEED_ROLE=AGENT) against the test database.
//
// Note: we deliberately shell out to the script via Bun rather than
// importing `better-auth/crypto` + the generated Prisma client directly in
// this file. better-auth's `/crypto` subpath is ESM-only (no CJS export
// condition), and Playwright Test loads spec/helper files through Node's
// CommonJS loader, which cannot `require()` an ESM-only package
// ("Cannot use import statement outside a module"). Running the existing
// Bun-executed script as a subprocess sidesteps that entirely and reuses an
// already-proven code path (the same one that seeds the ADMIN user).
import { execFileSync } from "child_process";
import * as dotenv from "dotenv";
import * as path from "path";

const SERVER_DIR = path.resolve(__dirname, "../../server");

// Load the same test env global-setup.ts uses, so DATABASE_URL etc. point at
// the disposable test database (never dev/prod) even if this file is
// imported before playwright.config.ts's own dotenv.config has run in this
// process.
dotenv.config({ path: path.resolve(SERVER_DIR, ".env.test") });

export type Role = "ADMIN" | "AGENT";

export interface CreatedUser {
  name: string;
  email: string;
  password: string;
  role: Role;
}

let counter = 0;

/**
 * Creates a user directly in the test database via
 * apps/server/scripts/seed-user.ts, bypassing the UI (sign-up is disabled).
 */
export async function createUser(opts: {
  email: string;
  password: string;
  name: string;
  role: Role;
}): Promise<CreatedUser> {
  const bun = process.env.BUN_PATH ?? `${process.env.HOME}/.bun/bin/bun`;

  execFileSync(bun, ["run", "seed:user"], {
    cwd: SERVER_DIR,
    env: {
      ...process.env,
      PATH: `${path.dirname(bun)}:${process.env.PATH ?? ""}`,
      SEED_EMAIL: opts.email,
      SEED_PASSWORD: opts.password,
      SEED_NAME: opts.name,
      SEED_ROLE: opts.role,
    },
    stdio: "pipe",
  });

  return { name: opts.name, email: opts.email, password: opts.password, role: opts.role };
}

/**
 * Convenience wrapper for the common case: create a uniquely-emailed
 * AGENT-role user (ADMIN is already covered by the seeded global-setup
 * user, so tests needing an ADMIN should use that one instead).
 */
export async function createAgentUser(overrides?: {
  email?: string;
  password?: string;
  name?: string;
}): Promise<CreatedUser> {
  counter += 1;
  const unique = `${Date.now()}-${counter}-${Math.random().toString(36).slice(2, 8)}`;
  return createUser({
    email: overrides?.email ?? `agent-${unique}@test.local`,
    password: overrides?.password ?? "Test1234!",
    name: overrides?.name ?? "Test Agent",
    role: "AGENT",
  });
}
