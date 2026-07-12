// Canonical source of truth for ticket category values. Ticket.category in
// apps/server/prisma/schema.prisma is a plain String column (not a DB-native
// enum) validated against this at the application layer — see
// ticketListQuerySchema in ./schemas/tickets.ts — so this is the only place
// the value list is defined.
export type TicketCategory = "TECHNICAL" | "BILLING" | "ACCOUNT" | "GENERAL";

export const TicketCategory = {
  TECHNICAL: "TECHNICAL",
  BILLING: "BILLING",
  ACCOUNT: "ACCOUNT",
  GENERAL: "GENERAL",
} as const satisfies Record<string, TicketCategory>;
