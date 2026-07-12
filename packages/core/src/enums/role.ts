// Mirrors the `Role` enum in apps/server/prisma/schema.prisma. Keep the
// values in sync with that schema if it ever changes.
export const Role = {
  ADMIN: "ADMIN",
  AGENT: "AGENT",
} as const;

export type Role = (typeof Role)[keyof typeof Role];
