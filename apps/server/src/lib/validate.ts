import type { Response } from "express";
import type { ZodType } from "zod";

/**
 * Parses `body` against `schema`. On failure, writes the 400 response itself
 * and returns `undefined` — callers should `return` immediately when that
 * happens. On success, returns the parsed (typed) data.
 */
export function parseBody<T>(schema: ZodType<T>, body: unknown, res: Response): T | undefined {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message });
    return undefined;
  }
  return parsed.data;
}
