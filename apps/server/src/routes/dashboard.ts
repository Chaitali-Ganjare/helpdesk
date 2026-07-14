import { Router, type Request, type Response } from "express";
import { requireAuth } from "../middleware/auth";
import { getDashboardStats } from "../services/tickets";

const router = Router();

router.get("/stats", requireAuth, async (_req: Request, res: Response) => {
  const stats = await getDashboardStats();
  res.json(stats);
});

export default router;
