// Canonical source of truth for ticket priority values. Ticket.priority in
// apps/server/prisma/schema.prisma is a plain String column (not a DB-native
// enum) validated against this at the application layer — see
// ticketListQuerySchema in ./schemas/tickets.ts — so this is the only place
// the value list is defined.
export type TicketPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export const TicketPriority = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  URGENT: "URGENT",
} as const satisfies Record<string, TicketPriority>;
