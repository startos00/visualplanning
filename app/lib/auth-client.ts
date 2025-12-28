import { createAuthClient } from "better-auth/react";

/**
 * Client-side Better-Auth instance.
 *
 * IMPORTANT:
 * - Do NOT import server-only modules (db/auth server config) from client components.
 * - NEXT_PUBLIC_BETTER_AUTH_URL must be set for client-side requests (or we fall back to window.location.origin).
 */
export const authClient = createAuthClient({
  baseURL:
    typeof window !== "undefined"
      ? (process.env.NEXT_PUBLIC_BETTER_AUTH_URL ?? window.location.origin)
      : (process.env.NEXT_PUBLIC_BETTER_AUTH_URL ?? "http://localhost:3000"),
});


