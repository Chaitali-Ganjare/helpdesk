// Mirrors the `TicketCategory` enum in apps/server/prisma/schema.prisma. Keep
// both the type and the const object in sync with that schema if it ever
// changes — the union type is declared directly rather than derived from the
// const, so the two must be updated together.
export type TicketCategory = "TECHNICAL" | "BILLING" | "ACCOUNT" | "GENERAL";

export const TicketCategory = {
  TECHNICAL: "TECHNICAL",
  BILLING: "BILLING",
  ACCOUNT: "ACCOUNT",
  GENERAL: "GENERAL",
} as const satisfies Record<string, TicketCategory>;
