---
name: project-auth-security-posture
description: Auth/authz security posture of the helpdesk monorepo — what is hardened, what is missing, and where the next risks will land as routes are added
metadata:
  type: project
---

Reviewed as of 2026-06-29 (commit 9ecce5f "implement role base auth"). Re-verified same date — findings unchanged; no routes directory exists yet, so the missing-middleware risk is pre-emptive.

## What is hardened
- better-auth cookies: `httpOnly: true`, `sameSite: "lax"`, `secure` based on HTTPS detection — safe by default
- `disableSignUp: true` — no self-registration attack surface
- `role.input: false` in additionalFields — clients cannot elevate their own role during auth
- Database-backed opaque session tokens (no JWT vulnerabilities)
- Auth handler mounted BEFORE cors/json middleware — correct ordering
- Seed script uses `better-auth/crypto hashPassword` — consistent with sign-in verification
- Prisma health-check uses template-literal `$queryRaw` — parameterized, safe

## What is missing (open risks)
- **No backend route protection middleware exists** — `apps/server/src/index.ts` has no `requireAuth` or `requireAdmin` Express middleware. Every API route added is effectively public. The frontend AdminRoute is client-side only. When `/api/users/*` or other admin routes are wired up, any AGENT-role user can call them directly.
- **CORS hardcoded to `http://localhost:5173`** — `cors({ origin: "http://localhost:5173" })` in `index.ts`. No production domain. Also missing `credentials: true`, so cross-origin cookie sessions will be blocked by browsers in production. (Dev works because Vite proxy makes requests same-origin.)
- **No rate limiting on auth endpoints** — `/api/auth/*` has unlimited sign-in attempts.
- **No Express error handler** — no `(err, req, res, next)` catch-all; async errors may expose stack traces.
- **No security headers** — no Helmet.js; missing CSP, X-Frame-Options, HSTS, etc.
- **`trust proxy: true`** is set (all proxies trusted); `1` is more precise for Vercel.

## Pattern for auth middleware (not yet implemented)
```typescript
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "./lib/auth";

export async function requireAuth(req, res, next) {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
  if (!session) return res.status(401).json({ error: "Unauthorized" });
  req.session = session;
  next();
}

export async function requireAdmin(req, res, next) {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
  if (!session) return res.status(401).json({ error: "Unauthorized" });
  if (session.user.role !== "ADMIN") return res.status(403).json({ error: "Forbidden" });
  req.session = session;
  next();
}
```

**Why:** The above pattern is the idiomatic way to read better-auth sessions inside Express route handlers. `fromNodeHeaders` converts Node.js `IncomingHttpHeaders` to the `Headers` type better-auth expects.

**How to apply:** Every new route family in `apps/server/src/routes/` should use one of these guards. Admin-only routes (users, config) must use `requireAdmin`. Agent routes (tickets) must use `requireAuth`.
