import type { Request, Response, NextFunction } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../lib/auth";

// Augment the Express Request type so downstream handlers get full type safety.
declare global {
  namespace Express {
    interface Request {
      session?: Awaited<ReturnType<typeof auth.api.getSession>>;
    }
  }
}

/**
 * Requires a valid session. Returns 401 if the request is unauthenticated.
 * Attaches the session object to `req.session` for downstream handlers.
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });

  if (!session) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  req.session = session;
  next();
}

/**
 * Requires a valid session AND the ADMIN role.
 * Returns 401 for unauthenticated requests; 403 for authenticated non-admins.
 */
export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });

  if (!session) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const role = (session.user as { role?: string }).role;
  if (role !== "ADMIN") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  req.session = session;
  next();
}
