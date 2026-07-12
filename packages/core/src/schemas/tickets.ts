import { z } from "zod";
import { TicketStatus } from "../enums/ticket-status";
import { TicketCategory } from "../enums/ticket-category";
import { TicketPriority } from "../enums/ticket-priority";

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
  status: z.enum(Object.values(TicketStatus) as [TicketStatus, ...TicketStatus[]]).optional(),
  category: z
    .enum(Object.values(TicketCategory) as [TicketCategory, ...TicketCategory[]])
    .optional(),
  priority: z
    .enum(Object.values(TicketPriority) as [TicketPriority, ...TicketPriority[]])
    .optional(),
  // Free-text search — matched against subject/fromEmail/fromName.
  search: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().positive().optional().default(1),
});
export type TicketListQuery = z.infer<typeof ticketListQuerySchema>;

// `assignedToId: null` unassigns the ticket.
export const assignTicketSchema = z.object({
  assignedToId: z.string().min(1).nullable(),
});
export type AssignTicketInput = z.infer<typeof assignTicketSchema>;
