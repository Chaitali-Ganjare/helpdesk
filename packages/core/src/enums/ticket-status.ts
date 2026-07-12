// Mirrors the `TicketStatus` enum in apps/server/prisma/schema.prisma. Keep
// both the type and the const object in sync with that schema if it ever
// changes — the union type is declared directly rather than derived from the
// const, so the two must be updated together.
export type TicketStatus = "OPEN" | "RESOLVED" | "CLOSED";

export const TicketStatus = {
  OPEN: "OPEN",
  RESOLVED: "RESOLVED",
  CLOSED: "CLOSED",
} as const satisfies Record<string, TicketStatus>;
