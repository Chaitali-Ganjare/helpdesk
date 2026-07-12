import { Router, type Request, type Response } from "express";
import { requireAdmin } from "../middleware/auth";
import { Role } from "../generated/prisma";
import {
  createUserSchema,
  editUserSchema,
  listUsers,
  getUserById,
  emailExists,
  createUser,
  updateUser,
  deleteUser,
} from "../services/users";

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

router.patch(
  "/:id",
  requireAdmin,
  async (req: Request<{ id: string }>, res: Response) => {
    const parsed = editUserSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0].message });
      return;
    }

    const existingUser = await getUserById(req.params.id);
    if (!existingUser) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    if (await emailExists(parsed.data.email, req.params.id)) {
      res.status(409).json({ error: "A user with this email already exists" });
      return;
    }

    const user = await updateUser(req.params.id, parsed.data);
    res.json({ user });
  }
);

router.delete(
  "/:id",
  requireAdmin,
  async (req: Request<{ id: string }>, res: Response) => {
    const existingUser = await getUserById(req.params.id);
    if (!existingUser) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    if (existingUser.role === Role.ADMIN) {
      res.status(403).json({ error: "Admin users cannot be deleted" });
      return;
    }

    await deleteUser(req.params.id);
    res.status(204).send();
  }
);

export default router;
