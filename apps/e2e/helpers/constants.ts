import * as dotenv from "dotenv";
import * as path from "path";

// Same test env file global-setup.ts and playwright.config.ts load, so the
// seeded admin credentials here always match what global-setup actually
// created for this run.
dotenv.config({ path: path.resolve(__dirname, "../../server/.env.test") });

export const SEEDED_ADMIN = {
  email: process.env.SEED_EMAIL ?? "admin@test.local",
  password: process.env.SEED_PASSWORD ?? "Test1234!",
  name: process.env.SEED_NAME ?? "Test Admin",
};

// Basic Auth credentials the Express server checks inbound Postmark webhook
// requests against (see apps/server/src/middleware/postmarkAuth.ts).
export const POSTMARK_INBOUND_AUTH = {
  username: process.env.POSTMARK_INBOUND_USERNAME ?? "test-postmark-user",
  password: process.env.POSTMARK_INBOUND_PASSWORD ?? "test-postmark-password",
};

// Base URL of the Express API itself (port 3000) — distinct from
// playwright.config.ts's `baseURL`, which points at the Vite frontend
// (5173). `BETTER_AUTH_URL` already represents exactly this in .env.test,
// so reuse it rather than introducing a second, redundant env var.
export const API_BASE_URL = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
