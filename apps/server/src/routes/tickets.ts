import { Router, type Request, type Response } from "express";
import { requireAuth } from "../middleware/auth";
import { listTickets, ticketListQuerySchema } from "../services/tickets";
import { parseQuery } from "../lib/validate";

const router = Router();

router.get("/", requireAuth, async (req: Request, res: Response) => {
  const query = parseQuery(ticketListQuerySchema, req.query, res);
  if (!query) return;

  const tickets = await listTickets(query);
  res.json({ tickets });
});

export default router;
