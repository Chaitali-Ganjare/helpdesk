import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { TicketStatus } from "@helpdesk/core/enums/ticket-status";
import { TicketCategory } from "@helpdesk/core/enums/ticket-category";
import { TicketPriority } from "@helpdesk/core/enums/ticket-priority";
import type { DashboardStats } from "@helpdesk/core/types/dashboard";
import {
  ticketListQuerySchema,
  assignTicketSchema,
  updateTicketStatusSchema,
  updateTicketCategorySchema,
  createReplySchema,
  AI_ASSIGNEE,
  type TicketListQuery,
  type AssignTicketInput,
  type UpdateTicketStatusInput,
  type UpdateTicketCategoryInput,
  type CreateReplyInput,
} from "@helpdesk/core/schemas/tickets";
import { prisma } from "../lib/prisma";
import { anthropic } from "../lib/anthropic";
import { getPostmarkClient } from "../lib/postmark";

export {
  ticketListQuerySchema,
  assignTicketSchema,
  updateTicketStatusSchema,
  updateTicketCategorySchema,
  createReplySchema,
  AI_ASSIGNEE,
};
export type {
  TicketListQuery,
  AssignTicketInput,
  UpdateTicketStatusInput,
  UpdateTicketCategoryInput,
  CreateReplyInput,
};

// Mirrors the fields we consume from Postmark's inbound webhook payload —
// https://postmarkapp.com/developer/webhooks/inbound-webhook
// Postmark sends many more fields (Attachments, Headers, Cc, Bcc, ToFull,
// etc.); zod silently ignores anything not declared here since this schema
// isn't `.strict()`. This schema is server-only (validates a third-party
// webhook payload, never submitted by the frontend), so it stays local
// instead of living in `@helpdesk/core`.
export const postmarkInboundSchema = z
  .object({
    Subject: z.string().min(1, "Subject is required"),
    MessageID: z.string().min(1, "MessageID is required"),
    TextBody: z.string().optional(),
    HtmlBody: z.string().optional(),
    FromFull: z.object({
      Email: z.string().email("FromFull.Email must be a valid email"),
      Name: z.string().optional(),
    }),
  })
  .refine(
    (data) => (data.TextBody?.trim() ?? "") !== "" || (data.HtmlBody?.trim() ?? "") !== "",
    { message: "Either TextBody or HtmlBody must be present" }
  );

export type PostmarkInboundPayload = z.infer<typeof postmarkInboundSchema>;

const ticketListFields = {
  id: true,
  subject: true,
  fromEmail: true,
  fromName: true,
  status: true,
  category: true,
  priority: true,
  createdAt: true,
} as const;

const TICKET_PAGE_SIZE = 20;

function buildTicketWhere({ status, category, priority, search }: TicketListQuery) {
  return {
    status,
    category,
    priority,
    OR: search
      ? [
          { subject: { contains: search } },
          { fromEmail: { contains: search } },
          { fromName: { contains: search } },
        ]
      : undefined,
  };
}

export async function listTickets(query: TicketListQuery) {
  const { sort, order, page } = query;
  const where = buildTicketWhere(query);

  const [tickets, total] = await Promise.all([
    prisma.ticket.findMany({
      select: ticketListFields,
      where,
      // MySQL sorts NULLs first in ascending order for nullable columns
      // (category, priority) — Prisma's `nulls` option isn't available on
      // the MySQL connector, so this is inherent, not a bug.
      orderBy: { [sort]: order },
      skip: (page - 1) * TICKET_PAGE_SIZE,
      take: TICKET_PAGE_SIZE,
    }),
    prisma.ticket.count({ where }),
  ]);

  return {
    tickets,
    pagination: {
      page,
      pageSize: TICKET_PAGE_SIZE,
      total,
      totalPages: Math.max(1, Math.ceil(total / TICKET_PAGE_SIZE)),
    },
  };
}

export function findTicketByMessageId(messageId: string) {
  return prisma.ticket.findUnique({ where: { messageId } });
}

const assignedToField = {
  assignedTo: { select: { id: true, name: true } },
  assignedToAI: true,
} as const;

export function getTicketById(id: string) {
  return prisma.ticket.findUnique({
    where: { id },
    select: { ...ticketListFields, ...assignedToField, body: true, updatedAt: true },
  });
}

// `assignedTo` is the parsed AssignTicketInput value: null unassigns,
// AI_ASSIGNEE assigns to AI (clears assignedToId), any other string is a
// User id (clears assignedToAI) — the two are mutually exclusive on Ticket.
export function assignTicket(id: string, assignedTo: string | null) {
  return prisma.ticket.update({
    where: { id },
    data:
      assignedTo === AI_ASSIGNEE
        ? { assignedToId: null, assignedToAI: true }
        : { assignedToId: assignedTo, assignedToAI: false },
    select: { ...ticketListFields, ...assignedToField, body: true, updatedAt: true },
  });
}

export function updateTicketStatus(id: string, status: TicketStatus) {
  return prisma.ticket.update({
    where: { id },
    data: { status },
    select: { ...ticketListFields, ...assignedToField, body: true, updatedAt: true },
  });
}

export function updateTicketCategory(id: string, category: TicketCategory) {
  return prisma.ticket.update({
    where: { id },
    data: { category },
    select: { ...ticketListFields, ...assignedToField, body: true, updatedAt: true },
  });
}

const replyFields = {
  id: true,
  body: true,
  senderType: true,
  createdAt: true,
  author: { select: { id: true, name: true } },
} as const;

export function listReplies(ticketId: string) {
  return prisma.reply.findMany({
    where: { ticketId },
    select: replyFields,
    orderBy: { createdAt: "asc" },
  });
}

// Threads the outbound email onto the original inbound message via
// In-Reply-To/References so it lands in the customer's existing thread
// instead of starting a new one — mirrors ticket.messageId, which is only
// ever populated by the inbound webhook (see createTicketFromEmail).
async function sendReplyEmail(
  ticket: { subject: string; fromEmail: string; messageId: string | null },
  body: string
) {
  const subject = ticket.subject.trim().toLowerCase().startsWith("re:")
    ? ticket.subject
    : `Re: ${ticket.subject}`;

  await getPostmarkClient().sendEmail({
    From: process.env.POSTMARK_FROM_EMAIL!,
    To: ticket.fromEmail,
    Subject: subject,
    TextBody: body,
    MessageStream: "outbound",
    Headers: ticket.messageId
      ? [
          { Name: "In-Reply-To", Value: ticket.messageId },
          { Name: "References", Value: ticket.messageId },
        ]
      : undefined,
  });
}

// Stores the reply and marks the ticket RESOLVED, on the assumption a reply
// means the agent has addressed it, then emails it to the customer via
// Postmark's Send API. The DB write and the send are not atomic with each
// other — if sendReplyEmail throws, the reply row is already committed (it
// stays visible on the ticket as the agent's response) but the error still
// propagates to the route, so the agent sees the failure and knows delivery
// didn't happen. A retry from the UI will create a second Reply row; add an
// idempotency/delivery-status field if that becomes a real problem.
export async function createReply(ticketId: string, authorId: string, body: string) {
  const [reply, ticket] = await prisma.$transaction([
    prisma.reply.create({ data: { ticketId, authorId, body }, select: replyFields }),
    prisma.ticket.update({
      where: { id: ticketId },
      data: { status: TicketStatus.RESOLVED },
      select: { subject: true, fromEmail: true, messageId: true },
    }),
  ]);

  await sendReplyEmail(ticket, body);

  return reply;
}

export function createTicketFromEmail(payload: PostmarkInboundPayload) {
  const body = payload.TextBody?.trim() ? payload.TextBody : (payload.HtmlBody ?? "");

  return prisma.ticket.create({
    data: {
      subject: payload.Subject,
      body,
      fromEmail: payload.FromFull.Email,
      fromName: payload.FromFull.Name || null,
      messageId: payload.MessageID,
    },
  });
}

const resolvedOrClosedWhere = {
  status: { in: [TicketStatus.RESOLVED, TicketStatus.CLOSED] as TicketStatus[] },
};

const TICKETS_PER_DAY_WINDOW = 30;

// Bucketed in JS rather than a raw SQL date-trunc query — ticket volume here
// doesn't warrant it, and this keeps the query portable/testable. Buckets are
// UTC calendar days; zero-count days are filled in so the chart always shows
// a full 30-day run, oldest first.
function ticketsPerDay(createdAts: Date[]): { date: string; count: number }[] {
  const days: { date: string; count: number }[] = [];
  const counts = new Map<string, number>();
  for (const createdAt of createdAts) {
    const key = createdAt.toISOString().slice(0, 10);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const today = new Date();
  for (let i = TICKETS_PER_DAY_WINDOW - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push({ date: key, count: counts.get(key) ?? 0 });
  }
  return days;
}

// "Resolved by AI" = assigned to AI (Ticket.assignedToAI, see assignTicket)
// and resolved or closed. There's no AI auto-reply feature in this codebase
// yet (see implementation-plan.md Phase 6) — assignedToAI today only
// reflects an agent/admin manually marking "AI handled this", not an
// autonomous resolution — but it's a deliberate signal rather than an
// inferred proxy, unlike counting replies would be.
export async function getDashboardStats(): Promise<DashboardStats> {
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - (TICKETS_PER_DAY_WINDOW - 1));
  since.setUTCHours(0, 0, 0, 0);

  const [total, open, aiResolved, resolvedTimes, recentTickets] = await Promise.all([
    prisma.ticket.count(),
    prisma.ticket.count({ where: { status: TicketStatus.OPEN } }),
    prisma.ticket.count({ where: { ...resolvedOrClosedWhere, assignedToAI: true } }),
    prisma.ticket.findMany({
      where: resolvedOrClosedWhere,
      select: { createdAt: true, updatedAt: true },
    }),
    prisma.ticket.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true },
    }),
  ]);

  const avgResolutionMinutes =
    resolvedTimes.length > 0
      ? resolvedTimes.reduce(
          (sum, t) => sum + (t.updatedAt.getTime() - t.createdAt.getTime()),
          0
        ) /
        resolvedTimes.length /
        60_000
      : null;

  return {
    total,
    open,
    aiResolved,
    aiResolvedPercent: total > 0 ? (aiResolved / total) * 100 : null,
    avgResolutionMinutes,
    ticketsPerDay: ticketsPerDay(recentTickets.map((t) => t.createdAt)),
  };
}

const classificationSchema = z.object({
  category: z.enum(Object.values(TicketCategory) as [TicketCategory, ...TicketCategory[]]),
  priority: z.enum(Object.values(TicketPriority) as [TicketPriority, ...TicketPriority[]]),
});

// Classifies a ticket's category + priority via Claude, then writes the
// result. Called fire-and-forget from the webhook route (after it has
// already responded to Postmark) — never awaited on the request path, so a
// slow or failed classification never delays or breaks ticket creation.
// `category`/`priority` simply stay null if this doesn't complete.
export async function classifyTicket(ticketId: string, subject: string, body: string) {
  const response = await anthropic.messages.parse({
    model: "claude-opus-4-8",
    max_tokens: 256,
    output_config: {
      effort: "low",
      format: zodOutputFormat(classificationSchema),
    },
    messages: [
      {
        role: "user",
        content: `Classify this support ticket into a category and priority.\n\nSubject: ${subject}\n\nBody:\n${body}`,
      },
    ],
  });

  const result = response.parsed_output;
  if (!result) return;

  await prisma.ticket.update({
    where: { id: ticketId },
    data: { category: result.category, priority: result.priority },
  });
}
