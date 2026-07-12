import { Router, type Request, type Response } from "express";
import { requireAuth } from "../middleware/auth";
import {
  listTickets,
  getTicketById,
  assignTicket,
  ticketListQuerySchema,
  assignTicketSchema,
} from "../services/tickets";
import { getUserById } from "../services/users";
import { parseQuery, parseBody } from "../lib/validate";

const router = Router();

router.get("/", requireAuth, async (req: Request, res: Response) => {
  const query = parseQuery(ticketListQuerySchema, req.query, res);
  if (!query) return;

  const result = await listTickets(query);
  res.json(result);
});

router.get("/:id", requireAuth, async (req: Request<{ id: string }>, res: Response) => {
  const ticket = await getTicketById(req.params.id);
  if (!ticket) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }
  res.json(ticket);
});

router.patch(
  "/:id/assign",
  requireAuth,
  async (req: Request<{ id: string }>, res: Response) => {
    const data = parseBody(assignTicketSchema, req.body, res);
    if (!data) return;

    const ticket = await getTicketById(req.params.id);
    if (!ticket) {
      res.status(404).json({ error: "Ticket not found" });
      return;
    }

    if (data.assignedToId) {
      const assignee = await getUserById(data.assignedToId);
      if (!assignee) {
        res.status(404).json({ error: "Assignee not found" });
        return;
      }
    }

    const updated = await assignTicket(req.params.id, data.assignedToId);
    res.json(updated);
  }
);

export default router;
