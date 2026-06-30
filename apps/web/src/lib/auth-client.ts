import { createAuthClient } from "better-auth/react";

// Explicit baseURL so auth requests always target the right backend.
// In dev the Vite proxy forwards /api/* to Express, so window.location.origin works.
// In production both apps share the same Vercel origin, so this is still correct.
export const authClient = createAuthClient({
  baseURL: window.location.origin,
});
