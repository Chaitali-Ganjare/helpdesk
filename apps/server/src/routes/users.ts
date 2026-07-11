import { Router, type Request, type Response } from "express";
import { requireAdmin } from "../middleware/auth";
import { createUserSchema, listUsers, emailExists, createUser } from "../services/users";

const router = Router();

router.get("/", requireAdmin, async (_req: Request, res: Response) => {
  const users = await listUsers();
  res.json({ users });
});

router.post("/", requireAdmin, async (req: Request, res: Response) => {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message });
    return;
  }

  if (await emailExists(parsed.data.email)) {
    res.status(409).json({ error: "A user with this email already exists" });
    return;
  }

  const user = await createUser(parsed.data);
  res.status(201).json({ user });
});

export default router;
