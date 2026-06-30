import { execSync } from "child_process";
import * as dotenv from "dotenv";
import * as path from "path";

const SERVER_DIR = path.resolve(__dirname, "../server");

export default async function globalSetup() {
  // Ensure test env vars are loaded even if playwright.config.ts runs in a
  // separate module context.
  dotenv.config({ path: path.resolve(SERVER_DIR, ".env.test") });

  const bun = process.env.BUN_PATH ?? `${process.env.HOME}/.bun/bin/bun`;
  const bunxBin = path.resolve(path.dirname(bun), "bunx");
  const env = {
    ...process.env,
    // Guarantee bun's bin dir is on PATH for prisma CLI invocations.
    PATH: `${path.dirname(bun)}:${process.env.PATH ?? ""}`,
  };

  console.log("\n[e2e] Resetting test database...");
  execSync(`${bunxBin} prisma migrate reset --force --skip-seed`, {
    cwd: SERVER_DIR,
    env,
    stdio: "inherit",
  });

  console.log("\n[e2e] Seeding test admin user...");
  execSync(`${bun} run seed:user`, {
    cwd: SERVER_DIR,
    env,
    stdio: "inherit",
  });
}
