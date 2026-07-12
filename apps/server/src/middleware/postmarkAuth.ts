import type { Request, Response, NextFunction } from "express";
import { createHash, timingSafeEqual } from "node:crypto";

// Fixed-length digest comparison — `timingSafeEqual` throws on mismatched
// buffer lengths, so hashing first sidesteps that entirely (SHA-256 output
// is always 32 bytes) without leaking length info via an exception.
function safeEqual(a: string, b: string): boolean {
  const hashA = createHash("sha256").update(a).digest();
  const hashB = createHash("sha256").update(b).digest();
  return timingSafeEqual(hashA, hashB);
}

/**
 * Verifies Postmark's inbound webhook request via HTTP Basic Auth.
 * Credentials are embedded in the webhook URL configured in Postmark's
 * dashboard; Postmark base64-encodes them into the Authorization header
 * automatically. Returns 401 for any missing/malformed/incorrect credential,
 * and fails closed if the expected credentials aren't configured server-side.
 */
export function requirePostmarkAuth(req: Request, res: Response, next: NextFunction): void {
  const expectedUser = process.env.POSTMARK_INBOUND_USERNAME;
  const expectedPass = process.env.POSTMARK_INBOUND_PASSWORD;

  function unauthorized() {
    res.setHeader("WWW-Authenticate", 'Basic realm="postmark-inbound"');
    res.status(401).json({ error: "Unauthorized" });
  }

  if (!expectedUser || !expectedPass) {
    unauthorized();
    return;
  }

  const header = req.headers.authorization;
  if (!header || !header.startsWith("Basic ")) {
    unauthorized();
    return;
  }

  const decoded = Buffer.from(header.slice("Basic ".length), "base64").toString("utf8");
  const separatorIndex = decoded.indexOf(":");
  if (separatorIndex === -1) {
    unauthorized();
    return;
  }

  const user = decoded.slice(0, separatorIndex);
  const pass = decoded.slice(separatorIndex + 1);

  if (!safeEqual(user, expectedUser) || !safeEqual(pass, expectedPass)) {
    unauthorized();
    return;
  }

  next();
}
