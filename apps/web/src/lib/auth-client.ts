import { createAuthClient } from "better-auth/react";

// Explicit baseURL so auth requests always target the right backend.
// In dev the Vite proxy forwards /api/* to Express, so window.location.origin works
// when VITE_API_URL is unset. In production the web and API apps are deployed as
// separate Railway services on different origins, so VITE_API_URL must be set to
// the API service's public URL — better-auth's fetch client sends credentials:
// "include" automatically, so the session cookie still rides along cross-origin.
export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_API_URL || window.location.origin,
});
