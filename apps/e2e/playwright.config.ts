import { defineConfig, devices } from "@playwright/test";
import * as dotenv from "dotenv";
import * as path from "path";

// Load the server's test environment so DATABASE_URL and auth vars are
// available to globalSetup and to the webServer env blocks below.
dotenv.config({ path: path.resolve(__dirname, "../server/.env.test") });

const BUN = process.env.BUN_PATH ?? `${process.env.HOME}/.bun/bin/bun`;

export default defineConfig({
  testDir: "./tests",
  // Run tests sequentially to avoid concurrent writes to the test database.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [["html", { outputFolder: path.resolve(__dirname, "playwright-report") }], ["list"]],
  outputDir: path.resolve(__dirname, "test-results"),
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  globalSetup: "./global-setup.ts",
  globalTeardown: "./global-teardown.ts",
  webServer: [
    {
      // Express API — started with test env file; must not conflict with dev server.
      command: `${BUN} run start:test`,
      cwd: path.resolve(__dirname, "../server"),
      url: "http://localhost:3000/api/health",
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      // Vite frontend — reused in local dev to avoid double-start.
      command: `${BUN} run dev`,
      cwd: path.resolve(__dirname, "../web"),
      url: "http://localhost:5173",
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
  ],
});
