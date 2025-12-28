import { cookies } from "next/headers";

const SESSION_COOKIE_NAME = "visualplanning_session_id";

/**
 * Get or create a session ID for the current user.
 * Uses cookies to maintain session across requests.
 * This function is server-side only and should be called from API routes.
 */
export async function getSessionId(): Promise<string> {
  const cookieStore = await cookies();
  let sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionId) {
    // Generate a new session ID
    sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 15)}`;
    cookieStore.set(SESSION_COOKIE_NAME, sessionId, {
      httpOnly: false, // Allow client-side reading for debugging (can be set to true for production)
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365, // 1 year
    });
  }

  return sessionId;
}

