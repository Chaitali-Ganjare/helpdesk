import { Router, type Request, type Response } from "express";
import { requireAuth } from "../middleware/auth";
import { listTickets } from "../services/tickets";

const router = Router();

router.get("/", requireAuth, async (_req: Request, res: Response) => {
  const tickets = await listTickets();
  res.json({ tickets });
});

export default router;
