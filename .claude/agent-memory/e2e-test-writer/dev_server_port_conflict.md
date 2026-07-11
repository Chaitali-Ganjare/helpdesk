---
name: dev-server-port-conflict
description: apps/e2e's webServer config always starts its own server on :3000 (reuseExistingServer false) — conflicts if the user's dev server is already running there
metadata:
  type: project
---

`apps/e2e/playwright.config.ts`'s `webServer` array sets `reuseExistingServer: false` for the Express API (port 3000) specifically — unlike the Vite frontend (port 5173) which reuses an existing dev server locally. This is intentional: it guarantees the e2e run always talks to a server booted with `.env.test`, never an already-running dev server pointed at the dev DB.

**Why:** if it silently reused an already-running :3000 dev server, tests would run against the dev database instead of the disposable test one — exactly the kind of silent-wrong-env bug the explicit `false` is guarding against.

**How to apply:** if `bun run test:e2e` fails immediately with `Error: http://localhost:3000/api/health is already used`, check for a running dev server first (`lsof -i :3000`). If it's the user's own `bun run dev` / `dev:server` process, stop it (`kill <pid>` on the `bun run --cwd apps/server dev` process tree), run the e2e suite, then restart it afterward (`bun run dev:server` from repo root, backgrounded) to restore their environment — don't leave their dev server down. Port 5173 (Vite) does not need this treatment since the config already reuses it.
