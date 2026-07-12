import { Router, type Request, type Response } from "express";
import { requireAdmin, requireAuth } from "../middleware/auth";
import { Role } from "../generated/prisma";
import { parseBody } from "../lib/validate";
import {
  createUserSchema,
  editUserSchema,
  listUsers,
  listAssignableUsers,
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

router.get("/assignable", requireAuth, async (_req: Request, res: Response) => {
  const users = await listAssignableUsers();
  res.json({ users });
});

router.post("/", requireAdmin, async (req: Request, res: Response) => {
  const data = parseBody(createUserSchema, req.body, res);
  if (!data) return;

  if (await emailExists(data.email)) {
    res.status(409).json({ error: "A user with this email already exists" });
    return;
  }

  const user = await createUser(data);
  res.status(201).json({ user });
});

router.patch(
  "/:id",
  requireAdmin,
  async (req: Request<{ id: string }>, res: Response) => {
    const data = parseBody(editUserSchema, req.body, res);
    if (!data) return;

    const existingUser = await getUserById(req.params.id);
    if (!existingUser) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    if (await emailExists(data.email, req.params.id)) {
      res.status(409).json({ error: "A user with this email already exists" });
      return;
    }

    const user = await updateUser(req.params.id, data);
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
