"use server";

import { headers } from "next/headers";
import { db } from "@/app/lib/db";
import { highlights } from "@/app/lib/db/schema";
import { auth } from "@/app/lib/auth";
import { eq, and } from "drizzle-orm";

export async function getHighlights(nodeId?: string) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return [];

    const userId = session.user.id;
    let query = db.select().from(highlights).where(eq(highlights.userId, userId));

    if (nodeId) {
      query = db.select().from(highlights).where(
        and(
          eq(highlights.userId, userId),
          eq(highlights.nodeId, nodeId)
        )
      );
    }

    const results = await query;
    return results;
  } catch (error) {
    console.error("Error fetching highlights:", error);
    return [];
  }
}

export async function addHighlight(nodeId: string, content: string, position: any, comment?: string, categoryId?: string, title?: string, type: string = "highlight") {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return { success: false, error: "Unauthorized" };

    const userId = session.user.id;
    const now = new Date();

    // Insert snippet/highlight (duplicates allowed for flexibility)
    await db.insert(highlights).values({
      userId,
      nodeId,
      content,
      position,
      comment,
      categoryId,
      title,
      type,
      createdAt: now,
      updatedAt: now,
    });

    return { success: true };
  } catch (error) {
    console.error("Error adding highlight:", error);
    return { success: false, error: "Failed to add highlight" };
  }
}

export async function updateHighlight(id: string, updates: { content?: string, comment?: string, categoryId?: string | null, title?: string }) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return { success: false, error: "Unauthorized" };

    const userId = session.user.id;
    const now = new Date();

    await db.update(highlights).set({
      ...updates,
      updatedAt: now,
    }).where(
      and(
        eq(highlights.id, id),
        eq(highlights.userId, userId)
      )
    );

    return { success: true };
  } catch (error) {
    console.error("Error updating highlight:", error);
    return { success: false, error: "Failed to update highlight" };
  }
}

export async function addNote(nodeId: string, content: string, categoryId?: string, title?: string) {
  return addHighlight(nodeId, content, null, undefined, categoryId, title, "note");
}

export async function deleteHighlight(id: string) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return { success: false, error: "Unauthorized" };

    const userId = session.user.id;

    await db.delete(highlights).where(
      and(
        eq(highlights.id, id),
        eq(highlights.userId, userId)
      )
    );

    return { success: true };
  } catch (error) {
    console.error("Error deleting highlight:", error);
    return { success: false, error: "Failed to delete highlight" };
  }
}

