import type { TicketStatus } from "../enums/ticket-status";
import type { TicketCategory } from "../enums/ticket-category";
import type { TicketPriority } from "../enums/ticket-priority";

// Canonical shape of a ticket as returned by the API. Single source of
// truth so list/detail views can't drift out of sync the way
// hand-duplicated inline types would.
export interface Ticket {
  id: string;
  subject: string;
  body: string;
  fromEmail: string;
  fromName: string | null;
  status: TicketStatus;
  category: TicketCategory | null;
  priority: TicketPriority | null;
  assignedTo: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}
