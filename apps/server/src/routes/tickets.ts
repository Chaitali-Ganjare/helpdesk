import { Router, type Request, type Response } from "express";
import { requireAuth } from "../middleware/auth";
import { listTickets, getTicketById, ticketListQuerySchema } from "../services/tickets";
import { parseQuery } from "../lib/validate";

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

export default router;
