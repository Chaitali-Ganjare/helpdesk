// Mirrors the `TicketPriority` enum in apps/server/prisma/schema.prisma. Keep
// both the type and the const object in sync with that schema if it ever
// changes — the union type is declared directly rather than derived from the
// const, so the two must be updated together.
export type TicketPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export const TicketPriority = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  URGENT: "URGENT",
} as const satisfies Record<string, TicketPriority>;
