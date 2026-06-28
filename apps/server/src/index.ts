import express from "express";
import cors from "cors";
import { prisma } from "./lib/prisma";

const app = express();
const port = process.env.PORT ?? 3000;

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

app.get("/api/health", async (_req, res) => {
  await prisma.$queryRaw`SELECT 1`;
  res.json({ status: "ok", db: "connected" });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
