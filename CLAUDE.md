# Helpdesk — Project Memory

## Overview
AI-powered support ticket management system. Agents receive emails, which are auto-classified and responded to using a RAG knowledge base. See `project-scope.md` for full requirements and `implementation-plan.md` for the phased task breakdown.

## Tech Stack
See `tech-stack.md` for the full rationale. Summary:

| Layer        | Choice                                      |
|--------------|---------------------------------------------|
| Runtime      | Bun                                         |
| Frontend     | React 18 + Vite 5 + TypeScript              |
| Backend      | Express 4 + TypeScript                      |
| Database     | MySQL + Prisma ORM                          |
| Auth         | better-auth + Prisma adapter (database sessions)               |
| AI           | Anthropic Claude API (`claude-sonnet-4-6`)  |
| Email        | Postmark (inbound webhook + outbound)       |
| Deploy       | Vercel + Neon                               |

## Monorepo Structure
```
helpdesk/
├── apps/
│   ├── server/          # Express API — runs on :3000
│   │   └── src/index.ts
│   └── web/             # React + Vite — runs on :5173
│       ├── vite.config.ts
│       └── src/
├── package.json         # Bun workspace root
├── tsconfig.json        # Shared base TS config
└── .env.example
```

## Commands

```bash
# Install all workspace dependencies
bun install

# Run both apps in parallel
bun --filter '*' dev

# Run individually
bun run --cwd apps/server dev    # Express with --watch
bun run --cwd apps/web dev       # Vite HMR

# Run a named workspace
bun run --filter @helpdesk/server dev
```

> Bun is installed at `/home/enjay/.bun/bin/bun` — not in PATH by default. Either `source ~/.bashrc` or use the full path.

## API & Proxy
- All Express routes are prefixed with `/api`
- Vite proxies `/api/*` → `http://localhost:3000` in dev — no hardcoded backend URLs in the frontend
- CORS is configured on the server for `http://localhost:5173` only

## Frontend Data Fetching
- Use `axios` for HTTP calls, not the native `fetch`
- Use `@tanstack/react-query` (`useQuery`/`useMutation`) for server state — don't hand-roll loading/error state with `useEffect` + `useState`

## Express Conventions
- Routes are modular: create `src/routes/<resource>.ts` using `express.Router()`, mount in `src/index.ts` with `app.use('/api/<resource>', router)`
- Error handler is always the last middleware: `(err, req, res, next) => { ... }`

## Auth (better-auth + Prisma Adapter)
Uses `better-auth` with `prismaAdapter` for database-backed sessions (no JWTs).

**Server** — `apps/server/src/lib/auth.ts`:
```typescript
import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  trustedOrigins: (process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? "").split(",").filter(Boolean),
  database: prismaAdapter(prisma, { provider: "mysql" }),
  emailAndPassword: { enabled: true, disableSignUp: true },
})
```

Mounted in `apps/server/src/index.ts`:
```typescript
import { toNodeHandler } from "better-auth/node"
app.set("trust proxy", true)
app.all("/api/auth/*", toNodeHandler(auth))   // must be before cors/json middleware
```

**Frontend** — `apps/web/src/lib/auth-client.ts`:
```typescript
import { createAuthClient } from "better-auth/react"
export const authClient = createAuthClient()
```

Use `authClient.signIn.email({ email, password })`, `authClient.signOut()`, and `authClient.useSession()` in React components.

Key details:
- Route prefix is `/api/auth/*` (not `/auth/*`) because all Express routes are under `/api`
- `disableSignUp: true` — new users must be added via the seed script, not self-registration
- Sessions are stored in the `Session` table; tokens are opaque strings (no JWTs)
- `app.set("trust proxy", true)` is required and must come before the auth handler
- The auth handler must be mounted **before** `cors()` and `express.json()` middleware

## Prisma
```bash
# Apply schema changes and generate client
bunx prisma migrate dev --name <migration-name>
bunx prisma generate

# Open Prisma Studio
bunx prisma studio
```

- Schema lives at `apps/server/prisma/schema.prisma`
- Prisma client outputs to `apps/server/src/generated/prisma`
- better-auth requires these models: `User`, `Account`, `Session`, `Verification`
- `User` has a custom `role` field (`ADMIN` | `AGENT`, default `AGENT`) — not part of better-auth's standard schema, added manually
- To add a new admin user, run: `bunx tsx apps/server/scripts/seed-user.ts` (uses `SEED_EMAIL`, `SEED_PASSWORD`, `SEED_NAME`, `SEED_ROLE` env vars)

## Environment Variables
Copy `.env.example` to `.env` in `apps/server/`. Required vars:

```
PORT=3000

DATABASE_URL=                  # MySQL connection string

BETTER_AUTH_SECRET=            # openssl rand -base64 32
BETTER_AUTH_URL=               # e.g. http://localhost:3000
BETTER_AUTH_TRUSTED_ORIGINS=   # comma-separated, e.g. http://localhost:5173

SEED_EMAIL=                    # used by scripts/seed-user.ts
SEED_PASSWORD=
SEED_NAME=Admin
SEED_ROLE=ADMIN

ANTHROPIC_API_KEY=
POSTMARK_SERVER_TOKEN=
POSTMARK_FROM_EMAIL=
```

## Testing (Playwright E2E)
E2E tests live in `apps/e2e` (config: `apps/e2e/playwright.config.ts`).

```bash
# Run from repo root
bun run test:e2e

# Or from apps/e2e
bun run test         # headless
bun run test:ui      # Playwright UI mode
bun run test:headed  # headed browser
bun run test:debug   # debug mode
```

- `testDir` is `apps/e2e/tests`; tests run sequentially (`fullyParallel: false`, `workers: 1`) since they share one MySQL database — no parallel writes.
- `baseURL` is `http://localhost:5173`; the `webServer` config auto-starts both the Express test server (`bun run start:test` in `apps/server`, using `apps/server/.env.test`) and the Vite dev server — tests never start servers themselves.
- `globalSetup` (`apps/e2e/global-setup.ts`) runs `prisma migrate reset --force --skip-seed` then `bun run seed:user` to create the seeded admin before each run. `globalTeardown` is a no-op — cleanup happens at the *start* of the next run, not the end, so tests must not depend on leftover state from a previous file.

Use the **e2e-test-writer** subagent to write, extend, or fix Playwright tests — after implementing/changing a user-facing flow (login, ticket views, agent/admin actions, role-gated pages), or whenever asked to add/update/debug an e2e test. It knows this project's Playwright conventions (locator strategy, avoiding flaky waits, shared-database test isolation); don't hand-write e2e specs directly when it applies.

## Testing (Component/Unit — Vitest)
Component tests live alongside source in `apps/web/src` (e.g. `UsersPage.test.tsx` next to `UsersPage.tsx`), run with Vitest + React Testing Library.

### Running

```bash
# From apps/web
bun run test         # vitest run (single pass)
bun run test:watch   # vitest watch mode — rerun on save while writing tests
bun run test:ui      # vitest UI mode — visual browser-based test runner
```

- Config: `apps/web/vitest.config.ts` (`environment: "jsdom"`, setup file at `apps/web/src/test/setup.ts` which loads `@testing-library/jest-dom`).
- Scripts are pinned to `bun --bun vitest ...` — plain `vitest`/`bunx vitest` fails on this machine's Node 18 (Vitest 4's `rolldown` dependency needs `node:util`'s `styleText`, added in Node 22). Always run Vitest through Bun's own runtime here, not the system Node.

### Writing

- File naming: `<Component>.test.tsx` colocated next to the component it tests (not a separate `__tests__` folder).
- Prefer accessible RTL queries (`getByRole`, `getByLabelText`, `getByText`) over test IDs, same as the Playwright convention. Use `findBy*`/`waitFor` for anything that resolves after an async fetch — don't wrap assertions in manual `setTimeout`/`act` hacks.
- Use `renderWithQuery` from `apps/web/src/test/render-with-query.tsx` instead of RTL's `render` for any component that reads from `@tanstack/react-query` — it wraps the component in a fresh `QueryClientProvider` (`retry: false`) per test.
- The app's `QueryClientProvider` lives in `apps/web/src/App.tsx`; components using `<Link>`/`useNavigate` etc. still need a `MemoryRouter` wrapped around them in the test itself (`renderWithQuery` doesn't provide routing context).
- Mock `../lib/auth-client`'s `authClient.useSession()` in tests for any component that renders `NavBar`, rather than letting the real better-auth client attempt a network call.
- Mock `axios` (`vi.mock("axios")` + `vi.mocked(axios.get).mockResolvedValue(...)`/`mockRejectedValue(...)`) instead of hitting the real API — component tests should never require the Express/MySQL dev stack to be running. See `apps/web/src/pages/UsersPage.test.tsx` for the reference pattern (success + error-state cases).

## MCP Servers
- **context7** — fetch up-to-date library docs. Use before working with any external library.
