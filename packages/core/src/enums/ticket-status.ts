// Canonical source of truth for ticket status values. Ticket.status in
// apps/server/prisma/schema.prisma is a plain String column (not a DB-native
// enum) validated against this at the application layer — see
// ticketListQuerySchema in ./schemas/tickets.ts — so this is the only place
// the value list is defined.
export type TicketStatus = "OPEN" | "RESOLVED" | "CLOSED";

export const TicketStatus = {
  OPEN: "OPEN",
  RESOLVED: "RESOLVED",
  CLOSED: "CLOSED",
} as const satisfies Record<string, TicketStatus>;
