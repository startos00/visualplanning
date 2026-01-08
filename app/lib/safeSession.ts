import "server-only";

import { headers } from "next/headers";
import { auth } from "@/app/lib/auth";

export type SafeSessionResult =
  | { session: Awaited<ReturnType<typeof auth.api.getSession>>; error: null; debug: null }
  | {
      session: null;
      error: "Database unavailable" | "Auth service unavailable";
      debug: {
        name: string;
        code: string | null;
        message: string;
        causeName: string | null;
        causeCode: string | null;
        causeMessage: string | null;
      };
    };

function classifySessionFailure(err: any): "Database unavailable" | "Auth service unavailable" {
  const msg = String(err?.message ?? err ?? "").toLowerCase();
  const causeCode =
    err?.cause?.code ??
    err?.sourceError?.cause?.code ??
    err?.sourceError?.code ??
    null;

  if (
    causeCode === "UND_ERR_CONNECT_TIMEOUT" ||
    msg.includes("neondberror") ||
    msg.includes("error connecting to database") ||
    msg.includes("connect timeout") ||
    msg.includes("fetch failed")
  ) {
    return "Database unavailable";
  }

  return "Auth service unavailable";
}

function toDebug(err: any) {
  const cause = err?.cause ?? null;
  return {
    name: String(err?.name ?? "Error"),
    code: err?.code ? String(err.code) : null,
    message: String(err?.message ?? err).slice(0, 500),
    causeName: cause?.name ? String(cause.name) : null,
    causeCode: cause?.code ? String(cause.code) : null,
    causeMessage: cause ? String(cause?.message ?? cause).slice(0, 500) : null,
  };
}

/**
 * Better-Auth session retrieval can throw (e.g. DB/session store outage).
 * Use this helper in server actions and route handlers to avoid noisy 500s and
 * to return a consistent error/debug shape.
 */
export async function safeGetSession(): Promise<SafeSessionResult> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    return { session, error: null, debug: null };
  } catch (err: any) {
    return {
      session: null,
      error: classifySessionFailure(err),
      debug: toDebug(err),
    };
  }
}


