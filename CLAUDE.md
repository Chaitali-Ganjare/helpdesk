# Helpdesk — Project Memory

## Overview
AI-powered support ticket management system. Agents receive emails, which are auto-classified and responded to using a RAG knowledge base. See `project-scope.md` for full requirements and `implementation-plan.md` for the phased task breakdown.

## Tech Stack
See `tech-stack.md` for the full rationale. Summary:

| Layer        | Choice                                      |
|--------------|---------------------------------------------|
| Runtime      | Bun                                         |
| Frontend     | React 18 + Vite 5 + TypeScript              |
| Backend      | Express 5 + TypeScript                      |
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
├── packages/
│   └── core/             # @helpdesk/core — shared zod schemas (server + web)
│       └── src/schemas/
├── package.json         # Bun workspace root (workspaces: apps/*, packages/*)
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

## Frontend Forms
- Use `react-hook-form` + `zod` (via `@hookform/resolvers/zod`) for any form with client-side validation — don't hand-roll validation with `useState`/manual checks. Infer the form type with `z.infer<typeof schema>` (or import the inferred type from `@helpdesk/core` — see below), and wire it up with `useForm({ resolver: zodResolver(schema) })`. See `apps/web/src/pages/LoginPage.tsx` and `apps/web/src/components/CreateUserModal.tsx` for the reference pattern.
- Add `noValidate` to the `<form>` so native HTML5 constraint validation (e.g. `type="email"`) doesn't silently block submission before react-hook-form's `handleSubmit` runs — the zod schema is the single source of truth for validation errors.
- For a field that creates a **new** credential (e.g. a new user's password), set `autoComplete="new-password"` so Chrome doesn't try to autofill a saved password; use `autoComplete="off"` on the other fields in that form.

## Shared Schemas (`@helpdesk/core`)
- Any `zod` schema that validates the shape of data crossing the client↔server boundary (a request body the frontend submits and the backend also validates — e.g. "create user") must be defined **once**, in `packages/core/src/schemas/<resource>.ts`, and imported by both sides. Never redefine the same shape separately in a React component and an Express route/service — that's exactly the duplication that let the two sides' validation messages drift out of sync.
- Add a new export to `packages/core/package.json`'s `exports` map (e.g. `"./schemas/<resource>": "./src/schemas/<resource>.ts"`) — the package ships raw TypeScript with no build step, consumed directly by both Bun (server) and Vite (web) via `moduleResolution: "bundler"`.
- Export both the schema (`export const fooSchema = z.object({...})`) and its inferred type (`export type FooInput = z.infer<typeof fooSchema>`) from the same file.
- Server: import the schema into the resource's `src/services/<resource>.ts` (re-export it from there for routes to consume — see `apps/server/src/services/users.ts`). Client: import it directly into the form component and pass it to `zodResolver`.
- A schema that only matters to one side (e.g. the login form's client-only shape, since better-auth validates sign-in itself) can stay local — only lift it into `core` once both sides need the same shape.
- Any package depending on `@helpdesk/core` needs it declared as `"@helpdesk/core": "workspace:*"` in its `package.json`; run `bun install` from the repo root after adding a new workspace package so the symlink gets created.

## Express Conventions
- Routes are modular: create `src/routes/<resource>.ts` using `express.Router()`, mount in `src/index.ts` with `app.use('/api/<resource>', router)`
- Business logic (Prisma queries, hashing, etc.) lives in `src/services/<resource>.ts`, not inline in the route file. Routes stay thin: parse/validate the request, call into the service, translate the result into an HTTP response (status code + JSON). See `apps/server/src/services/users.ts` + `apps/server/src/routes/users.ts` for the reference split.
- Error handler is always the last middleware: `(err, req, res, next) => { ... }`
- No `try/catch` needed in async route handlers — Express 5 automatically catches rejected promises/thrown errors from `async` handlers and forwards them to the error-handling middleware. Just `await` and let it throw; don't wrap in `try { ... } catch (err) { next(err) }`. Wildcard route paths need Express 5's named-wildcard syntax (`*splat`, not a bare `*`) — see the `/api/auth/*splat` mount in `src/index.ts`.
- Validate request bodies with `zod` (`z.object({...}).safeParse(req.body)`) rather than hand-rolled `typeof`/regex checks — return `400` with `parsed.error.issues[0].message` on failure. If the frontend submits this same shape, the schema belongs in `@helpdesk/core` (see **Shared Schemas** above), re-exported from the service module; otherwise define it directly in the service module alongside the logic it validates input for.

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
- `disableSignUp: true` — disables public self-registration; new users are added via the seed script (first admin) or `POST /api/users` (admin-only, see `apps/server/src/routes/users.ts`)
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
- The `AGENT` default is declared once, in the schema's `role Role @default(AGENT)`. Routes that create a `User` without an explicit role (e.g. `POST /api/users`) should omit the `role` field and let Prisma apply that default, rather than passing `Role.AGENT` explicitly — keeps the default in one place. Routes that need a specific non-default role (like the seed script's `ADMIN`) should pass it explicitly using the generated `Role` enum from `../generated/prisma`, never a raw string.

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
