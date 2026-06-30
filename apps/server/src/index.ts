import express, { type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { toNodeHandler } from "better-auth/node";
import { prisma } from "./lib/prisma";
import { auth } from "./lib/auth";

const app = express();
const port = process.env.PORT ?? 3000;

// Trust exactly one proxy hop (the Vercel / reverse-proxy layer).
// `true` would trust all X-Forwarded-For headers unconditionally,
// enabling IP spoofing that defeats rate limiting.
app.set("trust proxy", 1);

// Brute-force protection on sign-in — must be registered BEFORE the auth
// handler so it runs on the matching path before better-auth takes over.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many sign-in attempts, please try again later." },
});
app.use("/api/auth/sign-in", authLimiter);

// Auth handler must be before CORS, Helmet, and body parsing.
// Use `/*` (Express 4 wildcard) — *splat named wildcards are Express 5 only.
app.all("/api/auth/*", toNodeHandler(auth));

// Standard security headers (CSP, X-Frame-Options, HSTS, etc.)
app.use(helmet());

// CORS: origin is env-driven so the same build works in dev and production.
// `credentials: true` is required for the browser to send the session cookie
// on cross-origin requests (Vercel frontend → Vercel API).
const allowedOrigins = (process.env.CORS_ORIGIN ?? "http://localhost:5173").split(",");

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

app.use(express.json());

app.get("/api/health", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", db: "connected" });
  } catch (err) {
    next(err);
  }
});

// Global error handler — must be the last middleware registered.
// Logs the full error server-side; sends a generic message to the client.
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
