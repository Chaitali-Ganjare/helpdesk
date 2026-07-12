import { z } from "zod";

// Sortable columns for GET /api/tickets — must stay a subset of
// ticketListFields in apps/server/src/services/tickets.ts.
// fromName is intentionally excluded (nullable); "Sender" sorts by
// fromEmail instead, which is never null.
export const ticketSortFieldSchema = z.enum([
  "subject",
  "status",
  "category",
  "priority",
  "fromEmail",
  "createdAt",
]);
export type TicketSortField = z.infer<typeof ticketSortFieldSchema>;

export const ticketSortOrderSchema = z.enum(["asc", "desc"]);
export type TicketSortOrder = z.infer<typeof ticketSortOrderSchema>;

export const ticketListQuerySchema = z.object({
  sort: ticketSortFieldSchema.optional().default("createdAt"),
  order: ticketSortOrderSchema.optional().default("desc"),
});
export type TicketListQuery = z.infer<typeof ticketListQuerySchema>;
