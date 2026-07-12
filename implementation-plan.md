# Implementation Plan

## Phase 1 — Project Setup

- [ ] Initialize Next.js 14 project with TypeScript and App Router
- [ ] Set up Neon Postgres database and connect with Prisma
- [ ] Define full database schema (users, sessions, tickets, messages, knowledge base chunks)
- [ ] Enable pgvector extension on Postgres
- [x] Set up environment variable structure (`.env.example`)

## Phase 2 — Authentication

- [x] Install and configure NextAuth.js with the Prisma adapter (database sessions)
- [x] Build login page (`/login`)
- [x] Add route middleware to protect all dashboard routes
- [x] Implement role-based access control (admin vs. agent)
- [x] Write database seed script to create the initial admin account

## Phase 3 — User Management (Admin)

- [x] Build user list page (`/admin/users`)
- [x] Add create-agent form (admin only)
- [x] Add deactivate/delete agent action

## Phase 4 — Email Ingestion

- [ ] Configure Postmark inbound email webhook
- [x] Build POST `/api/webhooks/email` endpoint to receive inbound emails
- [x] Parse email payload and create a ticket + initial message in the database
- [x] Handle duplicate detection (same Message-ID)

## Phase 5 — Ticket Dashboard

- [ ] Build ticket list page (`/tickets`) with columns: subject, status, sender, date
- [ ] Add filtering by status (Open / Resolved / Closed)
- [ ] Add sorting by date and status
- [ ] Build ticket detail page (`/tickets/[id]`) showing full message thread
- [ ] Add manual status update actions (resolve, close, reopen)
- [ ] Add ticket assignment to agent

## Phase 6 — AI Features

- [ ] Integrate Anthropic Claude API client
- [ ] Auto-classify ticket on creation (category + priority) using Claude
- [ ] Generate AI summary on ticket detail page
- [ ] Build knowledge base ingestion script (chunk docs → embed → store in pgvector)
- [ ] Build RAG retrieval helper (embed query → similarity search → fetch chunks)
- [ ] Generate AI-suggested reply using RAG context on ticket detail page
- [ ] Auto-generate and send initial response for low-complexity tickets

## Phase 7 — Email Sending

- [ ] Configure Postmark outbound email client
- [ ] Build POST `/api/tickets/[id]/reply` endpoint
- [ ] Send agent or AI reply via Postmark, preserving email thread (In-Reply-To header)
- [ ] Save sent message to ticket thread in the database

## Phase 8 — Dashboard & Overview

- [ ] Build main dashboard page (`/`) with ticket counts by status
- [ ] Add recent tickets feed
- [ ] Add basic stats: tickets opened today, avg. response time

## Phase 9 — Deployment

- [ ] Configure Vercel project and link Neon database
- [ ] Set all production environment variables in Vercel
- [ ] Run seed script to create admin account in production
- [ ] Configure Postmark inbound webhook URL to point to production
- [ ] Smoke test end-to-end: inbound email → ticket created → AI reply → outbound email
