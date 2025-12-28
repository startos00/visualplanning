"use server";

import { headers } from "next/headers";
import { db } from "@/app/lib/db";
import { grimpoStates } from "@/app/lib/db/schema";
import { auth } from "@/app/lib/auth";
import { eq } from "drizzle-orm";

export async function saveState(nodes: any, edges: any): Promise<{ success: boolean; error?: string }> {
  try {
    // Get the session using Better-Auth
    const session = await auth.api.getSession({ headers: await headers() });
    
    // Require authentication for saving
    if (!session) {
      return { success: false, error: "Unauthorized: Please sign in to save your canvas" };
    }

    const userId = session.user.id;

    // Try to find a row where user_id matches the authenticated user
    const existing = await db
      .select()
      .from(grimpoStates)
      .where(eq(grimpoStates.userId, userId))
      .limit(1);

    if (existing.length > 0) {
      // UPDATE the nodes and edges
      await db
        .update(grimpoStates)
        .set({
          nodes: nodes,
          edges: edges,
          updatedAt: new Date(),
        })
        .where(eq(grimpoStates.userId, userId));
    } else {
      // INSERT a new row with user_id from the authenticated session
      await db.insert(grimpoStates).values({
        userId: userId,
        nodes: nodes,
        edges: edges,
      });
    }

    return { success: true };
  } catch (error) {
    console.error("Error saving state:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to save state" 
    };
  }
}

export async function loadState() {
  try {
    // Get the session using Better-Auth
    const session = await auth.api.getSession({ headers: await headers() });
    
    // If no session, return null state (user not authenticated)
    if (!session) {
      return { nodes: null, edges: null };
    }

    const userId = session.user.id;

    // Select the row where user_id matches the authenticated user
    const result = await db
      .select({
        nodes: grimpoStates.nodes,
        edges: grimpoStates.edges,
      })
      .from(grimpoStates)
      .where(eq(grimpoStates.userId, userId))
      .limit(1);

    if (result.length === 0) {
      return { nodes: null, edges: null };
    }

    return {
      nodes: result[0].nodes,
      edges: result[0].edges,
    };
  } catch (error) {
    console.error("Error loading state:", error);
    // Return null state on error instead of throwing
    return { nodes: null, edges: null };
  }
}

