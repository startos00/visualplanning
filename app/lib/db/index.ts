import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// Next.js automatically loads .env.local, but we can add a fallback check
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL environment variable is not set. " +
    "Please create a .env.local file with DATABASE_URL, BETTER_AUTH_SECRET, and BETTER_AUTH_URL. " +
    "Then restart your Next.js dev server."
  );
}

const sql = neon(process.env.DATABASE_URL);
export const db = drizzle(sql, { schema });

