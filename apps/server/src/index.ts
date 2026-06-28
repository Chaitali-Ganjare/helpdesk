import express from "express";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";
import { prisma } from "./lib/prisma";
import { auth } from "./lib/auth";

const app = express();
const port = process.env.PORT ?? 3000;

app.set("trust proxy", true);
app.all("/api/auth/*", toNodeHandler(auth));

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

app.get("/api/health", async (_req, res) => {
  await prisma.$queryRaw`SELECT 1`;
  res.json({ status: "ok", db: "connected" });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
