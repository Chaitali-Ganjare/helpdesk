import { Router, type Request, type Response } from "express";
import { requirePostmarkAuth } from "../middleware/postmarkAuth";
import { parseBody } from "../lib/validate";
import {
  postmarkInboundSchema,
  findTicketByMessageId,
  createTicketFromEmail,
} from "../services/tickets";

const router = Router();

router.post("/email", requirePostmarkAuth, async (req: Request, res: Response) => {
  const data = parseBody(postmarkInboundSchema, req.body, res);
  if (!data) return;

  const existing = await findTicketByMessageId(data.MessageID);
  if (existing) {
    res.status(200).json({ status: "duplicate", ticketId: existing.id });
    return;
  }

  const ticket = await createTicketFromEmail(data);
  res.status(201).json({ status: "created", ticketId: ticket.id });
});

export default router;
