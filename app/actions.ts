"use server";

import { headers } from "next/headers";
import { db } from "@/app/lib/db";
import { canvases } from "@/app/lib/db/schema";
import { auth } from "@/app/lib/auth";
import { eq } from "drizzle-orm";

export async function saveCanvas(nodes: any, edges: any) {
  try {
    // Get the session using Better-Auth
    const session = await auth.api.getSession({ headers: await headers() });
    
    if (!session) {
      throw new Error("Unauthorized: Please sign in to save your canvas");
    }

    const userId = session.user.id;

    // Check if a row exists for the authenticated user
    const existing = await db
      .select()
      .from(canvases)
      .where(eq(canvases.userId, userId))
      .limit(1);

    if (existing.length > 0) {
      // UPDATE the nodes and edges columns
      await db
        .update(canvases)
        .set({
          nodes: nodes,
          edges: edges,
          updatedAt: new Date(),
        })
        .where(eq(canvases.userId, userId));
    } else {
      // INSERT a new row
      await db.insert(canvases).values({
        userId: userId,
        nodes: nodes,
        edges: edges,
      });
    }
  } catch (error) {
    console.error("Error saving canvas:", error);
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      throw error;
    }
    throw new Error("Failed to save canvas");
  }
}

export async function loadCanvas() {
  try {
    // Get the session using Better-Auth
    const session = await auth.api.getSession({ headers: await headers() });
    
    if (!session) {
      throw new Error("Unauthorized: Please sign in to load your canvas");
    }

    const userId = session.user.id;

    // Select the row for the authenticated user
    const result = await db
      .select({
        nodes: canvases.nodes,
        edges: canvases.edges,
      })
      .from(canvases)
      .where(eq(canvases.userId, userId))
      .limit(1);

    if (result.length === 0) {
      return { nodes: null, edges: null };
    }

    return {
      nodes: result[0].nodes,
      edges: result[0].edges,
    };
  } catch (error) {
    console.error("Error loading canvas:", error);
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      throw error;
    }
    throw new Error("Failed to load canvas");
  }
}

