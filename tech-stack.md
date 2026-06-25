# Tech Stack

## Frontend + Backend
**Next.js 14+ (App Router)**
Full-stack framework handling both UI and API routes in one repo.

## UI
**Tailwind CSS + shadcn/ui**
Fast to build data-heavy UIs (tables, filters, modals). shadcn/ui components are easy to customize.

## Database
**PostgreSQL + Prisma ORM**
Relational data for tickets, users, sessions, and status tracking. Use **pgvector** extension for knowledge base embeddings (avoids a separate vector DB).

## AI
**Anthropic Claude API (`claude-sonnet-4-6`)**
Ticket classification, summarization, suggested replies, and auto-response generation. Knowledge base retrieval (RAG) feeds context into prompts.

## Email
**Postmark**
Inbound webhook when a support email arrives (creates a ticket) and outbound for sending AI-generated replies.

## Auth
**NextAuth.js (Auth.js) — database sessions**
Session-based auth with the Prisma adapter. Sessions are stored in the database (not JWTs), giving full control over session revocation and auditing. Supports admin vs. agent roles.

## Deployment
**Vercel + Neon** (managed serverless Postgres)
Zero-config deployment for Next.js. Neon serverless Postgres works well with Vercel's serverless functions.

---

## Summary

| Layer        | Choice                          |
|--------------|---------------------------------|
| Frontend     | Next.js + Tailwind + shadcn/ui  |
| Backend      | Next.js API routes              |
| Database     | PostgreSQL (Neon) + Prisma      |
| Vector store | pgvector (same DB)              |
| AI           | Claude API (Anthropic)          |
| Email        | Postmark                        |
| Auth         | NextAuth.js + Prisma adapter (database sessions) |
| Deploy       | Vercel                          |
