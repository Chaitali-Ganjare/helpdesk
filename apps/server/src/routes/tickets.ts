import { Router, type Request, type Response } from "express";
import { requireAuth } from "../middleware/auth";
import {
  listTickets,
  getTicketById,
  assignTicket,
  updateTicketStatus,
  updateTicketCategory,
  listReplies,
  createReply,
  ticketListQuerySchema,
  assignTicketSchema,
  updateTicketStatusSchema,
  updateTicketCategorySchema,
  createReplySchema,
  AI_ASSIGNEE,
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

    if (data.assignedTo && data.assignedTo !== AI_ASSIGNEE) {
      const assignee = await getUserById(data.assignedTo);
      if (!assignee) {
        res.status(404).json({ error: "Assignee not found" });
        return;
      }
    }

    const updated = await assignTicket(req.params.id, data.assignedTo);
    res.json(updated);
  }
);

router.patch(
  "/:id/status",
  requireAuth,
  async (req: Request<{ id: string }>, res: Response) => {
    const data = parseBody(updateTicketStatusSchema, req.body, res);
    if (!data) return;

    const ticket = await getTicketById(req.params.id);
    if (!ticket) {
      res.status(404).json({ error: "Ticket not found" });
      return;
    }

    const updated = await updateTicketStatus(req.params.id, data.status);
    res.json(updated);
  }
);

router.patch(
  "/:id/category",
  requireAuth,
  async (req: Request<{ id: string }>, res: Response) => {
    const data = parseBody(updateTicketCategorySchema, req.body, res);
    if (!data) return;

    const ticket = await getTicketById(req.params.id);
    if (!ticket) {
      res.status(404).json({ error: "Ticket not found" });
      return;
    }

    const updated = await updateTicketCategory(req.params.id, data.category);
    res.json(updated);
  }
);

router.get("/:id/replies", requireAuth, async (req: Request<{ id: string }>, res: Response) => {
  const ticket = await getTicketById(req.params.id);
  if (!ticket) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }

  const replies = await listReplies(req.params.id);
  res.json({ replies });
});

router.post("/:id/replies", requireAuth, async (req: Request<{ id: string }>, res: Response) => {
  const data = parseBody(createReplySchema, req.body, res);
  if (!data) return;

  const ticket = await getTicketById(req.params.id);
  if (!ticket) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }

  const reply = await createReply(ticket.id, req.session!.user.id, data.body);
  res.status(201).json(reply);
});

export default router;
