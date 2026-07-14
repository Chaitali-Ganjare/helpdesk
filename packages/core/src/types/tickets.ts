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
  // Mutually exclusive: a ticket is unassigned (both null/false), assigned to
  // a human (assignedTo set, assignedToAI false), or assigned to AI
  // (assignedTo null, assignedToAI true).
  assignedTo: { id: string; name: string } | null;
  assignedToAI: boolean;
  createdAt: string;
  updatedAt: string;
}
