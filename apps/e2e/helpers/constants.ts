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
