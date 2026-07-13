// Canonical source of truth for reply sender-type values. Reply.senderType in
// apps/server/prisma/schema.prisma is a plain String column (not a DB-native
// enum) validated against this at the application layer — same pattern as
// ticket-status.ts — so this is the only place the value list is defined.
export type ReplySenderType = "AGENT" | "CUSTOMER";

export const ReplySenderType = {
  AGENT: "AGENT",
  CUSTOMER: "CUSTOMER",
} as const satisfies Record<string, ReplySenderType>;
