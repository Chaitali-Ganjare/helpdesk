import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { TicketCategory } from "@helpdesk/core/enums/ticket-category";
import { TicketPriority } from "@helpdesk/core/enums/ticket-priority";
import { ticketListQuerySchema, type TicketListQuery } from "@helpdesk/core/schemas/tickets";
import { prisma } from "../lib/prisma";
import { anthropic } from "../lib/anthropic";

export { ticketListQuerySchema };
export type { TicketListQuery };

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

export function getTicketById(id: string) {
  return prisma.ticket.findUnique({
    where: { id },
    select: { ...ticketListFields, body: true, updatedAt: true },
  });
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
