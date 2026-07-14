import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  trustedOrigins: (process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? "").split(",").filter(Boolean),
  database: prismaAdapter(prisma, {
    provider: "mysql",
  }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
  },
  // Web and API deploy as separate Railway services (different origins, not
  // subdomains of a shared parent domain), so the session cookie needs
  // SameSite=None to ride along on cross-origin requests. Only in production:
  // SameSite=None requires Secure, which requires HTTPS, which localhost dev
  // doesn't have.
  advanced:
    process.env.NODE_ENV === "production"
      ? {
          defaultCookieAttributes: {
            sameSite: "none",
            secure: true,
            partitioned: true,
          },
        }
      : undefined,
  user: {
    additionalFields: {
      role: {
        type: "string",
        input: false,
      },
    },
  },
});
