import { z } from "zod";
import { prisma } from "../lib/prisma";

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

export function findTicketByMessageId(messageId: string) {
  return prisma.ticket.findUnique({ where: { messageId } });
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
