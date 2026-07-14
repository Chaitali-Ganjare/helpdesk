// Canonical shape of GET /api/dashboard/stats's response. A read-only
// aggregate, not a request body validated by both sides, so this is a plain
// type (no zod schema) — same convention as ./tickets.ts's `Ticket`.
export interface DashboardStats {
  total: number;
  open: number;
  // Resolved/closed tickets with Ticket.assignedToAI set — see
  // apps/server/src/services/tickets.ts's assignTicket/getDashboardStats.
  aiResolved: number;
  // aiResolved as a percentage of `total`, or null when total is 0.
  aiResolvedPercent: number | null;
  // Average minutes between createdAt and updatedAt across resolved/closed
  // tickets, or null when there are none yet. An approximation — the schema
  // has no dedicated resolvedAt timestamp, so any later update (assignment,
  // category change) to an already-resolved ticket would shift this.
  avgResolutionMinutes: number | null;
  // Ticket counts per UTC calendar day for the last 30 days (oldest first),
  // zero-filled for days with no tickets. `date` is "YYYY-MM-DD".
  ticketsPerDay: { date: string; count: number }[];
}
