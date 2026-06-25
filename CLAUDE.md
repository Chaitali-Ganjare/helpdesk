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
| Database     | PostgreSQL (Neon) + Prisma ORM + pgvector   |
| Auth         | Auth.js (`@auth/express`) + Prisma adapter (database sessions) |
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

## Express Conventions
- Routes are modular: create `src/routes/<resource>.ts` using `express.Router()`, mount in `src/index.ts` with `app.use('/api/<resource>', router)`
- Error handler is always the last middleware: `(err, req, res, next) => { ... }`

## Auth (Auth.js + Prisma Adapter)
Uses `@auth/express` with `PrismaAdapter` for database-backed sessions (no JWTs).

```typescript
import { ExpressAuth } from "@auth/express"
import { PrismaAdapter } from "@auth/prisma-adapter"

app.set("trust proxy", true)
app.use("/auth/*", ExpressAuth({ providers: [], adapter: PrismaAdapter(prisma) }))
```

- Sessions are stored in the `Session` table in Postgres
- `app.set("trust proxy", true)` is required for Auth.js on Express

## Prisma
```bash
# Apply schema changes and generate client
bunx prisma migrate dev --name <migration-name>
bunx prisma generate

# Open Prisma Studio
bunx prisma studio
```

- Schema lives at `apps/server/prisma/schema.prisma`
- Prisma client outputs to `src/generated/prisma`
- Auth.js requires these models: `User`, `Account`, `Session`, `VerificationToken`

## Environment Variables
Copy `.env.example` to `.env` in `apps/server/`. Required vars:

```
DATABASE_URL=          # Neon Postgres connection string
NEXTAUTH_SECRET=       # Random secret for Auth.js session signing
ANTHROPIC_API_KEY=     # Claude API key
POSTMARK_SERVER_TOKEN= # Postmark API token
POSTMARK_FROM_EMAIL=   # Verified sender address
PORT=3000
```

## MCP Servers
- **context7** — fetch up-to-date library docs. Use before working with any external library.
