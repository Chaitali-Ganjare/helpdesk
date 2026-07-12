---
name: api-only-endpoint-testing-pattern
description: How to test server-to-server API endpoints (webhooks, etc.) that live on the Express API port, not the Vite baseURL, using Playwright's request fixture
metadata:
  type: project
---

Not every route belongs under the Playwright `baseURL` (`http://localhost:5173`, the Vite frontend). Server-to-server endpoints — e.g. `POST /api/webhooks/email` (Postmark inbound webhook, added 2026-07-12) — are hit directly on the Express API at `http://localhost:3000`, with no browser page involved at all.

**Pattern used** (see `apps/e2e/tests/webhooks-email.spec.ts`):
- Use Playwright's `request` fixture (`async ({ request }) => {...}`), not `page`.
- Build the **full absolute URL** (`http://localhost:3000/api/webhooks/email`) rather than a relative path — a relative path would resolve against `baseURL` (port 5173) and hit the wrong server (Vite, not Express).
- For HTTP Basic Auth, manually build the header rather than using Playwright's `httpCredentials` (that option is for browser contexts, not the `request` fixture): `"Basic " + Buffer.from(\`${user}:${pass}\`).toString("base64")` passed via `headers: { Authorization: ... }`.
- Credentials/expected env values still go through a `helpers/constants.ts` export (dotenv-loaded from `apps/server/.env.test`, same pattern as `SEEDED_ADMIN`) rather than being hardcoded literals in the spec — see `POSTMARK_INBOUND_AUTH`.
- Uniqueness key for dedup testing (here, `MessageID`) generated per-test the same way `uniqueUser`/`createAgentUser` do it elsewhere: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`.

**Why:** keeps API-only specs consistent with the browser specs' isolation/db conventions even though there's no UI to drive, and avoids a subtle bug class (relative URL silently hitting the wrong port).

**How to apply:** when asked to test a new webhook or other non-UI Express route, default to this pattern (request fixture + absolute URL + manual header construction) rather than trying to route it through `page.goto`/browser automation, and check whether `helpers/constants.ts` already exports the auth values needed before hardcoding them.
